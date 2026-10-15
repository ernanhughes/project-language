// Chapter 16: what a person already knows, as narrowly as the chapter allows.
//
// A fact is about a CONCEPT in a SENSE (the meaning the source gives it), with dated evidence. The grade is
// derived from the evidence and is never stored as a fact about the person:
//   KNOWN / PARTIAL / UNKNOWN, where UNKNOWN means "insufficient evidence either way", not "does not know".
//   not observed != not known     mentioned or exposed != mastered     familiar term != known meaning
// Evidence decays, and conflicting evidence is uncertainty. Omission needs BOTH "known in this sense" AND "not needed
// to interpret what is shown". The state is visible, and the person can correct or forget it.
//
// Not here: persistence, a ledger across sessions, or any model of who the person is. The state is a value passed in.
import { parseTime, type Unit } from "./types.ts";

export type Grade = "KNOWN" | "PARTIAL" | "UNKNOWN";
export const EVIDENCE_KINDS = ["stated", "used_correctly", "answered", "asked_explanation", "corrected_system", "worked_with", "exposed", "mistake"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/** Declared policy, in order of strength. Days are how long the evidence is trusted at full strength; after that it counts one grade lower. */
export const EVIDENCE_POLICY: Readonly<Record<Exclude<EvidenceKind, "mistake">, { strength: Grade; trusted_days: number }>> = {
  stated:            { strength: "KNOWN",   trusted_days: 730 },
  used_correctly:    { strength: "KNOWN",   trusted_days: 730 },
  answered:          { strength: "KNOWN",   trusted_days: 365 },
  corrected_system:  { strength: "KNOWN",   trusted_days: 730 },
  worked_with:       { strength: "PARTIAL", trusted_days: 365 },
  asked_explanation: { strength: "PARTIAL", trusted_days: 180 },
  exposed:           { strength: "UNKNOWN", trusted_days: 0 },
};
export const KNOWLEDGE_POLICY_VERSION = "knowledge-policy-v1";

export interface Evidence { kind: EvidenceKind; at: string; ref: string }
export interface KnowledgeFact { concept: string; sense: string; evidence: Evidence[] }
export type KnowledgeState = readonly KnowledgeFact[];

const RANK: Record<Grade, number> = { UNKNOWN: 0, PARTIAL: 1, KNOWN: 2 };
const FROM: Grade[] = ["UNKNOWN", "PARTIAL", "KNOWN"];
const DAY = 86_400_000;

export interface GradeResult { grade: Grade; why: string }

/** The grade at `now`, from the evidence alone. */
export function gradeOf(fact: KnowledgeFact | undefined, now: string): GradeResult {
  if (!fact || fact.evidence.length === 0) return { grade: "UNKNOWN", why: "not observed; that is not the same as not known" };
  const t = parseTime(now, "now");
  let best: { grade: Grade; ev: Evidence } | null = null;
  for (const ev of fact.evidence) {
    if (ev.kind === "mistake") continue;
    const p = EVIDENCE_POLICY[ev.kind];
    const age = (t - parseTime(ev.at, "evidence.at")) / DAY;
    let g = p.strength;
    if (age > p.trusted_days && g !== "UNKNOWN") g = FROM[Math.max(0, RANK[g] - 1)]!;
    const newer = best && RANK[g] === RANK[best.grade] && parseTime(ev.at, "evidence.at") > parseTime(best.ev.at, "evidence.at");
    if (!best || RANK[g] > RANK[best.grade] || newer) best = { grade: g, ev };
  }
  if (!best || best.grade === "UNKNOWN") return { grade: "UNKNOWN", why: best ? `only ${best.ev.kind}: having been shown something is not having understood it` : "no evidence of knowing" };
  // a later mistake against an earlier demonstration is a conflict, and a conflict is uncertainty
  const laterMistake = fact.evidence.find(e => e.kind === "mistake" && parseTime(e.at, "evidence.at") > parseTime(best!.ev.at, "evidence.at"));
  if (laterMistake) return { grade: "UNKNOWN", why: `${best.ev.kind} on ${best.ev.at.slice(0, 10)} conflicts with a later mistake on ${laterMistake.at.slice(0, 10)}` };
  return { grade: best.grade, why: `${best.ev.kind} on ${best.ev.at.slice(0, 10)}` };
}

export interface Knows { grade: Grade; why: string; sense_mismatch: boolean; known_sense?: string }
/** What the state says about a concept as THIS source uses it. A familiar term in another sense is not known. */
export function knows(state: KnowledgeState, concept: string, sense: string, now: string): Knows {
  const same = state.find(f => f.concept === concept && f.sense === sense);
  if (same) return { ...gradeOf(same, now), sense_mismatch: false };
  const other = state.find(f => f.concept === concept);
  if (other) {
    const g = gradeOf(other, now);
    return { grade: "UNKNOWN", sense_mismatch: true, known_sense: other.sense, why: `the term is familiar (${g.grade} in the sense "${other.sense}") but this source uses it in the sense "${sense}"` };
  }
  return { grade: "UNKNOWN", why: "not observed; that is not the same as not known", sense_mismatch: false };
}

/** What each unit says about which concepts it uses, and in what sense. Supplied; nothing here extracts it. */
export interface ConceptUse { unit_id: string; concept: string; sense: string }

export type Treatment = "omit" | "collapse" | "keep";
export interface OmissionDecision { unit_id: string; treatment: Treatment; why: string; sense_mismatch: boolean }

/**
 * For each unit that is NOT already shown for another reason: may it be left out? Only if known in this sense AND no
 * shown unit depends on it. Partial knowledge collapses it. Anything else, and every tie, keeps it. Showing a known
 * thing costs a little attention; hiding a needed one can strand the reader, so the error is made on the safe side.
 */
export function omissionPlan(
  candidates: readonly Unit[], shownIds: readonly string[], allUnits: readonly Unit[],
  uses: readonly ConceptUse[], state: KnowledgeState, now: string,
): OmissionDecision[] {
  return candidates.map(u => {
    const dependedOn = allUnits.filter(x => shownIds.includes(x.id) && x.id !== u.id && x.dependsOn.includes(u.id)).map(x => x.id);
    const use = uses.find(c => c.unit_id === u.id);
    if (!use) return { unit_id: u.id, treatment: "keep", why: "no concept is recorded for this unit; nothing says it is known", sense_mismatch: false };
    const k = knows(state, use.concept, use.sense, now);
    if (dependedOn.length) return { unit_id: u.id, treatment: "keep", why: `${use.concept}: ${k.grade}, but ${dependedOn.join(", ")} depend${dependedOn.length === 1 ? "s" : ""} on it; known is not safe to omit`, sense_mismatch: k.sense_mismatch };
    if (k.grade === "KNOWN") return { unit_id: u.id, treatment: "omit", why: `${use.concept} (${use.sense}) is known (${k.why}) and nothing shown depends on it`, sense_mismatch: false };
    if (k.grade === "PARTIAL") return { unit_id: u.id, treatment: "collapse", why: `${use.concept} is partly known (${k.why}); offered collapsed, not removed`, sense_mismatch: false };
    return { unit_id: u.id, treatment: "keep", why: `${use.concept}: ${k.why}`, sense_mismatch: k.sense_mismatch };
  });
}

// ─── the person can see, correct and forget ─────────────────────────────────────────────────────────
export interface VisibleRow { concept: string; sense: string; grade: Grade; why: string; evidence: Evidence[] }
export function visibleState(state: KnowledgeState, now: string): VisibleRow[] {
  return state.map(f => ({ concept: f.concept, sense: f.sense, ...gradeOf(f, now), evidence: [...f.evidence] }));
}
/** The person says they know it (or do not). A statement is evidence like any other, dated and attributed to them. */
export function correct(state: KnowledgeState, concept: string, sense: string, kind: "stated" | "mistake", at: string): KnowledgeState {
  const ev: Evidence = { kind, at, ref: "person" };
  const has = state.some(f => f.concept === concept && f.sense === sense);
  return has ? state.map(f => (f.concept === concept && f.sense === sense ? { ...f, evidence: [...f.evidence, ev] } : f)) : [...state, { concept, sense, evidence: [ev] }];
}
export function forget(state: KnowledgeState, concept: string, sense?: string): KnowledgeState {
  return state.filter(f => !(f.concept === concept && (sense === undefined || f.sense === sense)));
}
