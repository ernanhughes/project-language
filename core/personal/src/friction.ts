// Chapter 25: friction is a contract the person wrote.
//
//   user-authored goal != system-inferred benefit        support != control
//
// A goal alone authorises nothing. The intervention, its scope, its override and its expiry are part of the permission. The
// weakest authorised form is used, an override is cheap and changes only that action, and repeated overrides can prompt a
// question but can never raise the strength. Nothing here blocks or watches anything: it decides what may be shown.
import { assess, type Context } from "./applicability.ts";
import { validateRecord, type PersonalState } from "./state.ts";
import { INTERVENTIONS, PersonalError, type FrictionContract, type Intervention, type PersonalEvent } from "./types.ts";

export const strength = (i: Intervention): number => INTERVENTIONS.indexOf(i);

export function createContract(i: {
  id: string; scope: string; now: string; person: { ref: string; utterance_ref: string };
  goal: string; target_action: string; allowed_intervention: Intervention | null; override: string;
  expires: { at?: string | null; when?: string | null }; depends_on?: string[];
}): FrictionContract {
  return validateRecord({
    id: i.id, kind: "friction_contract", origin: "declared", key: `friction:${i.target_action}`, scope: i.scope,
    valid: { from: i.now, until: i.expires.at ?? null }, recorded_at: i.now,
    source: { by: "person", ref: i.person.ref }, authority_ref: i.person.utterance_ref,
    goal: i.goal, target_action: i.target_action, allowed_intervention: i.allowed_intervention, override: i.override,
    expires: { at: i.expires.at ?? null, when: i.expires.when ?? null }, ...(i.depends_on ? { depends_on: i.depends_on } : {}),
  }) as FrictionContract;
}

export interface FrictionDecision {
  intervention: Intervention | "none";
  /** The contract that authorised it, or why nothing applied. */
  contract: string | null;
  /** What the person sees beside the action: the instruction she gave, not a diagnosis of her. */
  message: string | null;
  override: string | null;
  reasons: string[];
  receipt: { mechanism: "deterministic friction decision"; proves: string; does_not_prove: string };
}
const RECEIPT = { mechanism: "deterministic friction decision" as const, proves: "which authorised intervention, if any, the contract permits for this action now", does_not_prove: "that the intervention helps, or that the person was not distracted" };

/**
 * Decide what, if anything, may be added beside `action`. The weakest authorised intervention among the applicable contracts
 * is used. A goal with no authorised intervention yields no friction; the default is ordinary access.
 */
export function decideFriction(state: PersonalState, action: string, ctx: Context): FrictionDecision {
  const reasons: string[] = [];
  const live = [...state.entries.values()]
    .filter((e): e is typeof e & { record: FrictionContract } => e.record.kind === "friction_contract" && e.record.target_action === action)
    .filter(e => { const a = assess(state, e.record.id, ctx); if (!a.applicable) reasons.push(`${e.record.id}: ${a.reasons.join("; ")}`); return a.applicable; });
  if (live.length === 0) return { intervention: "none", contract: null, message: null, override: null, reasons: [...reasons, "no applicable contract: ordinary access"], receipt: RECEIPT };
  const authorised = live.filter(e => e.record.allowed_intervention !== null);
  if (authorised.length === 0) return { intervention: "none", contract: live[0]!.record.id, message: null, override: null, reasons: [...reasons, "a goal is not an authorisation: no intervention was supplied or accepted"], receipt: RECEIPT };
  const weakest = authorised.reduce((a, b) => (strength(a.record.allowed_intervention!) <= strength(b.record.allowed_intervention!) ? a : b)).record;
  return {
    intervention: weakest.allowed_intervention!, contract: weakest.id,
    message: `You asked for ${article(weakest.allowed_intervention!)} ${weakest.allowed_intervention} before ${weakest.target_action}.`,
    override: weakest.override, reasons: [...reasons, `weakest authorised intervention of ${authorised.length}`], receipt: RECEIPT,
  };
}
const article = (i: Intervention) => (i === "reminder" || i === "confirmation" ? "a" : "a");

export interface OverrideReceipt {
  event: PersonalEvent;
  /** An override changes this action. The goal, the contract and the intervention are as they were. */
  goal_changed: false; contract_revoked: false; intervention_changed: false;
  override_count: number;
  /** After several overrides the person may be asked. The strength does not rise. */
  reconsideration: { suggested: boolean; question: string | null };
  conditions: string[];
}
export const RECONSIDER_AFTER = 3;

export function recordOverride(state: PersonalState, contractId: string, action: string, now: string, conditions: string[] = []): OverrideReceipt {
  const e = state.entries.get(contractId);
  if (!e || e.record.kind !== "friction_contract") throw new PersonalError("NOT_A_CONTRACT", contractId);
  const count = (state.overrides.get(contractId) ?? 0) + 1;
  const suggested = count >= RECONSIDER_AFTER;
  return {
    event: { type: "friction_overridden", at: now, id: contractId, action }, goal_changed: false, contract_revoked: false, intervention_changed: false,
    override_count: count, reconsideration: { suggested, question: suggested ? "Keep this reminder, change it, or remove it?" : null },
    // behaviour under an intervention keeps its conditions and is not a vote for more control
    conditions: [`under friction contract ${contractId}`, ...conditions],
  };
}

/** Escalation is never done on the system's initiative. Asking for it returns a refusal naming what would be needed. */
export function proposeEscalation(contract: FrictionContract, to: Intervention): { escalated: false; reason: string } {
  if (contract.allowed_intervention === null) return { escalated: false, reason: "a goal alone authorises no intervention; the person would have to supply one" };
  return { escalated: false, reason: strength(to) > strength(contract.allowed_intervention)
    ? `${to} is stronger than the ${contract.allowed_intervention} the person authorised; repeated overrides do not authorise it, and only a new explicit decision about that form can`
    : `${to} is not stronger than the authorised ${contract.allowed_intervention}` };
}
