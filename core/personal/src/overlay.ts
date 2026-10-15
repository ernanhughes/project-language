// Chapter 24: the person changes during the day. A scoped, expiring overlay, and no inference of inner state.
//
//   Communication POLICY can persist. Communication STATE should usually not.
//
// An overlay is the bounded application of a standing policy, the current context and an explicit temporary instruction.
// It ends with its scope, it sheds its effects when it ends, and it never becomes a durable trait on its own. Promotion to a
// standing policy is a separate act that only a person can perform.
import { invalidateDependents, type ProvenanceSink } from "./deps.ts";
import { validateRecord, type PersonalState } from "./state.ts";
import {
  PersonalError, type Actor, type DeclaredPolicy, type Dimension, type InferredBelief, type ObservedInteraction, type PersonalEvent, type SessionOverlay,
} from "./types.ts";

export function createOverlay(i: {
  id: string; session: string; scope: string; now: string; person: { ref: string; utterance_ref: string };
  decisions: string[]; effects?: string[]; depends_on?: string[]; ends: { at?: string | null; when?: string | null };
}): SessionOverlay {
  return validateRecord({
    id: i.id, kind: "session_overlay", origin: "declared", key: `overlay:${i.session}`, scope: i.scope,
    valid: { from: i.now, until: i.ends.at ?? null }, recorded_at: i.now,
    source: { by: "person", ref: i.person.ref }, authority_ref: i.person.utterance_ref,
    session: i.session, ends: { at: i.ends.at ?? null, when: i.ends.when ?? null }, decisions: i.decisions, effects: i.effects ?? [],
    ...(i.depends_on ? { depends_on: i.depends_on } : {}),
  }) as SessionOverlay;
}

/**
 * A task condition the channel may OFFER as visible, correctable context ("comparing these interfaces?"). It is an inference,
 * provisional, scoped, and it expires with its scope. An inner state is not a task condition and is refused by validation.
 */
export function proposeTaskCondition(i: {
  id: string; by: Actor; scope: string; now: string; proposition: string; evidence_refs: string[]; until: string | null;
}): InferredBelief {
  return validateRecord({
    id: i.id, kind: "inferred_belief", origin: "inferred", key: `task:${i.scope}`, scope: i.scope,
    valid: { from: i.now, until: i.until }, recorded_at: i.now, source: i.by, authority_ref: null,
    belief_kind: "task_condition", proposition: i.proposition, evidence_refs: i.evidence_refs,
    supported_scope: i.scope, applied_scope: i.scope, standing: "provisional", confidence: "low", consequence: "low",
  }) as InferredBelief;
}

/** Behaviour seen while an overlay was active keeps that condition. It is evidence about that interaction, not about the person. */
export function observeUnderOverlay(i: {
  id: string; scope: string; now: string; evidence_id: string; behaviour: string; overlay: SessionOverlay; extra_conditions?: string[];
}): ObservedInteraction {
  return validateRecord({
    id: i.id, kind: "observed_interaction", origin: "observed", key: `observed:${i.behaviour}`, scope: i.scope,
    valid: { from: i.now, until: null }, recorded_at: i.now, source: { by: "system", ref: "interaction-observer" }, authority_ref: null,
    evidence_id: i.evidence_id, behaviour: i.behaviour,
    conditions: [`under overlay ${i.overlay.id}`, ...i.overlay.decisions, ...(i.extra_conditions ?? [])], produced_under: i.overlay.id,
    depends_on: [i.overlay.id],
  }) as ObservedInteraction;
}

/** What temporary behaviour may become: a proposal for a person to consider. Never a declaration, never a policy. */
export function proposeFromObservations(i: { id: string; now: string; scope: string; observations: ObservedInteraction[]; proposition: string; by: Actor }): InferredBelief {
  if (i.observations.length === 0) throw new PersonalError("NO_EVIDENCE", "a proposal needs the observations it rests on");
  return validateRecord({
    id: i.id, kind: "inferred_belief", origin: "inferred", key: `proposal:${i.proposition}`, scope: i.scope,
    valid: { from: i.now, until: null }, recorded_at: i.now, source: i.by, authority_ref: null,
    belief_kind: "preference", proposition: i.proposition, evidence_refs: i.observations.map(o => o.evidence_id),
    // supported only within the conditions the evidence arose under
    supported_scope: i.scope, applied_scope: i.scope, standing: "proposed", confidence: "low", consequence: "medium",
    depends_on: i.observations.map(o => o.id),
  }) as InferredBelief;
}

export interface Promotion { policy: DeclaredPolicy }
/**
 * Make a proposal a standing rule. This is a NEW declaration with its own scope and authority, made by a person who says so.
 * A model, the system, or "the pattern was strong" cannot do it.
 */
export function promoteToPolicy(i: {
  id: string; now: string; scope: string; person: { ref: string; utterance_ref: string }; actor: Actor;
  settings: Partial<Record<Dimension, string>>; preserve: string[]; from_proposal: string;
}): Promotion {
  if (i.actor.by !== "person") throw new PersonalError("PROMOTION_REQUIRES_HUMAN_ACTION", `a ${i.actor.by} cannot promote a proposal into a standing policy`);
  const policy = validateRecord({
    id: i.id, kind: "declared_policy", origin: "declared", key: `policy:${i.scope}`, scope: i.scope,
    valid: { from: i.now, until: null }, recorded_at: i.now, source: { by: "person", ref: i.person.ref }, authority_ref: i.person.utterance_ref,
    settings: i.settings, preserve: i.preserve, depends_on: [i.from_proposal],
  }) as DeclaredPolicy;
  return { policy };
}

export interface OverlayEnd { events: PersonalEvent[]; invalidated: string[]; promoted: false }
/**
 * Ending an overlay sheds it and its effects. Discarding the overlay record alone is not enough: anything that depended on it
 * (a cached presentation plan, a behaviour observed under it) is invalidated for current use. Nothing is promoted.
 */
export function endOverlay(state: PersonalState, id: string, now: string, reason: string, sink?: ProvenanceSink): OverlayEnd {
  const e = state.entries.get(id);
  if (!e || e.record.kind !== "session_overlay") throw new PersonalError("NOT_AN_OVERLAY", id);
  const events: PersonalEvent[] = [{ type: "overlay_ended", at: now, id, reason }];
  const inv = invalidateDependents(state, id, now, `overlay ${id} ended: ${reason}`, sink);
  return { events: [...events, ...inv.events], invalidated: [...inv.direct, ...inv.transitive], promoted: false };
}
