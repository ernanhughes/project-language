/** Public contracts for the deterministic opencode-language core. */

export const STATE_SCHEMA_V1 = "language.state/v1";
export const META_SCHEMA_V1 = "language.meta/v1";
export const RECEIPT_SCHEMA_V1 = "language.receipt/v1";
export const REVISION_SCHEMA_V1 = "language.revision/v1";
export const IDEM_SCHEMA_V1 = "language.idem/v1";
export const LOCK_SCHEMA_V1 = "language.lock/v1";
export const RENDER_SCHEMA_V1 = "language.render/v1";

export const ITEM_KINDS = ["objective", "decision", "constraint", "definition", "ambiguity"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const STANDINGS = ["explicit", "tentative", "disputed", "superseded"] as const;
export type Standing = (typeof STANDINGS)[number];

export const PRODUCER_TYPES = ["model", "human", "migration"] as const;
export type ProducerType = (typeof PRODUCER_TYPES)[number];

export interface ProjectIdentity {
  project_id: string;
  basename_safe: string;
  path_original: string;
  path_canonical: string;
  path_hash16: string;
}

export interface SourceRef {
  session_id: string;
  message_id: string;
  part_id?: string;
  sha256: string;
}

export interface LanguageItem {
  id: string;
  kind: ItemKind;
  text: string;
  actor: string;
  standing: Standing;
  scope: string;
  sources: SourceRef[];
  /** Present only when standing is superseded. */
  superseded_by?: string;
  /** Required when kind is ambiguity and standing is explicit (resolved). */
  resolved_by?: SourceRef;
}

export interface SupersessionEntry {
  item_id: string;
  superseded_by: string | null;
  revision: string;
  pruned: boolean;
}

export interface LanguageState {
  schema: typeof STATE_SCHEMA_V1;
  items: LanguageItem[];
  superseded: SupersessionEntry[];
}

export interface ProducerRecord {
  type: ProducerType;
  /** Identity/version of the producer, e.g. model route or human handle. */
  id?: string;
  version?: string;
}

export interface StateMeta {
  schema: typeof META_SCHEMA_V1;
  project_id: string;
  thread_id: string;
  path_original: string;
  path_canonical: string;
  revision: string;
  parent_revision: string;
  state_sha256: string;
  receipt_id: string;
  receipt_path: string;
  session_ids: string[];
  producer: ProducerRecord;
  created_at: string;
  updated_at: string;
  bounds_policy_version: string;
  /** Item ids whose current version was last written by a human edit. */
  human_items: string[];
}

export type RevisionOrigin = "init" | "mutation" | "human-edit" | "recovery";

export interface RevisionReceipt {
  schema: typeof RECEIPT_SCHEMA_V1;
  project_id: string;
  thread_id: string;
  revision: string;
  parent_revision: string;
  state_sha256: string;
  meta_sha256: string;
  idempotency_key: string;
  /** SHA-256 over the canonical request (ops, producer, parent, refs, now). */
  request_digest: string;
  producer: ProducerRecord;
  attempt_id: string;
  source_events: SourceRef[];
  operations: OperationSummary;
  origin: RevisionOrigin;
  created_at: string;
  git_commit: string;
}

export interface OperationSummary {
  added: string[];
  revised: string[];
  standing_changed: string[];
  superseded: string[];
  removed_from_active: string[];
  sessions_added: string[];
}

export type MutationOp =
  | { op: "add"; item: LanguageItem }
  | { op: "revise"; id: string; text?: string; actor?: string; scope?: string; kind?: ItemKind; acknowledge_human?: boolean }
  | { op: "set-standing"; id: string; standing: Standing; resolved_by?: SourceRef; acknowledge_human?: boolean }
  | { op: "supersede"; id: string; by: string | null; acknowledge_human?: boolean }
  | { op: "prune"; id: string; reason: string; acknowledge_human?: boolean }
  | { op: "record-session"; session_id: string };

export interface SourceEvent {
  refs: SourceRef[];
  note?: string;
}

export interface MutationRequest {
  project_path: string;
  thread_id: string;
  expected_parent: string;
  idempotency_key: string;
  producer: ProducerRecord;
  source_event: SourceEvent;
  operations: MutationOp[];
  /** ISO-8601 timestamp supplied by the caller (injectable clock). */
  now: string;
  attempt_id?: string;
}

export interface MutationResult {
  ok: true;
  project_id: string;
  thread_id: string;
  revision: string;
  parent_revision: string;
  git_commit: string;
  idempotent_replay: boolean;
  origin: RevisionOrigin;
}

export type VerifyStatus = "ok" | "human-edit-pending" | "torn" | "corrupt";

export interface VerificationResult {
  status: VerifyStatus;
  project_id: string;
  thread_id: string;
  /** Present only when status is ok. */
  revision?: string | undefined;
  /** Present only when a last valid committed revision could be identified. */
  last_valid_revision?: string | undefined;
  issues: string[];
}

export interface ThreadPaths {
  store_root: string;
  project_id: string;
  thread_id: string;
  project_dir: string;
  thread_dir: string;
  git_dir: string;
  state_path: string;
  meta_path: string;
  revisions_dir: string;
  locks_dir: string;
  tmp_dir: string;
}
