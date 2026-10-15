// Part II, human-side path. The shared input contract and the typed vocabulary.
//
// This is the MINIMUM needed to make the tested distinctions inspectable. It does not
// claim to capture meaning. No host, model, clock, storage or network access.
//
// Two recipients, two control paths (see PART-TWO-CONTRACT.md):
//   model side  -> core/admission  (what may influence a model computation)
//   human side  -> this directory  (what a person is shown, at what resolution, and when)

export const RESOLUTIONS = ["GLANCE", "BRIEF", "SUMMARY", "DETAIL", "SOURCE"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];
export const resolutionRank = (r: Resolution): number => RESOLUTIONS.indexOf(r);

/** An attention-worthiness gate BEFORE the resolution ladder. NOTHING is not a timing mode. */
export const WORTHINESS = ["ATTENTION_WORTHY", "NOTHING"] as const;
export type Worthiness = (typeof WORTHINESS)[number];

export const DELIVERY_MODES = ["NOW", "QUEUE", "DIGEST", "AVAILABLE"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const STATUSES = ["PENDING", "DELIVERED", "WITHDRAWN", "EXPIRED"] as const;
export type Status = (typeof STATUSES)[number];

/** How far a source has been vetted. A property of the evidence, never of the reader. */
export type ReviewStanding = "peer_reviewed" | "preprint" | "unreviewed" | "unknown";

/** Dimensions are kept separate. There is no total, and no field that could hold one. */
export const DIMENSIONS = [
  "relevance", "permission", "currentness", "scope", "novelty", "dependency", "evidence_standing",
  "resolution_sufficiency", "urgency", "interruption_cost", "relation", "preservation", "timing",
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

/** Where a reason came from. A reason string that mentions a purpose is not proof it was valid. */
export const ORIGINS = [
  "declared_policy",   // a person-authored rule, with a version
  "declared_context",  // a fact the person stated (a focus mode, a meeting end)
  "observed_context",  // a fact the host observed (a calendar entry, a clock)
  "source_fact",       // read from a hash-pinned source
  "computed_rule",     // a deterministic function of the above
  "supplied_judgement",// a person or a domain rule supplied it (a bridge, a dependency)
  "model_proposal",    // a model said so. Never sufficient by itself.
] as const;
export type Origin = (typeof ORIGINS)[number];

export interface Reason {
  dimension: Dimension;
  origin: Origin;
  /** What the reason rests on: a rule id, a source id, a grant id. Empty is invalid. */
  ref: string;
  text: string;
}

// ─── The stages. noticed / used / helpful are unknown unless separately observed. ──────────────
export const STAGES = [
  "observed", "retrieved", "eligible", "selected", "assembled", "qualified",
  "safe_resolution", "delivery_timing", "presented", "noticed", "used", "helpful",
] as const;
export type Stage = (typeof STAGES)[number];
export type StageOutcome = "yes" | "no" | "unknown" | "not_reached" | "not_applicable";
export interface StageRecord { stage: Stage; outcome: StageOutcome; reasons: Reason[] }

// ─── The shared input contract ──────────────────────────────────────────────────────────────────
export interface SourceVersion { id: string; version: string; text: string; sha256: string }
export interface Span { start: number; end: number }

/** A stable, identified piece of a source. Not a sentence heuristic. */
export interface Unit {
  id: string;
  source_id: string;
  source_version: string;
  /** One or more exact spans. A unit may combine places far apart. */
  spans: Span[];
  /** Must equal the spans' text joined with a single space. */
  text: string;
  role: "claim" | "qualifier" | "evidence" | "other";
  /** Directed: this unit cannot be shown faithfully without these. A claim depends on its qualifier. */
  dependsOn: string[];
}

export type Need = "triage" | "decide" | "judge_proof" | "implement" | "safety_claim";
export interface Purpose {
  id: string;
  /** Declared by a person. An inferred purpose may be proposed, never substituted. */
  declared_by: "person";
  text: string;
  need: Need;
}

export interface Grant { id: string; principal: string; purpose: string }
export interface CandidateItem {
  id: string;
  source: SourceVersion;
  text: string;
  /** The monitored area the item belongs to. Eligibility compares this with the task's scope. */
  domain: string;
  /** The conditions under which the item's OWN claim holds. A relation to a tracked claim needs a bridge between scopes. */
  scope: string;
  standing: ReviewStanding;
  validFrom: string;
  validUntil: string | null;
  supersededBy?: string;
  grants: Grant[];
  /** Units of this item, when a decomposition exists. */
  units?: Unit[];
}

/** The person's task. `scope` is the monitored area (compared with each item's domain). */
export interface Task {
  id: string;
  principal: string;
  purpose: Purpose;
  scope: string;
  asOf: string;
}

export type ConditionKind = "standing" | "after";
export interface Condition {
  kind: ConditionKind;
  /** for standing: the acceptable standings. for after: an ISO time. */
  requires: string[];
  /** The words the person used. Kept verbatim; never rewritten to make a fixture pass. */
  stated: string;
}
export interface Subscription {
  id: string;
  version: number;
  declared_by: "person";
  /** The subscription as the person wrote it. */
  statement: string;
  anchor: { claim_id: string; scope: string };
  relation: "weakens" | "contradicts" | "supersedes";
  conditions: Condition[];
  exclusions: string[];
}

export interface Bridge {
  id: string;
  supplied_by: "person" | "domain_rule" | "model";
  /** The relation this bridge asserts between the candidate and the tracked claim. It must be the one the subscription asks for. */
  relation: "weakens" | "contradicts" | "supersedes" | "supports" | "unrelated";
  /** The scope of the tracked claim, and the scope of the candidate, both named. */
  anchor_scope: string;
  candidate_scope: string;
  /** What the bridge asserts about the relation, in the person's terms. */
  asserts: string;
  argument_ref: string;
  preserves_scope: boolean;
}

export type Urgency = "HIGH" | "MEDIUM" | "LOW";
export type Cost = "HIGH" | "LOW";

export class AttentionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(`${code}: ${message}`); this.name = "AttentionError"; this.code = code; }
}

export const parseTime = (iso: string, what: string): number => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new AttentionError("INVALID_TIME", `${what} is not a time: ${JSON.stringify(iso)}`);
  return t;
};
