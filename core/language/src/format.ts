import { sha256HexUtf8 } from "./canonical.ts";
import { LanguageError } from "./errors.ts";
import { DEFAULT_BOUNDS_V1, type BoundsPolicy } from "./bounds.ts";
import {
  ITEM_KINDS,
  STANDINGS,
  STATE_SCHEMA_V1,
  type ItemKind,
  type LanguageItem,
  type LanguageState,
  type OperationSummary,
  type SourceRef,
  type Standing,
  type SupersessionEntry,
} from "./types.ts";

export const RENDER_MARK_START = "<<<LANGUAGE-PROJECTION-START>>>";
export const RENDER_MARK_END = "<<<LANGUAGE-PROJECTION-END>>>";

const SECTION_ORDER = [
  "Current objective",
  "Decisions",
  "Constraints",
  "Definitions",
  "Open ambiguities",
  "Supersession index",
] as const;

const KIND_TO_SECTION: Record<ItemKind, string> = {
  objective: "Current objective",
  decision: "Decisions",
  constraint: "Constraints",
  definition: "Definitions",
  ambiguity: "Open ambiguities",
};

const ITEM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function fail(message: string, details?: Record<string, unknown>): never {
  throw new LanguageError("INVALID_INPUT", message, details);
}

function checkNoMarkers(value: string, where: string): void {
  for (const line of value.split("\n")) {
    if (line.includes(RENDER_MARK_START) || line.includes(RENDER_MARK_END)) {
      throw new LanguageError("INVALID_INPUT", `reserved renderer delimiter in ${where}`);
    }
  }
}

export function validateSourceRef(ref: unknown, where: string): SourceRef {
  if (typeof ref !== "object" || ref === null) fail(`source reference must be an object (${where})`);
  const r = ref as Record<string, unknown>;
  if (typeof r["session_id"] !== "string" || r["session_id"] === "") fail(`session_id required (${where})`);
  if (typeof r["message_id"] !== "string" || r["message_id"] === "") fail(`message_id required (${where})`);
  if (r["part_id"] !== undefined && typeof r["part_id"] !== "string") fail(`part_id must be a string (${where})`);
  if (typeof r["sha256"] !== "string" || !SHA256_PATTERN.test(r["sha256"])) {
    throw new LanguageError("INVALID_INPUT", `sha256 must be 64 lowercase hex chars (${where})`);
  }
  const out: SourceRef = {
    session_id: r["session_id"] as string,
    message_id: r["message_id"] as string,
    sha256: r["sha256"] as string,
  };
  if (typeof r["part_id"] === "string" && r["part_id"] !== "") out.part_id = r["part_id"];
  return out;
}

function sameRef(a: SourceRef, b: SourceRef): boolean {
  return (
    a.session_id === b.session_id &&
    a.message_id === b.message_id &&
    (a.part_id ?? "") === (b.part_id ?? "") &&
    a.sha256 === b.sha256
  );
}

export function validateItemStructure(item: unknown): LanguageItem {
  if (typeof item !== "object" || item === null) fail("item must be an object");
  const it = item as Record<string, unknown>;
  if (typeof it["id"] !== "string" || !ITEM_ID_PATTERN.test(it["id"])) fail("item id malformed");
  if (!(ITEM_KINDS as readonly string[]).includes(it["kind"] as string)) fail(`unknown item kind: ${String(it["kind"])}`);
  if (typeof it["text"] !== "string" || it["text"] === "") fail(`item text required (${String(it["id"])})`);
  if (typeof it["actor"] !== "string" || it["actor"] === "") fail(`item actor required (${String(it["id"])})`);
  if (!(STANDINGS as readonly string[]).includes(it["standing"] as string)) {
    throw new LanguageError("INVALID_INPUT", `invalid standing: ${String(it["standing"])}`);
  }
  if (typeof it["scope"] !== "string" || it["scope"] === "") fail(`item scope required (${String(it["id"])})`);
  if (!Array.isArray(it["sources"]) || it["sources"].length === 0) {
    fail(`at least one source reference required (${String(it["id"])})`);
  }
  const id = it["id"] as string;
  const sources = (it["sources"] as unknown[]).map((s, i) => validateSourceRef(s, `${id}[${i}]`));
  const standing = it["standing"] as Standing;
  const kind = it["kind"] as ItemKind;
  const out: LanguageItem = {
    id,
    kind,
    text: it["text"] as string,
    actor: it["actor"] as string,
    standing,
    scope: it["scope"] as string,
    sources,
  };
  if (it["superseded_by"] !== undefined) {
    if (typeof it["superseded_by"] !== "string" || !ITEM_ID_PATTERN.test(it["superseded_by"])) {
      fail(`malformed superseded_by (${id})`);
    }
    out.superseded_by = it["superseded_by"];
  }
  if (standing !== "superseded" && out.superseded_by !== undefined) {
    fail(`active item must not carry superseded_by (${id})`);
  }
  if (standing === "superseded" && out.superseded_by === undefined) {
    fail(`superseded item must name superseded_by (${id})`);
  }
  if (it["resolved_by"] !== undefined) {
    out.resolved_by = validateSourceRef(it["resolved_by"], `${id}.resolved_by`);
  }
  if (kind === "ambiguity" && standing === "explicit") {
    if (out.resolved_by === undefined) {
      fail(`resolved ambiguity must carry resolved_by newer than the opening reference (${id})`);
    }
    if (sources.some((s) => sameRef(s, out.resolved_by as SourceRef))) {
      fail(`resolved_by must differ from the opening references (${id})`);
    }
  }
  checkNoMarkers(out.text, `item ${id} text`);
  checkNoMarkers(out.actor, `item ${id} actor`);
  checkNoMarkers(out.scope, `item ${id} scope`);
  return out;
}

/** Full state validation: structure, standing rules, and v0 bounds. */
export function validateState(state: unknown, bounds: BoundsPolicy = DEFAULT_BOUNDS_V1): LanguageState {
  if (typeof state !== "object" || state === null) fail("state must be an object");
  const st = state as Record<string, unknown>;
  if (st["schema"] !== STATE_SCHEMA_V1) {
    throw new LanguageError("INVALID_INPUT", `unsupported state schema: ${String(st["schema"])}`);
  }
  if (!Array.isArray(st["items"])) fail("state items must be an array");
  if (!Array.isArray(st["superseded"])) fail("state superseded index must be an array");
  const items = (st["items"] as unknown[]).map(validateItemStructure);
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) fail(`duplicate item id: ${item.id}`);
    seen.add(item.id);
  }
  const superseded: SupersessionEntry[] = [];
  const seenIndex = new Set<string>();
  for (const raw of st["superseded"] as unknown[]) {
    if (typeof raw !== "object" || raw === null) fail("supersession entry must be an object");
    const e = raw as Record<string, unknown>;
    if (typeof e["item_id"] !== "string" || !ITEM_ID_PATTERN.test(e["item_id"])) fail("malformed supersession item_id");
    if (!(typeof e["superseded_by"] === "string" || e["superseded_by"] === null)) fail("superseded_by must be string or null");
    if (typeof e["superseded_by"] === "string" && !ITEM_ID_PATTERN.test(e["superseded_by"])) fail("malformed superseded_by in index");
    if (typeof e["revision"] !== "string") fail("supersession entry revision required");
    if (typeof e["pruned"] !== "boolean") fail("supersession entry pruned flag required");
    if (seenIndex.has(e["item_id"] as string)) fail(`duplicate supersession entry: ${e["item_id"] as string}`);
    seenIndex.add(e["item_id"] as string);
    // An empty revision is a transient pre-commit marker for entries created
    // by the current mutation; buildRevision always stamps it before anything
    // is persisted, so "" never appears in a committed state.
    if (typeof e["revision"] !== "string") fail("supersession entry revision required");
    superseded.push({
      item_id: e["item_id"] as string,
      superseded_by: e["superseded_by"] as string | null,
      revision: e["revision"] as string,
      pruned: e["pruned"] as boolean,
    });
  }
  const out: LanguageState = { schema: STATE_SCHEMA_V1, items, superseded };
  enforceBounds(out, bounds);
  return out;
}

export function enforceBounds(state: LanguageState, bounds: BoundsPolicy): void {
  const failBound = (message: string): never => {
    throw new LanguageError("BOUND_EXCEEDED", message);
  };
  if (state.items.length > bounds.max_items) failBound(`item count ${state.items.length} exceeds ${bounds.max_items}`);
  if (state.superseded.length > bounds.max_supersession_entries) {
    failBound(`supersession index ${state.superseded.length} exceeds ${bounds.max_supersession_entries}`);
  }
  for (const item of state.items) {
    if (Buffer.byteLength(item.text, "utf8") > bounds.max_item_text_bytes) {
      failBound(`item ${item.id} text exceeds ${bounds.max_item_text_bytes} bytes`);
    }
    if (Buffer.byteLength(item.scope, "utf8") > bounds.max_scope_bytes) failBound(`item ${item.id} scope too long`);
    if (Buffer.byteLength(item.actor, "utf8") > bounds.max_actor_bytes) failBound(`item ${item.id} actor too long`);
    if (item.sources.length > bounds.max_sources_per_item) {
      failBound(`item ${item.id} has too many source references`);
    }
  }
  const bytes = Buffer.byteLength(serializeCanonical(canonicalizeState(state)), "utf8");
  if (bytes > bounds.max_state_bytes) failBound(`canonical state ${bytes} bytes exceeds ${bounds.max_state_bytes}`);
}

/** Canonical order: items and index sorted by id; sources sorted canonically. */
export function canonicalizeState(state: LanguageState): LanguageState {
  const sortRef = (a: SourceRef, b: SourceRef): number =>
    a.session_id.localeCompare(b.session_id) ||
    a.message_id.localeCompare(b.message_id) ||
    (a.part_id ?? "").localeCompare(b.part_id ?? "") ||
    a.sha256.localeCompare(b.sha256);
  return {
    schema: STATE_SCHEMA_V1,
    items: [...state.items]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((item) => ({ ...item, sources: [...item.sources].sort(sortRef) })),
    superseded: [...state.superseded].sort((a, b) => a.item_id.localeCompare(b.item_id)),
  };
}

function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Parse a `"..."` quoted value starting at pos; returns value and next pos. */
function parseQuoted(text: string, pos: number, where: string): { value: string; next: number } {
  if (text[pos] !== '"') fail(`expected quoted value (${where})`);
  let out = "";
  let i = pos + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      const next = text[i + 1];
      if (next !== '"' && next !== "\\") fail(`bad escape (${where})`);
      out += next;
      i += 2;
      continue;
    }
    if (ch === '"') return { value: out, next: i + 1 };
    out += ch;
    i += 1;
  }
  return fail(`unterminated quoted value (${where})`);
}

function parseRefLine(line: string, where: string): SourceRef {
  // key="value" triples; part_id optional.
  const ref: Record<string, string> = {};
  let i = 0;
  const skipSpaces = (): void => {
    while (text_at(line, i) === " ") i += 1;
  };
  const text_at = (s: string, p: number): string => (p < s.length ? (s[p] as string) : "");
  while (i < line.length) {
    skipSpaces();
    if (i >= line.length) break;
    const keyMatch = /^[A-Za-z0-9_]+/.exec(line.slice(i));
    if (!keyMatch) fail(`malformed reference field (${where})`);
    const key = keyMatch[0];
    i += key.length;
    skipSpaces();
    if (text_at(line, i) !== "=") fail(`expected = in reference (${where})`);
    i += 1;
    skipSpaces();
    const parsed = parseQuoted(line, i, where);
    ref[key] = parsed.value;
    i = parsed.next;
  }
  const allowed = new Set(["session_id", "message_id", "part_id", "sha256"]);
  for (const key of Object.keys(ref)) {
    if (!allowed.has(key)) fail(`unknown reference field ${key} (${where})`);
  }
  return validateSourceRef(ref, where);
}

function serializeRefLine(ref: SourceRef): string {
  const parts = [`session_id=${quote(ref.session_id)}`, `message_id=${quote(ref.message_id)}`];
  if (ref.part_id !== undefined) parts.push(`part_id=${quote(ref.part_id)}`);
  parts.push(`sha256=${quote(ref.sha256)}`);
  return parts.join(" ");
}

/** Serialize without validation: input must already be validated and canonical. */
export function serializeCanonical(canon: LanguageState): string {
  const lines: string[] = ["# Communication state", `schema: ${STATE_SCHEMA_V1}`, ""];
  const bySection = new Map<string, LanguageItem[]>();
  for (const section of SECTION_ORDER) bySection.set(section, []);
  for (const item of canon.items) {
    (bySection.get(KIND_TO_SECTION[item.kind]) as LanguageItem[]).push(item);
  }
  for (const section of SECTION_ORDER) {
    lines.push(`## ${section}`, "");
    if (section === "Supersession index") {
      for (const entry of canon.superseded) {
        lines.push(
          `### supersession ${entry.item_id}`,
          `superseded_by: ${entry.superseded_by ?? "none"}`,
          `revision: ${entry.revision}`,
          `pruned: ${entry.pruned ? "true" : "false"}`,
          "",
        );
      }
      continue;
    }
    for (const item of bySection.get(section) as LanguageItem[]) {
      lines.push(
        `### item ${item.id}`,
        `kind: ${item.kind}`,
        `actor: ${item.actor}`,
        `standing: ${item.standing}`,
        `scope: ${item.scope}`,
      );
      if (item.superseded_by !== undefined) lines.push(`superseded_by: ${item.superseded_by}`);
      if (item.resolved_by !== undefined) lines.push(`resolved_by: ${serializeRefLine(item.resolved_by)}`);
      lines.push("text:");
      for (const textLine of item.text.split("\n")) lines.push(`> ${textLine}`);
      lines.push("sources:");
      for (const ref of item.sources) lines.push(`  - ${serializeRefLine(ref)}`);
      lines.push("");
    }
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return `${lines.join("\n")}\n`;
}

/** Serialize to canonical bytes: UTF-8, LF, exactly one final newline. */
export function serializeState(state: LanguageState): string {
  return serializeCanonical(canonicalizeState(validateState(state)));
}

interface ItemDraft {
  fields: Map<string, string[]>;
  textLines: string[] | null;
  sourceLines: string[];
}

/** Parse canonical or human-edited text. CRLF is accepted and normalized. */
export function parseState(text: string): LanguageState {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0] !== "# Communication state") fail("missing document header");
  if (lines[1] !== `schema: ${STATE_SCHEMA_V1}`) {
    throw new LanguageError("INVALID_INPUT", `unsupported or missing schema line: ${lines[1] ?? ""}`);
  }
  let pos = 2;
  const skipBlank = (): void => {
    while (pos < lines.length && (lines[pos] as string).trim() === "") pos += 1;
  };
  skipBlank();
  const items: LanguageItem[] = [];
  const superseded: SupersessionEntry[] = [];
  const seenSections = new Set<string>();
  while (pos < lines.length) {
    const line = lines[pos] as string;
    const sectionMatch = /^## (.+)$/.exec(line);
    if (!sectionMatch) fail(`expected section heading, got: ${line}`);
    const section = sectionMatch[1] as string;
    if (seenSections.has(section)) fail(`duplicate section: ${section}`);
    seenSections.add(section);
    if (!(SECTION_ORDER as readonly string[]).includes(section)) fail(`unknown section: ${section}`);
    pos += 1;
    skipBlank();
    if (section === "Supersession index") {
      while (pos < lines.length && !(lines[pos] as string).startsWith("## ")) {
        const entryLine = lines[pos] as string;
        if (entryLine.trim() === "") {
          pos += 1;
          continue;
        }
        const head = /^### supersession (\S+)$/.exec(entryLine);
        if (!head) fail(`expected supersession entry, got: ${entryLine}`);
        const item_id = head[1] as string;
        pos += 1;
        const fields = new Map<string, string>();
        while (pos < lines.length) {
          const f = lines[pos] as string;
          if (f.trim() === "" || f.startsWith("### ") || f.startsWith("## ")) break;
          const m = /^([A-Za-z0-9_]+): (.*)$/.exec(f);
          if (!m) fail(`malformed index field: ${f}`);
          if (fields.has(m[1] as string)) fail(`duplicate index field: ${m[1] as string}`);
          fields.set(m[1] as string, m[2] as string);
          pos += 1;
        }
        const by = fields.get("superseded_by");
        const rev = fields.get("revision");
        const pruned = fields.get("pruned");
        if (by === undefined || rev === undefined || pruned === undefined || fields.size !== 3) {
          fail(`index entry ${item_id} must have exactly superseded_by/revision/pruned`);
        }
        if (pruned !== "true" && pruned !== "false") fail(`pruned must be true/false (${item_id})`);
        superseded.push({
          item_id,
          superseded_by: by === "none" ? null : by,
          revision: rev,
          pruned: pruned === "true",
        });
        skipBlank();
      }
      continue;
    }
    while (pos < lines.length && !(lines[pos] as string).startsWith("## ")) {
      const itemLine = lines[pos] as string;
      if (itemLine.trim() === "") {
        pos += 1;
        continue;
      }
      const head = /^### item (\S+)$/.exec(itemLine);
      if (!head) fail(`expected item heading, got: ${itemLine}`);
      const draft: ItemDraft = { fields: new Map(), textLines: null, sourceLines: [] };
      pos += 1;
      let mode: "fields" | "text" | "sources" = "fields";
      while (pos < lines.length) {
        const f = lines[pos] as string;
        if (f.startsWith("### ") || f.startsWith("## ")) break;
        if (f.trim() === "") {
          pos += 1;
          if (mode === "text") mode = "fields";
          continue;
        }
        if (f === "text:") {
          if (draft.textLines !== null) fail("duplicate text block");
          draft.textLines = [];
          mode = "text";
          pos += 1;
          continue;
        }
        if (f === "sources:") {
          mode = "sources";
          pos += 1;
          continue;
        }
        if (mode === "text") {
          if (f === ">") {
            (draft.textLines as string[]).push("");
            pos += 1;
            continue;
          }
          if (!f.startsWith("> ")) fail(`text lines must start with "> ": ${f}`);
          (draft.textLines as string[]).push(f.slice(2));
          pos += 1;
          continue;
        }
        if (mode === "sources") {
          const m = /^  - (.*)$/.exec(f);
          if (!m) fail(`source lines must look like "  - k=...": ${f}`);
          draft.sourceLines.push(m[1] as string);
          pos += 1;
          continue;
        }
        const m = /^([A-Za-z0-9_]+): (.*)$/.exec(f);
        if (!m) fail(`malformed item field: ${f}`);
        const key = m[1] as string;
        const existing = draft.fields.get(key);
        if (existing !== undefined) fail(`duplicate item field: ${key}`);
        draft.fields.set(key, [m[2] as string]);
        pos += 1;
      }
      const get = (key: string): string => {
        const v = draft.fields.get(key);
        if (v === undefined) fail(`missing item field: ${key}`);
        return v[0] as string;
      };
      const raw: Record<string, unknown> = {
        id: head[1],
        kind: get("kind"),
        actor: get("actor"),
        standing: get("standing"),
        scope: get("scope"),
        text: draft.textLines === null ? fail("missing text block") : draft.textLines.join("\n"),
        sources: draft.sourceLines.map((s, i) => parseRefLine(s, `item ${head[1]} source ${i}`)),
      };
      const extra = new Set(["superseded_by", "resolved_by"]);
      for (const [key, values] of draft.fields) {
        if (["kind", "actor", "standing", "scope"].includes(key)) continue;
        if (!extra.has(key)) fail(`unknown item field: ${key}`);
        if (key === "superseded_by") raw["superseded_by"] = values[0];
        if (key === "resolved_by") raw["resolved_by"] = parseRefLine(values[0] as string, `item ${head[1]} resolved_by`);
      }
      items.push(validateItemStructure(raw));
      skipBlank();
    }
  }
  return validateState({ schema: STATE_SCHEMA_V1, items, superseded });
}

export function stateSha256(canonicalText: string): string {
  return sha256HexUtf8(canonicalText);
}

/** Structural diff between two validated states, used for receipts and human-edit review. */
export function diffStates(previous: LanguageState, next: LanguageState): OperationSummary {
  const prevMap = new Map(previous.items.map((i) => [i.id, i]));
  const nextMap = new Map(next.items.map((i) => [i.id, i]));
  const summary: OperationSummary = {
    added: [],
    revised: [],
    standing_changed: [],
    superseded: [],
    removed_from_active: [],
    sessions_added: [],
  };
  for (const [id, item] of nextMap) {
    const before = prevMap.get(id);
    if (!before) {
      summary.added.push(id);
      continue;
    }
    if (before.text !== item.text || before.actor !== item.actor || before.scope !== item.scope || before.kind !== item.kind) {
      summary.revised.push(id);
    }
    if (before.standing !== item.standing) summary.standing_changed.push(id);
    if (before.standing !== "superseded" && item.standing === "superseded") summary.superseded.push(id);
  }
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) summary.removed_from_active.push(id);
  }
  for (const key of Object.keys(summary) as (keyof OperationSummary)[]) summary[key].sort();
  return summary;
}
