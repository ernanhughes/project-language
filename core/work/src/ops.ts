/**
 * The v0.1 operation vocabulary. Small, boring, deterministic-first.
 * Operations that need a model declare it (CALL_MODEL) and block without a
 * provider; everything else runs without any model. Operation choice comes
 * first; model choice second.
 */
export type Operation =
  | {
      op_id: string;
      kind: "RUN_COMMAND";
      command: string;
      args?: string[];
      cwd?: string;
      subject?: string;
    }
  | {
      op_id: string;
      kind: "CAPTURE_EVIDENCE";
      source_op: string;
      subject?: string;
    }
  | {
      op_id: string;
      kind: "VERIFY";
      criterion: unknown;
      evidence: string[];
    }
  | {
      op_id: string;
      kind: "BUILD_PROOF";
      obligations: Array<{
        description: string;
        criterion: unknown;
        evidence: string[];
        verification: string;
        required?: boolean;
      }>;
    }
  | {
      op_id: string;
      kind: "CALL_MODEL";
      prompt: string;
      model?: string;
      data_policy?: "training_allowed" | "private" | "local_only";
      max_output_tokens?: number;
      temperature?: number;
      reasoning_effort?: string;
      session_id?: string;
      output_path?: string;
    }
  | {
      op_id: string;
      kind: "SEARCH_EXPERTISE";
      query: string;
      top_k?: number;
      capability?: string;
    }
  | {
      op_id: string;
      kind: "REQUEST_AUTHORITY";
      scope: string;
      reason: string;
    }
  | {
      op_id: string;
      kind: "ASK_HUMAN";
      question: string;
    };

export const OP_KINDS: readonly string[] = [
  "RUN_COMMAND",
  "CAPTURE_EVIDENCE",
  "VERIFY",
  "BUILD_PROOF",
  "CALL_MODEL",
  "SEARCH_EXPERTISE",
  "REQUEST_AUTHORITY",
  "ASK_HUMAN",
];

export type OpsValidation =
  | { ok: true; ops: Operation[] }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): OpsValidation {
  return { ok: false, code, message };
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/** Validate a plan: shape, unique op_ids, in-order references. */
export function validatePlan(input: unknown): OpsValidation {
  if (!Array.isArray(input) || input.length === 0) {
    return fail("INVALID_PLAN", "plan must be a non-empty array of operations");
  }
  const seen = new Set<string>();
  const ops: Operation[] = [];
  for (let i = 0; i < input.length; i++) {
    const raw = input[i];
    const where = `plan[${i}]`;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return fail("INVALID_PLAN", `${where}: operation must be an object`);
    }
    const o = raw as Record<string, unknown>;
    if (!nonEmptyString(o["op_id"])) {
      return fail("INVALID_PLAN", `${where}: op_id must be a non-empty string`);
    }
    if (seen.has(o["op_id"] as string)) {
      return fail("INVALID_PLAN", `${where}: duplicate op_id "${String(o["op_id"])}"`);
    }
    seen.add(o["op_id"] as string);
    if (typeof o["kind"] !== "string" || !OP_KINDS.includes(o["kind"])) {
      return fail("INVALID_PLAN", `${where}: kind must be one of ${OP_KINDS.join(", ")}`);
    }
    const refs: string[] = [];
    switch (o["kind"]) {
      case "RUN_COMMAND":
        if (!nonEmptyString(o["command"])) return fail("INVALID_PLAN", `${where}: command required`);
        if (o["args"] !== undefined && (!Array.isArray(o["args"]) || !o["args"].every((a) => typeof a === "string"))) {
          return fail("INVALID_PLAN", `${where}: args must be string[] when present`);
        }
        if (o["cwd"] !== undefined && typeof o["cwd"] !== "string") {
          return fail("INVALID_PLAN", `${where}: cwd must be a string when present`);
        }
        break;
      case "CAPTURE_EVIDENCE":
        if (!nonEmptyString(o["source_op"])) return fail("INVALID_PLAN", `${where}: source_op required`);
        refs.push(o["source_op"] as string);
        break;
      case "VERIFY":
        if (o["criterion"] === undefined) return fail("INVALID_PLAN", `${where}: criterion required`);
        if (!Array.isArray(o["evidence"]) || o["evidence"].length === 0 || !o["evidence"].every((e) => typeof e === "string")) {
          return fail("INVALID_PLAN", `${where}: evidence must be a non-empty string[] of op ids`);
        }
        refs.push(...(o["evidence"] as string[]));
        break;
      case "BUILD_PROOF": {
        if (!Array.isArray(o["obligations"]) || o["obligations"].length === 0) {
          return fail("INVALID_PLAN", `${where}: obligations must be a non-empty array`);
        }
        for (let j = 0; j < (o["obligations"] as unknown[]).length; j++) {
          const ob = (o["obligations"] as unknown[])[j];
          if (typeof ob !== "object" || ob === null || Array.isArray(ob)) {
            return fail("INVALID_PLAN", `${where}.obligations[${j}]: must be an object`);
          }
          const b = ob as Record<string, unknown>;
          if (!nonEmptyString(b["description"]) || b["criterion"] === undefined) {
            return fail("INVALID_PLAN", `${where}.obligations[${j}]: description + criterion required`);
          }
          if (!Array.isArray(b["evidence"]) || b["evidence"].length === 0 || !b["evidence"].every((e) => typeof e === "string")) {
            return fail("INVALID_PLAN", `${where}.obligations[${j}]: evidence must be non-empty string[]`);
          }
          if (!nonEmptyString(b["verification"])) {
            return fail("INVALID_PLAN", `${where}.obligations[${j}]: verification op id required`);
          }
          refs.push(...(b["evidence"] as string[]), b["verification"] as string);
        }
        break;
      }
      case "CALL_MODEL":
        if (!nonEmptyString(o["prompt"])) return fail("INVALID_PLAN", `${where}: prompt required`);
        if (o["data_policy"] !== undefined && !["training_allowed", "private", "local_only"].includes(String(o["data_policy"]))) return fail("INVALID_PLAN", `${where}: data_policy invalid`);
        if (o["max_output_tokens"] !== undefined && (typeof o["max_output_tokens"] !== "number" || !Number.isInteger(o["max_output_tokens"]) || o["max_output_tokens"] < 1)) return fail("INVALID_PLAN", `${where}: max_output_tokens must be a positive integer`);
        if (o["output_path"] !== undefined && !nonEmptyString(o["output_path"])) return fail("INVALID_PLAN", `${where}: output_path must be a non-empty string`);
        break;
      case "SEARCH_EXPERTISE":
        if (!nonEmptyString(o["query"])) return fail("INVALID_PLAN", `${where}: query required`);
        if (
          o["top_k"] !== undefined &&
          (typeof o["top_k"] !== "number" || !Number.isInteger(o["top_k"]) || o["top_k"] < 1 || o["top_k"] > 50)
        ) {
          return fail("INVALID_PLAN", `${where}: top_k must be an integer 1..50 when present`);
        }
        if (o["capability"] !== undefined && typeof o["capability"] !== "string") {
          return fail("INVALID_PLAN", `${where}: capability must be a string when present`);
        }
        break;
      case "REQUEST_AUTHORITY":
        if (!nonEmptyString(o["scope"]) || !nonEmptyString(o["reason"])) {
          return fail("INVALID_PLAN", `${where}: scope + reason required`);
        }
        break;
      case "ASK_HUMAN":
        if (!nonEmptyString(o["question"])) return fail("INVALID_PLAN", `${where}: question required`);
        break;
    }
    // References must point backwards: no forward refs, no self refs, no ghosts.
    for (const ref of refs) {
      if (!seen.has(ref) || ref === o["op_id"]) {
        return fail("INVALID_PLAN", `${where}: reference "${ref}" must name an earlier op`);
      }
    }
    ops.push(raw as Operation);
  }
  return { ok: true, ops };
}
