/**
 * Work proposals: knowledge may inform reasoning, reasoning may propose,
 * but only explicit approval amends Work. A proposal is a persisted,
 * referenceable object with status PROPOSED and NO apply path — there is
 * deliberately no method anywhere that turns a proposal into an amendment
 * without a human/tool calling work_amend with its own reason.
 */
import { canonicalize, sha256Hex } from "./canonical.ts";
import { PLUGIN_ID, PLUGIN_VERSION } from "./version.ts";
import { validatePlan } from "./ops.ts";
import type { ArtifactRef } from "./work.ts";

export type ProposalKind = "ADD_OBLIGATION" | "CHANGE_SCOPE" | "CHANGE_CLAIM" | "CHANGE_PLAN";

export const PROPOSAL_KINDS: readonly string[] = [
  "ADD_OBLIGATION",
  "CHANGE_SCOPE",
  "CHANGE_CLAIM",
  "CHANGE_PLAN",
];

export type WorkProposal = {
  proposal_id: string;
  work_id: string;
  work_version: number;
  kind: ProposalKind;
  basis: ArtifactRef[];
  proposed_change: unknown;
  status: "PROPOSED";
  producer: {
    by: string;
    capability?: string;
  };
  created_at: string;
  content_hash: string;
};

export const PROPOSAL_ID_PATTERN = /^wp_[0-9a-f]{32}$/;
const CONTENT_HASH_PATTERN = /^[0-9a-f]{64}$/;

export type ProposalValidation =
  | { ok: true; proposal: WorkProposal }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): ProposalValidation {
  return { ok: false, code, message };
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function deriveProposalId(input: {
  work_id: string;
  work_version: number;
  kind: string;
  proposed_change: unknown;
  created_at: string;
}): string {
  return `wp_${sha256Hex(canonicalize(input)).slice(0, 32)}`;
}

/** Validate + normalize a proposal. Never touches any declaration. */
export function normalizeProposal(
  input: unknown,
  work_id: string,
  work_version: number,
): ProposalValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("INVALID_PROPOSAL", "proposal must be a JSON object");
  }
  const p = input as Record<string, unknown>;
  if (typeof p["kind"] !== "string" || !PROPOSAL_KINDS.includes(p["kind"])) {
    return fail("INVALID_PROPOSAL", `kind must be one of ${PROPOSAL_KINDS.join(", ")}`);
  }
  if (p["basis"] !== undefined) {
    if (!Array.isArray(p["basis"])) {
      return fail("INVALID_PROPOSAL", "basis must be an array of artifact refs when present");
    }
    for (let i = 0; i < p["basis"].length; i++) {
      const ref = (p["basis"] as unknown[])[i];
      if (typeof ref !== "object" || ref === null || typeof (ref as Record<string, unknown>)["kind"] !== "string") {
        return fail("INVALID_PROPOSAL", `basis[${i}] must be an artifact ref object with a kind`);
      }
    }
  }
  if (p["proposed_change"] === undefined) {
    return fail("INVALID_PROPOSAL", "proposed_change is required");
  }
  const change = validateProposedChange(p["kind"] as ProposalKind, p["proposed_change"]);
  if (!change.ok) return fail(change.code, change.message);
  if (p["by"] !== undefined && typeof p["by"] !== "string") {
    return fail("INVALID_PROPOSAL", "by must be a string when present");
  }
  if (p["capability"] !== undefined && typeof p["capability"] !== "string") {
    return fail("INVALID_PROPOSAL", "capability must be a string when present");
  }
  const created_at = new Date().toISOString();
  const proposal: WorkProposal = {
    proposal_id: deriveProposalId({
      work_id,
      work_version,
      kind: p["kind"] as string,
      proposed_change: p["proposed_change"],
      created_at,
    }),
    work_id,
    work_version,
    kind: p["kind"] as ProposalKind,
    basis: (p["basis"] as ArtifactRef[]) ?? [],
    proposed_change: p["proposed_change"],
    status: "PROPOSED",
    producer: {
      by: typeof p["by"] === "string" && p["by"].length > 0 ? p["by"] : "caller",
      ...(typeof p["capability"] === "string" ? { capability: p["capability"] } : {}),
    },
    created_at,
    content_hash: "",
  };
  const { content_hash: _omitted, ...body } = proposal as unknown as Record<string, unknown>;
  proposal.content_hash = sha256Hex(canonicalize(body));
  void _omitted;
  return { ok: true, proposal };
}

function validateProposedChange(
  kind: ProposalKind,
  change: unknown,
): { ok: true } | { ok: false; code: string; message: string } {
  const bad = (message: string) => ({ ok: false as const, code: "INVALID_PROPOSAL", message });
  if (typeof change !== "object" || change === null || Array.isArray(change)) {
    return bad("proposed_change must be an object");
  }
  const c = change as Record<string, unknown>;
  switch (kind) {
    case "ADD_OBLIGATION": {
      if (!Array.isArray(c["add_obligations"]) || c["add_obligations"].length === 0) {
        return bad("ADD_OBLIGATION needs non-empty add_obligations");
      }
      for (let i = 0; i < c["add_obligations"].length; i++) {
        const o = (c["add_obligations"] as unknown[])[i] as Record<string, unknown>;
        if (typeof o !== "object" || o === null || !nonEmptyString(o["description"]) || o["criterion"] === undefined) {
          return bad(`add_obligations[${i}] needs description + criterion`);
        }
      }
      return { ok: true };
    }
    case "CHANGE_SCOPE":
      if (typeof c["scope"] !== "object" || c["scope"] === null || Array.isArray(c["scope"])) {
        return bad("CHANGE_SCOPE needs a scope object");
      }
      return { ok: true };
    case "CHANGE_CLAIM": {
      const claim = c["claim"];
      if (typeof claim !== "object" || claim === null || Array.isArray(claim)) {
        return bad("CHANGE_CLAIM needs a claim object");
      }
      if (!nonEmptyString((claim as Record<string, unknown>)["statement"])) {
        return bad("CHANGE_CLAIM needs claim.statement");
      }
      return { ok: true };
    }
    case "CHANGE_PLAN": {
      if (c["plan"] === undefined) return bad("CHANGE_PLAN needs a plan");
      const plan = validatePlan(c["plan"]);
      if (!plan.ok) return { ok: false, code: plan.code, message: plan.message };
      return { ok: true };
    }
  }
}

export function checkProposalIntegrity(proposal: WorkProposal): { ok: true } | { ok: false; code: string; message: string } {
  if (!PROPOSAL_ID_PATTERN.test(proposal.proposal_id)) {
    return { ok: false, code: "PROPOSAL_BAD_ID", message: "proposal_id must match /^wp_[0-9a-f]{32}$/" };
  }
  if (proposal.status !== "PROPOSED") {
    return { ok: false, code: "PROPOSAL_BAD_STATUS", message: 'proposal status is always "PROPOSED" in V1' };
  }
  if (typeof proposal.content_hash !== "string" || !CONTENT_HASH_PATTERN.test(proposal.content_hash)) {
    return { ok: false, code: "PROPOSAL_BAD_HASH", message: "content_hash must be 64 hex chars" };
  }
  const { content_hash: _omitted, ...body } = proposal as unknown as Record<string, unknown>;
  void _omitted;
  if (sha256Hex(canonicalize(body)) !== proposal.content_hash) {
    return { ok: false, code: "PROPOSAL_HASH_MISMATCH", message: "stored content_hash does not match proposal body" };
  }
  return { ok: true };
}
