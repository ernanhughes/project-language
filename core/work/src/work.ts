import { canonicalize, sha256Hex } from "./canonical.ts";
import { PLUGIN_ID, PLUGIN_VERSION, WORK_SCHEMA } from "./version.ts";
import type { Operation } from "./ops.ts";

export const WORK_ID_PATTERN = /^wk_[0-9a-f]{32}$/;
export const AMENDMENT_ID_PATTERN = /^wa_[0-9a-f]{32}$/;
export const QUESTION_ID_PATTERN = /^wq_[0-9a-f]{32}$/;
const CONTENT_HASH_PATTERN = /^[0-9a-f]{64}$/;

// Metadata generation legitimately carries the authoritative schema, contract,
// book state, and manuscript context in one Worker objective. Keep a bounded
// declaration size, but do not reject that validated application payload.
export const MAX_STATEMENT_CHARS = 4096;
export const MAX_DESCRIPTION_CHARS = 1024;

/** Opaque in v0.1: authority is owned elsewhere; Work only records scope. */
export type AuthorityScope = {
  scope: string;
  granted_by?: string;
};

export type SuccessObligationDecl = {
  description: string;
  criterion: unknown;
  required?: boolean;
};

export type AcceptanceCheckDecl = {
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
};

export type Amendment = {
  amendment_id: string;
  work_id: string;
  from_version: number;
  to_version: number;
  reason: string;
  claim?: { statement: string; subject?: string };
  add_obligations: SuccessObligationDecl[];
  add_acceptance_checks: AcceptanceCheckDecl[];
  amended_by: string;
  amended_at: string;
};

export type Question = {
  question_id: string;
  question: string;
  status: "open" | "answered";
  raised_by_op?: string;
  raised_at: string;
};

export type ArtifactRef =
  | { kind: "evidence"; evidence_id: string; op_id: string }
  | { kind: "verification"; verification_id: string; op_id: string }
  | { kind: "proof"; proof_id: string; op_id: string }
  | { kind: "acceptance"; acceptance_id: string }
  | { kind: "model_output"; op_id: string; note: string }
  | { kind: "authority_request"; op_id: string; scope: string }
  | {
      /**
       * Ch17 knowledge-work experiment (experiments/ch17-knowledge-work/):
       * a typed judgment of how one artifact relates to a target, using
       * opencode-relate's own vocabulary rather than a parallel one. This
       * variant exists to test whether persisting the judgment itself (as
       * opposed to a free-text rationale, or nothing) earns its schema —
       * see protocol.md for the comparison this is part of.
       */
      kind: "relation_judgment";
      finding_ref: string;
      target_ref: string;
      relation: "SUPPORTS" | "PARTIAL_SUPPORT" | "CONTRADICTS" | "TOPIC_RELATED" | "UNKNOWN";
      evidence?: string[];
      materiality: "low" | "medium" | "high";
      judged_by: string;
      op_id: string;
    }
  | { kind: "knowledge"; brief_id: string; capability: string; capability_version: string; op_id: string };

export type WorkDeclaration = {
  schema: typeof WORK_SCHEMA;
  work_id: string;
  work_version: number;
  objective: {
    statement: string;
    source: "human" | "system";
  };
  scope: {
    project?: string;
    resources?: string[];
    constraints?: unknown[];
  };
  claim: {
    statement: string;
    subject?: string;
  };
  success: {
    obligations: Array<SuccessObligationDecl & { required: boolean }>;
    acceptance: {
      checks: Array<Required<Pick<AcceptanceCheckDecl, "name" | "command">> & AcceptanceCheckDecl>;
    };
  };
  plan: Operation[];
  authority: AuthorityScope;
  state: "DECLARED";
  artifacts: ArtifactRef[];
  unresolved: Question[];
  provenance: {
    created_at: string;
    created_by: string;
    amendments: Amendment[];
  };
  producer: {
    plugin: typeof PLUGIN_ID;
    version: string;
  };
  content_hash: string;
};

export type WorkValidation =
  | { ok: true; declaration: WorkDeclaration }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): WorkValidation {
  return { ok: false, code, message };
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function deriveWorkId(input: { statement: string; source: string; scope: unknown; created_at: string }): string {
  return `wk_${sha256Hex(canonicalize({ scope: input.scope ?? null, source: input.source, statement: input.statement, created_at: input.created_at })).slice(0, 32)}`;
}

export function deriveAmendmentId(input: {
  work_id: string;
  from_version: number;
  reason: string;
  claim?: unknown;
  add_obligations: unknown;
  add_acceptance_checks: unknown;
  amended_at: string;
}): string {
  return `wa_${sha256Hex(canonicalize(input)).slice(0, 32)}`;
}

export function deriveQuestionId(input: { work_id: string; question: string; raised_at: string }): string {
  return `wq_${sha256Hex(canonicalize(input)).slice(0, 32)}`;
}

function workBodyHash(declaration: Record<string, unknown>): string {
  const { content_hash: _omitted, ...body } = declaration;
  return sha256Hex(canonicalize(body));
}

/** Validate + normalize a declaration input. Never executes anything. */
export function normalizeDeclaration(input: unknown): WorkValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("INVALID_WORK", "work declaration must be a JSON object");
  }
  const w = input as Record<string, unknown>;

  const objective = w["objective"];
  if (typeof objective !== "object" || objective === null || Array.isArray(objective)) {
    return fail("INVALID_WORK", "objective must be an object");
  }
  const obj = objective as Record<string, unknown>;
  if (!nonEmptyString(obj["statement"])) {
    return fail("INVALID_WORK", "objective.statement must be a non-empty string");
  }
  if (obj["statement"].length > MAX_STATEMENT_CHARS) {
    return fail("INVALID_WORK", `objective.statement exceeds ${MAX_STATEMENT_CHARS} chars`);
  }
  if (obj["source"] !== "human" && obj["source"] !== "system") {
    return fail("INVALID_WORK", 'objective.source must be "human" or "system"');
  }

  let scope: WorkDeclaration["scope"] = {};
  if (w["scope"] !== undefined) {
    if (typeof w["scope"] !== "object" || w["scope"] === null || Array.isArray(w["scope"])) {
      return fail("INVALID_WORK", "scope must be an object when present");
    }
    const s = w["scope"] as Record<string, unknown>;
    if (s["project"] !== undefined && typeof s["project"] !== "string") {
      return fail("INVALID_WORK", "scope.project must be a string when present");
    }
    if (s["resources"] !== undefined && (!Array.isArray(s["resources"]) || !s["resources"].every((r) => typeof r === "string"))) {
      return fail("INVALID_WORK", "scope.resources must be string[] when present");
    }
    scope = {
      ...(typeof s["project"] === "string" ? { project: s["project"] } : {}),
      ...(Array.isArray(s["resources"]) ? { resources: s["resources"] as string[] } : {}),
      ...(s["constraints"] !== undefined ? { constraints: s["constraints"] as unknown[] } : {}),
    };
  }

  const claim = w["claim"];
  if (typeof claim !== "object" || claim === null || Array.isArray(claim)) {
    return fail("INVALID_WORK", "claim must be an object");
  }
  const cl = claim as Record<string, unknown>;
  if (!nonEmptyString(cl["statement"])) {
    return fail("INVALID_WORK", "claim.statement must be a non-empty string");
  }
  if (cl["subject"] !== undefined && typeof cl["subject"] !== "string") {
    return fail("INVALID_WORK", "claim.subject must be a string when present");
  }

  const success = w["success"];
  if (typeof success !== "object" || success === null || Array.isArray(success)) {
    return fail("INVALID_WORK", "success must be an object");
  }
  const su = success as Record<string, unknown>;
  if (!Array.isArray(su["obligations"]) || su["obligations"].length === 0) {
    return fail("INVALID_WORK", "success.obligations must be a non-empty array");
  }
  const obligations: WorkDeclaration["success"]["obligations"] = [];
  for (let i = 0; i < (su["obligations"] as unknown[]).length; i++) {
    const raw = (su["obligations"] as unknown[])[i];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return fail("INVALID_WORK", `success.obligations[${i}] must be an object`);
    }
    const o = raw as Record<string, unknown>;
    if (!nonEmptyString(o["description"]) || (o["description"] as string).length > MAX_DESCRIPTION_CHARS) {
      return fail("INVALID_WORK", `success.obligations[${i}].description must be a non-empty string`);
    }
    if (o["criterion"] === undefined) {
      return fail("INVALID_WORK", `success.obligations[${i}].criterion must be present (criteria are validated at run time by Verify)`);
    }
    let required = true;
    if (o["required"] !== undefined) {
      if (typeof o["required"] !== "boolean") {
        return fail("INVALID_WORK", `success.obligations[${i}].required must be a boolean when present`);
      }
      required = o["required"];
    }
    obligations.push({
      description: o["description"] as string,
      criterion: o["criterion"],
      required,
    });
  }

  const acceptance = su["acceptance"];
  if (typeof acceptance !== "object" || acceptance === null || Array.isArray(acceptance)) {
    return fail("INVALID_WORK", "success.acceptance must be an object");
  }
  const acc = acceptance as Record<string, unknown>;
  if (!Array.isArray(acc["checks"]) || acc["checks"].length === 0) {
    return fail("INVALID_WORK", "success.acceptance.checks must be a non-empty array");
  }
  const checks: WorkDeclaration["success"]["acceptance"]["checks"] = [];
  for (let i = 0; i < (acc["checks"] as unknown[]).length; i++) {
    const raw = (acc["checks"] as unknown[])[i];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return fail("INVALID_WORK", `success.acceptance.checks[${i}] must be an object`);
    }
    const c = raw as Record<string, unknown>;
    if (!nonEmptyString(c["name"]) || !nonEmptyString(c["command"])) {
      return fail("INVALID_WORK", `success.acceptance.checks[${i}] needs name + command`);
    }
    if (c["args"] !== undefined && (!Array.isArray(c["args"]) || !c["args"].every((a) => typeof a === "string"))) {
      return fail("INVALID_WORK", `success.acceptance.checks[${i}].args must be string[] when present`);
    }
    if (c["cwd"] !== undefined && typeof c["cwd"] !== "string") {
      return fail("INVALID_WORK", `success.acceptance.checks[${i}].cwd must be a string when present`);
    }
    checks.push({
      name: c["name"] as string,
      command: c["command"] as string,
      ...(Array.isArray(c["args"]) ? { args: c["args"] as string[] } : {}),
      ...(typeof c["cwd"] === "string" ? { cwd: c["cwd"] } : {}),
    });
  }

  if (!Array.isArray(w["plan"]) || w["plan"].length === 0) {
    return fail("INVALID_WORK", "plan must be a non-empty array of operations");
  }

  const authority = w["authority"];
  if (typeof authority !== "object" || authority === null || Array.isArray(authority)) {
    return fail("INVALID_WORK", "authority must be an object");
  }
  const au = authority as Record<string, unknown>;
  if (!nonEmptyString(au["scope"])) {
    return fail("INVALID_WORK", "authority.scope must be a non-empty string (reserved: enforced elsewhere)");
  }

  const created_at = typeof w["created_at"] === "string" ? w["created_at"] : new Date().toISOString();
  if (Number.isNaN(Date.parse(created_at))) {
    return fail("INVALID_WORK", "created_at must be a parseable timestamp string");
  }
  const created_by = typeof w["created_by"] === "string" && w["created_by"].length > 0 ? w["created_by"] : "caller";

  const declaration: WorkDeclaration = {
    schema: WORK_SCHEMA,
    work_id: deriveWorkId({
      statement: obj["statement"] as string,
      source: obj["source"] as string,
      scope,
      created_at,
    }),
    work_version: 1,
    objective: { statement: obj["statement"] as string, source: obj["source"] as "human" | "system" },
    scope,
    claim: {
      statement: cl["statement"] as string,
      ...(typeof cl["subject"] === "string" ? { subject: cl["subject"] } : {}),
    },
    success: { obligations, acceptance: { checks } },
    plan: w["plan"] as Operation[],
    authority: {
      scope: au["scope"] as string,
      ...(typeof au["granted_by"] === "string" ? { granted_by: au["granted_by"] } : {}),
    },
    state: "DECLARED",
    artifacts: [],
    unresolved: [],
    provenance: { created_at, created_by, amendments: [] },
    producer: { plugin: PLUGIN_ID, version: PLUGIN_VERSION },
    content_hash: "",
  };
  declaration.content_hash = workBodyHash(declaration as unknown as Record<string, unknown>);
  return { ok: true, declaration };
}

/** Structural check of a stored declaration (id patterns, hash recompute). */
export function checkDeclarationIntegrity(declaration: WorkDeclaration): { ok: true } | { ok: false; code: string; message: string } {
  if (declaration.schema !== WORK_SCHEMA) {
    return { ok: false, code: "WORK_SCHEMA_MISMATCH", message: `schema must be "${WORK_SCHEMA}"` };
  }
  if (!WORK_ID_PATTERN.test(declaration.work_id)) {
    return { ok: false, code: "WORK_BAD_ID", message: "work_id must match /^wk_[0-9a-f]{32}$/" };
  }
  if (declaration.producer?.plugin !== PLUGIN_ID) {
    return { ok: false, code: "WORK_BAD_PRODUCER", message: `producer.plugin must be "${PLUGIN_ID}"` };
  }
  const recomputed = workBodyHash(declaration as unknown as Record<string, unknown>);
  if (recomputed !== declaration.content_hash) {
    return { ok: false, code: "WORK_HASH_MISMATCH", message: "stored content_hash does not match declaration body" };
  }
  return { ok: true };
}
