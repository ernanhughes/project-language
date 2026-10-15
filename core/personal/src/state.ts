// Validation of records and events, and the reduction of events into state.
//
// A record that fails validation is refused with a code, never repaired. The rules here are what keep the distinctions of
// Chapters 21 to 23 from collapsing: a declaration needs a person, a model's statement can only be an inference, an
// inference cannot be about a person-type or an inner state, and nothing carries a benefit or performance claim.
import { EVIDENCE_ID_PATTERN } from "../../evidence/src/schema.ts";
import {
  BELIEF_KINDS, DIMENSIONS, INTERVENTIONS, PersonalError, parseTime,
  type PersonalEvent, type PersonalRecord, type RecordKind,
} from "./types.ts";

/** Words that name a stable type of person or an inner state. Not representable, and not accepted in a proposition. */
export const PERSON_TYPE_WORDS = ["learning style", "visual learner", "auditory learner", "kind of person", "type of person", "personality", "introvert", "extrovert", "persona"];
export const INNER_STATE_WORDS = ["stressed", "stress", "tired", "fatigued", "fatigue", "frustrated", "anxious", "anxiety", "mood", "emotional", "unmotivated", "motivation", "impatient", "overwhelmed", "bored"];
/** Fields that would turn a preference into a performance claim, or a record into a profile. */
const FORBIDDEN_FIELDS = ["benefit", "performance", "improves", "effectiveness", "outcome", "score", "personality", "person_type", "learning_style", "trait", "profile", "mood", "stress", "fatigue", "motivation", "persona"];
const INNER_KINDS = ["mood", "stress", "fatigue", "motivation", "emotion", "inner_state", "personality_state"];
const TYPE_KINDS = ["person_type", "personality", "learning_style", "trait", "persona", "profile"];

const COMMON = ["id", "kind", "origin", "key", "scope", "valid", "recorded_at", "source", "authority_ref", "supersedes", "depends_on"];
const FIELDS: Record<RecordKind, string[]> = {
  declared_preference: [...COMMON, "dimension", "setting"],
  declared_policy: [...COMMON, "settings", "preserve"],
  accessibility_requirement: [...COMMON, "requirement", "forbid_forms", "require_forms"],
  observed_interaction: [...COMMON, "evidence_id", "behaviour", "conditions", "produced_under"],
  inferred_belief: [...COMMON, "belief_kind", "proposition", "evidence_refs", "supported_scope", "applied_scope", "standing", "confidence", "consequence"],
  session_overlay: [...COMMON, "session", "ends", "decisions", "effects"],
  friction_contract: [...COMMON, "goal", "target_action", "allowed_intervention", "override", "expires"],
  portable_boundary: [...COMMON, "version", "destinations", "effect", "preserve", "override", "end", "persistence"],
};
const ORIGIN_OF: Record<RecordKind, string> = {
  declared_preference: "declared", declared_policy: "declared", accessibility_requirement: "declared",
  observed_interaction: "observed", inferred_belief: "inferred", session_overlay: "declared",
  friction_contract: "declared", portable_boundary: "declared",
};

const fail = (code: string, detail: string): never => { throw new PersonalError(code, detail); };
const str = (v: unknown, name: string): string => (typeof v === "string" && v.trim() ? v : fail("MALFORMED", `${name} must be a non-empty string`));
const arr = (v: unknown, name: string): unknown[] => (Array.isArray(v) ? v : fail("MALFORMED", `${name} must be an array`));
const strs = (v: unknown, name: string): string[] => arr(v, name).map((x, i) => str(x, `${name}[${i}]`));
const obj = (v: unknown, name: string): Record<string, unknown> => (v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : fail("MALFORMED", `${name} must be an object`));
const endOf = (v: unknown, name: string, code: string): void => {
  const o = obj(v, name);
  const at = o.at ?? null, when = o.when ?? null;
  if (at === null && when === null) fail(code, `${name} needs an end time or an end condition: nothing here ends by itself`);
  if (at !== null) parseTime(str(at, `${name}.at`), `${name}.at`);
  if (when !== null) str(when, `${name}.when`);
};

const containsAny = (text: string, words: readonly string[]): string | undefined => words.find(w => new RegExp(`\\b${w}\\b`, "i").test(text));

/** Validate an unknown value as a PersonalRecord. Throws PersonalError with a code; never repairs. */
export function validateRecord(raw: unknown): PersonalRecord {
  const r = obj(raw, "record");
  const kind = r.kind as RecordKind;
  if (!(kind in FIELDS)) fail("UNKNOWN_KIND", String(r.kind));
  for (const k of Object.keys(r)) {
    if (FORBIDDEN_FIELDS.includes(k)) fail("FORBIDDEN_FIELD", `"${k}" would make this a performance claim or a profile`);
    if (!FIELDS[kind].includes(k)) fail("UNKNOWN_FIELD", `"${k}" is not a field of ${kind}`);
  }
  if (r.origin !== ORIGIN_OF[kind]) fail("ORIGIN_MISMATCH", `${kind} has origin ${ORIGIN_OF[kind]}, not ${String(r.origin)}`);
  str(r.id, "id"); str(r.key, "key"); str(r.scope, "scope");
  const valid = obj(r.valid, "valid");
  const from = parseTime(str(valid.from, "valid.from"), "valid.from");
  if (valid.until !== null && parseTime(str(valid.until, "valid.until"), "valid.until") <= from) fail("INTERVAL_EMPTY", "valid.until is not after valid.from");
  parseTime(str(r.recorded_at, "recorded_at"), "recorded_at");
  const src = obj(r.source, "source");
  if (!["person", "system", "model"].includes(src.by as string)) fail("MALFORMED", "source.by");
  str(src.ref, "source.ref");
  // Origin determines what a record may claim to be.
  if (r.origin === "declared") {
    if (src.by !== "person") fail("DECLARATION_REQUIRES_PERSON", `a ${String(src.by)} cannot make a declaration; a model's statement can only be an inference`);
    if (typeof r.authority_ref !== "string" || !r.authority_ref.trim()) fail("DECLARATION_REQUIRES_AUTHORITY", "a declaration cites the person's utterance or grant");
  }
  if (r.origin === "observed" && src.by !== "system") fail("OBSERVATION_REQUIRES_SYSTEM", "an observation is something the system saw");
  if (r.origin === "inferred" && src.by === "person") fail("INFERENCE_NOT_BY_PERSON", "what a person says is a declaration, not an inference");
  if (r.depends_on !== undefined) strs(r.depends_on, "depends_on");

  switch (kind) {
    case "declared_preference":
      if (!(DIMENSIONS as readonly string[]).includes(r.dimension as string)) fail("UNKNOWN_DIMENSION", String(r.dimension));
      str(r.setting, "setting"); break;
    case "declared_policy": {
      const s = obj(r.settings, "settings");
      for (const [d, v] of Object.entries(s)) { if (!(DIMENSIONS as readonly string[]).includes(d)) fail("UNKNOWN_DIMENSION", d); str(v, `settings.${d}`); }
      if (Object.keys(s).length === 0) fail("MALFORMED", "a policy needs at least one setting");
      strs(r.preserve, "preserve"); break;
    }
    case "accessibility_requirement": str(r.requirement, "requirement"); strs(r.forbid_forms, "forbid_forms"); strs(r.require_forms, "require_forms"); break;
    case "observed_interaction":
      if (typeof r.evidence_id !== "string" || !EVIDENCE_ID_PATTERN.test(r.evidence_id)) fail("OBSERVATION_NEEDS_EVIDENCE", "an observation cites a core/evidence record");
      str(r.behaviour, "behaviour"); strs(r.conditions, "conditions");
      if (r.produced_under !== null) str(r.produced_under, "produced_under");
      break;
    case "inferred_belief": {
      const bk = String(r.belief_kind);
      if (INNER_KINDS.includes(bk)) fail("INNER_STATE_INFERENCE_REJECTED", `"${bk}" is an inner state; inferring it is excluded, not merely discouraged`);
      if (TYPE_KINDS.includes(bk)) fail("PERSON_TYPE_REJECTED", `"${bk}" is a stable type of person; the schema has nowhere to store one`);
      if (!(BELIEF_KINDS as readonly string[]).includes(bk)) fail("UNKNOWN_BELIEF_KIND", bk);
      const p = str(r.proposition, "proposition");
      const inner = containsAny(p, INNER_STATE_WORDS); if (inner) fail("INNER_STATE_INFERENCE_REJECTED", `the proposition names an inner state ("${inner}")`);
      const typ = containsAny(p, PERSON_TYPE_WORDS); if (typ) fail("PERSON_TYPE_REJECTED", `the proposition names a person-type ("${typ}")`);
      strs(r.evidence_refs, "evidence_refs"); str(r.supported_scope, "supported_scope"); str(r.applied_scope, "applied_scope");
      if (!["proposed", "provisional"].includes(r.standing as string)) fail("INFERENCE_CANNOT_START_ESTABLISHED", "an inference begins as a proposal or provisional; only a person's act changes that");
      if (!["low", "moderate", "high"].includes(r.confidence as string)) fail("MALFORMED", "confidence");
      if (!["low", "medium", "high"].includes(r.consequence as string)) fail("MALFORMED", "consequence");
      break;
    }
    case "session_overlay":
      str(r.session, "session"); endOf(r.ends, "ends", "OVERLAY_NEEDS_END"); strs(r.decisions, "decisions"); strs(r.effects, "effects"); break;
    case "friction_contract":
      str(r.goal, "goal"); str(r.target_action, "target_action"); str(r.override, "override"); endOf(r.expires, "expires", "FRICTION_NEEDS_EXPIRY");
      if (r.allowed_intervention !== null && !(INTERVENTIONS as readonly string[]).includes(r.allowed_intervention as string)) fail("UNKNOWN_INTERVENTION", String(r.allowed_intervention));
      break;
    case "portable_boundary":
      if (!Number.isInteger(r.version) || (r.version as number) < 1) fail("MALFORMED", "version");
      if (strs(r.destinations, "destinations").length === 0) fail("MALFORMED", "a boundary names where it may apply");
      { const e = obj(r.effect, "effect"); if (e.action !== "hold_out") fail("UNKNOWN_EFFECT", String(e.action)); str(e.category, "effect.category"); if (strs(e.surfaces, "effect.surfaces").length === 0) fail("MALFORMED", "effect.surfaces"); }
      strs(r.preserve, "preserve"); str(r.override, "override"); endOf(r.end, "end", "BOUNDARY_NEEDS_END");
      if (r.persistence !== "no-promotion") fail("BOUNDARY_MUST_FORBID_PROMOTION", "behaviour under a temporary boundary may not become durable preference evidence");
      break;
  }
  return r as unknown as PersonalRecord;
}

export function validateEvent(raw: unknown): PersonalEvent {
  const e = obj(raw, "event");
  const type = e.type;
  parseTime(str(e.at, "at"), "at");
  switch (type) {
    case "added": validateRecord(e.record); break;
    case "superseded": case "corrected": str(e.id, "id"); str(e.by, "by"); break;
    case "retracted": case "belief_rejected": {
      str(e.id, "id"); str(e.reason, "reason");
      const by = obj(e.by, "by"); if (by.by !== "person") fail("RETRACTION_REQUIRES_PERSON", "only a person retracts or rejects"); str(by.ref, "by.ref"); break;
    }
    case "expired": str(e.id, "id"); break;
    case "overlay_ended": str(e.id, "id"); str(e.reason, "reason"); break;
    case "rederivation_blocked": case "optional_disabled": case "optional_enabled": {
      if (type === "rederivation_blocked") str(e.proposition_key, "proposition_key");
      str(e.scope, "scope"); const by = obj(e.by, "by"); if (by.by !== "person") fail("CONTROL_REQUIRES_PERSON", "only a person disables, enables or blocks"); break;
    }
    case "friction_overridden": str(e.id, "id"); str(e.action, "action"); break;
    case "artifact_registered": str(e.id, "id"); strs(e.depends_on, "depends_on"); break;
    case "artifact_invalidated": str(e.id, "id"); str(e.because, "because"); break;
    default: fail("UNKNOWN_EVENT", String(type));
  }
  return e as unknown as PersonalEvent;
}

// ─── state ────────────────────────────────────────────────────────────────────────────────────────
export type Status = "active" | "superseded" | "corrected" | "retracted" | "expired" | "ended" | "rejected";
export interface Entry { record: PersonalRecord; status: Status; replaced_by?: string; note?: string }
export interface PersonalState {
  entries: Map<string, Entry>;
  /** Everything that happened, in order. History is never rewritten. */
  history: PersonalEvent[];
  disabled_scopes: Set<string>;
  /** Propositions a person has blocked from being derived again in a scope. Forgetting is a separate operation. */
  blocked: { proposition_key: string; scope: string }[];
  overrides: Map<string, number>;
  /** Cached derived artifacts (presentation plans), what they depend on, and whether they are still valid. */
  artifacts: Map<string, { depends_on: string[]; valid: boolean; because?: string }>;
  /** Records or artifacts invalidated for current use because something they depended on changed. History is untouched. */
  invalidated: Map<string, string>;
}

export function emptyState(): PersonalState {
  return { entries: new Map(), history: [], disabled_scopes: new Set(), blocked: [], overrides: new Map(), artifacts: new Map(), invalidated: new Map() };
}

/** Pure reduction. Events that do not apply are ignored and reported by the caller through `validateEvent`, not guessed at. */
export function reduce(events: readonly PersonalEvent[]): PersonalState {
  const s = emptyState();
  for (const ev of events) {
    s.history.push(ev);
    switch (ev.type) {
      case "added": {
        if (s.entries.has(ev.record.id)) break; // an id is added once; a second add does not replace
        s.entries.set(ev.record.id, { record: ev.record, status: "active" });
        if (ev.record.supersedes) { const old = s.entries.get(ev.record.supersedes); if (old && old.status === "active") { old.status = "superseded"; old.replaced_by = ev.record.id; } }
        break;
      }
      case "superseded": { const e = s.entries.get(ev.id); if (e && e.status === "active") { e.status = "superseded"; e.replaced_by = ev.by; } break; }
      case "corrected": { const e = s.entries.get(ev.id); if (e && e.status === "active") { e.status = "corrected"; e.replaced_by = ev.by; e.note = ev.reason; } break; }
      case "retracted": { const e = s.entries.get(ev.id); if (e && e.status !== "retracted") { e.status = "retracted"; e.note = ev.reason; } break; }
      case "belief_rejected": { const e = s.entries.get(ev.id); if (e) { e.status = "rejected"; e.note = ev.reason; } break; }
      case "expired": { const e = s.entries.get(ev.id); if (e && e.status === "active") e.status = "expired"; break; }
      case "overlay_ended": { const e = s.entries.get(ev.id); if (e && e.status === "active") { e.status = "ended"; e.note = ev.reason; } break; }
      case "rederivation_blocked": s.blocked.push({ proposition_key: ev.proposition_key, scope: ev.scope }); break;
      case "friction_overridden": s.overrides.set(ev.id, (s.overrides.get(ev.id) ?? 0) + 1); break;
      case "artifact_registered": s.artifacts.set(ev.id, { depends_on: ev.depends_on, valid: true }); break;
      case "artifact_invalidated": { const a = s.artifacts.get(ev.id); if (a) { a.valid = false; a.because = ev.because; } s.invalidated.set(ev.id, ev.because); break; }
      case "optional_disabled": s.disabled_scopes.add(ev.scope); break;
      case "optional_enabled": s.disabled_scopes.delete(ev.scope); break;
    }
  }
  return s;
}
