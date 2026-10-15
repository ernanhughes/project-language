// The human-side decision, assembled from independent axes:
//   qualification | selection | resolution | delivery | observation
// Each axis is decided by its own function with its own inputs. Nothing here adds them up.
import {
  POLICY_VERSION, current, firstRevision, isTerminal, schedule, type Revision, type Timing, type TimingInput,
} from "./delivery.ts";
import {
  eligibility, qualify, retrieve, type Eligibility, type QualificationResult,
} from "./qualify.ts";
import { chooseResolution, minimumFor, type Rendering, type ResolutionChoice } from "./resolution.ts";
import { observedStage, presentationText, type Receipt, type HumanObservation } from "./receipts.ts";
import { selectUnits, type UnitSelection } from "./units.ts";
import {
  AttentionError, DELIVERY_MODES, RESOLUTIONS, STAGES,
  type Bridge, type CandidateItem, type DeliveryMode, type Reason, type Resolution, type Stage, type StageRecord,
  type Subscription, type Task,
} from "./types.ts";

export interface AttendInput {
  task: Task; subscription: Subscription; item: CandidateItem;
  /** The configured corpus the retrieval step searched. */
  corpus: readonly CandidateItem[];
  query: string; topK: number;
  bridge?: Bridge;
  renderings: readonly Rendering[];
  timing: TimingInput;
  budgetTokens: number;
  declaredAt: string; outputAt: string;
}

export interface AttentionResult {
  item_id: string;
  stages: StageRecord[];
  eligibility: Eligibility | null;
  qualification: QualificationResult | null;
  selection: UnitSelection | null;
  resolution: ResolutionChoice | null;
  timing: Timing | null;
  history: Revision[];
  /** Every known cause that stopped the candidate. More than one is normal. Empty if it went on. */
  causes: string[];
  /** What an interface would be asked to present. Null when nothing is to be shown. */
  content: string | null;
}

const stage = (s: Stage, outcome: StageRecord["outcome"], reasons: Reason[]): StageRecord => ({ stage: s, outcome, reasons });
const note = (text: string, ref: string, dimension: Reason["dimension"] = "relevance"): Reason => ({ dimension, origin: "computed_rule", ref, text });

export function attend(i: AttendInput): AttentionResult {
  const { item } = i;
  const stages: StageRecord[] = [];
  const decision_id = `attn:${item.id}`;
  const stop = (from: Stage, why: string): AttentionResult => {
    const at = STAGES.indexOf(from);
    for (const s of STAGES.slice(at)) stages.push(stage(s, s === "presented" || s === "noticed" || s === "used" || s === "helpful" ? "unknown" : "not_reached", [note(why, "stopped-earlier", "relevance")]));
    const causes = [
      ...(elig && !elig.eligible ? elig.failed.map(r => `${r.dimension}:${r.ref}`) : []),
      ...(qual && qual.outcome === "NOT_QUALIFIED" ? [...qual.match.unmet.map(u => `evidence_standing:${u.condition} (candidate: ${u.observed})`), ...qual.match.excluded_by.map(x => `exclusion:${x}`)] : []),
      ...(!elig && !qual ? [why] : []),
    ];
    return { item_id: item.id, stages, eligibility: elig, qualification: qual, selection: sel, resolution: null, timing: null, content: null, causes,
      history: [firstRevision(decision_id, null, null, i.timing.now, [note(`withheld: ${why}`, "withheld")], "WITHDRAWN")] };
  };
  let elig: Eligibility | null = null; let qual: QualificationResult | null = null; let sel: UnitSelection | null = null;

  stages.push(stage("observed", i.corpus.some(c => c.id === item.id) ? "yes" : "no", [note("in a configured source", "configured-corpus")]));
  if (stages[0]!.outcome === "no") return stop("retrieved", "not in a configured source");

  const hit = retrieve(i.query, i.corpus, i.topK).find(r => r.id === item.id);
  stages.push(stage("retrieved", hit ? "yes" : "no", [note(hit ? `lexical closeness ${hit.similarity.toFixed(2)}; retrieval proposes and grants nothing` : "outside the retrieval limit", "retrieval")]));
  if (!hit) return stop("eligible", "not retrieved");

  elig = eligibility(i.task, item);
  stages.push(stage("eligible", elig.eligible ? "yes" : "no", elig.reasons));
  if (!elig.eligible) return stop("selected", "not eligible: " + elig.failed.map(r => r.text).join("; "));

  if (item.units && item.units.length) {
    sel = selectUnits(item.units, item.source, i.budgetTokens, { asOf: i.task.asOf, scope: i.task.scope });
    stages.push(stage("selected", sel.selected.length ? "yes" : "no", [note(`${sel.selected.length} unit(s) admitted by the compiler, ${sel.rejected.length} refused${sel.rejected.length ? " (" + sel.rejected.map(r => r.id + ":" + r.decision).join(", ") + ")" : ""}`, "compiler-trace")]));
    stages.push(stage("assembled", i.renderings.length ? "yes" : "no", [note(`${i.renderings.length} rendering(s) authored`, "renderings")]));
  } else {
    stages.push(stage("selected", "not_applicable", [note("no unit decomposition for this item", "no-units")]));
    stages.push(stage("assembled", "not_applicable", [note("no unit decomposition for this item", "no-units")]));
  }

  qual = qualify(i.subscription, item, elig, i.bridge);
  stages.push(stage("qualified", qual.outcome === "QUALIFIED" ? "yes" : qual.outcome === "UNRESOLVED" ? "unknown" : "no", qual.reasons));
  if (qual.worth === "NOTHING") return stop("safe_resolution", `not worth attention: ${qual.reasons.map(r => r.text).join("; ")}`);

  const units = item.units ?? [];
  const choice = chooseResolution({ units, source: item.source, renderings: i.renderings, selected: sel?.selected ?? [], minimum: minimumFor(i.task.purpose.need), declaredAt: i.declaredAt, outputAt: i.outputAt });
  stages.push(stage("safe_resolution", choice.basis === "authored" ? "yes" : "no", choice.reasons));

  const nonInterruptive = qual.outcome === "UNRESOLVED" || i.timing.non_interruptive === true;
  const timing = schedule({ ...i.timing, non_interruptive: nonInterruptive });
  stages.push(stage("delivery_timing", "yes", timing.reasons));
  for (const s of observedStage([], [], decision_id, 1, "")) stages.push(s);

  const tail = qual.outcome === "UNRESOLVED" ? `\n[relation to your tracked claim: not established — ${qual.relation?.why}]` : "";
  const content = `${choice.rendering.text}${tail}\n[standing: ${item.standing}]`;
  const reasons = [...qual.reasons];
  return {
    item_id: item.id, stages, eligibility: elig, qualification: qual, selection: sel, resolution: choice, timing, content, causes: [],
    history: [firstRevision(decision_id, choice.chosen, timing, i.timing.now, reasons, "PENDING", nonInterruptive)],
  };
}

/**
 * Observation stages, reconnected to the revision history. A receipt hashes the exact text handed to the
 * interface (`presentationText`), so each revision is checked against the text it would have produced.
 * Presented is yes if any revision in the history was presented; noticed / used / helpful need their own observation.
 */
export function withObservation(r: AttentionResult, history: readonly Revision[], receipts: readonly Receipt[], observations: readonly HumanObservation[]): StageRecord[] {
  const content = r.content ?? "";
  const per = history.map(rev => observedStage(receipts, observations, rev.decision_id, rev.revision, presentationText(rev, content)));
  const hit = per.find(p => p[0]!.outcome === "yes") ?? per[per.length - 1] ?? observedStage([], [], r.item_id, 1, content);
  return [...r.stages.filter(s => !["presented", "noticed", "used", "helpful"].includes(s.stage)), ...hit];
}

export interface ReopenOutcome { ok: boolean; revision?: Revision; refused?: string[]; result: AttentionResult }
/**
 * A person brings back a withheld, withdrawn or expired candidate. Every gate is re-run on the candidate as it is now
 * (permission, currentness, scope, subscription conditions, relation, selection, resolution); nothing is taken on trust
 * from the earlier decision. A pending or delivered decision is not reopened. The result is kept within reach (AVAILABLE),
 * not pushed. Every revision returned validates.
 */
export function reopen(history: readonly Revision[], fresh: AttendInput, now: string): ReopenOutcome {
  const last = current(history);
  if (last.status !== "WITHDRAWN" && last.status !== "EXPIRED") throw new AttentionError("NOT_REOPENABLE", `${last.decision_id} is ${last.status}; only a withdrawn or expired decision is reopened`);
  const result = attend({ ...fresh, task: { ...fresh.task, asOf: now }, timing: { ...fresh.timing, now } });
  const first = result.history[0]!;
  if (first.status === "WITHDRAWN" || first.resolution === null) return { ok: false, refused: result.causes.length ? result.causes : ["no safe rendering"], result };
  const revision: Revision = Object.freeze({
    decision_id: last.decision_id, revision: last.revision + 1, prior: { decision_id: last.decision_id, revision: last.revision },
    status: "PENDING" as const, resolution: first.resolution, mode: "AVAILABLE" as const, non_interruptive: true,
    trigger: { kind: "reopened" as const, at: now, by: "person" }, policy_version: POLICY_VERSION, evaluated_at: now,
    reasons: [{ dimension: "permission" as const, origin: "computed_rule" as const, ref: "reopen-rechecked", text: "reopened by the person; every gate was re-run on the candidate as it is now" }, ...(result.qualification?.reasons ?? [])],
  });
  const problems = validateRevision(revision);
  if (problems.length) throw new AttentionError("REOPEN_PRODUCED_INVALID_REVISION", problems.map(p => p.code).join(","));
  return { ok: true, revision, result };
}

// ─── a decision's shape, checked ────────────────────────────────────────────────────────────────
export interface ShapeProblem { code: string; detail: string }
export function validateRevision(rev: Revision, qualified?: QualificationResult["outcome"]): ShapeProblem[] {
  const out: ShapeProblem[] = [];
  if (rev.resolution !== null && !(RESOLUTIONS as readonly string[]).includes(rev.resolution)) out.push({ code: "BAD_RESOLUTION", detail: String(rev.resolution) });
  if (rev.mode !== null && !(DELIVERY_MODES as readonly string[]).includes(rev.mode)) out.push({ code: "BAD_MODE", detail: String(rev.mode) });
  if (rev.mode !== null && rev.resolution === null) out.push({ code: "DELIVERY_WITHOUT_RESOLUTION", detail: "something is to be delivered but nothing says at what resolution" });
  if (rev.status === "PENDING" && rev.mode === null) out.push({ code: "PENDING_WITHOUT_MODE", detail: "a pending decision needs a delivery mode" });
  if ((rev.status === "WITHDRAWN" || rev.status === "EXPIRED") && rev.mode !== null) out.push({ code: "TERMINAL_WITH_MODE", detail: `${rev.status} carries mode ${rev.mode}` });
  if (rev.reasons.some(r => !r.ref.trim())) out.push({ code: "REASON_WITHOUT_REF", detail: "a reason must say what it rests on" });
  if (rev.revision > 1 && !rev.prior) out.push({ code: "REVISION_WITHOUT_PRIOR", detail: `r${rev.revision}` });
  if (rev.revision > 1 && rev.prior && rev.prior.revision !== rev.revision - 1) out.push({ code: "PRIOR_NOT_ADJACENT", detail: `r${rev.revision} follows r${rev.prior.revision}` });
  if (qualified === "QUALIFIED" && rev.reasons.length > 0 && rev.reasons.every(r => r.origin === "model_proposal")) out.push({ code: "MODEL_ONLY_BASIS", detail: "a qualification may not rest only on a model's proposal" });
  return out;
}

/** Every revision of a history, shape-checked, and the chain itself. */
export function validateHistory(history: readonly Revision[]): ShapeProblem[] {
  const out: ShapeProblem[] = [];
  history.forEach((r, k) => {
    out.push(...validateRevision(r));
    if (r.revision !== k + 1) out.push({ code: "REVISION_NUMBER", detail: `position ${k + 1} holds r${r.revision}` });
    if (k > 0 && isTerminal(history[k - 1]!.status) && !(history[k - 1]!.status !== "DELIVERED" && r.trigger?.kind === "reopened")) out.push({ code: "AFTER_TERMINAL", detail: `r${r.revision} follows ${history[k - 1]!.status}` });
  });
  return out;
}

// ─── the decision surface, enumerable ───────────────────────────────────────────────────────────
export interface SurfaceRow { inputs: Record<string, string | boolean>; urgency: string; cost: string; mode: DeliveryMode }
const NOW = "2026-10-15T14:40:00.000Z";
const at = (h: number, m: number) => new Date(Date.UTC(2026, 9, 15, h, m)).toISOString();
/** Every combination of the timing inputs, run through `schedule`. Resolution is not an input. */
export function deliverySurface(): SurfaceRow[] {
  const rows: SurfaceRow[] = [];
  const deadlines: [string, string | null][] = [["none", null], ["passed", at(14, 0)], ["before-break", at(15, 0)], ["after-break", at(18, 0)]];
  for (const [dn, acts_by] of deadlines) for (const cal of ["in_meeting", "free"]) for (const dnd of ["on", "off"])
    for (const focus of ["normal", "blockers_only"]) for (const brk of [true, false]) for (const dig of [true, false])
      for (const nonInt of [true, false]) for (const delay of [true, false]) {
        const ctx = [
          { key: "calendar_state" as const, value: cal, origin: "observed_context" as const, ref: "calendar", at: NOW },
          { key: "do_not_disturb" as const, value: dnd, origin: "declared_context" as const, ref: "dnd", at: NOW },
          { key: "focus_mode" as const, value: focus, origin: "declared_context" as const, ref: "focus", at: NOW },
          ...(brk ? [{ key: "next_break_at" as const, value: at(15, 30), origin: "observed_context" as const, ref: "calendar", at: NOW }] : []),
          ...(dig ? [{ key: "digest_at" as const, value: new Date(Date.UTC(2026, 9, 16, 9, 0)).toISOString(), origin: "declared_context" as const, ref: "digest", at: NOW }] : []),
        ];
        const t = schedule({ now: NOW, acts_by, context: ctx, non_interruptive: nonInt, delay_exceeds_interruption: delay });
        rows.push({ inputs: { deadline: dn, calendar: cal, dnd, focus, break_known: brk, digest_known: dig, non_interruptive: nonInt, delay_exceeds: delay }, urgency: t.urgency, cost: t.cost, mode: t.mode });
      }
  return rows;
}

/** The lifted radar's labels, and what they mean in the new vocabulary. SIDECAR is non-interruptive AVAILABLE and nothing more. */
export const LEGACY_EQUIVALENCE = {
  SHOW: "selection+timing folded together: NOW only when interrupting is justified; the legacy value cannot say otherwise",
  QUEUE: "QUEUE, but always at GLANCE in the legacy rules",
  SIDECAR: "AVAILABLE (non-interruptive)",
  SKIP: "withheld: no delivery, and (unlike here) not recorded as reopenable",
} as const;
