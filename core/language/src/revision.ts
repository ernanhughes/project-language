import { sha256HexOfCanonical } from "./canonical.ts";
import { REVISION_SCHEMA_V1, type ProducerRecord } from "./types.ts";

export interface RevisionInputs {
  project_id: string;
  thread_id: string;
  parent_revision: string;
  state_sha256: string;
  idempotency_key: string;
  producer: ProducerRecord;
  ops_digest: string;
  created_at: string;
}

/**
 * Deterministic revision IDs: `rev_` + 32 hex chars of SHA-256 over the
 * canonical revision inputs. Same inputs always yield the same id.
 */
export function deriveRevisionId(inputs: RevisionInputs): string {
  const digest = sha256HexOfCanonical({ schema: REVISION_SCHEMA_V1, ...inputs });
  return `rev_${digest.slice(0, 32)}`;
}
