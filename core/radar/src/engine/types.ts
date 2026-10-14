export type Disposition = "SHOW" | "QUEUE" | "SIDECAR" | "SKIP";
export type Resolution = "GLANCE" | "BRIEF" | "DETAIL" | "SOURCE";

export type Relevance = "high" | "medium" | "low";
export type Novelty = "NEW" | "ACCESSIBLE" | "UNCERTAIN" | "STALE" | "UNKNOWN";
export type Validity = "confirmed" | "unconfirmed" | "refuted" | "unknown";
export type Urgency = "expiring" | "soon" | "routine";
export type Cost = "low" | "high";

export interface SourceRef {
  id: string;
  kind: string;
  uri?: string;
  version?: string;
  scope?: string;
  observed_at?: string;
}

/** Caller-supplied metadata. v0.1 performs NO inference: every field arrives
 *  from the orchestrator (task model, knowledge ledger, subscription matcher).
 *  Absent personal fields mean "unknown", never a default person. */
export interface CandidateInput extends SourceRef {
  task_relevance: Relevance;
  novelty: Novelty;
  evidential_validity: Validity;
  urgency: Urgency;
  cost: Cost;
  note?: string;
}

export interface RadarReason {
  dimension: "validity" | "relevance" | "novelty" | "urgency" | "cost" | "policy";
  summary: string;
}

export interface RadarDecision {
  candidate: SourceRef;
  disposition: Disposition;
  resolution: Resolution;
  reasons: RadarReason[];
  uncertainty: string[];
  policy_version: string;
  producer: { plugin: "opencode-radar"; version: string; model?: string };
}

export type RadarFailureCode = "INVALID_CANDIDATE" | "CONFIG_INVALID";

export class RadarError extends Error {
  readonly code: RadarFailureCode;
  constructor(code: RadarFailureCode, message: string) {
    super(message);
    this.name = "RadarError";
    this.code = code;
  }
}
