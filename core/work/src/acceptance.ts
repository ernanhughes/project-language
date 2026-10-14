import { canonicalize, sha256Hex } from "./canonical.ts";
import { ACCEPTANCE_SCHEMA, PLUGIN_ID, PLUGIN_VERSION } from "./version.ts";

export type AcceptanceOutcome = "ACCEPTED" | "REJECTED";

export type AcceptanceCheckResult = {
  name: string;
  command: string;
  exit_code: number;
};

export type AcceptanceRecord = {
  schema: typeof ACCEPTANCE_SCHEMA;
  acceptance_id: string;
  work_id: string;
  work_version: number;
  run_id: string;
  proof_id: string | null;
  outcome: AcceptanceOutcome;
  reason: string;
  checks: AcceptanceCheckResult[];
  recorded_at: string;
  recorder: {
    plugin: typeof PLUGIN_ID;
    version: string;
  };
  content_hash: string;
};

export const ACCEPTANCE_ID_PATTERN = /^ac_[0-9a-f]{32}$/;
const CONTENT_HASH_PATTERN = /^[0-9a-f]{64}$/;

export function deriveAcceptanceId(input: {
  work_id: string;
  work_version: number;
  run_id: string;
  proof_id: string | null;
  outcome: AcceptanceOutcome;
  checks: AcceptanceCheckResult[];
}): string {
  return `ac_${sha256Hex(canonicalize(input)).slice(0, 32)}`;
}

function bodyHash(record: Record<string, unknown>): string {
  const { content_hash: _omitted, ...body } = record;
  return sha256Hex(canonicalize(body));
}

export function buildAcceptance(input: {
  work_id: string;
  work_version: number;
  run_id: string;
  proof_id: string | null;
  outcome: AcceptanceOutcome;
  reason: string;
  checks: AcceptanceCheckResult[];
  recorded_at?: string;
}): AcceptanceRecord {
  const recorded_at = input.recorded_at ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(recorded_at))) {
    throw new Error("INVALID_ACCEPTANCE_TIME: recorded_at must be parseable");
  }
  if (input.reason.length === 0) throw new Error("INVALID_ACCEPTANCE: reason required");
  const record: AcceptanceRecord = {
    schema: ACCEPTANCE_SCHEMA,
    acceptance_id: deriveAcceptanceId({
      work_id: input.work_id,
      work_version: input.work_version,
      run_id: input.run_id,
      proof_id: input.proof_id,
      outcome: input.outcome,
      checks: input.checks,
    }),
    work_id: input.work_id,
    work_version: input.work_version,
    run_id: input.run_id,
    proof_id: input.proof_id,
    outcome: input.outcome,
    reason: input.reason,
    checks: input.checks,
    recorded_at,
    recorder: { plugin: PLUGIN_ID, version: PLUGIN_VERSION },
    content_hash: "",
  };
  record.content_hash = bodyHash(record as unknown as Record<string, unknown>);
  return record;
}

export type AcceptanceValidation =
  | { ok: true; record: AcceptanceRecord }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): AcceptanceValidation {
  return { ok: false, code, message };
}

/** Structural validation. Never judges the outcome. */
export function validateAcceptance(parsed: unknown): AcceptanceValidation {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return fail("ACCEPTANCE_MALFORMED", "acceptance record must be a JSON object");
  }
  const a = parsed as Record<string, unknown>;
  if (a["schema"] !== ACCEPTANCE_SCHEMA) {
    return fail("ACCEPTANCE_SCHEMA_MISMATCH", `schema must be "${ACCEPTANCE_SCHEMA}"`);
  }
  if (typeof a["acceptance_id"] !== "string" || !ACCEPTANCE_ID_PATTERN.test(a["acceptance_id"])) {
    return fail("ACCEPTANCE_BAD_ID", "acceptance_id must match /^ac_[0-9a-f]{32}$/");
  }
  if (typeof a["work_id"] !== "string" || a["work_id"].length === 0) {
    return fail("ACCEPTANCE_BAD_WORK", "work_id required");
  }
  if (typeof a["work_version"] !== "number" || typeof a["run_id"] !== "string") {
    return fail("ACCEPTANCE_BAD_REF", "work_version + run_id required");
  }
  if (a["proof_id"] !== null && typeof a["proof_id"] !== "string") {
    return fail("ACCEPTANCE_BAD_REF", "proof_id must be a string or null");
  }
  if (a["outcome"] !== "ACCEPTED" && a["outcome"] !== "REJECTED") {
    return fail("ACCEPTANCE_BAD_OUTCOME", "outcome must be ACCEPTED or REJECTED");
  }
  if (typeof a["reason"] !== "string" || a["reason"].length === 0) {
    return fail("ACCEPTANCE_BAD_REASON", "reason required");
  }
  if (!Array.isArray(a["checks"])) {
    return fail("ACCEPTANCE_BAD_CHECKS", "checks must be an array");
  }
  if (typeof a["recorded_at"] !== "string" || Number.isNaN(Date.parse(a["recorded_at"]))) {
    return fail("ACCEPTANCE_BAD_TIME", "recorded_at must be parseable");
  }
  const recorder = a["recorder"];
  if (typeof recorder !== "object" || recorder === null || Array.isArray(recorder)) {
    return fail("ACCEPTANCE_BAD_RECORDER", "recorder must be an object");
  }
  const rr = recorder as Record<string, unknown>;
  if (rr["plugin"] !== PLUGIN_ID || typeof rr["version"] !== "string") {
    return fail("ACCEPTANCE_BAD_RECORDER", "recorder must identify this plugin");
  }
  if (typeof a["content_hash"] !== "string" || !CONTENT_HASH_PATTERN.test(a["content_hash"])) {
    return fail("ACCEPTANCE_BAD_HASH", "content_hash must be 64 hex chars");
  }
  return { ok: true, record: parsed as AcceptanceRecord };
}
