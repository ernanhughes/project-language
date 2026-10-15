// Chapter 15: relevance is a relation among a unit, a declared purpose and a context.
//
// What this module enforces:
//   - a judgement belongs to ONE purpose and cites the units it is about; it is not a property of the unit
//   - a judgement needs a stated reason, and a model's judgement is a proposal until a person accepts it
//   - a declared purpose is never replaced by an inferred one (an inference may be proposed, and is shown as one)
//   - a unit judged not relevant is still ATTACHED when a shown unit depends on it (the preservation obligation)
//   - everything not shown is WITHHELD with a reason and can be brought back; nothing is dropped silently
// What it does not do: decide whether a unit is relevant. The judgements are supplied.
import { selectUnits, type UnitSelection } from "./units.ts";
import { AttentionError, type Purpose, type SourceVersion, type Unit } from "./types.ts";

export const VERDICTS = ["decisive", "relevant", "low", "not_relevant"] as const;
export type Verdict = (typeof VERDICTS)[number];
/** A declared ordering for the compiler. These are not computed scores and they are not shown to the person. */
const ORDER: Readonly<Record<Verdict, number>> = { decisive: 1000, relevant: 100, low: 10, not_relevant: 0 };

export interface Judgement {
  unit_id: string;
  purpose_id: string;
  verdict: Verdict;
  /** In the person's terms. Must be non-empty and must say what the unit does for or against the purpose. */
  reason: string;
  /** Units the reason rests on. At least the unit itself. */
  cites: string[];
  by: "person" | "domain_rule" | "model";
  /** A model's judgement counts only once a person has accepted it. */
  accepted_by?: "person";
}

export interface JudgementProblem { code: string; detail: string }
export function validateJudgement(j: Judgement, purpose: Purpose, units: readonly Unit[]): JudgementProblem[] {
  const out: JudgementProblem[] = [];
  const ids = new Set(units.map(u => u.id));
  if (!ids.has(j.unit_id)) out.push({ code: "UNKNOWN_UNIT", detail: j.unit_id });
  if (j.purpose_id !== purpose.id) out.push({ code: "WRONG_PURPOSE", detail: `judged for "${j.purpose_id}", used under "${purpose.id}"; a judgement is not reusable across purposes` });
  if (!(VERDICTS as readonly string[]).includes(j.verdict)) out.push({ code: "BAD_VERDICT", detail: String(j.verdict) });
  if (!j.reason.trim()) out.push({ code: "NO_REASON", detail: "a relevance judgement without a reason is a number nobody can argue with" });
  if (!j.cites.includes(j.unit_id) || j.cites.some(c => !ids.has(c))) out.push({ code: "BAD_CITATION", detail: "the reason must cite the unit it is about, and only units that exist" });
  if (j.by === "model" && j.accepted_by !== "person") out.push({ code: "MODEL_JUDGEMENT_NOT_ACCEPTED", detail: "a model's judgement is a proposal until a person accepts it" });
  return out;
}

// ─── the purpose: declared first, inferred only as a suggestion ─────────────────────────────────────
export interface ProposedPurpose { text: string; by: "model" | "system"; why: string }
export interface PurposeResolution {
  purpose: Purpose | null;
  /** Shown to the person next to their own words. Never applied. */
  suggestion: ProposedPurpose | null;
  note: string;
}
export function resolvePurpose(declared: Purpose | null, proposed: ProposedPurpose | null): PurposeResolution {
  if (declared) {
    return { purpose: declared, suggestion: proposed && proposed.text !== declared.text ? proposed : null, note: proposed && proposed.text !== declared.text ? "an inferred purpose exists; it is offered as a suggestion and does not replace the declared one" : "declared by the person" };
  }
  return { purpose: null, suggestion: proposed, note: "no declared purpose: ask the person; an inference is not substituted" };
}

// ─── planning what to show for one purpose ──────────────────────────────────────────────────────────
export type Disposition = "shown" | "attached" | "withheld";
export interface UnitDecision { unit_id: string; disposition: Disposition; verdict: Verdict | "unjudged"; reason: string; reopenable: boolean }
export interface Plan {
  purpose_id: string;
  decisions: UnitDecision[];
  shown: string[];
  attached: string[];
  withheld: string[];
  selection: UnitSelection;
}

/**
 * Show the units that bear on the purpose, within a token budget (through the existing compiler), attach what a shown
 * unit depends on even when it was judged not relevant, and withhold the rest, each with its reason.
 */
export function planForPurpose(
  units: readonly Unit[], source: SourceVersion, purpose: Purpose, judgements: readonly Judgement[], budgetTokens: number,
): Plan {
  const bad = judgements.flatMap(j => validateJudgement(j, purpose, units).map(p => `${j.unit_id}:${p.code}`));
  if (bad.length) throw new AttentionError("INVALID_JUDGEMENTS", bad.join(","));
  const counts = (j: Judgement) => j.by !== "model" || j.accepted_by === "person";
  const judged = new Map(judgements.filter(counts).map(j => [j.unit_id, j]));
  const byId = new Map(units.map(u => [u.id, u]));

  // Offer the compiler the units judged at least low, and what they depend on, transitively. Nothing else is offered.
  const offered = new Set<string>();
  const add = (id: string): void => { if (offered.has(id)) return; offered.add(id); for (const d of byId.get(id)?.dependsOn ?? []) add(d); };
  for (const u of units) { const v = judged.get(u.id)?.verdict; if (v && v !== "not_relevant") add(u.id); }
  const subset = units.filter(u => offered.has(u.id));
  const decisive = subset.filter(u => judged.get(u.id)?.verdict === "decisive").map(u => u.id);
  const selection = selectUnits(subset, source, budgetTokens, {
    required: decisive,
    relevance: Object.fromEntries(subset.map(u => [u.id, ORDER[judged.get(u.id)?.verdict ?? "not_relevant"]])),
  });
  const chosen = new Set(selection.selected);

  const decisions: UnitDecision[] = units.map(u => {
    const j = judged.get(u.id); const verdict: UnitDecision["verdict"] = j?.verdict ?? "unjudged";
    if (chosen.has(u.id)) {
      if (verdict === "not_relevant" || verdict === "unjudged") {
        const by = units.filter(x => chosen.has(x.id) && x.dependsOn.includes(u.id)).map(x => x.id);
        return { unit_id: u.id, disposition: "attached", verdict, reason: `not relevant to this purpose, but ${by.join(", ")} depend${by.length === 1 ? "s" : ""} on it, so it travels with ${by.length === 1 ? "it" : "them"}`, reopenable: false };
      }
      return { unit_id: u.id, disposition: "shown", verdict, reason: j!.reason, reopenable: false };
    }
    if (!j) return { unit_id: u.id, disposition: "withheld", verdict, reason: "no judgement for this purpose", reopenable: true };
    if (j.verdict === "not_relevant") return { unit_id: u.id, disposition: "withheld", verdict, reason: j.reason, reopenable: true };
    const why = selection.rejected.find(r => r.id === u.id);
    return { unit_id: u.id, disposition: "withheld", verdict, reason: `judged ${j.verdict} (${j.reason}) but not selected: ${why ? why.reason : "budget"}`, reopenable: true };
  });
  const pick = (d: Disposition) => decisions.filter(x => x.disposition === d).map(x => x.unit_id);
  return { purpose_id: purpose.id, decisions, shown: pick("shown"), attached: pick("attached"), withheld: pick("withheld"), selection };
}
