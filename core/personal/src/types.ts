// Part III: personal mediation. The vocabulary.
//
// No host, model, clock, storage or network access here. Records are DISCRIMINATED: each kind has its own fields, so the
// distinctions the chapters draw are in the types, not in comments. There is deliberately no profile, no person-type, no
// score that combines kinds, and no field that could hold an inferred inner state.

/** Where a record came from. Authority runs in this order and inference may propose but never establish. */
export type Origin = "declared" | "observed" | "inferred";

export type Actor =
  | { by: "person"; ref: string }   // something the person said or accepted, with a reference to where
  | { by: "system"; ref: string }   // something the system saw or did
  | { by: "model"; ref: string };   // something a model said; never a human declaration

/** The independent presentation dimensions of Chapter 21. There is no slot for a type of person. */
export const DIMENSIONS = ["depth", "form", "explanation", "order", "evidence", "interaction", "technicality", "navigation"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

/** Free-text scope, e.g. "architecture-review". Always present; nothing here is global by default. */
export type Scope = string;

/** The interval during which a record's proposition is meant to describe the world. `until: null` is open. */
export interface Interval { from: string; until: string | null }

interface Base {
  id: string;
  /** Used to group records that make claims about the same thing, so supersession and contradiction can be told apart. */
  key: string;
  scope: Scope;
  /** When this record applies to the world. Retention and applicability are different questions. */
  valid: Interval;
  recorded_at: string;
  source: Actor;
  /** The authority under which it was recorded: a person's utterance ref, a grant id. Null only for observations. */
  authority_ref: string | null;
  /** The record this one replaces for present use. The earlier record stays in history. */
  supersedes?: string;
  /** Records whose conditions this record's meaning depends on (e.g. the overlay under which a behaviour was seen). */
  depends_on?: string[];
}

export interface DeclaredPreference extends Base {
  kind: "declared_preference"; origin: "declared";
  dimension: Dimension; setting: string;
}
export interface DeclaredPolicy extends Base {
  kind: "declared_policy"; origin: "declared";
  /** Independent settings, one per dimension. A rule for a kind of task, not a description of a person. */
  settings: Partial<Record<Dimension, string>>;
  /** Content that must survive any presentation under this policy. */
  preserve: string[];
}
export interface AccessibilityRequirement extends Base {
  kind: "accessibility_requirement"; origin: "declared";
  requirement: string;
  /** Forms this requirement excludes from every view. A constraint, never weighed against a benefit. */
  forbid_forms: string[];
  require_forms: string[];
}
export interface ObservedInteraction extends Base {
  kind: "observed_interaction"; origin: "observed";
  /** The core/evidence record this observation is an instance of. Observations are evidence, not statements about preference. */
  evidence_id: string;
  behaviour: string;
  /** The conditions under which it happened. They stay attached: behaviour under an overlay is evidence about that interaction. */
  conditions: string[];
  produced_under: string | null;
}

/** What an inference may be about. Person types, personality and inner states are not in this list and cannot be represented. */
export const BELIEF_KINDS = ["task_condition", "knowledge", "preference", "strategy", "expertise"] as const;
export type BeliefKind = (typeof BELIEF_KINDS)[number];
export type Consequence = "low" | "medium" | "high";
export type BeliefStanding = "proposed" | "provisional" | "confirmed" | "rejected" | "withdrawn";

export interface InferredBelief extends Base {
  kind: "inferred_belief"; origin: "inferred";
  belief_kind: BeliefKind;
  proposition: string;
  evidence_refs: string[];
  /** What the evidence supports, and where it is being used. Using it beyond the first is a new inference. */
  supported_scope: Scope;
  applied_scope: Scope;
  standing: BeliefStanding;
  /** Qualifies the interpretation. It is not authority and nothing here lets it become authority. */
  confidence: "low" | "moderate" | "high";
  consequence: Consequence;
}

/** A scoped, expiring set of decisions derived from the current request. Not a second standing policy. */
export interface SessionOverlay extends Base {
  kind: "session_overlay"; origin: "declared";
  /** Named session or task whose end ends the overlay. */
  session: string;
  ends: { at: string | null; when: string | null };
  decisions: string[];
  /** Presentation effects this overlay caused. Ending the overlay invalidates them. */
  effects: string[];
}

export const INTERVENTIONS = ["reminder", "confirmation", "delay", "block"] as const;
export type Intervention = (typeof INTERVENTIONS)[number];
export interface FrictionContract extends Base {
  kind: "friction_contract"; origin: "declared";
  goal: string;
  target_action: string;
  /** The intervention the person supplied or accepted. A goal alone authorises none. */
  allowed_intervention: Intervention | null;
  override: string;
  expires: { at: string | null; when: string | null };
}

export interface PortableBoundary extends Base {
  kind: "portable_boundary"; origin: "declared";
  version: number;
  destinations: string[];
  effect: { action: "hold_out"; category: string; surfaces: string[] };
  preserve: string[];
  override: string;
  end: { at: string | null; when: string | null };
  /** Behaviour produced under this boundary may not become durable preference evidence. */
  persistence: "no-promotion";
}

export type PersonalRecord =
  | DeclaredPreference | DeclaredPolicy | AccessibilityRequirement | ObservedInteraction
  | InferredBelief | SessionOverlay | FrictionContract | PortableBoundary;
export type RecordKind = PersonalRecord["kind"];

/** Appended facts about records. State is the reduction of these; nothing is overwritten. */
export type PersonalEvent =
  | { type: "added"; at: string; record: PersonalRecord }
  | { type: "superseded"; at: string; id: string; by: string }
  | { type: "corrected"; at: string; id: string; by: string; reason: string }
  | { type: "retracted"; at: string; id: string; reason: string; by: Actor }
  | { type: "expired"; at: string; id: string }
  | { type: "overlay_ended"; at: string; id: string; reason: string }
  | { type: "belief_rejected"; at: string; id: string; reason: string; by: Actor }
  | { type: "rederivation_blocked"; at: string; proposition_key: string; scope: Scope; by: Actor }
  | { type: "artifact_registered"; at: string; id: string; depends_on: string[] }
  | { type: "artifact_invalidated"; at: string; id: string; because: string }
  | { type: "friction_overridden"; at: string; id: string; action: string }
  | { type: "optional_disabled"; at: string; scope: Scope; by: Actor }
  | { type: "optional_enabled"; at: string; scope: Scope; by: Actor };

export class PersonalError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(`${code}: ${message}`); this.name = "PersonalError"; this.code = code; }
}

export type Clock = () => string;
export const parseTime = (iso: string, what: string): number => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new PersonalError("INVALID_TIME", `${what} is not a time: ${JSON.stringify(iso)}`);
  return t;
};
/** Deterministic ids for tests and examples: `prefix-1`, `prefix-2`, ... per generator. */
export function counterIds(): (prefix: string) => string {
  const n = new Map<string, number>();
  return (prefix) => { const k = (n.get(prefix) ?? 0) + 1; n.set(prefix, k); return `${prefix}-${k}`; };
}
