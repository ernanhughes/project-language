// Resolution: the least representation whose obligations hold, and no lower than the task needs.
//
// A rendering may use ONLY units the compiler selected. A rendering that names no unit is refused:
// an unattached summary has nothing tying it to the source. An item with no unit decomposition, or
// whose selection is empty, is not summarised at all; the source stands.
//
// Four obligations, reported SEPARATELY. Passing the first three says nothing about the fourth.
//   membership            every unit a rendering names is in the stable unit set AND was selected
//   nesting               a lower rendering's units are within the next higher one's
//   dependency closure    every unit named brings the units it depends on
//   semantic preservation the rendering's WORDS keep what each named unit (and a claim's qualifier) says
// Stable ids, nested membership and closure do not prove faithful wording. A rendering can name
// the qualifier's unit and still say "safe".
import {
  assess, declare, mustKeep, validateInstrument, type Obligation, type InstrumentValidation,
} from "../../../preservation/src/index.ts";
import {
  RESOLUTIONS, resolutionRank, type Need, type Reason, type Resolution, type SourceVersion, type Unit,
} from "./types.ts";
import { sliceOf } from "./units.ts";

export interface Rendering { level: Resolution; text: string; unit_ids: string[] }
export type ObligationName = "membership" | "nesting" | "dependency_closure" | "semantic_preservation";
export interface Check { name: ObligationName; ok: boolean; detail: string }

/** Declared policy: no lower than this for the person's need. GLANCE passing its contract does not make it enough to judge a proof. */
export const MINIMUM_BY_NEED: Readonly<Record<Need, Resolution>> = {
  triage: "GLANCE", decide: "BRIEF", safety_claim: "SUMMARY", implement: "DETAIL", judge_proof: "DETAIL",
};
export const MINIMUM_POLICY_VERSION = "minimum-by-need-v1";
export const minimumFor = (need: Need): Resolution => MINIMUM_BY_NEED[need];

/** Every content word of a unit must appear. Strict on purpose: a paraphrase fails closed and the resolution rises. */
const keyWords = (text: string): string[] => [...new Set(text.toLowerCase().match(/[a-z0-9-]{5,}/g) ?? [])];

/**
 * Obligations for the words of a rendering that names `ids`:
 *  - one per named unit (its own content words survive, in order, within a sentence);
 *  - one per claim that has a qualifier (claim and qualifier together, in the source's order).
 */
export function semanticObligations(units: readonly Unit[], source: SourceVersion, ids: readonly string[]): { obligations: Obligation[]; passages: Record<string, string> } {
  const byId = new Map(units.map(u => [u.id, u]));
  const obligations: Obligation[] = []; const passages: Record<string, string> = {};
  for (const id of ids) {
    const u = byId.get(id);
    if (!u) continue;
    const own = sliceOf(source, u).replace(/\s+/g, " ").trim();
    const oid = `has-${u.id}`;
    obligations.push(mustKeep(oid, u.role === "qualifier" ? "qualifier" : "claim", `"${u.text}" must be kept`, own, { patterns: keyWords(own) }));
    passages[oid] = own;
    if (u.role !== "claim") continue;
    const quals = u.dependsOn.map(d => byId.get(d)).filter((q): q is Unit => Boolean(q) && q!.role === "qualifier");
    if (quals.length === 0) continue;
    const group = [u, ...quals];
    const start = Math.min(...group.flatMap(g => g.spans.map(s => s.start)));
    const end = Math.max(...group.flatMap(g => g.spans.map(s => s.end)));
    const passage = source.text.slice(start, end).replace(/\s+/g, " ").trim();
    const keys = quals.flatMap(q => keyWords(sliceOf(source, q)));
    const qid = `keeps-${u.id}`;
    obligations.push(mustKeep(qid, "qualifier", `"${u.text}" must keep: ${quals.map(q => q.text).join("; ")}`, passage, { patterns: keys }));
    passages[qid] = passage;
  }
  return { obligations, passages };
}

export interface Attempt {
  level: Resolution;
  rendering: Rendering | null;
  checks: Check[];
  accepted: boolean;
  /** Which instrument stood behind the semantic check. A rendering is never accepted on an unvalidated one. */
  instrument: string;
  skipped?: string;
}
export interface ResolutionChoice {
  minimum: Resolution;
  chosen: Resolution;
  rendering: Rendering;
  /** `authored`: an authored rendering passed. `source_stands`: nothing authored was acceptable, or nothing could be. */
  basis: "authored" | "source_stands";
  failed_closed: boolean;
  attempts: Attempt[];
  reasons: Reason[];
}

export interface ChooseInput {
  units: readonly Unit[]; source: SourceVersion; renderings: readonly Rendering[];
  /** Unit ids the compiler selected. Renderings may use nothing else. */
  selected: readonly string[];
  minimum: Resolution; declaredAt: string; outputAt: string;
}

const sourceStands = (i: ChooseInput, attempts: Attempt[], reasons: Reason[], why: string, failed: boolean): ResolutionChoice => ({
  minimum: i.minimum, chosen: "SOURCE", basis: "source_stands", failed_closed: failed, attempts,
  reasons: [...reasons, { dimension: "preservation", origin: "computed_rule", ref: failed ? "fail-closed" : "undecomposed", text: why }],
  rendering: { level: "SOURCE", text: i.source.text, unit_ids: i.units.map(u => u.id) },
});

export function chooseResolution(input: ChooseInput): ResolutionChoice {
  const { units, source, renderings, minimum } = input;
  const reasons: Reason[] = [{ dimension: "resolution_sufficiency", origin: "declared_policy", ref: MINIMUM_POLICY_VERSION, text: `no lower than ${minimum} for this need` }];
  if (units.length === 0) return sourceStands(input, [], reasons, "no unit decomposition: nothing to select from, so no summary is offered and the source stands", false);
  if (input.selected.length === 0) return sourceStands(input, [], reasons, "the compiler selected no unit under the budget: no summary is offered and the source stands", true);

  const unitIds = new Set(units.map(u => u.id));
  const selected = new Set(input.selected);
  const byLevel = new Map(renderings.map(r => [r.level, r]));
  const present = RESOLUTIONS.filter(l => byLevel.has(l) && l !== "SOURCE");
  const attempts: Attempt[] = [];

  for (const level of RESOLUTIONS) {
    if (level === "SOURCE") break;
    if (resolutionRank(level) < resolutionRank(minimum)) { attempts.push({ level, rendering: byLevel.get(level) ?? null, checks: [], accepted: false, instrument: "n/a", skipped: `below the minimum ${minimum} for this need` }); continue; }
    const r = byLevel.get(level);
    if (!r) { attempts.push({ level, rendering: null, checks: [], accepted: false, instrument: "n/a", skipped: "no rendering authored at this level" }); continue; }
    const checks: Check[] = [];
    const unknown = r.unit_ids.filter(id => !unitIds.has(id));
    const unselected = r.unit_ids.filter(id => unitIds.has(id) && !selected.has(id));
    const membershipOk = r.unit_ids.length > 0 && unknown.length === 0 && unselected.length === 0;
    checks.push({ name: "membership", ok: membershipOk, detail:
      r.unit_ids.length === 0 ? "names no unit; an unattached summary is refused"
      : unknown.length ? `not in the stable unit set: ${unknown.join(",")}`
      : unselected.length ? `units the compiler did not select: ${unselected.join(",")}`
      : "every named unit is in the stable set and was selected" });
    const higher = present.filter(l => resolutionRank(l) > resolutionRank(level)).map(l => byLevel.get(l)!)[0];
    const outside = higher ? r.unit_ids.filter(id => !higher.unit_ids.includes(id)) : [];
    checks.push({ name: "nesting", ok: outside.length === 0, detail: higher ? (outside.length ? `${level} names units that ${higher.level} lacks: ${outside.join(",")}` : `${level} within ${higher.level}`) : "no higher authored rendering to nest within" });
    const missing = r.unit_ids.flatMap(id => (units.find(u => u.id === id)?.dependsOn ?? []).filter(d => !r.unit_ids.includes(d)).map(d => `${id}→${d}`));
    checks.push({ name: "dependency_closure", ok: missing.length === 0, detail: missing.length ? `named without what they depend on: ${missing.join(",")}` : "every named unit brings its dependencies" });

    const { obligations } = semanticObligations(units, source, r.unit_ids.filter(id => unitIds.has(id)));
    let instrument = "no obligations";
    if (obligations.length === 0) {
      checks.push({ name: "semantic_preservation", ok: false, detail: "no unit is named, so nothing ties the words to the source" });
    } else {
      const declaration = declare({ at: input.declaredAt, obligations });
      const faithful = obligations.map(o => o.anchor!.passage).join(" ");
      const validation: InstrumentValidation = validateInstrument(declaration, source.text, faithful, input.outputAt);
      const profile = assess(declaration, { id: `${level}`, source: source.text, output: r.text, output_at: input.outputAt }, validation);
      instrument = profile.instrument;
      const lost = profile.obligations.filter(o => o.outcome !== "SURVIVED");
      const ok = profile.instrument === "validated" && lost.length === 0;
      checks.push({
        name: "semantic_preservation", ok,
        detail: profile.instrument !== "validated" ? `the check is ${profile.instrument}; an unvalidated check authorises nothing`
          : lost.length ? `the words lost: ${lost.map(o => o.id).join(",")}` : "each named unit's words survived (anchored check, validated by mutation probes)",
      });
    }
    attempts.push({ level, rendering: r, checks, accepted: checks.every(c => c.ok), instrument });
  }

  const winner = attempts.find(a => a.accepted && a.rendering);
  if (winner) {
    reasons.push({ dimension: "preservation", origin: "computed_rule", ref: "four-obligations", text: `${winner.level}: membership, nesting, closure and wording all hold` });
    const raised = attempts.filter(a => !a.accepted && !a.skipped).map(a => a.level);
    if (raised.length) reasons.push({ dimension: "resolution_sufficiency", origin: "computed_rule", ref: "raised", text: `raised past ${raised.join(", ")} because an obligation failed` });
    return { minimum, chosen: winner.level, rendering: winner.rendering!, basis: "authored", failed_closed: false, attempts, reasons };
  }
  return sourceStands(input, attempts, reasons, "no authored rendering kept its obligations; the source stands", true);
}
