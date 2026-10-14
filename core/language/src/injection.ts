import { sha256HexUtf8 } from "./canonical.ts";
import { RENDER_MARK_END, RENDER_MARK_START } from "./format.ts";
import type { DiagnosticCode } from "./diagnostics.ts";

export type InjectionOutcome =
  | "INJECTED"
  | "ALREADY_PRESENT"
  | "REPLACED"
  | "CONFLICT"
  | "MALFORMED"
  | "UNSUPPORTED_SHAPE";

export interface InjectionResult {
  outcome: InjectionOutcome;
  code: DiagnosticCode;
  /** New system array when changed; original reference when unchanged. */
  system: unknown[];
  /** Index of the owned block (after the operation), or -1. */
  owned_index: number;
  /** Revision parsed from the pre-existing owned block, if any. */
  present_revision: string | null;
}

function systemTexts(system: unknown): { index: number; text: string }[] {
  if (!Array.isArray(system)) return [];
  const out: { index: number; text: string }[] = [];
  for (let i = 0; i < system.length; i += 1) {
    const entry = system[i] as Record<string, unknown> | null;
    if (typeof entry === "object" && entry !== null && typeof entry["text"] === "string") {
      out.push({ index: i, text: entry["text"] as string });
    }
  }
  return out;
}

/** Well-formed means exactly one START line and one later END line. */
export function isWellFormedOwned(text: string): boolean {
  const lines = text.split("\n");
  const starts = lines.filter((l) => l.includes(RENDER_MARK_START)).length;
  const ends = lines.filter((l) => l.includes(RENDER_MARK_END)).length;
  if (starts !== 1 || ends !== 1) return false;
  return lines.findIndex((l) => l.includes(RENDER_MARK_START)) < lines.findIndex((l) => l.includes(RENDER_MARK_END));
}

export function parseOwnedRevision(text: string): string | null {
  const match = /^revision: (\S+)$/m.exec(text);
  return match ? (match[1] as string) : null;
}

/**
 * Pure injection math on an unknown system array. Never mutates its input:
 * changed results are fresh arrays; unchanged results return the input.
 *
 * Deterministic conflict rule: zero owned blocks inject; one well-formed
 * owned block with different bytes is replaced (same safe rebuild+assign
 * mechanism as injection); anything else fails closed.
 */
export function applyInjection(system: unknown, block: string, _revision: string): InjectionResult {
  if (!Array.isArray(system)) {
    return { outcome: "UNSUPPORTED_SHAPE", code: "LANG_API_UNSUPPORTED", system: [], owned_index: -1, present_revision: null };
  }
  const texts = systemTexts(system);
  const owned = texts.filter((t) => t.text.includes(RENDER_MARK_START));
  if (owned.length === 0) {
    const next = [...system, { type: "text", text: block }];
    return { outcome: "INJECTED", code: "LANG_INJECTED", system: next, owned_index: next.length - 1, present_revision: null };
  }
  const exact = owned.find((t) => t.text === block);
  if (exact && owned.length === 1) {
    return { outcome: "ALREADY_PRESENT", code: "LANG_ALREADY_PRESENT", system, owned_index: exact.index, present_revision: parseOwnedRevision(exact.text) };
  }
  if (owned.length > 1) {
    const first = owned[0] as { index: number; text: string };
    return { outcome: "CONFLICT", code: "LANG_CONFLICTING_PROJECTION", system, owned_index: first.index, present_revision: parseOwnedRevision(first.text) };
  }
  const single = owned[0] as { index: number; text: string };
  if (!isWellFormedOwned(single.text)) {
    return { outcome: "MALFORMED", code: "LANG_CONFLICTING_PROJECTION", system, owned_index: single.index, present_revision: parseOwnedRevision(single.text) };
  }
  const presentRevision = parseOwnedRevision(single.text);
  const nextRevision = parseOwnedRevision(block);
  if (presentRevision !== null && presentRevision === nextRevision) {
    // Same revision must be byte-identical; anything else is tampering.
    return { outcome: "CONFLICT", code: "LANG_CONFLICTING_PROJECTION", system, owned_index: single.index, present_revision: presentRevision };
  }
  const next = system.map((entry, i) => (i === single.index ? { type: "text", text: block } : entry));
  return { outcome: "REPLACED", code: "LANG_REPLACED", system: next, owned_index: single.index, present_revision: presentRevision };
}

/**
 * Byte-exact extraction for reconciliation: concatenate is forbidden —
 * return the single owned block text, or null when it cannot be isolated.
 */
export function extractOwnedBlock(system: unknown): string | null {
  if (!Array.isArray(system)) return null;
  const owned = systemTexts(system).filter((t) => t.text.includes(RENDER_MARK_START));
  if (owned.length !== 1) return null;
  const single = owned[0] as { text: string };
  if (!isWellFormedOwned(single.text)) return null;
  return single.text;
}

export function sha256Of(text: string): string {
  return sha256HexUtf8(text);
}
