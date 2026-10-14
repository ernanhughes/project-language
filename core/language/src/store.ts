import { execFile as execFileCb } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const runGit = promisify(execFileCb);
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { DEFAULT_BOUNDS_V1, type BoundsPolicy } from "./bounds.ts";
import { canonicalJsonBytes, sha256HexOfCanonical, sha256HexUtf8 } from "./canonical.ts";
import { LanguageError } from "./errors.ts";
import {
  canonicalizeState,
  diffStates,
  enforceBounds,
  parseState,
  serializeState,
  stateSha256,
  validateItemStructure,
  validateSourceRef,
} from "./format.ts";
import {
  assertNoRemote,
  commitOwnedPaths,
  commitsTouching,
  listCommits,
  showBlob,
} from "./git.ts";
import { deriveProjectIdentity, resolveThreadPaths, validateThreadId } from "./identity.ts";
import { initThreadRepo } from "./git.ts";
import { acquireThreadLock } from "./lock.ts";
import { deriveRevisionId } from "./revision.ts";
import {
  META_SCHEMA_V1,
  RECEIPT_SCHEMA_V1,
  type LanguageItem,
  type LanguageState,
  type MutationOp,
  type MutationRequest,
  type MutationResult,
  type OperationSummary,
  type ProducerRecord,
  type RevisionOrigin,
  type SourceEvent,
  type SourceRef,
  type StateMeta,
  type ThreadPaths,
  type VerificationResult,
} from "./types.ts";

export interface StoreOptions {
  storeRoot: string;
  bounds?: BoundsPolicy | undefined;
  lockTimeoutMs?: number | undefined;
}

function faultPoint(): string | null {
  const v = process.env["OPENCODE_LANGUAGE_FAULT"];
  return v === undefined || v === "" ? null : v;
}

/** Test-only crash-consistency hook. Never set outside fault-injection tests. */
function checkFault(point: string): void {
  if (faultPoint() === point) {
    throw new LanguageError("GIT_FAILURE", `injected fault at ${point}`);
  }
}

function writeFileAtomic(targetPath: string, content: string): void {
  const tmp = join(
    mkdtempSync(join(tmpdir(), "opencode-language-write-")),
    basename(targetPath),
  );
  // Same-directory replacement: move the temp file next to the target first,
  // so the final rename is atomic on both Windows and POSIX.
  const sibling = `${targetPath}.tmp-${process.pid}`;
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, sibling);
  renameSync(sibling, targetPath);
}

function parseMeta(text: string): StateMeta {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new LanguageError("TORN_STATE", "state.meta.json is not valid JSON");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new LanguageError("TORN_STATE", "state.meta.json must be an object");
  }
  const m = raw as Record<string, unknown>;
  if (m["schema"] !== META_SCHEMA_V1) {
    throw new LanguageError("TORN_STATE", `unsupported meta schema: ${String(m["schema"])}`);
  }
  const required = [
    "project_id", "thread_id", "path_original", "path_canonical", "revision",
    "parent_revision", "state_sha256", "receipt_id", "receipt_path",
    "session_ids", "producer", "created_at", "updated_at",
    "bounds_policy_version", "human_items",
  ];
  for (const key of required) {
    if (m[key] === undefined) throw new LanguageError("TORN_STATE", `metadata missing ${key}`);
  }
  return m as unknown as StateMeta;
}

function idemPointerPath(paths: ThreadPaths, key: string): string {
  return join(paths.revisions_dir, `idem-${sha256HexUtf8(key).slice(0, 32)}.json`);
}

function receiptPathFor(paths: ThreadPaths, revision: string): string {
  return join(paths.revisions_dir, `${revision}.json`);
}

export function resolveStorePaths(storeRoot: string, projectPath: string, threadId: string): ThreadPaths {
  const identity = deriveProjectIdentity(projectPath);
  return resolveThreadPaths(storeRoot, identity.project_id, validateThreadId(threadId));
}

export interface InitOptions {
  projectPath: string;
  threadId: string;
  idempotencyKey: string;
  producer: ProducerRecord;
  now: string;
  sessionId?: string | undefined;
}

function validateProducer(producer: unknown): ProducerRecord {
  if (typeof producer !== "object" || producer === null) {
    throw new LanguageError("INVALID_INPUT", "producer must be an object");
  }
  const p = producer as Record<string, unknown>;
  if (p["type"] !== "model" && p["type"] !== "human" && p["type"] !== "migration") {
    throw new LanguageError("INVALID_INPUT", "producer.type must be model, human, or migration");
  }
  const out: ProducerRecord = { type: p["type"] };
  if (p["id"] !== undefined) {
    if (typeof p["id"] !== "string") throw new LanguageError("INVALID_INPUT", "producer.id must be a string");
    out.id = p["id"];
  }
  if (p["version"] !== undefined) {
    if (typeof p["version"] !== "string") throw new LanguageError("INVALID_INPUT", "producer.version must be a string");
    out.version = p["version"];
  }
  return out;
}

function validateNow(now: unknown): string {
  if (typeof now !== "string" || Number.isNaN(Date.parse(now))) {
    throw new LanguageError("INVALID_INPUT", "now must be an ISO-8601 timestamp");
  }
  return now;
}

function opsDigest(operations: MutationOp[]): string {
  return sha256HexOfCanonical(operations);
}

/** Apply deterministic operations to a validated state; returns the candidate. */
export function applyOperations(
  previous: LanguageState,
  operations: MutationOp[],
  producer: ProducerRecord,
  humanItems: string[],
  bounds: BoundsPolicy,
): { next: LanguageState; summary: OperationSummary; sessionsAdded: string[]; humanItems: string[] } {
  const items = new Map(previous.items.map((i) => [i.id, { ...i, sources: [...i.sources] }]));
  const index = new Map(previous.superseded.map((e) => [e.item_id, { ...e }]));
  const summary: OperationSummary = {
    added: [], revised: [], standing_changed: [], superseded: [], removed_from_active: [], sessions_added: [],
  };
  const nextHuman = new Set(humanItems);
  const sessionsAdded: string[] = [];

  const guardHuman = (id: string, op: MutationOp): void => {
    if (producer.type === "human") return;
    if (!nextHuman.has(id)) return;
    const acknowledged = (op as { acknowledge_human?: boolean }).acknowledge_human === true;
    if (!acknowledged) {
      throw new LanguageError("HUMAN_GUARD", `automated producer must not silently rewrite human-touched item ${id}`, {
        item_id: id,
      });
    }
  };

  for (const op of operations) {
    switch (op.op) {
      case "add": {
        const item = validateItemStructure(op.item);
        if (items.has(item.id)) {
          throw new LanguageError("INVALID_INPUT", `duplicate item id: ${item.id}`);
        }
        if (producer.type !== "human" && item.actor.toLowerCase() === "human") {
          throw new LanguageError("INVALID_INPUT", "automated producers cannot author items as human");
        }
        items.set(item.id, item);
        summary.added.push(item.id);
        break;
      }
      case "revise": {
        const current = items.get(op.id);
        if (!current) throw new LanguageError("INVALID_INPUT", `unknown item: ${op.id}`);
        guardHuman(op.id, op);
        const updated: LanguageItem = { ...current, sources: [...current.sources] };
        if (op.text !== undefined) updated.text = op.text;
        if (op.actor !== undefined) {
          if (producer.type !== "human" && op.actor.toLowerCase() === "human") {
            throw new LanguageError("INVALID_INPUT", "automated producers cannot author items as human");
          }
          updated.actor = op.actor;
        }
        if (op.scope !== undefined) updated.scope = op.scope;
        if (op.kind !== undefined) updated.kind = op.kind;
        validateItemStructure(updated);
        items.set(op.id, updated);
        summary.revised.push(op.id);
        if (producer.type === "human") nextHuman.add(op.id);
        break;
      }
      case "set-standing": {
        const current = items.get(op.id);
        if (!current) throw new LanguageError("INVALID_INPUT", `unknown item: ${op.id}`);
        guardHuman(op.id, op);
        const updated: LanguageItem = { ...current, sources: [...current.sources] };
        updated.standing = op.standing;
        if (op.resolved_by !== undefined) updated.resolved_by = validateSourceRef(op.resolved_by, `${op.id}.resolved_by`);
        else delete updated.resolved_by;
        if (op.standing !== "superseded") delete updated.superseded_by;
        validateItemStructure(updated);
        items.set(op.id, updated);
        summary.standing_changed.push(op.id);
        if (producer.type === "human") nextHuman.add(op.id);
        break;
      }
      case "supersede": {
        const current = items.get(op.id);
        if (!current) throw new LanguageError("INVALID_INPUT", `unknown item: ${op.id}`);
        guardHuman(op.id, op);
        if (op.by !== null && !items.has(op.by)) {
          throw new LanguageError("INVALID_INPUT", `supersede replacement unknown: ${op.by}`);
        }
        if (op.by === op.id) throw new LanguageError("INVALID_INPUT", "an item cannot supersede itself");
        const updated: LanguageItem = { ...current, sources: [...current.sources], standing: "superseded" };
        if (op.by === null) delete updated.superseded_by;
        else updated.superseded_by = op.by;
        if (op.by === null) {
          // Caller must still name a link; null link requires the item to carry one already.
          if (current.superseded_by === undefined) {
            throw new LanguageError("INVALID_INPUT", `supersede of ${op.id} names no replacement`);
          }
          updated.superseded_by = current.superseded_by;
        }
        delete updated.resolved_by;
        validateItemStructure(updated);
        items.set(op.id, updated);
        summary.superseded.push(op.id);
        summary.standing_changed.push(op.id);
        if (producer.type === "human") nextHuman.add(op.id);
        break;
      }
      case "prune": {
        const current = items.get(op.id);
        if (!current) throw new LanguageError("INVALID_INPUT", `unknown item: ${op.id}`);
        if (current.standing !== "superseded") {
          throw new LanguageError("INVALID_INPUT", `only superseded items may be pruned (${op.id})`);
        }
        if (typeof op.reason !== "string" || op.reason === "") {
          throw new LanguageError("INVALID_INPUT", `prune of ${op.id} requires a reason`);
        }
        guardHuman(op.id, op);
        items.delete(op.id);
        index.set(op.id, {
          item_id: op.id,
          superseded_by: current.superseded_by ?? null,
          revision: "",
          pruned: true,
        });
        summary.removed_from_active.push(op.id);
        nextHuman.delete(op.id);
        break;
      }
      case "record-session": {
        if (typeof op.session_id !== "string" || op.session_id === "") {
          throw new LanguageError("INVALID_INPUT", "session_id must be non-empty");
        }
        sessionsAdded.push(op.session_id);
        summary.sessions_added.push(op.session_id);
        break;
      }
    }
  }
  const next: LanguageState = {
    schema: previous.schema,
    items: [...items.values()],
    superseded: [...index.values()].map((e) => ({ ...e })),
  };
  enforceBounds(canonicalizeState(next), bounds);
  return { next: canonicalizeState(next), summary, sessionsAdded, humanItems: [...nextHuman] };
}

interface CommittedTriple {
  stateText: string;
  state: LanguageState;
  meta: StateMeta;
}

/** Read working-tree files and verify mutual consistency (no Git). */
function readWorkingTriple(paths: ThreadPaths): CommittedTriple {
  if (!existsSync(paths.state_path) || !existsSync(paths.meta_path)) {
    throw new LanguageError("TORN_STATE", "state.md or state.meta.json missing from working tree");
  }
  const stateText = readFileSync(paths.state_path, "utf8");
  const metaText = readFileSync(paths.meta_path, "utf8");
  let state: LanguageState;
  try {
    state = parseState(stateText);
  } catch (err) {
    throw new LanguageError("TORN_STATE", `working state.md does not parse: ${(err as Error).message}`);
  }
  const meta = parseMeta(metaText);
  return { stateText, state, meta };
}

function checkTripleAgreement(paths: ThreadPaths, triple: CommittedTriple, stateText: string): string[] {
  const issues: string[] = [];
  const { state, meta } = triple;
  if (meta.project_id !== paths.project_id) issues.push("project_id mismatch");
  if (meta.thread_id !== paths.thread_id) issues.push("thread_id mismatch");
  const canonicalText = serializeState(state);
  if (stateSha256(canonicalText) !== meta.state_sha256) issues.push("state hash mismatch");
  if (stateText.replace(/\r\n/g, "\n") !== canonicalText) issues.push("state.md is not canonical");
  const receiptPath = join(paths.revisions_dir, `${meta.receipt_id}.json`);
  if (!existsSync(receiptPath)) {
    issues.push("named receipt missing");
  } else {
    try {
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8") as string) as Record<string, unknown>;
      if (receipt["revision"] !== meta.revision) issues.push("receipt revision mismatch");
      if (receipt["state_sha256"] !== meta.state_sha256) issues.push("receipt state hash mismatch");
      if (receipt["schema"] !== RECEIPT_SCHEMA_V1) issues.push("receipt schema mismatch");
    } catch {
      issues.push("named receipt unreadable");
    }
  }
  return issues;
}

/** Full reader verification, including Git history presence. */
export async function verifyThread(storeRoot: string, projectPath: string, threadId: string): Promise<VerificationResult> {
  const paths = resolveStorePaths(storeRoot, projectPath, threadId);
  if (!existsSync(paths.thread_dir)) {
    throw new LanguageError("THREAD_NOT_FOUND", `no such thread: ${threadId}`);
  }
  const triple = readWorkingTriple(paths);
  const { meta } = triple;
  const agreement = checkTripleAgreement(paths, triple, triple.stateText);
  const receiptRel = `revisions/${meta.receipt_id}.json`;
  const history = await commitsTouching(paths.thread_dir, receiptRel);
  if (history.length === 0) {
    return {
      status: "corrupt",
      project_id: paths.project_id,
      thread_id: paths.thread_id,
      issues: [...agreement, "receipt not present in Git history"],
    };
  }
  // System-written files (metadata, receipt) must match the committed bytes
  // exactly; only state.md may legitimately differ as a human-edit candidate.
  const head = history[0] as string;
  const committedMeta = await showBlob(paths.thread_dir, head, "state.meta.json");
  const committedReceipt = await showBlob(paths.thread_dir, head, receiptRel);
  const workingMeta = readFileSync(paths.meta_path, "utf8");
  const workingReceipt = existsSync(join(paths.revisions_dir, `${meta.receipt_id}.json`))
    ? readFileSync(join(paths.revisions_dir, `${meta.receipt_id}.json`), "utf8")
    : null;
  if (committedMeta !== workingMeta || committedReceipt !== workingReceipt) {
    const last = await findLastValidRevision(paths);
    return {
      status: "corrupt",
      project_id: paths.project_id,
      thread_id: paths.thread_id,
      last_valid_revision: last?.revision,
      issues: [...agreement, "metadata or receipt differs from committed bytes"],
    };
  }
  if (agreement.length === 0) {
    return {
      status: "ok",
      project_id: paths.project_id,
      thread_id: paths.thread_id,
      revision: meta.revision,
      last_valid_revision: meta.revision,
      issues: [],
    };
  }
  // state.md changed while meta+receipt still agree with each other:
  // an unaccepted human-edit candidate, not corruption.
  const metaReceiptAgree = agreement.every((i) => i === "state hash mismatch" || i === "state.md is not canonical");
  if (metaReceiptAgree) {
    return {
      status: "human-edit-pending",
      project_id: paths.project_id,
      thread_id: paths.thread_id,
      last_valid_revision: meta.revision,
      issues: agreement,
    };
  }
  const last = await findLastValidRevision(paths);
  return {
    status: "torn",
    project_id: paths.project_id,
    thread_id: paths.thread_id,
    last_valid_revision: last?.revision,
    issues: agreement,
  };
}

/** Walk Git history newest-first; return the first fully valid revision. */
export async function findLastValidRevision(
  paths: ThreadPaths,
): Promise<{ revision: string; commit: string; meta: StateMeta; stateText: string } | null> {
  const commits = await listCommits(paths.thread_dir, 500);
  for (const commit of commits) {
    const metaText = await showBlob(paths.thread_dir, commit, "state.meta.json");
    const stateText = await showBlob(paths.thread_dir, commit, "state.md");
    if (metaText === null || stateText === null) continue;
    let meta: StateMeta;
    let state: LanguageState;
    try {
      meta = parseMeta(metaText);
      state = parseState(stateText);
    } catch {
      continue;
    }
    if (serializeState(state) === stateText.replace(/\r\n/g, "\n") && stateSha256(serializeState(state)) === meta.state_sha256) {
      const receiptText = await showBlob(paths.thread_dir, commit, `revisions/${meta.receipt_id}.json`);
      if (receiptText === null) continue;
      try {
        const receipt = JSON.parse(receiptText) as Record<string, unknown>;
        if (receipt["revision"] !== meta.revision || receipt["state_sha256"] !== meta.state_sha256) continue;
      } catch {
        continue;
      }
      if (meta.project_id === paths.project_id && meta.thread_id === paths.thread_id) {
        return { revision: meta.revision, commit, meta, stateText };
      }
    }
  }
  return null;
}

function ensureThreadDirs(paths: ThreadPaths): void {
  mkdirSync(paths.revisions_dir, { recursive: true });
  mkdirSync(paths.locks_dir, { recursive: true });
  mkdirSync(paths.tmp_dir, { recursive: true });
}

interface RevisionInputs {
  revision: string;
  stateText: string;
  metaText: string;
  receiptText: string;
  meta: StateMeta;
}

/**
 * Derive the revision id from canonical inputs, then stamp prune entries
 * created by this revision with that id and finalize texts. The revision id
 * is derived from the unstamped candidate; meta/receipt record the final
 * stamped bytes. The whole mapping is deterministic: identical inputs always
 * yield the identical revision id and identical final bytes.
 */
function buildRevision(
  paths: ThreadPaths,
  identity: { project_id: string; path_original: string; path_canonical: string },
  parentRevision: string,
  candidate: LanguageState,
  summary: OperationSummary,
  sessions: string[],
  humanItems: string[],
  request: { idempotency_key: string; producer: ProducerRecord; source_event: { refs: SourceRef[] }; now: string; attempt_id: string; ops_digest: string },
  origin: RevisionOrigin,
  bounds: BoundsPolicy,
): RevisionInputs {
  const unstampedText = serializeState(candidate);
  const revision = deriveRevisionId({
    project_id: paths.project_id,
    thread_id: paths.thread_id,
    parent_revision: parentRevision,
    state_sha256: stateSha256(unstampedText),
    idempotency_key: request.idempotency_key,
    producer: request.producer,
    ops_digest: request.ops_digest,
    created_at: request.now,
  });
  const stamped: LanguageState = {
    schema: candidate.schema,
    items: candidate.items,
    superseded: candidate.superseded.map((e) => (e.revision === "" ? { ...e, revision } : e)),
  };
  const stateText = serializeState(stamped);
  const stateHash = stateSha256(stateText);
  const meta: StateMeta = {
    schema: META_SCHEMA_V1,
    project_id: paths.project_id,
    thread_id: paths.thread_id,
    path_original: identity.path_original,
    path_canonical: identity.path_canonical,
    revision,
    parent_revision: parentRevision,
    state_sha256: stateHash,
    receipt_id: revision,
    receipt_path: `revisions/${revision}.json`,
    session_ids: sessions,
    producer: request.producer,
    created_at: request.now,
    updated_at: request.now,
    bounds_policy_version: bounds.policy_version,
    human_items: [...humanItems].sort(),
  };
  const metaText = canonicalJsonBytes(meta);
  const requestDigest = sha256HexOfCanonical({
    operations_digest: request.ops_digest,
    producer: request.producer,
    parent_revision: parentRevision,
    source_refs: request.source_event.refs,
    now: request.now,
  });
  const receipt = {
    schema: RECEIPT_SCHEMA_V1,
    project_id: paths.project_id,
    thread_id: paths.thread_id,
    revision,
    parent_revision: parentRevision,
    state_sha256: stateHash,
    meta_sha256: sha256HexUtf8(metaText),
    idempotency_key: request.idempotency_key,
    request_digest: requestDigest,
    producer: request.producer,
    attempt_id: request.attempt_id,
    source_events: request.source_event.refs,
    operations: summary,
    origin,
    created_at: request.now,
    git_commit: "",
  };
  return { revision, stateText, metaText, receiptText: canonicalJsonBytes(receipt), meta };
}

function readIdemPointer(paths: ThreadPaths, key: string): { revision: string; commit: string } | null {
  const p = idemPointerPath(paths, key);
  if (!existsSync(p)) return null;
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
    if (raw["schema"] !== "language.idem/v1") return null;
    if (typeof raw["revision"] !== "string" || typeof raw["commit"] !== "string") return null;
    return { revision: raw["revision"], commit: raw["commit"] };
  } catch {
    return null;
  }
}

async function materializeRevision(
  paths: ThreadPaths,
  write: RevisionInputs,
  idempotencyKey: string,
): Promise<string> {
  const receiptPath = receiptPathFor(paths, write.revision);
  if (existsSync(receiptPath)) {
    const existing = readFileSync(receiptPath, "utf8");
    // Receipt bytes contain the commit hash, so compare the payload shape
    // without git_commit: same revision inputs must reproduce the same body.
    const existingBody = (JSON.parse(existing) as Record<string, unknown>);
    const pendingBody = (JSON.parse(write.receiptText) as Record<string, unknown>);
    existingBody["git_commit"] = "";
    pendingBody["git_commit"] = "";
    if (sha256HexOfCanonical(existingBody) !== sha256HexOfCanonical(pendingBody)) {
      throw new LanguageError("CORRUPT_HISTORY", `receipt path collision with different bytes: ${write.revision}`);
    }
    const pointer = readIdemPointer(paths, idempotencyKey);
    if (pointer !== null) return pointer.commit;
    throw new LanguageError("CORRUPT_HISTORY", `receipt already exists: ${write.revision}`);
  }
  writeFileAtomic(paths.state_path, write.stateText);
  checkFault("after-state");
  writeFileAtomic(paths.meta_path, write.metaText);
  checkFault("after-meta");
  writeFileAtomic(receiptPath, write.receiptText);
  checkFault("after-receipt");
  const idemText = canonicalJsonBytes({ schema: "language.idem/v1", key: idempotencyKey, revision: write.revision, commit: "" });
  writeFileAtomic(idemPointerPath(paths, idempotencyKey), idemText);
  checkFault("after-stage");
  const relPaths = ["state.md", "state.meta.json", `revisions/${write.revision}.json`, relative(paths.thread_dir, idemPointerPath(paths, idempotencyKey))];
  const message = `language(${write.revision}): ${paths.thread_id}`;
  const { hash } = await commitOwnedPaths(paths.thread_dir, relPaths, message);
  // The committed receipt bytes intentionally do not contain their own commit
  // hash (it cannot exist before the commit). The hash is returned to the
  // caller and recorded in the idempotency pointer only.
  const idemFinal = canonicalJsonBytes({ schema: "language.idem/v1", key: idempotencyKey, revision: write.revision, commit: hash });
  writeFileAtomic(idemPointerPath(paths, idempotencyKey), idemFinal);
  return hash;
}

export async function initThread(options: StoreOptions & InitOptions): Promise<MutationResult> {
  const { storeRoot, projectPath, threadId, idempotencyKey, producer, now } = options;
  const bounds = options.bounds ?? DEFAULT_BOUNDS_V1;
  const validProducer = validateProducer(producer);
  const validNow = validateNow(now);
  if (typeof idempotencyKey !== "string" || idempotencyKey === "") {
    throw new LanguageError("INVALID_INPUT", "idempotency_key is required");
  }
  const identity = deriveProjectIdentity(projectPath);
  const paths = resolveThreadPaths(storeRoot, identity.project_id, validateThreadId(threadId));
  ensureThreadDirs(paths);
  const alreadyGit = existsSync(join(paths.thread_dir, ".git"));
  if (!alreadyGit) {
    await initThreadRepo(paths.thread_dir);
  } else {
    // Repeating identical initialization is idempotent via the pointer file.
    const pointer = readIdemPointer(paths, idempotencyKey);
    if (pointer !== null) {
      const receiptText = readFileSync(receiptPathFor(paths, pointer.revision), "utf8");
      const receipt = JSON.parse(receiptText) as { origin?: string };
      if (receipt["origin"] === "init") {
        return {
          ok: true, project_id: paths.project_id, thread_id: paths.thread_id,
          revision: pointer.revision, parent_revision: "rev_genesis",
          git_commit: pointer.commit, idempotent_replay: true, origin: "init",
        };
      }
    }
    if (existsSync(paths.meta_path)) {
      throw new LanguageError("INVALID_INPUT", "thread already initialized with different inputs");
    }
  }
  await assertNoRemote(paths.thread_dir);
  const lock = await acquireThreadLock(paths.locks_dir, { timeoutMs: options.lockTimeoutMs, purpose: "init" });
  try {
    const replay = readIdemPointer(paths, idempotencyKey);
    if (replay !== null) {
      return {
        ok: true, project_id: paths.project_id, thread_id: paths.thread_id,
        revision: replay.revision, parent_revision: "rev_genesis",
        git_commit: replay.commit, idempotent_replay: true, origin: "init",
      };
    }
    if (existsSync(paths.meta_path) || existsSync(paths.state_path)) {
      throw new LanguageError("INVALID_INPUT", "thread already initialized with different inputs");
    }
    const empty: LanguageState = { schema: "language.state/v1", items: [], superseded: [] };
    const sessions = options.sessionId ? [options.sessionId] : [];
    const summary: OperationSummary = {
      added: [], revised: [], standing_changed: [], superseded: [], removed_from_active: [], sessions_added: [...sessions],
    };
    const write = buildRevision(
      paths,
      { project_id: identity.project_id, path_original: identity.path_original, path_canonical: identity.path_canonical },
      "rev_genesis",
      empty,
      summary,
      sessions,
      [],
      { idempotency_key: idempotencyKey, producer: validProducer, source_event: { refs: [] }, now: validNow, attempt_id: idempotencyKey, ops_digest: opsDigest([]) },
      "init",
      bounds,
    );
    enforceBounds(empty, bounds);
    const commit = await materializeRevision(paths, write, idempotencyKey);
    return {
      ok: true, project_id: paths.project_id, thread_id: paths.thread_id,
      revision: write.revision, parent_revision: "rev_genesis",
      git_commit: commit, idempotent_replay: false, origin: "init",
    };
  } finally {
    lock.release();
  }
}

function validateMutationShape(request: MutationRequest): void {
  if (typeof request.expected_parent !== "string" || request.expected_parent === "") {
    throw new LanguageError("INVALID_INPUT", "expected_parent revision is required");
  }
  if (typeof request.idempotency_key !== "string" || request.idempotency_key === "") {
    throw new LanguageError("INVALID_INPUT", "idempotency_key is required");
  }
  if (!Array.isArray(request.operations) || request.operations.length === 0) {
    throw new LanguageError("INVALID_INPUT", "at least one operation is required");
  }
  if (typeof request.source_event !== "object" || request.source_event === null) {
    throw new LanguageError("INVALID_INPUT", "source_event is required");
  }
  if (!Array.isArray(request.source_event.refs) || request.source_event.refs.length === 0) {
    throw new LanguageError("INVALID_INPUT", "source_event.refs must be non-empty");
  }
  for (const [i, ref] of request.source_event.refs.entries()) validateSourceRef(ref, `source_event[${i}]`);
}

export async function applyMutation(store: StoreOptions, request: MutationRequest): Promise<MutationResult> {
  const bounds = store.bounds ?? DEFAULT_BOUNDS_V1;
  const producer = validateProducer(request.producer);
  const now = validateNow(request.now);
  const attemptId = typeof request.attempt_id === "string" && request.attempt_id !== "" ? request.attempt_id : request.idempotency_key;
  validateMutationShape(request);
  const identity = deriveProjectIdentity(request.project_path);
  const paths = resolveThreadPaths(store.storeRoot, identity.project_id, validateThreadId(request.thread_id));
  if (!existsSync(join(paths.thread_dir, ".git"))) {
    throw new LanguageError("THREAD_NOT_FOUND", `no such thread: ${request.thread_id}`);
  }
  await assertNoRemote(paths.thread_dir);
  const lock = await acquireThreadLock(paths.locks_dir, { timeoutMs: store.lockTimeoutMs, purpose: "apply" });
  try {
    // Re-read and revalidate after acquiring the lock.
    const triple = readWorkingTriple(paths);
    const agreement = checkTripleAgreement(paths, triple, triple.stateText);
    if (agreement.length !== 0) {
      throw new LanguageError("TORN_STATE", `refusing mutation on unverified state: ${agreement.join("; ")}`);
    }
    // Idempotency is checked before CAS: a replay carries the original
    // expected parent by definition and must not fail as a conflict.
    const pointer = readIdemPointer(paths, request.idempotency_key);
    const requestDigest = sha256HexOfCanonical({
      operations_digest: opsDigest(request.operations),
      producer,
      parent_revision: request.expected_parent,
      source_refs: request.source_event.refs,
      now,
    });
    if (pointer !== null) {
      const receiptText = readFileSync(receiptPathFor(paths, pointer.revision), "utf8");
      const receipt = JSON.parse(receiptText) as Record<string, unknown>;
      if (receipt["request_digest"] === requestDigest) {
        return {
          ok: true, project_id: paths.project_id, thread_id: paths.thread_id,
          revision: pointer.revision, parent_revision: request.expected_parent,
          git_commit: pointer.commit, idempotent_replay: true, origin: (receipt["origin"] as RevisionOrigin) ?? "mutation",
        };
      }
      throw new LanguageError("IDEMPOTENCY_CONFLICT", "idempotency key reused with different input");
    }
    if (triple.meta.revision !== request.expected_parent) {
      throw new LanguageError("CAS_CONFLICT", `expected ${request.expected_parent}, current is ${triple.meta.revision}`, {
        expected: request.expected_parent,
        current: triple.meta.revision,
      });
    }
    const applied = applyOperations(triple.state, request.operations, producer, triple.meta.human_items, bounds);
    const sessions = [...new Set([...triple.meta.session_ids, ...applied.sessionsAdded])].sort();
    applied.summary.sessions_added = [...applied.sessionsAdded].sort();
    if (producer.type === "human") {
      for (const id of [...applied.summary.added, ...applied.summary.revised, ...applied.summary.standing_changed]) {
        if (!applied.humanItems.includes(id)) applied.humanItems.push(id);
      }
      applied.humanItems.sort();
    }
    // Stamp prune index entries with the new revision after derivation.
    const write = buildRevision(
      paths,
      { project_id: identity.project_id, path_original: identity.path_original, path_canonical: identity.path_canonical },
      triple.meta.revision,
      applied.next,
      applied.summary,
      sessions,
      applied.humanItems,
      {
        idempotency_key: request.idempotency_key, producer,
        source_event: { refs: request.source_event.refs }, now, attempt_id: attemptId,
        ops_digest: opsDigest(request.operations),
      },
      producer.type === "human" ? "human-edit" : "mutation",
      bounds,
    );
    const commit = await materializeRevision(paths, write, request.idempotency_key);
    return {
      ok: true, project_id: paths.project_id, thread_id: paths.thread_id,
      revision: write.revision, parent_revision: triple.meta.revision,
      git_commit: commit, idempotent_replay: false,
      origin: producer.type === "human" ? "human-edit" : "mutation",
    };
  } finally {
    lock.release();
  }
}

export interface HumanEditRequest {
  projectPath: string;
  threadId: string;
  expectedParent: string;
  idempotencyKey: string;
  sourceEvent: SourceEvent;
  /** Human reason, required when items leave the active projection. */
  reason?: string | undefined;
  now: string;
  attemptId?: string | undefined;
}

/**
 * Accept a direct human edit of state.md as a new attributed revision.
 * The edited file is parsed, validated, canonicalized, and committed.
 */
export async function acceptHumanEdit(store: StoreOptions, request: HumanEditRequest): Promise<MutationResult> {
  const bounds = store.bounds ?? DEFAULT_BOUNDS_V1;
  const now = validateNow(request.now);
  const attemptId = request.attemptId ?? request.idempotencyKey;
  if (typeof request.idempotencyKey !== "string" || request.idempotencyKey === "") {
    throw new LanguageError("INVALID_INPUT", "idempotency_key is required");
  }
  if (!request.sourceEvent || !Array.isArray(request.sourceEvent.refs) || request.sourceEvent.refs.length === 0) {
    throw new LanguageError("INVALID_INPUT", "an attributable human source event is required");
  }
  for (const [i, ref] of request.sourceEvent.refs.entries()) validateSourceRef(ref, `source_event[${i}]`);
  const identity = deriveProjectIdentity(request.projectPath);
  const paths = resolveThreadPaths(store.storeRoot, identity.project_id, validateThreadId(request.threadId));
  if (!existsSync(join(paths.thread_dir, ".git"))) {
    throw new LanguageError("THREAD_NOT_FOUND", `no such thread: ${request.threadId}`);
  }
  await assertNoRemote(paths.thread_dir);
  const lock = await acquireThreadLock(paths.locks_dir, { timeoutMs: store.lockTimeoutMs, purpose: "accept-human-edit" });
  try {
    const pointer = readIdemPointer(paths, request.idempotencyKey);
    if (pointer !== null) {
      return {
        ok: true, project_id: paths.project_id, thread_id: paths.thread_id,
        revision: pointer.revision, parent_revision: request.expectedParent,
        git_commit: pointer.commit, idempotent_replay: true, origin: "human-edit",
      };
    }
    // Last accepted state comes from Git history, never from the dirty file alone.
    const last = await findLastValidRevision(paths);
    if (last === null) throw new LanguageError("CORRUPT_HISTORY", "no valid committed revision found");
    if (last.revision !== request.expectedParent) {
      throw new LanguageError("CAS_CONFLICT", `expected ${request.expectedParent}, current is ${last.revision}`);
    }
    const editedText = readFileSync(paths.state_path, "utf8");
    let candidate: LanguageState;
    try {
      candidate = parseState(editedText);
    } catch (err) {
      throw new LanguageError("INVALID_INPUT", `human edit does not parse: ${(err as Error).message}`);
    }
    enforceBounds(canonicalizeState(candidate), bounds);
    const previous = parseState(last.stateText);
    const summary = diffStates(previous, canonicalizeState(candidate));
    if (summary.removed_from_active.length > 0 || summary.superseded.length > 0) {
      if (typeof request.reason !== "string" || request.reason === "") {
        throw new LanguageError("INVALID_INPUT", "human removals or supersessions require a reason");
      }
    }
    if (
      summary.added.length === 0 && summary.revised.length === 0 &&
      summary.standing_changed.length === 0 && summary.removed_from_active.length === 0
    ) {
      throw new LanguageError("INVALID_INPUT", "human edit is a no-op against the last accepted state");
    }
    const sessions = [...last.meta.session_ids];
    const touched = new Set(last.meta.human_items);
    for (const id of [...summary.added, ...summary.revised, ...summary.standing_changed]) touched.add(id);
    for (const id of summary.removed_from_active) touched.delete(id);
    const producer: ProducerRecord = { type: "human" };
    const write = buildRevision(
      paths,
      { project_id: identity.project_id, path_original: identity.path_original, path_canonical: identity.path_canonical },
      last.revision,
      canonicalizeState(candidate),
      summary,
      sessions,
      [...touched].sort(),
      { idempotency_key: request.idempotencyKey, producer, source_event: request.sourceEvent, now, attempt_id: attemptId, ops_digest: sha256HexOfCanonical(summary) },
      "human-edit",
      bounds,
    );
    const commit = await materializeRevision(paths, write, request.idempotencyKey);
    return {
      ok: true, project_id: paths.project_id, thread_id: paths.thread_id,
      revision: write.revision, parent_revision: last.revision,
      git_commit: commit, idempotent_replay: false, origin: "human-edit",
    };
  } finally {
    lock.release();
  }
}

export interface HistoryEntry {
  revision: string;
  parent_revision: string;
  origin: RevisionOrigin;
  created_at: string;
  git_commit: string;
}

export async function listHistory(storeRoot: string, projectPath: string, threadId: string, limit = 100): Promise<HistoryEntry[]> {
  const paths = resolveStorePaths(storeRoot, projectPath, threadId);
  if (!existsSync(join(paths.thread_dir, ".git"))) {
    throw new LanguageError("THREAD_NOT_FOUND", `no such thread: ${threadId}`);
  }
  const commits = await listCommits(paths.thread_dir, limit);
  const entries: HistoryEntry[] = [];
  for (const commit of commits) {
    const metaText = await showBlob(paths.thread_dir, commit, "state.meta.json");
    if (metaText === null) continue;
    try {
      const meta = parseMeta(metaText);
      let origin: RevisionOrigin = "mutation";
      const receiptText = await showBlob(paths.thread_dir, commit, `revisions/${meta.revision}.json`);
      if (receiptText !== null) {
        try {
          const receipt = JSON.parse(receiptText) as { origin?: RevisionOrigin };
          if (receipt.origin === "init" || receipt.origin === "mutation" || receipt.origin === "human-edit" || receipt.origin === "recovery") {
            origin = receipt.origin;
          }
        } catch {
          // Keep the default origin.
        }
      }
      entries.push({
        revision: meta.revision,
        parent_revision: meta.parent_revision,
        origin,
        created_at: meta.updated_at,
        git_commit: commit,
      });
    } catch {
      continue;
    }
  }
  return entries;
}

/**
 * Explicit recovery: restore the managed thread repository to the last fully
 * valid committed revision. Requires explicit discard confirmation and never
 * touches the user's project repository.
 */
export async function recoverThread(
  storeRoot: string,
  projectPath: string,
  threadId: string,
  discardUnaccepted: boolean,
): Promise<{ revision: string; commit: string }> {
  if (!discardUnaccepted) {
    throw new LanguageError("INVALID_INPUT", "recovery requires explicit discard confirmation");
  }
  const paths = resolveStorePaths(storeRoot, projectPath, threadId);
  if (!existsSync(join(paths.thread_dir, ".git"))) {
    throw new LanguageError("THREAD_NOT_FOUND", `no such thread: ${threadId}`);
  }
  const last = await findLastValidRevision(paths);
  if (last === null) throw new LanguageError("CORRUPT_HISTORY", "no valid committed revision to recover");
  try {
    await runGit("git", ["reset", "--hard", last.commit], { cwd: paths.thread_dir });
  } catch (err) {
    throw new LanguageError("GIT_FAILURE", `recovery reset failed: ${String(err).slice(0, 500)}`);
  }
  return { revision: last.revision, commit: last.commit };
}

export type { BoundsPolicy };
export { DEFAULT_BOUNDS_V1 as DEFAULT_BOUNDS };
