// Chapter 28: the Personal AI, as a bounded compiler. It composes the earlier mechanisms into one presentation plan and says,
// for every personal input, whether it was considered, consulted, used, refused, inapplicable, expired, disabled or retracted.
//
// Precedence (a proposed starting mechanism, not an earned law):
//   1 binding preservation and accessibility obligations     (constrain every choice; conflicts are returned, never ranked)
//   2 the explicit current instruction
//   3 a valid, scoped session overlay
//   4 an applicable declared standing policy
//   5 authorised optional observations and inferences
//   6 the generic default
//
//   available state != necessary state      not consulted != disabled != retracted
//
// The generic path is not an ungoverned path: it keeps the source, the request, preservation, accessibility and binding policy.
// It uses less OPTIONAL personal conditioning; it does not claim the system holds no state about the person.
import {
  compileContext, defaultPolicy, estimateTokens, type ContextCandidate, type ContextRequest,
} from "../../compiler/src/core/index.ts";
import type { AuthorityPolicy } from "../../authority/src/engine/types.ts";
import { assess, authorizeUse, type Assessment } from "./applicability.ts";
import { checkScope, mayChangeCommunication } from "./beliefs.ts";
import type { PersonalState } from "./state.ts";
import type {
  AccessibilityRequirement, Actor, DeclaredPolicy, InferredBelief, PersonalEvent, PersonalRecord, SessionOverlay,
} from "./types.ts";

/** A declared policy of the compiler, not a measurement: how many tokens of reading fit in a minute of the person's time. */
export const TOKENS_PER_MINUTE = 20;
export const COMPILER_VERSION = "personal-compiler-v1";

export interface SourceBlock { id: string; text: string; role: "decisive" | "supporting" | "background"; kind: string }
/** An optional-conditioning proposal: some renderer or model wants to use a belief to fold blocks. The gates decide. */
export interface Proposal { belief_id: string; fold: string[]; confirmed_by_person?: boolean }

export type ConditioningMode = "full" | "no_optional" | "generic_only";
export interface CompileInput {
  plan_id: string;
  now: string;
  scope: string;
  session: string;
  source: { id: string; blocks: SourceBlock[] };
  task: { id: string; purpose: string; available_minutes: number | null };
  current_instruction: { by: Actor; ref: string; fold?: SourceBlock["role"][]; keep_visible?: string[]; first?: string[] } | null;
  /** Binding: blocks that must stay visible, and forms the content needs. */
  preservation: { must_keep_visible: string[]; requires_forms?: string[] };
  state: PersonalState;
  authority: { policy: AuthorityPolicy; purpose: string };
  proposals?: Proposal[];
  /** full: everything applicable. no_optional: observations and inferences do not condition. generic_only: no personal state except binding accessibility. */
  conditioning: ConditioningMode;
  /** Beliefs suspended for an inspection comparison. */
  suspend?: string[];
  supersedes_plan?: string;
}

export type InputStatus = "considered" | "consulted" | "used" | "refused" | "inapplicable" | "expired" | "disabled" | "retracted";
export interface InputRecord { input_id: string; kind: PersonalRecord["kind"]; status: InputStatus; reasons: string[]; receipt_ids: string[] }
export type Treatment = "visible" | "folded";
export interface PlanBlock { block_id: string; treatment: Treatment; decided_by: "preservation" | "accessibility" | "instruction" | "overlay" | "inference" | "time_budget" | "default"; reason: string }
export interface Conflict { code: "BINDING_OBLIGATIONS_CONFLICT" | "PRESERVATION_EXCEEDS_BUDGET"; detail: string }

export interface PresentationPlan {
  id: string;
  version: typeof COMPILER_VERSION;
  source_id: string;
  scope: string;
  mode: "personalised" | "generic";
  /** True only if an authorised observation or inference actually conditioned the view. */
  optional_conditioning_used: boolean;
  outcome: "PLAN" | "CONFLICT";
  form: string;
  blocks: PlanBlock[];
  inputs: InputRecord[];
  conflicts: Conflict[];
  settings: Record<string, string>;
  depends_on: string[];
  explanation: string[];
  budget: { tokens: number | null; admitted: string[]; rejected: string[] };
  receipt: { mechanism: "deterministic compile"; proves: string; does_not_prove: string };
}
export interface CompileOutput { plan: PresentationPlan; events: PersonalEvent[] }

const RECEIPT = {
  mechanism: "deterministic compile" as const,
  proves: "which inputs the gates admitted for this plan, and why the others were not",
  does_not_prove: "that the view communicates better, that the person benefits, or that the inputs are true",
};

const active = <T extends PersonalRecord>(state: PersonalState, kind: T["kind"]) =>
  [...state.entries.values()].filter(e => e.record.kind === kind).map(e => e.record as T);

function statusFrom(a: Assessment): InputStatus {
  if (a.applicable) return "considered";
  if (a.status === "retracted" || a.status === "rejected") return "retracted";
  if (a.reasons.some(r => /end time|interval has ended|expired|ended/.test(r)) || a.status === "expired" || a.status === "ended") return "expired";
  return "inapplicable";
}

export function compile(input: CompileInput): CompileOutput {
  const ctx = { now: input.now, scope: input.scope, session: input.session };
  const blocks = input.source.blocks; const byId = new Map(blocks.map(b => [b.id, b]));
  const ledger = new Map<string, InputRecord>();
  const setInput = (r: PersonalRecord, status: InputStatus, reasons: string[], receipts: string[] = []) => ledger.set(r.id, { input_id: r.id, kind: r.kind, status, reasons, receipt_ids: receipts });
  const personalAllowed = input.conditioning !== "generic_only";
  const optionalAllowed = input.conditioning === "full" && !([...input.state.disabled_scopes].some(s => input.scope === s || input.scope.startsWith(`${s}:`)));
  const mustKeep = new Set<string>(input.preservation.must_keep_visible);
  const explanation: string[] = []; const conflicts: Conflict[] = [];

  // 1. binding obligations ----------------------------------------------------------------------------------------
  const accessibility = active<AccessibilityRequirement>(input.state, "accessibility_requirement").filter(r => assess(input.state, r.id, ctx).applicable);
  const forbidden = new Set(accessibility.flatMap(r => r.forbid_forms));
  const needForms = input.preservation.requires_forms ?? [];
  for (const f of needForms.filter(f => forbidden.has(f))) conflicts.push({ code: "BINDING_OBLIGATIONS_CONFLICT", detail: `the content needs form "${f}" and an accessibility requirement forbids it; neither outranks the other, so the person is asked` });
  for (const r of accessibility) setInput(r, "used", [`binding: ${r.requirement}`]);
  if (conflicts.length) {
    const plan: PresentationPlan = {
      id: input.plan_id, version: COMPILER_VERSION, source_id: input.source.id, scope: input.scope, mode: "generic", optional_conditioning_used: false, outcome: "CONFLICT", form: "source",
      blocks: blocks.map(b => ({ block_id: b.id, treatment: "visible" as const, decided_by: "preservation" as const, reason: "binding obligations conflict: the source stands unchanged" })),
      inputs: [...ledger.values()], conflicts, settings: {}, depends_on: accessibility.map(r => r.id), explanation: conflicts.map(c => c.detail),
      budget: { tokens: null, admitted: [], rejected: [] }, receipt: RECEIPT,
    };
    return { plan, events: [{ type: "artifact_registered", at: input.now, id: plan.id, depends_on: plan.depends_on }] };
  }

  // 2. declared standing policy -----------------------------------------------------------------------------------
  const policies = active<DeclaredPolicy>(input.state, "declared_policy");
  const livePolicies = personalAllowed ? policies.filter(p => assess(input.state, p.id, ctx).applicable) : [];
  const settings: Record<string, string> = {};
  for (const p of livePolicies) { Object.assign(settings, p.settings); for (const k of p.preserve) explanation.push(`standing policy preserves: ${k}`); }
  for (const p of policies) {
    if (!personalAllowed) setInput(p, "disabled", ["generic_only: no personal state except binding accessibility"]);
    else if (livePolicies.includes(p)) setInput(p, "used", ["applicable declared standing policy for this scope"]);
    else setInput(p, statusFrom(assess(input.state, p.id, ctx)), assess(input.state, p.id, ctx).reasons);
  }

  // 3. overlay ----------------------------------------------------------------------------------------------------
  const overlays = active<SessionOverlay>(input.state, "session_overlay");
  const liveOverlays = personalAllowed ? overlays.filter(o => assess(input.state, o.id, ctx).applicable) : [];
  const overlayFold = new Set<string>(), overlayFirst: string[] = [];
  for (const o of liveOverlays) for (const d of o.decisions) { const [k, v] = d.split(":"); if (k === "fold" && v) overlayFold.add(v); if (k === "first" && v) overlayFirst.push(v); }
  for (const o of overlays) {
    if (!personalAllowed) setInput(o, "disabled", ["generic_only"]);
    else if (liveOverlays.includes(o)) setInput(o, "used", [`this session's decisions: ${o.decisions.join(", ")}`]);
    else { const a = assess(input.state, o.id, ctx); setInput(o, statusFrom(a), a.reasons); }
  }

  // 4. optional inference proposals, through every gate -------------------------------------------------------------
  const inferenceFold = new Set<string>(); const usedBeliefs: string[] = [];
  const beliefs = active<InferredBelief>(input.state, "inferred_belief");
  const proposed = new Map((input.proposals ?? []).map(p => [p.belief_id, p]));
  for (const b of beliefs) {
    const p = proposed.get(b.id); const a = assess(input.state, b.id, ctx);
    if (input.suspend?.includes(b.id)) { setInput(b, "disabled", ["suspended for this comparison only; this is not evidence that the person lacks the knowledge"]); continue; }
    if (!optionalAllowed) { setInput(b, "disabled", [input.conditioning === "full" ? "optional conditioning disabled in this scope by the person" : `${input.conditioning}: optional conditioning excluded`]); continue; }
    if (!a.applicable) { setInput(b, statusFrom(a), a.reasons); continue; }
    if (!p) { setInput(b, "considered", ["available; no use of it was proposed, and nothing in this view needed it"]); continue; }
    const why: string[] = []; const receipts: string[] = [];
    const scope = checkScope(b, b.applied_scope); if (!scope.ok) why.push(`${scope.code}: ${scope.why}`);
    const auth = authorizeUse(b, "REUSE", input.authority.purpose, input.authority.policy, input.now); receipts.push(auth.receipt.receipt_id); if (!auth.allowed) why.push(`not authorised: ${auth.why}`);
    const bar = mayChangeCommunication(b, !!p.confirmed_by_person); if (!bar.ok) why.push(bar.why);
    const hidden = p.fold.filter(f => mustKeep.has(f) || byId.get(f)?.role === "decisive"); if (hidden.length) why.push(`it would fold decisive material (${hidden.join(", ")}); binding preservation outranks an inference`);
    if (why.length) { setInput(b, "refused", why, receipts); explanation.push(`inference not used: ${b.proposition} (${why[0]})`); }
    else { setInput(b, "used", [`authorised, within scope, bar met: ${b.proposition}`], receipts); usedBeliefs.push(b.id); for (const f of p.fold) inferenceFold.add(f); }
    for (const dep of b.depends_on ?? []) { const l = ledger.get(dep); if (l && l.status === "considered") l.status = "consulted"; }
  }

  // 5. observations: available evidence, consulted only if something stayed undecided ------------------------------------
  for (const o of active<PersonalRecord>(input.state, "observed_interaction")) {
    if (ledger.has(o.id)) continue;
    const a = assess(input.state, o.id, ctx);
    if (!optionalAllowed) setInput(o, "disabled", [input.conditioning === "full" ? "optional conditioning disabled in this scope" : `${input.conditioning}: excluded`]);
    else if (!a.applicable) setInput(o, statusFrom(a), a.reasons);
    else setInput(o, "considered", ["available evidence; not consulted: the request, overlay, policy and source obligations decided every block"]);
  }
  for (const r of active<PersonalRecord>(input.state, "friction_contract")) setInput(r, statusFrom(assess(input.state, r.id, ctx)), ["constrains an action, not this presentation; not part of conditioning"]);
  for (const r of active<PersonalRecord>(input.state, "portable_boundary")) setInput(r, statusFrom(assess(input.state, r.id, ctx)), ["applies at other services; not part of this presentation"]);
  for (const r of active<PersonalRecord>(input.state, "declared_preference")) if (!ledger.has(r.id)) setInput(r, personalAllowed ? statusFrom(assess(input.state, r.id, ctx)) : "disabled", ["a preference decides among acceptable presentations; it never outranks a binding obligation"]);

  // 6. block treatments ---------------------------------------------------------------------------------------------
  const instruction = input.current_instruction;
  const instructionFold = new Set<string>(instruction?.fold ?? []);
  const planBlocks: PlanBlock[] = blocks.map(b => {
    if (mustKeep.has(b.id) || b.role === "decisive" || instruction?.keep_visible?.includes(b.id)) return { block_id: b.id, treatment: "visible", decided_by: "preservation", reason: "binding: decisive material stays visible" };
    if (instructionFold.has(b.role)) return { block_id: b.id, treatment: "folded", decided_by: "instruction", reason: `the current request asked to fold ${b.role} material; it remains available` };
    if (overlayFold.has(b.role)) return { block_id: b.id, treatment: "folded", decided_by: "overlay", reason: `this session's overlay folds ${b.role} material; it remains available` };
    if (inferenceFold.has(b.id)) return { block_id: b.id, treatment: "folded", decided_by: "inference", reason: "an authorised inference supported folding it" };
    return { block_id: b.id, treatment: "visible", decided_by: "default", reason: "nothing asked to fold it" };
  });

  // 7. the time budget, through core/compiler ------------------------------------------------------------------------
  const tokens = input.task.available_minutes === null ? null : Math.round(input.task.available_minutes * TOKENS_PER_MINUTE);
  const budget = { tokens, admitted: [] as string[], rejected: [] as string[] };
  if (tokens !== null) {
    const keep = (id: string) => planBlocks.find(p => p.block_id === id)!.decided_by === "preservation";
    const visible = planBlocks.filter(p => p.treatment === "visible");
    const cands: ContextCandidate[] = visible.map(p => {
      const b = byId.get(p.block_id)!; const t = estimateTokens(b.text)[0];
      return {
        candidateId: b.id, contentIdentity: b.id, representationId: "verbatim", formRank: 1, minRank: 1, sourceKind: "block", sourceRef: input.source.id, kind: "evidence", content: b.text,
        tokenCount: t, tokenSource: "approximation", requirement: keep(b.id) ? "MANDATORY" : "DISCRETIONARY", orderRole: "evidence",
        scopeEligible: true, scopeReason: "block of the source", freshnessEligible: true, freshnessReason: "source pinned", authorityEligible: true, authorityReason: "decided before compilation",
        dependsOn: [], groupId: null, groupRequired: false, coverageKeys: [], relevance: 1, isDefaultForm: true,
      };
    });
    const policy = defaultPolicy();
    const req: ContextRequest = { requestId: input.plan_id, taskId: input.task.id, createdAt: input.now, usableTokenBudget: tokens, activeScope: input.scope, requiredIds: cands.filter(c => c.requirement === "MANDATORY").map(c => c.candidateId), policyVersion: policy.policyVersion };
    const out = compileContext(req, cands, policy);
    if (out.result.failure) {
      conflicts.push({ code: "PRESERVATION_EXCEEDS_BUDGET", detail: `the decisive material does not fit ${input.task.available_minutes} minutes; it stays visible and the brief view is reported as unable to meet the obligation (${out.result.failure.reason})` });
    } else {
      const admitted = new Set(out.bundle?.items.map(i => i.id) ?? []);
      budget.admitted = [...admitted];
      for (const p of planBlocks) if (p.treatment === "visible" && !admitted.has(p.block_id)) { p.treatment = "folded"; p.decided_by = "time_budget"; p.reason = "did not fit the available time; still available"; budget.rejected.push(p.block_id); }
    }
  }

  // 8. form and order -----------------------------------------------------------------------------------------------
  let form = needForms[0] ?? settings["form"] ?? "prose";
  if (forbidden.has(form)) { const alt = ["prose", "table"].find(f => !forbidden.has(f)) ?? "prose"; explanation.push(`form "${form}" is excluded by an accessibility requirement; using "${alt}"`); form = alt; }
  const first = [...(instruction?.first ?? []), ...overlayFirst];
  const ordered = [...planBlocks].sort((a, b) => (first.includes(b.block_id) ? 1 : 0) - (first.includes(a.block_id) ? 1 : 0));

  // 9. explanation, dependencies, mode --------------------------------------------------------------------------------
  const usedOptional = usedBeliefs.length > 0;
  const personalUsed = livePolicies.length > 0 || liveOverlays.length > 0 || usedOptional;
  const depends = [...livePolicies.map(p => p.id), ...liveOverlays.map(o => o.id), ...usedBeliefs, ...accessibility.map(r => r.id)];
  explanation.unshift(
    `source obligation: ${[...mustKeep].join(", ") || "none named"} kept visible`,
    instruction ? `current request (${instruction.ref}): ${[...instructionFold].map(r => `fold ${r}`).join(", ") || "no folding"}${instruction.keep_visible?.length ? `; keep ${instruction.keep_visible.join(", ")} visible` : ""}` : "current request: none",
    `standing policy: ${livePolicies.length ? "applied" : "none applied"}`,
    `past observations: ${[...ledger.values()].some(l => l.kind === "observed_interaction" && l.status === "consulted") ? "consulted" : "not needed for this presentation choice"}`,
    `preference inference: ${usedOptional ? "used" : "not used"}`,
  );
  const plan: PresentationPlan = {
    id: input.plan_id, version: COMPILER_VERSION, source_id: input.source.id, scope: input.scope,
    mode: personalUsed ? "personalised" : "generic", optional_conditioning_used: usedOptional, outcome: "PLAN", form,
    blocks: ordered, inputs: [...ledger.values()], conflicts, settings, depends_on: depends, explanation, budget, receipt: RECEIPT,
  };
  return { plan, events: [{ type: "artifact_registered", at: input.now, id: plan.id, depends_on: depends }] };
}

/** The generic path: source, request, preservation, accessibility and binding policy. No optional personal conditioning. */
export const compileGeneric = (input: CompileInput): CompileOutput => compile({ ...input, conditioning: "no_optional", proposals: [] });

export interface Subtraction { with_state: PresentationPlan; generic: PresentationPlan; difference: { block_id: string; with_state: Treatment; generic: Treatment }[]; label: string }
/**
 * Compile the same thing with and without optional personal conditioning. The difference is an inspection aid: a recompiled view
 * can differ for reasons other than the removed belief, so it is not a causal attribution.
 */
export function subtract(input: CompileInput): Subtraction {
  const w = compile(input).plan, g = compileGeneric({ ...input, plan_id: `${input.plan_id}:generic` }).plan;
  const difference = w.blocks.flatMap(b => { const o = g.blocks.find(x => x.block_id === b.block_id)!; return o.treatment === b.treatment ? [] : [{ block_id: b.block_id, with_state: b.treatment, generic: o.treatment }]; });
  return { with_state: w, generic: g, difference, label: "inspection aid, not causal proof: a recompiled view can differ for reasons other than the removed state" };
}

/** Suspend one belief and compare. Suspending is not recorded as evidence that the person lacks the knowledge. */
export function explainWithout(input: CompileInput, beliefId: string): { with_belief: PresentationPlan; without_belief: PresentationPlan; difference: { block_id: string; with: Treatment; without: Treatment }[]; label: string } {
  const a = compile(input).plan, b = compile({ ...input, plan_id: `${input.plan_id}:without`, suspend: [...(input.suspend ?? []), beliefId] }).plan;
  const difference = a.blocks.flatMap(x => { const y = b.blocks.find(z => z.block_id === x.block_id)!; return y.treatment === x.treatment ? [] : [{ block_id: x.block_id, with: x.treatment, without: y.treatment }]; });
  return { with_belief: a, without_belief: b, difference, label: "inspection aid, not causal proof" };
}

/** A cached plan that was invalidated must be recompiled before it is used again; this reports whether it still can be trusted. */
export function planIsCurrent(state: PersonalState, planId: string): { current: boolean; because: string | null } {
  const a = state.artifacts.get(planId);
  return !a ? { current: false, because: "unknown plan" } : a.valid ? { current: true, because: null } : { current: false, because: a.because ?? "invalidated" };
}
