import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyBoundary, assertStagesSeparate, blockRederivation, checkScope, compile, compileGeneric, correctBelief, createContract, createOverlay,
  decideFriction, endOverlay, engineVerifier, expandScope, fitControl, forgetBelief, gateProposal, inspectBeliefs, mayChangeCommunication,
  minimalPayload, observeUnderOverlay, planIsCurrent, promoteToPolicy, proposeEscalation, proposeFromObservations, proposeTaskCondition,
  RECONSIDER_AFTER, recordOverride, reduce, revokeBoundary, subtract, explainWithout, validateEvent, validateRecord, verifyBoundary, RememberingDurable,
  dependents, type InferredBelief, type PersonalEvent, type PersonalRecord, type PortableBoundary, type ProvenanceSink,
} from "../src/index.ts";
import {
  T, SCOPE, SESSION, PURPOSE, BLOCKS, SOURCE, baseInput, boundary, compilePlan, newsService, offlineService, policyStrict, policyReuseInference,
  irisSays, records, scenarioState, videoService, asEvents,
} from "../fixtures/iris.ts";
import { VerificationEngine } from "../../verify/src/engine.ts";
import { MemoryWriteStore } from "../../remembering/src/engine/write/store.ts";
import { recordStructured } from "../../evidence/src/capture.ts";

const person = { by: "person" as const, ref: "iris" };
const model = { by: "model" as const, ref: "faux-model" };
const code = (fn: () => unknown): string => { try { fn(); return "ACCEPTED"; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const counter = () => { let n = 0; return (p: string) => `${p}-${++n}`; };
const treat = (p: { blocks: { block_id: string; treatment: string }[] }, id: string) => p.blocks.find(b => b.block_id === id)!.treatment;
const input = (id: string, p: { inputs: { input_id: string; status: string }[] }) => p.inputs.find(i => i.input_id === id)?.status;
const proposals = [{ belief_id: "inf-derivations-useful", fold: ["library-release"] }, { belief_id: "inf-foundations-known", fold: ["intro-assumptions"] }];

// ─── Chapter 21 / 27: the composed compile ─────────────────────────────────────────────────────────
test("the composed plan keeps the decisive qualifier visible, folds supporting steps by instruction, and says what decided each block", () => {
  const { plan } = compilePlan({ proposals });
  assert.equal(plan.outcome, "PLAN"); assert.equal(plan.mode, "personalised");
  for (const id of ["intro-assumptions", "decisive-equation", "failure-assumptions"]) {
    assert.equal(treat(plan, id), "visible", id);
    assert.equal(plan.blocks.find(b => b.block_id === id)!.decided_by, "preservation");
  }
  assert.equal(treat(plan, "supporting-step-1"), "folded"); assert.equal(plan.blocks.find(b => b.block_id === "supporting-step-1")!.decided_by, "instruction");
  assert.equal(treat(plan, "library-release"), "folded"); assert.equal(plan.blocks.find(b => b.block_id === "library-release")!.decided_by, "inference");
  assert.equal(plan.receipt.mechanism, "deterministic compile");
  assert.match(plan.receipt.does_not_prove, /better|benefit/);
});

test("preservation holds in both the personalised and the generic view, and a proposal cannot fold a preserved block", () => {
  for (const plan of [compilePlan({ proposals }).plan, compileGeneric(baseInput()).plan, compilePlan({ conditioning: "generic_only" }).plan]) {
    for (const id of ["intro-assumptions", "decisive-equation", "failure-assumptions"]) assert.equal(treat(plan, id), "visible", `${plan.mode}/${id}`);
  }
  const { plan } = compilePlan({ proposals: [{ belief_id: "inf-foundations-known", fold: ["decisive-equation", "intro-assumptions"], confirmed_by_person: true }] });
  assert.equal(treat(plan, "decisive-equation"), "visible");
  assert.equal(treat(plan, "intro-assumptions"), "visible");
});

test("a false, overbroad belief is refused by scope and consequence gates, not by its confidence", () => {
  const { plan } = compilePlan({ proposals });
  assert.equal(input("inf-foundations-known", plan), "refused");
  const why = plan.inputs.find(i => i.input_id === "inf-foundations-known")!.reasons.join(" ");
  assert.match(why, /SCOPE_EXPANSION_IS_NEW_INFERENCE/);
  assert.equal(input("inf-derivations-useful", plan), "used");
  const b = records()["inf-foundations-known"] as InferredBelief;
  assert.equal(b.confidence, "high");
  assert.equal(checkScope(b, `${SCOPE}:talk-q`).code, "SCOPE_EXPANSION_IS_NEW_INFERENCE");
  assert.equal(checkScope(b, `${SCOPE}:protocol-p1`).ok, true);
  assert.equal(mayChangeCommunication(b, false).ok, false, "a high-consequence belief needs more evidence");
  const twice = { ...b, evidence_refs: ["a", "b"] };
  assert.match(mayChangeCommunication(twice, false).why, /does not supply it/);
  assert.equal(mayChangeCommunication(twice, true).ok, true);
});

test("a person's confirmation does not widen scope or authority, and a policy with no grant keeps inference out of the plan", () => {
  const confirmed = compilePlan({ proposals: [{ ...proposals[1]!, confirmed_by_person: true }] }).plan;
  assert.equal(treat(confirmed, "intro-assumptions"), "visible", "preservation still wins");
  assert.equal(input("inf-foundations-known", confirmed), "refused", "scope expansion is not cured by confirmation");
  const strict = compilePlan({ proposals, authority: { policy: policyStrict, purpose: PURPOSE } }).plan;
  assert.equal(input("inf-derivations-useful", strict), "refused", "no REUSE grant: confidence is irrelevant");
  assert.equal(strict.optional_conditioning_used, false);
  assert.equal(treat(strict, "library-release"), "visible");
});

test("with no optional inputs the generic path is coherent, and the personalised view subtracts to a named difference", () => {
  const generic = compilePlan({ conditioning: "generic_only" }).plan;
  assert.equal(generic.mode, "generic"); assert.equal(generic.outcome, "PLAN"); assert.equal(generic.optional_conditioning_used, false);
  assert.ok(generic.blocks.length === BLOCKS.length, "every block is placed");
  const s = subtract(baseInput(undefined, { proposals }));
  assert.ok(s.difference.some(d => d.block_id === "library-release" && d.with_state === "folded" && d.generic === "visible"));
  assert.match(s.label, /inspection aid, not causal proof/);
  const ex = explainWithout(baseInput(undefined, { proposals }), "inf-derivations-useful");
  assert.ok(ex.difference.some(d => d.block_id === "library-release" && d.with === "folded" && d.without === "visible"), "removing the belief changes exactly what it changed");
});

test("accessibility is binding: a forbidden form is never planned, and that holds in the generic path too", () => {
  for (const conditioning of ["full", "generic_only"] as const) {
    const { plan } = compilePlan({ conditioning, preservation: { must_keep_visible: ["decisive-equation"], requires_forms: ["interactive-diagram"] } });
    assert.equal(plan.outcome, "CONFLICT", conditioning);
    assert.equal(plan.conflicts[0]!.code, "BINDING_OBLIGATIONS_CONFLICT");
  }
});

test("individually valid inputs can fail together: preservation beyond the time budget is a typed conflict, not a silent ranking", () => {
  const { plan } = compilePlan({ task: { id: "architecture-review", purpose: PURPOSE, available_minutes: 0.1 } });
  assert.deepEqual(plan.conflicts.map(c => c.code), ["PRESERVATION_EXCEEDS_BUDGET"]);
  for (const id of ["intro-assumptions", "decisive-equation", "failure-assumptions"]) assert.equal(treat(plan, id), "visible", "the obligation is not dropped to fit the time");
  assert.ok(plan.conflicts[0]!.detail.length > 0);
});

test("an explicit current instruction outranks a declared policy, and the declared policy outranks an inference", () => {
  const policyOnly = compilePlan({ current_instruction: null }).plan;
  const withInstruction = compilePlan().plan;
  assert.equal(treat(withInstruction, "supporting-step-1"), "folded");
  assert.notEqual(treat(policyOnly, "supporting-step-1") === "folded" && policyOnly.blocks.find(b => b.block_id === "supporting-step-1")!.decided_by === "instruction", true);
  const a = compilePlan({ proposals: [{ belief_id: "inf-derivations-useful", fold: ["supporting-step-1"] }], current_instruction: null }).plan;
  assert.ok(["policy", "default", "overlay", "time_budget", "inference"].includes(a.blocks.find(b => b.block_id === "supporting-step-1")!.decided_by));
});

test("disabled, not consulted, retracted and expired inputs are distinguishable in the plan's ledger", () => {
  const recs = records();
  const base = asEvents(recs);
  const retracted: PersonalEvent[] = [...base, { type: "retracted", at: T.now, id: "pol-arch-review", reason: "no longer true", by: person }];
  assert.equal(input("pol-arch-review", compile(baseInput(reduce(retracted))).plan), "retracted");
  const expired = compile(baseInput(reduce(base), { now: T.after })).plan;
  assert.equal(input("ov-pre-meeting", expired), "expired");
  const disabled = reduce([...base, { type: "optional_disabled", at: T.now, scope: SCOPE, by: person }]);
  const d = compile(baseInput(disabled, { proposals })).plan;
  assert.equal(d.optional_conditioning_used, false);
  assert.equal(input("inf-derivations-useful", d), "disabled");
  const none = compile(baseInput(undefined, { conditioning: "no_optional", proposals })).plan;
  const reasonOf = (pl: typeof d, id: string) => pl.inputs.find(i => i.input_id === id)!.reasons.join(" ");
  assert.match(reasonOf(d, "inf-derivations-useful"), /disabled in this scope by the person/);
  assert.match(reasonOf(none, "inf-derivations-useful"), /no_optional: optional conditioning excluded/, "excluded by mode, which is not the person disabling it");
  assert.notEqual(reasonOf(d, "inf-derivations-useful"), reasonOf(none, "inf-derivations-useful"));
  const statuses = new Set([input("pol-arch-review", compile(baseInput(reduce(retracted))).plan), input("ov-pre-meeting", expired), input("inf-derivations-useful", d)]);
  assert.equal(statuses.size, 3);
});

// ─── Chapter 24: overlay ───────────────────────────────────────────────────────────────────────────────
test("an overlay is scoped, expiring and never durable: it applies in its scope and session only and ends with its time", () => {
  const s = scenarioState();
  const at = (now: string, scope: string, session: string) => compile(baseInput(s, { now, scope, session })).plan.inputs.find(i => i.input_id === "ov-pre-meeting")!.status;
  assert.equal(at(T.now, `${SCOPE}:talk-q`, SESSION), "used");
  assert.notEqual(at(T.now, `${SCOPE}:talk-q`, "another-session"), "used");
  assert.notEqual(at(T.now, "technical-triage", SESSION), "used");
  assert.equal(at(T.after, `${SCOPE}:talk-q`, SESSION), "expired");
  assert.equal(code(() => createOverlay({ id: "o", session: "s", scope: SCOPE, now: T.now, person: irisSays("x"), decisions: [], ends: {} })), "OVERLAY_NEEDS_END");
});

test("ending an overlay sheds its effects: a plan and a behaviour observed under it are invalidated, transitively, and nothing is promoted", () => {
  const s0 = scenarioState();
  const ov = s0.entries.get("ov-pre-meeting")!.record as never;
  const obs = observeUnderOverlay({ id: "obs-under", scope: SCOPE, now: T.now, evidence_id: (s0.entries.get("obs-expand-derivations")!.record as { evidence_id: string }).evidence_id, behaviour: "skipped steps", overlay: ov });
  const sc = reduce([...asEvents(records()), { type: "added", at: T.now, record: obs }]);
  const out = compile(baseInput(sc, { proposals }));
  const withPlan = reduce([...asEvents(records()), { type: "added", at: T.now, record: obs }, ...out.events]);
  const planDeps = withPlan.artifacts.get("plan-1")!.depends_on;
  assert.ok(planDeps.includes("ov-pre-meeting"), "the plan records the overlay it depended on");
  const sinkEdges: string[] = []; const sink: ProvenanceSink = { edge: (f, t, r) => sinkEdges.push(`${f}<-${t}:${r}`) };
  const end = endOverlay(withPlan, "ov-pre-meeting", T.after, "the review ended", sink);
  assert.equal(end.promoted, false);
  assert.ok(end.invalidated.includes("obs-under") && end.invalidated.includes("plan-1"));
  const after = reduce([...withPlan.history.map(h => h), ...end.events]);
  assert.equal(planIsCurrent(after, "plan-1").current, false);
  assert.match(planIsCurrent(after, "plan-1").because ?? "", /overlay ov-pre-meeting ended/);
  assert.ok(sinkEdges.some(e => e.includes("invalidated_by")));
  assert.equal(after.entries.get("ov-pre-meeting")!.status, "ended");
  assert.equal([...after.entries.values()].filter(e => e.record.kind === "declared_policy").length, 1, "no new standing policy appeared");
  assert.equal(code(() => endOverlay(withPlan, "pol-arch-review", T.after, "x")), "NOT_AN_OVERLAY");
});

test("behaviour seen under an overlay keeps its conditions and only a person can promote a proposal into a policy", () => {
  const s0 = scenarioState();
  const ov = s0.entries.get("ov-pre-meeting")!.record as never;
  const ev = (s0.entries.get("obs-expand-derivations")!.record as { evidence_id: string }).evidence_id;
  const obs = observeUnderOverlay({ id: "o1", scope: SCOPE, now: T.now, evidence_id: ev, behaviour: "read only the equation", overlay: ov, extra_conditions: ["ten minutes left"] });
  assert.ok(obs.conditions.includes("ten minutes left") && obs.conditions.some(c => c.startsWith("under overlay")));
  assert.equal(obs.produced_under, "ov-pre-meeting");
  const proposal = proposeFromObservations({ id: "prop-1", now: T.now, scope: SCOPE, observations: [obs], proposition: "Iris prefers equations first before reviews", by: model });
  assert.equal(proposal.standing, "proposed"); assert.equal(proposal.source.by, "model");
  assert.equal(code(() => proposeFromObservations({ id: "p", now: T.now, scope: SCOPE, observations: [], proposition: "x", by: model })), "NO_EVIDENCE");
  const attempt = (actor: typeof model | typeof person) => code(() => promoteToPolicy({ id: "pol-new", now: T.now, scope: SCOPE, person: irisSays("promote"), actor, settings: { depth: "equations first" }, preserve: [], from_proposal: "prop-1" }));
  assert.equal(attempt(model), "PROMOTION_REQUIRES_HUMAN_ACTION");
  assert.equal(attempt({ by: "system", ref: "observer" } as never), "PROMOTION_REQUIRES_HUMAN_ACTION");
  assert.equal(attempt(person), "ACCEPTED");
});

test("a task condition can be offered as correctable context, and an inner state cannot", () => {
  const ok = proposeTaskCondition({ id: "t1", by: model, scope: SCOPE, now: T.now, proposition: "she is comparing two interfaces", evidence_refs: ["obs-expand-derivations"], until: T.reviewEnds });
  assert.equal(ok.belief_kind, "task_condition"); assert.equal(ok.standing, "provisional"); assert.equal(ok.valid.until, T.reviewEnds);
  assert.equal(code(() => proposeTaskCondition({ id: "t2", by: model, scope: SCOPE, now: T.now, proposition: "she is overwhelmed", evidence_refs: ["x"], until: null })), "INNER_STATE_INFERENCE_REJECTED");
});

// ─── Chapter 25: friction ───────────────────────────────────────────────────────────────────────────────
test("a goal alone authorises no intervention, and the default is ordinary access", () => {
  const goalOnly = createContract({ id: "fr-goal", scope: SCOPE, now: T.now, person: irisSays("goal"), goal: "finish this paper", target_action: "open-another-paper", allowed_intervention: null, override: "open it", expires: { at: T.reviewEnds } });
  const s = reduce([{ type: "added", at: T.now, record: goalOnly }]);
  const d = decideFriction(s, "open-another-paper", { now: T.now, scope: SCOPE });
  assert.equal(d.intervention, "none"); assert.equal(d.message, null);
  assert.match(d.reasons.join(" "), /goal is not an authorisation/);
  assert.equal(decideFriction(s, "unrelated-action", { now: T.now, scope: SCOPE }).intervention, "none");
  assert.equal(code(() => createContract({ id: "fr-x", scope: SCOPE, now: T.now, person: irisSays("x"), goal: "g", target_action: "a", allowed_intervention: "reminder", override: "", expires: { at: T.reviewEnds } })), "MALFORMED");
});

test("friction applies the weakest authorised form and a stronger form needs its own decision, and only inside scope and time", () => {
  const mk = (id: string, form: "reminder" | "confirmation" | "delay") => createContract({ id, scope: SCOPE, now: T.now, person: irisSays(id), goal: "finish", target_action: "open-another-paper", allowed_intervention: form, override: "open it now", expires: { at: T.reviewEnds } });
  const s = reduce([{ type: "added", at: T.now, record: mk("a", "confirmation") }, { type: "added", at: T.now, record: mk("b", "reminder") }]);
  const d = decideFriction(s, "open-another-paper", { now: T.now, scope: SCOPE });
  assert.equal(d.intervention, "reminder"); assert.equal(d.contract, "b");
  assert.match(d.message ?? "", /You asked for/);
  assert.equal(decideFriction(s, "open-another-paper", { now: T.after, scope: SCOPE }).intervention, "none", "expired");
  assert.equal(decideFriction(s, "open-another-paper", { now: T.now, scope: "casual-reading" }).intervention, "none", "out of scope");
  const esc = proposeEscalation(mk("b", "reminder"), "delay");
  assert.equal(esc.escalated, false); assert.match(esc.reason, /new explicit decision/);
  assert.equal(proposeEscalation(createContract({ id: "g", scope: SCOPE, now: T.now, person: irisSays("g"), goal: "g", target_action: "a", allowed_intervention: null, override: "o", expires: { at: T.reviewEnds } }), "reminder").escalated, false);
});

test("an override changes that action only, and repeated overrides can prompt a question but never raise the strength", () => {
  let s = scenarioState();
  const before = decideFriction(s, "opening another paper", { now: T.now, scope: SCOPE });
  assert.equal(before.intervention, "reminder");
  const receipts = [];
  for (let i = 1; i <= RECONSIDER_AFTER + 2; i++) {
    const r = recordOverride(s, "fr-one-paper", "opening another paper", T.now, ["late in the day"]);
    receipts.push(r); s = reduce([...s.history, r.event]);
    assert.deepEqual([r.goal_changed, r.contract_revoked, r.intervention_changed], [false, false, false]);
    assert.equal(r.override_count, i);
    assert.ok(r.conditions.includes("late in the day"));
  }
  assert.equal(receipts[0]!.reconsideration.suggested, false);
  assert.equal(receipts[RECONSIDER_AFTER - 1]!.reconsideration.suggested, true);
  assert.match(receipts[RECONSIDER_AFTER - 1]!.reconsideration.question ?? "", /Keep this reminder, change it, or remove it/);
  const after = decideFriction(s, "opening another paper", { now: T.now, scope: SCOPE });
  assert.equal(after.intervention, "reminder", "never escalated");
  assert.equal((s.entries.get("fr-one-paper")!.record as { goal: string }).goal, "finish this review's paper before opening another");
  assert.equal(code(() => recordOverride(s, "pol-arch-review", "x", T.now)), "NOT_A_CONTRACT");
});

// ─── Chapter 26: portable boundary ───────────────────────────────────────────────────────────────────────
const ctxFor = (extra: object = {}) => ({ now: T.now, ids: counter(), state: scenarioState(), scope: SCOPE, session: SESSION, ...extra });

test("the payload is minimal: the rule, its limits and its authority, with no observations, inferences or history", () => {
  const p = minimalPayload(boundary());
  assert.deepEqual(Object.keys(p).sort(), ["authority_ref", "boundary_id", "effect", "end", "override", "persistence", "preserve", "version"]);
  const text = JSON.stringify(p);
  for (const leak of ["obs-expand", "inf-", "evidence", "pol-arch", "derivations", "iris"]) assert.ok(!text.includes(leak), leak);
});

test("a boundary is applied faithfully where an exact control exists, and each stage is reported separately", async () => {
  const svc = videoService();
  const r = await applyBoundary(boundary(), svc, ctxFor());
  assert.equal(r.status, "FAITHFUL"); assert.equal(r.fit, "exact");
  assert.deepEqual(r.stages, { declared: "yes", carried: "yes", received: "yes", supported: "yes", enforced: "yes", verified: "not_attempted" });
  assert.equal(svc.received.length, 1);
  assert.deepEqual(Object.keys(svc.received[0]!).sort(), r.payload_keys);
  assert.doesNotThrow(() => assertStagesSeparate(r));
  assert.equal(code(() => assertStagesSeparate({ ...r, stages: { ...r.stages, received: "no" } })), "STAGE_INFERRED");
  assert.equal(svc.settings.size, 1);
});

test("a broader-only service is refused and the rule is returned for reformulation rather than widened", async () => {
  const svc = newsService();
  const r = await applyBoundary(boundary(), svc, ctxFor());
  assert.equal(r.status, "REFORMULATE"); assert.equal(r.fit, "broader_only"); assert.equal(r.stages.supported, "no"); assert.equal(r.stages.enforced, "not_attempted");
  assert.match(r.reformulation ?? "", /new decision with its own scope; the original was not widened/);
  assert.equal(svc.settings.size, 0, "nothing was applied");
  const b = boundary();
  assert.equal(fitControl(b, [{ id: "c", hides: { category: "consensus-research", surfaces: ["recommendation_feed"], includes_search: true }, supports_override: true, supports_end: ["at", "when"], learning_limit: true, readback: true }]).kind, "broader_only");
  assert.equal(fitControl(b, [{ id: "c", hides: { category: "cooking", surfaces: ["recommendation_feed"], includes_search: false }, supports_override: true, supports_end: ["at", "when"], learning_limit: true, readback: true }]).kind, "broader_only");
  assert.equal(fitControl(b, []).kind, "none");
  const partial = fitControl({ ...b, effect: { ...b.effect, surfaces: ["recommendation_feed", "autoplay_queue"] } }, [{ id: "c", hides: { category: "consensus-research", surfaces: ["recommendation_feed"], includes_search: false }, supports_override: true, supports_end: ["at", "when"], learning_limit: true, readback: true }]);
  assert.equal(partial.kind, "partial"); assert.deepEqual(partial.unsupported, ["autoplay_queue"]);
});

test("an unreachable service is unconfirmed, not applied and not failed, and a service the person did not select gets nothing", async () => {
  const off = offlineService();
  const r = await applyBoundary(boundary(), off, ctxFor());
  assert.equal(r.status, "UNCONFIRMED"); assert.equal(r.stages.carried, "unknown"); assert.equal(r.stages.enforced, "not_attempted");
  assert.equal(off.received.length, 0);
  const stranger = videoService(); (stranger as { id: string }).id = "other-service";
  const d = await applyBoundary(boundary(), stranger, ctxFor());
  assert.equal(d.status, "DESTINATION_NOT_AUTHORISED"); assert.equal(stranger.received.length, 0);
});

test("a boundary that is not active (ended, or retracted) is not applied, and nothing is sent", async () => {
  const svc = videoService();
  const late = await applyBoundary(boundary(), svc, ctxFor({ now: T.after }));
  assert.equal(late.status, "BOUNDARY_NOT_ACTIVE");
  const gone = reduce([...asEvents(records()), { type: "retracted", at: T.now, id: "bd-quiet-feeds", reason: "changed my mind", by: person }]);
  assert.equal((await applyBoundary(boundary(), svc, ctxFor({ state: gone }))).status, "BOUNDARY_NOT_ACTIVE");
  assert.equal(svc.received.length, 0);
});

test("revocation uses the same adapter path and is an enforcement event, not only a deleted source rule", async () => {
  const svc = videoService();
  const applied = await applyBoundary(boundary(), svc, ctxFor());
  const revoked = await revokeBoundary(boundary(), svc, ctxFor({ priorSettingRef: applied.setting_ref }));
  assert.equal(revoked.operation, "revoke"); assert.equal(revoked.status, "REVOKED_APPLIED"); assert.equal(revoked.stages.enforced, "yes");
  assert.equal(svc.settings.size, 0, "the destination setting is gone");
  assert.equal(svc.received.length, 2, "revocation travelled through the same receive path");
  const lost = await revokeBoundary(boundary(), svc, ctxFor({ priorSettingRef: null }));
  assert.equal(lost.status, "UNCONFIRMED", "without a setting reference removal is not claimed");
  const refused = await revokeBoundary(boundary(), svc, ctxFor({ priorSettingRef: "nonexistent" }));
  assert.equal(refused.status, "REVOKE_REFUSED");
});

test("verification is a separate act through core/verify: applying proves nothing about readback, and a false readback is FALSE", async () => {
  const svc = videoService();
  const verifier = engineVerifier(new VerificationEngine(mkdtempSync(join(tmpdir(), "pv-proj-")), { store_dir: mkdtempSync(join(tmpdir(), "pv-store-")) }) as never);
  const applied = await applyBoundary(boundary(), svc, ctxFor());
  assert.equal(applied.stages.verified, "not_attempted"); assert.equal(applied.check_basis, null);
  const checked = await verifyBoundary(applied, svc, verifier, T.now);
  assert.equal(checked.stages.verified, "yes"); assert.match(checked.check_basis ?? "", /read back and checked/); assert.match(checked.check_basis ?? "", /content matching not independently checked/);
  svc.settings.clear();
  assert.equal((await verifyBoundary(applied, svc, verifier, T.now)).stages.verified, "no", "the destination changed: not verified");
  const revoked = await revokeBoundary(boundary(), svc, ctxFor({ priorSettingRef: applied.setting_ref }));
  assert.equal(revoked.stages.verified, "not_attempted");
  assert.equal((await verifyBoundary({ ...applied, setting_ref: null }, svc, verifier, T.now)).stages.verified, "not_attempted");
  assert.ok(applied.limits.some(l => /not proof/.test(l)));
});

test("a portable boundary must forbid promotion, and its persistence is part of the payload", () => {
  const b = records()["bd-quiet-feeds"] as PortableBoundary;
  assert.equal(b.persistence, "no-promotion");
  assert.equal(code(() => validateRecord({ ...b, persistence: "durable" })), "BOUNDARY_MUST_FORBID_PROMOTION");
  assert.equal(code(() => validateRecord({ ...b, destinations: [] })), "MALFORMED");
});

// ─── Chapter 27: beliefs ───────────────────────────────────────────────────────────────────────────────────────
test("a belief exposes provenance, scope, standing, confidence, authority and effects as separate facts", () => {
  const out = compile(baseInput(undefined, { proposals }));
  const state = reduce([...asEvents(records()), ...out.events]);
  const views = inspectBeliefs(state, { now: T.now, scope: `${SCOPE}:talk-q` }, { policy: policyReuseInference, purpose: PURPOSE });
  const v = Object.fromEntries(views.map(x => [x.id, x]));
  const f = v["inf-foundations-known"]!;
  assert.deepEqual([f.origin, f.visible, f.scope_expanded, f.valid.ok], ["inferred", true, true, false]);
  assert.equal(f.confidence, "high"); assert.equal(f.authority.allowed, true, "authority is its own decision");
  assert.ok(f.provenance.evidence_refs.length > 0); assert.equal(f.provenance.by.by, "model");
  assert.deepEqual(f.consequences.direct.includes("plan-1"), false, "a refused belief shaped nothing");
  const u = v["inf-derivations-useful"]!;
  assert.equal(u.valid.ok, true);
  assert.ok(u.consequences.direct.includes("plan-1"), "the plan that used it is listed");
  const strict = inspectBeliefs(state, { now: T.now, scope: SCOPE }, { policy: policyStrict, purpose: PURPOSE }).find(x => x.id === "inf-derivations-useful")!;
  assert.deepEqual([strict.visible, strict.valid.ok, strict.authority.allowed], [true, true, false], "visible and valid, yet not authorised");
});

test("expanding a belief's scope is a new proposed inference that needs its own evidence and inherits no support", () => {
  const b = records()["inf-foundations-known"] as InferredBelief;
  assert.equal(code(() => expandScope(b, { id: "e", now: T.now, new_scope: SCOPE, evidence_refs: [], by: model })), "NEW_INFERENCE_NEEDS_EVIDENCE");
  const wider = expandScope(b, { id: "e", now: T.now, new_scope: `${SCOPE}:talk-q`, evidence_refs: ["obs-expand-derivations"], by: model });
  assert.deepEqual([wider.standing, wider.confidence, wider.supported_scope, wider.depends_on], ["proposed", "low", `${SCOPE}:talk-q`, [b.id]]);
});

test("correcting a belief appends a revision, keeps history, stops use, and invalidates direct and transitive dependents", () => {
  const out = compile(baseInput(undefined, { proposals }));
  const chain: PersonalEvent[] = [...asEvents(records()), ...out.events, { type: "artifact_registered", at: T.now, id: "summary-1", depends_on: ["plan-1"] }];
  const state = reduce(chain);
  assert.deepEqual(dependents(state, "obs-expand-derivations").transitive.includes("summary-1"), true);
  const sink: string[] = [];
  const rep = correctBelief(state, { id: "inf-derivations-useful", now: T.now, by: person, reason: "I only expand when the decision depends on it" }, { edge: (f, t) => sink.push(`${f}<-${t}`) });
  assert.equal(rep.record_corrected, true); assert.equal(rep.future_use_stopped, true); assert.equal(rep.past_effect_reversed, false); assert.equal(rep.downstream.recomputed, false);
  assert.ok(rep.downstream.invalidated.includes("plan-1") && rep.downstream.invalidated.includes("summary-1"));
  const after = reduce([...chain, ...rep.events]);
  assert.equal(after.entries.get("inf-derivations-useful")!.record.id, "inf-derivations-useful", "history kept");
  assert.equal(after.entries.get("inf-derivations-useful")!.status, "rejected");
  assert.equal(planIsCurrent(after, "plan-1").current, false);
  assert.equal(planIsCurrent(after, "summary-1").current, false);
  assert.ok(sink.length >= 2);
  const recomputed = compile(baseInput(after, { proposals, plan_id: "plan-2", supersedes_plan: "plan-1" })).plan;
  assert.equal(treat(recomputed, "library-release"), "visible", "the corrected belief no longer shapes the view");
  assert.equal(input("inf-derivations-useful", recomputed), "retracted");
  assert.equal(code(() => correctBelief(state, { id: "inf-derivations-useful", now: T.now, by: model, reason: "r" })), "CORRECTION_REQUIRES_PERSON");
  assert.equal(code(() => correctBelief(state, { id: "pol-arch-review", now: T.now, by: person, reason: "r" })), "NOT_A_BELIEF");
});

test("a correction may carry the person's replacement, but a replacement authored by a model is refused", () => {
  const state = scenarioState();
  const replacement = validateRecord({ ...records()["pol-arch-review"]!, id: "pol-2", key: "policy:ar2", settings: { depth: "decision-relevant only" } });
  const rep = correctBelief(state, { id: "inf-derivations-useful", now: T.now, by: person, reason: "r", replacement });
  assert.deepEqual(rep.events.slice(0, 3).map(e => e.type), ["belief_rejected", "added", "corrected"]);
  const fake = { ...replacement, source: model } as unknown as PersonalRecord;
  assert.match(code(() => correctBelief(state, { id: "inf-derivations-useful", now: T.now, by: person, reason: "r", replacement: fake })), /DECLARATION_REQUIRES_PERSON/);
});

test("forgetting a belief does not prevent it from being derived again; blocking re-derivation is a separate act that holds", () => {
  const state = scenarioState();
  const f = forgetBelief(state, "inf-derivations-useful", T.now, person, "not me");
  assert.equal(f.rederivation_blocked, false); assert.equal(f.evidence_retained, true);
  const b = records()["inf-derivations-useful"] as InferredBelief;
  const forgotten = reduce([...asEvents(records()), ...f.events]);
  assert.equal(gateProposal(forgotten, { ...b, id: "again" }).accepted, true, "the same inference can come back");
  const blocked = reduce([...asEvents(records()), ...f.events, ...blockRederivation(forgotten, b.key, SCOPE, T.now, person)]);
  assert.equal(gateProposal(blocked, { ...b, id: "again" }).accepted, false);
  assert.equal(gateProposal(blocked, { ...b, id: "other", scope: "x", applied_scope: "technical-triage" }).accepted, true, "blocked only where the person said");
  assert.equal(code(() => forgetBelief(state, "inf-derivations-useful", T.now, model, "r")), "FORGET_REQUIRES_PERSON");
  assert.equal(code(() => blockRederivation(state, "k", "s", T.now, model)), "BLOCK_REQUIRES_PERSON");
});

// ─── durable standing records through core/remembering ──────────────────────────────────────────────────
test("durable standing records survive through core/remembering, keep their kinds, and retraction is a tombstone, not erasure", async () => {
  const store = new MemoryWriteStore();
  const clock = () => T.now;
  const d = new RememberingDurable(store as never, clock);
  const recs = records();
  await d.add(recs["pol-arch-review"]!); await d.add(recs["inf-derivations-useful"]!); await d.add(recs["obs-expand-derivations"]!);
  const roles = [...store.records.values()].map(r => r.role).sort();
  assert.deepEqual(roles, ["evidence", "preference", "proposal"], "an inference is a proposal, never a preference");
  const fresh = new RememberingDurable(store as never, clock);
  const { events, skipped } = await fresh.events();
  assert.deepEqual(skipped, []);
  const s = reduce(events);
  assert.deepEqual([...s.entries.keys()].sort(), ["inf-derivations-useful", "obs-expand-derivations", "pol-arch-review"]);
  const revised = validateRecord({ ...recs["pol-arch-review"]!, id: "pol-arch-review-2", valid: { from: T.now, until: null }, supersedes: "pol-arch-review", settings: { depth: "decision-relevant only" } });
  await fresh.supersede("pol-arch-review", revised, "I changed my mind");
  const del = await fresh.requestDeletion("inf-derivations-useful", "forget it");
  assert.deepEqual([del.effect, del.physical_deletion], ["RETRACTED_NOT_ERASED", "UNSUPPORTED_BY_BACKEND"]);
  assert.equal(await fresh.retract("never-stored", "x").then(() => "ok", e => (e as { code: string }).code), "NOT_DURABLE");
  const { events: later } = await new RememberingDurable(store as never, clock).events();
  const s2 = reduce(later);
  assert.equal(s2.entries.get("inf-derivations-useful")!.status, "retracted");
  assert.ok(s2.entries.has("pol-arch-review") && s2.entries.has("pol-arch-review-2"), "the old policy stays as history");
  assert.equal(code(() => validateEvent({ type: "added", at: T.now, record: { ...recs["pol-arch-review"]!, id: "x", origin: "inferred" } })), "ORIGIN_MISMATCH");
});

test("a malformed or forged durable record is skipped visibly and gains no influence", async () => {
  const store = new MemoryWriteStore();
  const d = new RememberingDurable(store as never, () => T.now);
  await d.add(records()["pol-arch-review"]!);
  store.records.set("forged-1", { ...[...store.records.values()][0]!, recordId: "forged-1", content: JSON.stringify({ ...records()["pol-arch-review"]!, id: "forged", source: model }) });
  store.records.set("junk-1", { ...[...store.records.values()][0]!, recordId: "junk-1", content: "not json" });
  const { events, skipped } = await d.events();
  assert.deepEqual(skipped.map(s => s.durable_id).sort(), ["forged-1", "junk-1"]);
  assert.deepEqual(Object.keys(Object.fromEntries(reduce(events).entries)), ["pol-arch-review"]);
  const evidenceOnly = recordStructured("structured_observation", { x: 1 }, { subject: "s", observed_at: T.now });
  assert.ok(evidenceOnly.evidence_id);
});
