/**
 * Expertise capability contract (narrow).
 *
 * Expertise answers "what have we learned that matters here?" by returning
 * ranked findings. It owns no Work mutation path: findings flow to reasoning
 * (proposals), proposals flow to explicit human/tool approval (amendments).
 * knowledge ≠ proposal ≠ approval ≠ amendment — enforced by leaving every
 * rightward step to a different, explicit mechanism.
 *
 * NOTE: C:\Projects\opencode-expertise does not exist as a runtime (checked
 * 2026-09-27). Register `unavailableExpertise()` until it does; report, do
 * not fake. Fixture-backed capabilities in tests/smoke carry distinct ids
 * and prove the SEAM, never expertise quality.
 */
import type { CapabilityRegistration } from "./capabilities.ts";

export const EXPERTISE_CAPABILITY_ID = "expertise";
export const EXPERTISE_VERSION_UNAVAILABLE = "0.0.0-unavailable";
export const MAX_BRIEF_BYTES = 65_536;

export type ExpertiseFinding = {
  finding_id: string;
  note_id?: string;
  title: string;
  excerpt: string;
  score?: number;
  /** Preserved source references (never flattened away when the capability provides them). */
  references?: Array<{
    source_id: string;
    locator: string;
    title?: string | null;
    start_line?: number | null;
    end_line?: number | null;
    revision?: string | null;
  }>;
  /** Evidence maturity as classified by the capability (opaque to Work). */
  evidence_status?: string;
  kind?: string;
  caveat?: string | null;
};

export type ExpertiseBrief = {
  brief_id: string;
  capability: typeof EXPERTISE_CAPABILITY_ID;
  version: string;
  query: string;
  findings: ExpertiseFinding[];
  retrieved_at: string;
  /** Capability-supplied provenance (searched sources, query terms, domains). */
  provenance?: {
    searched_sources?: string[];
    query_terms?: string[];
    domains?: string[];
  };
};

export interface ExpertiseAdapter {
  search(input: { query: string; top_k?: number }): Promise<{ brief: ExpertiseBrief }>;
}

export const MISSING_EXPERTISE_CONTRACT =
  "no expertise runtime configured: set OPENCODE_EXPERTISE_CONFIG to an " +
  "expertise.json (or add .opencode/expertise.json) backed by an " +
  "opencode-expertise checkout; SEARCH_EXPERTISE fails " +
  "CAPABILITY_UNAVAILABLE until then.";

export function unavailableExpertise(reason?: string): CapabilityRegistration {
  return {
    id: EXPERTISE_CAPABILITY_ID,
    version: EXPERTISE_VERSION_UNAVAILABLE,
    operations: ["SEARCH_EXPERTISE"],
    available: false,
    unavailableReason: reason ?? MISSING_EXPERTISE_CONTRACT,
    handle: null,
  };
}

export type BriefValidation =
  | { ok: true; brief: ExpertiseBrief }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): BriefValidation {
  return { ok: false, code, message };
}

/** Shape + size validation for a returned brief. Never judges relevance. */
export function validateBrief(input: unknown): BriefValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return fail("EXPERTISE_BRIEF_INVALID", "brief must be a JSON object");
  }
  const b = input as Record<string, unknown>;
  if (typeof b["brief_id"] !== "string" || b["brief_id"].length === 0) {
    return fail("EXPERTISE_BRIEF_INVALID", "brief.brief_id must be a non-empty string");
  }
  if (!Array.isArray(b["findings"])) {
    return fail("EXPERTISE_BRIEF_INVALID", "brief.findings must be an array");
  }
  for (let i = 0; i < (b["findings"] as unknown[]).length; i++) {
    const f = (b["findings"] as unknown[])[i];
    if (
      typeof f !== "object" ||
      f === null ||
      typeof (f as Record<string, unknown>)["finding_id"] !== "string" ||
      typeof (f as Record<string, unknown>)["title"] !== "string" ||
      typeof (f as Record<string, unknown>)["excerpt"] !== "string"
    ) {
      return fail("EXPERTISE_BRIEF_INVALID", `brief.findings[${i}] needs finding_id + title + excerpt`);
    }
    const refs = (f as Record<string, unknown>)["references"];
    if (refs !== undefined && !Array.isArray(refs)) {
      return fail("EXPERTISE_BRIEF_INVALID", `brief.findings[${i}].references must be an array when present`);
    }
    for (const [field, want] of [["evidence_status", "string"], ["kind", "string"]] as const) {
      const v = (f as Record<string, unknown>)[field];
      if (v !== undefined && typeof v !== want) {
        return fail("EXPERTISE_BRIEF_INVALID", `brief.findings[${i}].${field} must be a string when present`);
      }
    }
  }
  if (b["provenance"] !== undefined) {
    if (typeof b["provenance"] !== "object" || b["provenance"] === null || Array.isArray(b["provenance"])) {
      return fail("EXPERTISE_BRIEF_INVALID", "brief.provenance must be an object when present");
    }
  }
  let bytes: number;
  try {
    bytes = JSON.stringify(b).length;
  } catch {
    return fail("EXPERTISE_BRIEF_INVALID", "brief must be JSON-serializable");
  }
  if (bytes > MAX_BRIEF_BYTES) {
    return fail("EXPERTISE_BRIEF_TOO_LARGE", `brief is ${bytes} bytes (cap ${MAX_BRIEF_BYTES})`);
  }
  return { ok: true, brief: input as ExpertiseBrief };
}
