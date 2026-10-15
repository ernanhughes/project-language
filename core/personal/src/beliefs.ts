// Chapter 27: what the system believes about you must be visible, and visible is not valid and not authorised.
//
//   visible != valid != authorised        scope expansion = new inference
//
// A consequential belief exposes its origin, evidence, supported and applied scope, standing, confidence (separately from
// authority), the authority decision, and what it changed. Correction appends a revision and reaches everything that depended
// on the belief. Forgetting a record and preventing it from being derived again are different operations.
import { assess, authorizeUse, scopeCovers, type Context, type UseDecision } from "./applicability.ts";
import { dependents, invalidateDependents, type ProvenanceSink } from "./deps.ts";
import { validateRecord, type PersonalState } from "./state.ts";
import type { AuthorityPolicy } from "../../authority/src/engine/types.ts";
import { PersonalError, type Actor, type Consequence, type InferredBelief, type PersonalEvent, type PersonalRecord } from "./types.ts";

export interface BeliefView {
  id: string;
  proposition: string;
  origin: "inferred";
  provenance: { by: Actor; recorded_at: string; evidence_refs: string[] };
  supported_scope: string;
  applied_scope: string;
  scope_expanded: boolean;
  standing: InferredBelief["standing"];
  /** How sure the interpretation is. Not authority, and unrelated to the authority decision below. */
  confidence: InferredBelief["confidence"];
  consequence: Consequence;
  /** Can the person inspect it? Always, here. */
  visible: true;
  /** Does the evidence support it in this scope, now? */
  valid: { ok: boolean; why: string };
  /** May this use be made? Decided by core/authority; never by confidence. */
  authority: { allowed: boolean; verdict: string; why: string; receipt_id: string };
  /** What changed because of it: the cached or derived state that depends on it, directly and through other dependents. */
  consequences: { direct: string[]; transitive: string[] };
}

export function inspectBeliefs(state: PersonalState, ctx: Context, auth: { policy: AuthorityPolicy; purpose: string }): BeliefView[] {
  const out: BeliefView[] = [];
  for (const [id, e] of state.entries) {
    if (e.record.kind !== "inferred_belief") continue;
    const b = e.record; const a = assess(state, id, ctx);
    const expanded = !scopeCovers(b.supported_scope, b.applied_scope);
    const use: UseDecision = authorizeUse(b, "REUSE", auth.purpose, auth.policy, ctx.now);
    out.push({
      id, proposition: b.proposition, origin: "inferred",
      provenance: { by: b.source, recorded_at: b.recorded_at, evidence_refs: b.evidence_refs },
      supported_scope: b.supported_scope, applied_scope: b.applied_scope, scope_expanded: expanded, standing: b.standing,
      confidence: b.confidence, consequence: b.consequence, visible: true,
      valid: { ok: a.applicable && !expanded, why: expanded ? "used outside the scope its evidence supports: a new inference" : a.reasons.join("; ") },
      authority: { allowed: use.allowed, verdict: use.verdict, why: use.why, receipt_id: use.receipt.receipt_id },
      consequences: dependents(state, id),
    });
  }
  return out;
}

export interface ScopeCheck { ok: boolean; code: "OK" | "SCOPE_EXPANSION_IS_NEW_INFERENCE"; why: string }
/** Using a belief outside the scope its evidence supports is itself a new inference with its own provenance and standing. */
export function checkScope(b: InferredBelief, useScope: string): ScopeCheck {
  return scopeCovers(b.supported_scope, useScope)
    ? { ok: true, code: "OK", why: "within the supported scope" }
    : { ok: false, code: "SCOPE_EXPANSION_IS_NEW_INFERENCE", why: `evidence supports "${b.supported_scope}"; using it for "${useScope}" is a new inference and inherits no support from the old one` };
}

/** Make the expansion explicit: a NEW provisional inference that depends on the old one, with its own evidence. */
export function expandScope(b: InferredBelief, i: { id: string; now: string; new_scope: string; evidence_refs: string[]; by: Actor }): InferredBelief {
  if (i.evidence_refs.length === 0) throw new PersonalError("NEW_INFERENCE_NEEDS_EVIDENCE", "a wider use needs its own evidence; the narrow belief's support does not carry over");
  return validateRecord({
    id: i.id, kind: "inferred_belief", origin: "inferred", key: b.key, scope: b.scope, valid: { from: i.now, until: null }, recorded_at: i.now,
    source: i.by, authority_ref: null, belief_kind: b.belief_kind, proposition: b.proposition, evidence_refs: i.evidence_refs,
    supported_scope: i.new_scope, applied_scope: i.new_scope, standing: "proposed", confidence: "low", consequence: b.consequence, depends_on: [b.id],
  }) as InferredBelief;
}

/** The greater the consequence, the more evidence and the more confirmation. Stronger evidence never supplies missing authority. */
export function consequenceBar(level: Consequence): { min_evidence: number; person_confirmation: boolean; note: string } {
  return level === "low" ? { min_evidence: 1, person_confirmation: false, note: "adds a route (for example a table beside prose)" }
    : level === "medium" ? { min_evidence: 2, person_confirmation: false, note: "changes emphasis or order; reversible" }
    : { min_evidence: 2, person_confirmation: true, note: "removes a route (folds an explanation); a mistake can strand the reader" };
}
export function mayChangeCommunication(b: InferredBelief, confirmedByPerson: boolean): { ok: boolean; why: string } {
  const bar = consequenceBar(b.consequence);
  if (b.evidence_refs.length < bar.min_evidence) return { ok: false, why: `${b.consequence} consequence needs ${bar.min_evidence} evidence reference(s); has ${b.evidence_refs.length}` };
  if (bar.person_confirmation && !confirmedByPerson) return { ok: false, why: `${b.consequence} consequence needs the person's confirmation; confidence "${b.confidence}" does not supply it` };
  return { ok: true, why: "the evidence and confirmation bar for this consequence is met; this says nothing about authority, which is decided separately" };
}

// ─── correction ───────────────────────────────────────────────────────────────────────────────────
export interface RepairReport {
  /** The record itself, repaired. */
  record_corrected: boolean;
  /** The use stopped, locally, in the named scope. */
  future_use_stopped: boolean;
  /** Cached and derived state that depended on the belief: invalidated now, recomputed only when something recomputes it. */
  downstream: { invalidated: string[]; recomputed: boolean };
  /** What was already shown or acted on. Never reversible. */
  past_effect_reversed: false;
  unconfirmed: string[];
  events: PersonalEvent[];
}

/**
 * A person corrects a belief. Appends a rejection (history stays), optionally a replacement they supply, and invalidates every
 * direct and transitive dependent so it cannot keep shaping the view. It does not claim the past was different.
 */
export function correctBelief(
  state: PersonalState,
  i: { id: string; now: string; by: Actor; reason: string; replacement?: PersonalRecord; unreachable_dependents?: string[] },
  sink?: ProvenanceSink,
): RepairReport {
  if (i.by.by !== "person") throw new PersonalError("CORRECTION_REQUIRES_PERSON", "only a person corrects a belief about herself");
  const e = state.entries.get(i.id);
  if (!e || e.record.kind !== "inferred_belief") throw new PersonalError("NOT_A_BELIEF", i.id);
  const events: PersonalEvent[] = [{ type: "belief_rejected", at: i.now, id: i.id, reason: i.reason, by: i.by }];
  if (i.replacement) {
    const rep = validateRecord(i.replacement);
    if (rep.source.by !== "person") throw new PersonalError("REPLACEMENT_REQUIRES_PERSON", "a replacement supplied in a correction is the person's own statement");
    events.push({ type: "added", at: i.now, record: rep });
    events.push({ type: "corrected", at: i.now, id: i.id, by: rep.id, reason: i.reason });
  }
  const inv = invalidateDependents(state, i.id, i.now, `belief ${i.id} corrected: ${i.reason}`, sink);
  return {
    record_corrected: true, future_use_stopped: true, downstream: { invalidated: [...inv.direct, ...inv.transitive], recomputed: false },
    past_effect_reversed: false, unconfirmed: i.unreachable_dependents ?? [], events: [...events, ...inv.events],
  };
}

// ─── forgetting and re-derivation are separate ────────────────────────────────────────────────────
/** Forgetting retracts the retained item. It does not stop the same proposition from being derived again from evidence. */
export function forgetBelief(state: PersonalState, id: string, now: string, by: Actor, reason: string): { events: PersonalEvent[]; rederivation_blocked: false; evidence_retained: boolean } {
  if (by.by !== "person") throw new PersonalError("FORGET_REQUIRES_PERSON", "only a person asks the system to forget");
  const e = state.entries.get(id);
  if (!e) throw new PersonalError("NOT_FOUND", id);
  const b = e.record.kind === "inferred_belief" ? e.record : null;
  return { events: [{ type: "retracted", at: now, id, reason, by }], rederivation_blocked: false, evidence_retained: !!b && b.evidence_refs.length > 0 };
}
export function blockRederivation(state: PersonalState, key: string, scope: string, now: string, by: Actor): PersonalEvent[] {
  if (by.by !== "person") throw new PersonalError("BLOCK_REQUIRES_PERSON", "only a person blocks a future derivation");
  void state; return [{ type: "rederivation_blocked", at: now, proposition_key: key, scope, by }];
}
/** The gate every new proposal passes: a derivation the person blocked in this scope is refused, whatever the evidence says. */
export function gateProposal(state: PersonalState, b: InferredBelief): { accepted: boolean; why: string } {
  const blocked = state.blocked.find(x => x.proposition_key === b.key && scopeCovers(x.scope, b.applied_scope));
  return blocked ? { accepted: false, why: `the person blocked "${b.key}" in "${blocked.scope}"; a synonymous proposal is not a new basis` } : { accepted: true, why: "not blocked" };
}
