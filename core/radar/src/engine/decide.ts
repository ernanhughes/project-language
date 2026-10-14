import { createHash } from "node:crypto";
import {
  RadarError,
  type CandidateInput,
  type Disposition,
  type RadarDecision,
  type RadarReason,
  type Resolution,
} from "./types.ts";

export const RADAR_VERSION = "0.1.0";
export const POLICY_VERSION = "radar-policy-v0.1";

/**
 * v0.1 deterministic policy. Ordered gates; first match wins. Documented limits:
 * - thresholds are authored, not learned; the generic path is the same ruleset
 *   with personal fields UNKNOWN (safe default, Ch-21 doctrine);
 * - resolution is requested-minimum, never a summary (Radar does not summarise);
 * - SKIP produces no derived representation (resolution SOURCE = the original stands).
 */
export function decide(candidate: CandidateInput, options: { model?: string } = {}): RadarDecision {
  validate(candidate);
  const reasons: RadarReason[] = [];
  const uncertainty: string[] = [];
  let disposition: Disposition;
  const R = (dimension: RadarReason["dimension"], summary: string): void => {
    reasons.push({ dimension, summary });
  };

  if (candidate.evidential_validity === "refuted") {
    disposition = "SKIP";
    R("validity", "evidential-validity gate: refuted claims are not surfaced as valid information");
  } else if (candidate.task_relevance === "low" && candidate.urgency === "routine") {
    disposition = "SKIP";
    R("relevance", "below attention threshold: low task relevance with routine urgency");
  } else if (candidate.task_relevance === "low" && candidate.novelty === "ACCESSIBLE") {
    disposition = "SKIP";
    R("novelty", "already-accessible information with low task relevance");
  } else if (candidate.novelty === "ACCESSIBLE" && candidate.urgency === "routine" && candidate.task_relevance !== "high") {
    disposition = "SKIP";
    R("novelty", "already-accessible duplicate without urgency; high-relevance accessible items queue instead");
  } else if (candidate.urgency === "expiring" && candidate.task_relevance !== "low") {
    // (refuted already returned above, so reaching here implies not-refuted)
    disposition = "SHOW";
    R("urgency", "expiring value with sufficient relevance; shown with uncertainty intact");
    if (candidate.evidential_validity !== "confirmed") {
      uncertainty.push("shown while evidentially unconfirmed; verify before acting");
    }
  } else if (candidate.task_relevance === "high" && candidate.novelty === "NEW") {
    disposition = "SHOW";
    R("novelty", "high relevance with novel information");
  } else if (candidate.task_relevance === "high" && (candidate.novelty === "UNCERTAIN" || candidate.novelty === "UNKNOWN")) {
    disposition = "SIDECAR";
    R("novelty", "high relevance but uncertain novelty: available, not foreground");
    uncertainty.push("novelty uncertain; foregrounding withheld pending evidence");
  } else if (candidate.novelty === "STALE") {
    disposition = "QUEUE";
    R("novelty", "stale information held for context change, not foreground");
  } else {
    disposition = "QUEUE";
    R("policy", "default hold: no gate fired; queued rather than skipped to preserve recoverability");
    uncertainty.push("no decisive gate matched; queued conservatively");
  }

  // Resolution: minimum sufficient, decided AFTER disposition.
  let resolution: Resolution;
  if (disposition === "SKIP") {
    resolution = "SOURCE";
    R("cost", "no derived representation for skipped items; the original stands");
  } else if (disposition === "SIDECAR" || disposition === "QUEUE") {
    resolution = "GLANCE";
    R("cost", "deferred items get glance-minimum; expand on dequeue");
  } else if (candidate.evidential_validity !== "confirmed") {
    resolution = "DETAIL";
    R("validity", "unconfirmed evidence must stay visible for inspection");
  } else if (candidate.cost === "high") {
    resolution = "GLANCE";
    R("cost", "high-cost item shown at glance-minimum first");
  } else {
    resolution = "BRIEF";
    R("cost", "confirmed routine item at brief resolution");
  }

  const { note: _n, ...candidateRef } = candidate;
  void _n;
  return {
    candidate: candidateRef,
    disposition,
    resolution,
    reasons,
    uncertainty,
    policy_version: POLICY_VERSION,
    producer: { plugin: "opencode-radar", version: RADAR_VERSION, ...(options.model ? { model: options.model } : {}) },
  };
}

function validate(c: CandidateInput): void {
  if (!c || typeof c.id !== "string" || c.id.length === 0) {
    throw new RadarError("INVALID_CANDIDATE", "candidate.id must be a non-empty string");
  }
  const enums: Record<string, readonly string[]> = {
    task_relevance: ["high", "medium", "low"],
    novelty: ["NEW", "ACCESSIBLE", "UNCERTAIN", "STALE", "UNKNOWN"],
    evidential_validity: ["confirmed", "unconfirmed", "refuted", "unknown"],
    urgency: ["expiring", "soon", "routine"],
    cost: ["low", "high"],
  };
  for (const [field, allowed] of Object.entries(enums)) {
    const value = (c as unknown as Record<string, unknown>)[field];
    if (!allowed.includes(value as string)) {
      throw new RadarError("INVALID_CANDIDATE", `${field} must be one of ${allowed.join("|")}`);
    }
  }
}

export function decisionId(decision: RadarDecision): string {
  return createHash("sha256")
    .update([decision.candidate.id, decision.disposition, decision.resolution, decision.policy_version].join("\u0000"))
    .digest("hex")
    .slice(0, 16);
}
