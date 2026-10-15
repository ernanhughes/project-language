import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DELIVERY_MODES, RESOLUTIONS, STAGES, STATUSES, assertContext, attend, chooseResolution, coverageReport, current,
  deliverySurface, establishRelation, firstRevision, humanReceipt, markDelivered, matchSubscription, minimumFor,
  modelReceipt, presentationEstablished, observedStage, reevaluate, reopen, retrieve, schedule, selectUnits,
  validateHistory, validateReceipt, validateRevision, validateUnits, LEGACY_EQUIVALENCE,
  type AttendInput, type CandidateItem, type Revision, type Unit,
} from "../src/attention/index.ts";
import { decide } from "../src/engine/decide.ts";
import { observeDelivery } from "../../admission/src/index.ts";
import {
  T_AFTER, T_DEPLOY, T_MEETING_ENDS, T_NOW, contradiction, contradictionBridge, contradictionRenderings, corpus, decoy,
  inMeeting, lossy, mechanismRenderings, lossyBriefNoQualifierUnit, lossyBridge, lossyRenderings, mechanism, mechanismBridge, meetingOver,
  preprint, purpose, query, subscription, task,
} from "../fixtures/afternoon.ts";

const base = (item: CandidateItem, over: Partial<AttendInput> = {}): AttendInput => ({
  task, subscription, item, corpus, query, topK: 5, renderings: [],
  timing: { now: T_NOW, acts_by: T_DEPLOY, context: inMeeting }, budgetTokens: 200,
  declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW, ...over,
});
const stageOf = (r: ReturnType<typeof attend>, s: string) => r.stages.find(x => x.stage === s)!;

// ─── 1. Case A: a subscription is matched as written ────────────────────────────────────────────────
test("an unreviewed preprint does not satisfy a peer-reviewed subscription, and the subscription is not rewritten", () => {
  const before = JSON.stringify(subscription);
  const r = attend(base(preprint));
  assert.equal(r.qualification!.outcome, "NOT_QUALIFIED");
  assert.equal(r.qualification!.match.matched, false);
  assert.deepEqual(r.qualification!.match.unmet.map(u => [u.stated, u.observed]), [["peer-reviewed", "preprint"]]);
  assert.equal(stageOf(r, "observed").outcome, "yes");
  assert.equal(stageOf(r, "retrieved").outcome, "yes");
  assert.equal(stageOf(r, "eligible").outcome, "yes", "it is eligible: the failure is the standing the person asked for, not permission");
  assert.equal(stageOf(r, "qualified").outcome, "no");
  assert.deepEqual(r.causes, ["evidence_standing:standing in [peer_reviewed] (candidate: preprint)"]);
  assert.equal(stageOf(r, "safe_resolution").outcome, "not_reached");
  assert.equal(r.content, null);
  assert.equal(JSON.stringify(subscription), before, "the fixture did not edit the subscription to make the case pass");
  assert.equal(matchSubscription(subscription, preprint).subscription_version, 1);
});

// ─── 2. Case B: closeness is not a relationship ─────────────────────────────────────────────────────
test("a different mechanism with no delay bound does not weaken the tracked claim without a scope-preserving bridge", () => {
  const sim = retrieve(query, corpus, 5).find(x => x.id === "mechanism")!;
  assert.ok(sim.similarity > 0.3, "the lexical closeness is real: " + sim.similarity);
  const r = attend(base(mechanism, { renderings: mechanismRenderings }));
  assert.equal(r.qualification!.relation!.status, "UNRESOLVED");
  assert.equal(r.qualification!.outcome, "UNRESOLVED");
  assert.equal(stageOf(r, "qualified").outcome, "unknown");
  assert.equal(r.timing!.mode, "AVAILABLE", "an unresolved relation is made available, never pushed");
  assert.match(r.content!, /not established/);
  assert.doesNotMatch(r.content!, /no longer depends|safety result need not/i);
});

test("neither a model's assertion nor a mis-scoped or uncited bridge establishes the relation; an explicit one does", () => {
  const sub = subscription;
  assert.equal(establishRelation(sub, mechanism, mechanismBridge("model")).status, "UNRESOLVED");
  assert.equal(establishRelation(sub, mechanism, { ...mechanismBridge("person"), argument_ref: "  " }).status, "UNRESOLVED");
  assert.equal(establishRelation(sub, mechanism, { ...mechanismBridge("person"), preserves_scope: false }).status, "UNRESOLVED");
  assert.equal(establishRelation(sub, mechanism, { ...mechanismBridge("person"), anchor_scope: "protocol Q" }).status, "UNRESOLVED");
  assert.equal(establishRelation(sub, mechanism, { ...mechanismBridge("person"), candidate_scope: "somewhere else" }).status, "UNRESOLVED");
  const ok = establishRelation(sub, mechanism, mechanismBridge("person"));
  assert.equal(ok.status, "ESTABLISHED");
  assert.equal(ok.reasons[0]!.origin, "supplied_judgement");
  assert.equal(establishRelation(sub, mechanism, mechanismBridge("domain_rule")).status, "ESTABLISHED");
});

// ─── 3. dependency and qualifier closure survive selection ──────────────────────────────────────────
test("the compiler never admits a claim without its qualifier, at any budget", () => {
  const units = contradiction.units!;
  let sawClaim = false; let sawQualifierOnly = false;
  for (let budget = 1; budget <= 120; budget++) {
    let sel;
    try { sel = selectUnits(units, contradiction.source, budget); } catch { continue; }
    if (sel.selected.includes("c-claim")) { sawClaim = true; assert.ok(sel.selected.includes("c-qual"), `budget ${budget}: claim without its qualifier`); }
    if (!sel.selected.includes("c-claim") && sel.selected.includes("c-qual")) sawQualifierOnly = true;
  }
  assert.ok(sawClaim, "the claim is selectable at a large budget");
  assert.ok(sawQualifierOnly, "at some budget only the qualifier fits: the claim waits, it is not shown bare");
});

test("a claim whose qualifier is ineligible is refused for its dependency, not shown without it", () => {
  const sel = selectUnits(contradiction.units!, contradiction.source, 500, { ineligible: ["c-qual"] });
  assert.ok(!sel.selected.includes("c-claim"));
  assert.ok(sel.rejected.some(r => r.id === "c-claim" && /DEPENDENCY/.test(r.decision)), JSON.stringify(sel.rejected));
  assert.ok(sel.selected.includes("c-assume"), "an independent unit is unaffected");
});

test("a unit whose dependency is not in the set, a bad span, a text that is not its span, and a cycle are all refused", () => {
  const u = contradiction.units!;
  const codes = (units: Unit[]) => validateUnits(units, contradiction.source).map(p => p.code);
  assert.deepEqual(codes(u), []);
  assert.ok(codes([{ ...u[1]!, dependsOn: ["nope"] }]).includes("UNKNOWN_DEPENDENCY"));
  assert.ok(codes([{ ...u[0]!, spans: [{ start: 5, end: 99999 }] }]).includes("BAD_SPAN"));
  assert.ok(codes([{ ...u[0]!, text: "something else" }]).includes("TEXT_NOT_SPAN"));
  assert.ok(codes([{ ...u[0]!, dependsOn: ["c-claim"] }, u[1]!]).includes("DEPENDENCY_CYCLE"));
  assert.ok(codes([{ ...u[0]!, source_version: "v2" }]).includes("WRONG_SOURCE"));
  assert.throws(() => selectUnits([{ ...u[0]!, text: "x" }], contradiction.source, 100), /INVALID_UNITS/);
});

// ─── 4. Case C: membership is not semantic preservation ─────────────────────────────────────────────
test("a BRIEF that names the qualifier's unit but says only 'safe' passes membership, nesting and closure, and fails on wording", () => {
  const choice = chooseResolution({ units: lossy.units!, selected: lossy.units!.map(u => u.id), source: lossy.source, renderings: lossyRenderings, minimum: "BRIEF", declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  const brief = choice.attempts.find(a => a.level === "BRIEF")!;
  const by = Object.fromEntries(brief.checks.map(c => [c.name, c.ok]));
  assert.deepEqual(by, { membership: true, nesting: true, dependency_closure: true, semantic_preservation: false });
  assert.equal(brief.accepted, false);
  assert.equal(choice.chosen, "SUMMARY", "the resolution is raised, not the wording excused");
  assert.equal(choice.failed_closed, false);
  assert.ok(choice.reasons.some(r => /raised past BRIEF/.test(r.text)));
  assert.ok(choice.attempts.find(a => a.level === "GLANCE")!.skipped, "GLANCE is below the minimum for this need and is not offered");
});

test("naming the claim without the qualifier's unit also fails dependency closure; and with nothing safe authored, the source stands", () => {
  const withoutQ = [lossyRenderings[0]!, lossyBriefNoQualifierUnit];
  const c1 = chooseResolution({ units: lossy.units!, selected: lossy.units!.map(u => u.id), source: lossy.source, renderings: withoutQ, minimum: "BRIEF", declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  const brief = c1.attempts.find(a => a.level === "BRIEF")!;
  assert.equal(brief.checks.find(c => c.name === "dependency_closure")!.ok, false);
  assert.equal(brief.checks.find(c => c.name === "semantic_preservation")!.ok, false);
  assert.equal(c1.chosen, "SOURCE");
  assert.equal(c1.failed_closed, true);
  assert.equal(c1.rendering.text, lossy.source.text);
});

test("a nested pair fails nesting when a lower rendering names a unit the higher one lacks", () => {
  const lower = { level: "BRIEF" as const, text: "The mechanism is safe under crash faults.", unit_ids: ["l-claim", "l-qual", "l-live"] };
  const higher = { level: "SUMMARY" as const, text: "The mechanism is safe under crash faults.", unit_ids: ["l-claim", "l-qual"] };
  const c = chooseResolution({ units: lossy.units!, selected: lossy.units!.map(u => u.id), source: lossy.source, renderings: [lower, higher], minimum: "BRIEF", declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  assert.equal(c.attempts.find(a => a.level === "BRIEF")!.checks.find(x => x.name === "nesting")!.ok, false);
});

test("the minimum resolution comes from the person's need: passing a GLANCE contract does not make GLANCE sufficient", () => {
  assert.deepEqual(["triage", "decide", "safety_claim", "implement", "judge_proof"].map(n => minimumFor(n as never)), ["GLANCE", "BRIEF", "SUMMARY", "DETAIL", "DETAIL"]);
  const run = (min: "GLANCE" | "SUMMARY" | "DETAIL") => chooseResolution({ units: lossy.units!, selected: lossy.units!.map(u => u.id), source: lossy.source, renderings: lossyRenderings, minimum: min, declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  assert.equal(run("SUMMARY").chosen, "SUMMARY");
  assert.equal(run("DETAIL").chosen, "DETAIL");
  const judgingProof = chooseResolution({ units: contradiction.units!, selected: contradiction.units!.map(u => u.id), source: contradiction.source, renderings: contradictionRenderings, minimum: "DETAIL", declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  assert.equal(judgingProof.chosen, "SOURCE", "no DETAIL was authored, so a proof is judged from the source and not from a brief");
});

test("the check behind an accepted rendering is itself validated by mutation probes", () => {
  const c = chooseResolution({ units: contradiction.units!, selected: contradiction.units!.map(u => u.id), source: contradiction.source, renderings: contradictionRenderings, minimum: "BRIEF", declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  const brief = c.attempts.find(a => a.level === "BRIEF")!;
  assert.equal(brief.instrument, "validated");
  assert.equal(brief.accepted, true);
});

// ─── 5. QUEUE/BRIEF and DIGEST are reachable ────────────────────────────────────────────────────────
test("QUEUE with BRIEF is reachable: a qualifying contradiction safe at BRIEF, during a meeting", () => {
  const r = attend(base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge }));
  assert.equal(r.qualification!.outcome, "QUALIFIED");
  assert.equal(r.resolution!.chosen, "BRIEF");
  assert.equal(r.timing!.mode, "QUEUE");
  assert.equal(r.timing!.deliver_after, T_MEETING_ENDS);
  const first = r.history[0]!;
  assert.deepEqual([first.status, first.resolution, first.mode], ["PENDING", "BRIEF", "QUEUE"]);
});

test("DIGEST is reachable, and the delivery surface reaches all four modes", () => {
  const t = schedule({ now: T_NOW, acts_by: null, context: inMeeting });
  assert.equal(t.mode, "DIGEST");
  const surface = deliverySurface();
  assert.ok(surface.length >= 512, `enumerated ${surface.length} input combinations`);
  const modes = new Set(surface.map(r => r.mode));
  assert.deepEqual([...modes].sort(), [...DELIVERY_MODES].sort());
  const cells = new Set(surface.map(r => `${r.urgency}/${r.cost}/${r.mode}`));
  for (const want of ["HIGH/LOW/NOW", "HIGH/HIGH/QUEUE", "HIGH/HIGH/NOW", "MEDIUM/HIGH/QUEUE", "LOW/HIGH/DIGEST", "LOW/LOW/DIGEST", "LOW/HIGH/AVAILABLE"]) assert.ok(cells.has(want), "unreachable: " + want);
  // an impossible output is visible here: every row maps to exactly one declared mode
  assert.ok(surface.every(r => (DELIVERY_MODES as readonly string[]).includes(r.mode)));
  assert.ok(surface.filter(r => r.inputs.non_interruptive === true).every(r => r.mode === "AVAILABLE"), "non-interruptive is always AVAILABLE");
  assert.ok(surface.filter(r => r.cost === "HIGH" && r.mode === "NOW").every(r => r.inputs.delay_exceeds === true), "NOW against a high cost only on a declared reason");
});

test("the lifted radar cannot represent either: QUEUE is always GLANCE and DIGEST is never produced", () => {
  const seen = new Set<string>();
  for (const task_relevance of ["high", "medium", "low"] as const) for (const novelty of ["NEW", "ACCESSIBLE", "UNCERTAIN", "STALE", "UNKNOWN"] as const)
    for (const evidential_validity of ["confirmed", "unconfirmed", "refuted", "unknown"] as const) for (const urgency of ["expiring", "soon", "routine"] as const) for (const cost of ["low", "high"] as const) {
      const d = decide({ id: "x", kind: "x", task_relevance, novelty, evidential_validity, urgency, cost });
      seen.add(`${d.disposition}/${d.resolution}`);
    }
  assert.ok(!seen.has("QUEUE/BRIEF"), "pinned legacy limit");
  assert.ok([...seen].every(s => !s.startsWith("DIGEST")));
  assert.ok([...seen].filter(s => s.startsWith("QUEUE")).every(s => s === "QUEUE/GLANCE"));
  assert.equal(LEGACY_EQUIVALENCE.SIDECAR, "AVAILABLE (non-interruptive)");
});

// ─── 6. timing never rewrites resolution ────────────────────────────────────────────────────────────
test("timing takes no resolution as input and its answer cannot depend on one", () => {
  const same = RESOLUTIONS.map(() => schedule({ now: T_NOW, acts_by: T_DEPLOY, context: inMeeting }).mode);
  assert.equal(new Set(same).size, 1);
  assert.equal(schedule.length, 1, "a single argument, none of which is a resolution");
});

test("after the meeting ends a new revision is BRIEF + NOW; the resolution did not change because the timing did", () => {
  const r = attend(base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge }));
  const next = reevaluate({
    history: r.history, circumstance: { kind: "meeting_ended", at: T_AFTER },
    timing: { now: T_AFTER, acts_by: T_DEPLOY, context: meetingOver },
    standing: { permission: true, current: true, scope: true, standing: true }, acts_by: T_DEPLOY,
  });
  assert.deepEqual([next.revision, next.status, next.resolution, next.mode], [2, "PENDING", "BRIEF", "NOW"]);
  assert.deepEqual(next.prior, { decision_id: "attn:contradiction", revision: 1 });
  assert.equal(next.trigger!.kind, "meeting_ended");
  assert.equal(next.evaluated_at, T_AFTER);
  assert.equal(next.policy_version, "attention-policy-v1");
  assert.ok(next.reasons.some(x => /meeting_ended/.test(x.text)));
  const history = [...r.history, next];
  assert.equal(history[0]!.mode, "QUEUE", "the earlier decision was not overwritten");
  assert.ok(Object.isFrozen(history[0]) && Object.isFrozen(next));
  assert.deepEqual(validateHistory(history), []);
});

// ─── 7/8. lifecycle: re-evaluation, withdrawal, expiry, reopening ───────────────────────────────────
const pending = (): Revision[] => attend(base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge })).history;
const ok = { permission: true, current: true, scope: true, standing: true };
const tm = { now: T_AFTER, acts_by: T_DEPLOY, context: meetingOver };

test("permission revoked, a newer result, or stale evidence each withdraw a queued decision with a versioned reason", () => {
  for (const [c, dim] of [
    [{ kind: "permission_revoked" as const, at: T_AFTER, detail: "grant removed" }, "permission"],
    [{ kind: "superseded" as const, at: T_AFTER, by: "newer-result" }, "currentness"],
    [{ kind: "evidence_stale" as const, at: T_AFTER, detail: "retracted" }, "evidence_standing"],
  ] as const) {
    const w = reevaluate({ history: pending(), circumstance: c, timing: tm, standing: ok, acts_by: T_DEPLOY });
    assert.equal(w.status, "WITHDRAWN", c.kind);
    assert.equal(w.mode, null);
    assert.equal(w.revision, 2);
    assert.equal(w.reasons[0]!.dimension, dim);
    assert.deepEqual(validateRevision(w), []);
  }
  const lostScope = reevaluate({ history: pending(), circumstance: { kind: "meeting_ended", at: T_AFTER }, timing: tm, standing: { ...ok, scope: false }, acts_by: T_DEPLOY });
  assert.equal(lostScope.status, "WITHDRAWN", "a lost standing found on re-evaluation withdraws it even when the trigger was only the meeting");
});

test("a deadline passed while queued expires the decision; delivered and withdrawn decisions are not reopened by timing", () => {
  const e = reevaluate({ history: pending(), circumstance: { kind: "deadline_passed", at: "2026-10-15T18:01:00.000Z" }, timing: { ...tm, now: "2026-10-15T18:01:00.000Z" }, standing: ok, acts_by: T_DEPLOY });
  assert.equal(e.status, "EXPIRED");
  assert.throws(() => reevaluate({ history: [...pending(), e], circumstance: { kind: "meeting_ended", at: T_AFTER }, timing: tm, standing: ok, acts_by: T_DEPLOY }), /TERMINAL_REVISION/);
  const now = reevaluate({ history: pending(), circumstance: { kind: "meeting_ended", at: T_AFTER }, timing: tm, standing: ok, acts_by: T_DEPLOY });
  const receipt = humanReceipt({ decision_id: now.decision_id, revision: now.revision, interface: "test-ui", content: "x", resolution: "BRIEF", mode: "NOW", presented_at: T_AFTER });
  const delivered = markDelivered([...pending(), now], receipt);
  assert.equal(delivered.status, "DELIVERED");
  assert.throws(() => reevaluate({ history: [...pending(), now, delivered], circumstance: { kind: "meeting_ended", at: T_AFTER }, timing: tm, standing: ok, acts_by: T_DEPLOY }), /TERMINAL_REVISION/);
  assert.throws(() => markDelivered([...pending(), now], { ...receipt, revision: 1 }), /RECEIPT_REVISION_MISMATCH/);
});

test("reopening re-runs every gate on the candidate as it is now; the rejected preprint stays rejected", () => {
  const withheld = attend(base(preprint)).history;
  assert.equal(current(withheld).status, "WITHDRAWN");
  const r = reopen(withheld, base(preprint), T_AFTER);
  assert.equal(r.ok, false);
  assert.equal(r.revision, undefined);
  assert.ok(r.refused!.some(x => /peer_reviewed/.test(x)), JSON.stringify(r.refused));
  const d = reopen(attend(base(decoy)).history, base(decoy), T_AFTER);
  assert.equal(d.ok, false);
  assert.ok(d.refused!.includes("permission:no-grant") && d.refused!.includes("scope:scope-mismatch"));
});

test("a reopened candidate is kept within reach (AVAILABLE) and every revision returned validates", () => {
  const withheld = attend(base(preprint)).history;
  const improved: CandidateItem = { ...preprint, standing: "peer_reviewed" };
  const r = reopen(withheld, base(improved, { bridge: { ...contradictionBridge, candidate_scope: improved.scope } }), T_AFTER);
  assert.equal(r.ok, true);
  const rev = r.revision!;
  assert.deepEqual([rev.status, rev.mode, rev.non_interruptive, rev.trigger!.kind], ["PENDING", "AVAILABLE", true, "reopened"]);
  assert.notEqual(rev.resolution, null);
  assert.deepEqual(validateRevision(rev), []);
  assert.deepEqual(validateHistory([...withheld, rev]), []);
  // the counterexample from the review: a reopened item must never be PENDING/NOW with no resolution
  assert.ok(!(rev.mode === "NOW" && rev.resolution === null));
});

test("a revoked permission is not restored by reopening; restoring the grant is what allows it", () => {
  const w = reevaluate({ history: pending(), circumstance: { kind: "permission_revoked", at: T_AFTER, detail: "grant removed" }, timing: tm, standing: ok, acts_by: T_DEPLOY });
  const history = [...pending(), w];
  const revoked: CandidateItem = { ...contradiction, grants: [] };
  const no = reopen(history, base(revoked, { renderings: contradictionRenderings, bridge: contradictionBridge }), T_AFTER);
  assert.equal(no.ok, false);
  assert.ok(no.refused!.includes("permission:no-grant"));
  const yes = reopen(history, base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge }), T_AFTER);
  assert.equal(yes.ok, true);
  assert.deepEqual(validateHistory([...history, yes.revision!]), []);
});

test("only a withdrawn or expired decision is reopened: pending and delivered ones are refused", () => {
  assert.throws(() => reopen(pending(), base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge }), T_AFTER), /NOT_REOPENABLE/);
  const now = reevaluate({ history: pending(), circumstance: { kind: "meeting_ended", at: T_AFTER }, timing: tm, standing: ok, acts_by: T_DEPLOY });
  const receipt = humanReceipt({ decision_id: now.decision_id, revision: now.revision, interface: "ui", content: "x", resolution: "BRIEF", mode: "NOW", presented_at: T_AFTER });
  const delivered = markDelivered([...pending(), now], receipt);
  assert.throws(() => reopen([...pending(), now, delivered], base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge }), T_AFTER), /NOT_REOPENABLE/);
});

test("an unresolved relation stays non-interruptive when the meeting ends: AVAILABLE does not become NOW", () => {
  const r = attend(base(mechanism, { renderings: mechanismRenderings }));
  assert.equal(r.history[0]!.non_interruptive, true);
  const next = reevaluate({ history: r.history, circumstance: { kind: "meeting_ended", at: T_AFTER }, timing: { now: T_AFTER, acts_by: T_DEPLOY, context: meetingOver }, standing: { permission: true, current: true, scope: true, standing: true }, acts_by: T_DEPLOY });
  assert.equal(next.mode, "AVAILABLE");
});

// ─── 9. Case E: the decoy ───────────────────────────────────────────────────────────────────────────
test("a keyword-stuffed decoy may be retrieved, and retrieval grants it nothing", () => {
  const sim = retrieve(query, corpus, 5);
  const rank = sim.findIndex(x => x.id === "decoy");
  assert.ok(rank >= 0 && rank <= 2, "it ranks high on overlap alone: position " + rank);
  const r = attend(base(decoy, { renderings: contradictionRenderings }));
  assert.equal(stageOf(r, "retrieved").outcome, "yes");
  assert.equal(stageOf(r, "eligible").outcome, "no");
  assert.deepEqual(r.eligibility!.failed.map(x => x.ref).sort(), ["no-grant", "scope-mismatch"], "more than one cause is recorded, not a single reason");
  assert.deepEqual(r.causes.sort(), ["permission:no-grant", "scope:scope-mismatch"]);
  assert.equal(matchSubscription(subscription, decoy).matched, false, "its standing is unmet as well");
  for (const s of ["selected", "assembled", "qualified", "safe_resolution", "delivery_timing"]) assert.equal(stageOf(r, s).outcome, "not_reached", s);
  assert.equal(r.content, null);
  assert.equal(current(r.history).status, "WITHDRAWN");
  assert.equal(r.timing, null);
});

// ─── 10. two receipts, never one ────────────────────────────────────────────────────────────────────
test("model delivery and human presentation are separate receipts, and neither stands in for the other", () => {
  const delivery = observeDelivery({ packet: "[CONTEXT BUNDLE]\nx\n[/CONTEXT BUNDLE]\n", packetSha256: "p", assembledIds: ["a"], transitions: [] } as never, "no packet here");
  const m = modelReceipt(delivery);
  const content = "BRIEF text";
  const h = humanReceipt({ decision_id: "attn:contradiction", revision: 2, interface: "test-ui", content, resolution: "BRIEF", mode: "NOW", presented_at: T_AFTER });
  assert.equal(m.kind, "model_delivery"); assert.equal(h.kind, "human_presentation");
  assert.deepEqual(validateReceipt(m), []); assert.deepEqual(validateReceipt(h), []);
  assert.equal(presentationEstablished([m], "attn:contradiction", 2, content), false, "a model receipt is not a presentation");
  assert.equal(presentationEstablished([h], "attn:contradiction", 2, content), true);
  assert.equal(presentationEstablished([h], "attn:contradiction", 1, content), false, "another revision");
  assert.equal(presentationEstablished([h], "attn:contradiction", 2, content + "!"), false, "other content");
  const noticed = observedStage([h], [], "attn:contradiction", 2, content);
  assert.deepEqual(noticed.map(s => `${s.stage}:${s.outcome}`), ["presented:yes", "noticed:unknown", "used:unknown", "helpful:unknown"]);
  const seen = observedStage([h], [{ kind: "noticed", decision_id: "attn:contradiction", revision: 2, observed_by: "eye-tracker", at: T_AFTER }], "attn:contradiction", 2, content);
  assert.equal(seen.find(s => s.stage === "noticed")!.outcome, "yes");
  assert.equal(seen.find(s => s.stage === "used")!.outcome, "unknown");
  assert.ok(m.not_shown.includes("human presentation"));
  const crossed = { ...m, decision_id: "attn:contradiction", revision: 2, content_sha256: h.content_sha256, presented_at: T_AFTER } as never;
  assert.equal(presentationEstablished([crossed], "attn:contradiction", 2, content), false, "a model receipt dressed with presentation fields is still not one");
});

test("a presentation receipt cannot claim the person noticed, used or benefited; a model receipt cannot carry presentation fields", () => {
  const h = humanReceipt({ decision_id: "d", revision: 1, interface: "ui", content: "c", resolution: "GLANCE", mode: "AVAILABLE", presented_at: T_NOW });
  for (const k of ["noticed", "used", "helpful"]) assert.equal(validateReceipt({ ...h, [k]: "yes" })[0]!.code, "OVERCLAIM");
  assert.equal(validateReceipt({ ...h, boundary: "provider_callback" }).some(p => p.code === "WRONG_BOUNDARY"), true);
  assert.equal(validateReceipt({ kind: "model_delivery", boundary: "provider_callback", presented_at: T_NOW }).some(p => p.code === "CROSSED_RECEIPT"), true);
  assert.equal(validateReceipt(null)[0]!.code, "MALFORMED");
  assert.equal(validateReceipt({ kind: "other" })[0]!.code, "UNKNOWN_KIND");
});

// ─── 11. coverage ───────────────────────────────────────────────────────────────────────────────────
test("coverage names its boundary, lists only configured and observed sources, and keeps several causes", () => {
  const rep = coverageReport({
    boundary: "two configured feeds, one afternoon", configured_sources: ["feed-a", "feed-b", "feed-c"],
    searches: [{ source_id: "feed-a", query, at: T_NOW, ok: true }, { source_id: "feed-b", query, at: T_NOW, ok: false, error: "timeout" }],
    retrieved: ["preprint", "decoy"], failures: [{ source_id: "feed-b", error: "timeout" }],
    exclusions: [{ candidate_id: "decoy", reached_stages: ["observed", "retrieved"], causes: ["no-grant", "scope-mismatch", "unmet standing"] }],
    deferrals: [{ candidate_id: "contradiction", until: T_MEETING_ENDS, why: "in a meeting" }],
  });
  assert.deepEqual(rep.searched_sources, ["feed-a"]);
  assert.deepEqual(rep.configured_but_not_searched, ["feed-b", "feed-c"]);
  assert.equal(rep.covers, "configured and observed sources only");
  assert.ok(rep.unknown.some(u => /never retrieved/.test(u)) && rep.unknown.some(u => /not configured/.test(u)));
  assert.equal(rep.exclusions![0]!.causes.length, 3);
  assert.throws(() => coverageReport({ boundary: "x", configured_sources: ["a"], searches: [{ source_id: "z", query: "q", at: T_NOW, ok: true }], retrieved: [] }), /SEARCH_OUTSIDE_CONFIGURATION/);
  assert.throws(() => coverageReport({ boundary: " ", configured_sources: [], searches: [], retrieved: [] }), /COVERAGE_NO_BOUNDARY/);
  assert.throws(() => coverageReport({ boundary: "x", configured_sources: [], searches: [], retrieved: [], exclusions: [{ candidate_id: "c", reached_stages: [], causes: [] }] }), /EXCLUSION_NO_CAUSE/);
});

// ─── 12. context is declared or observed ────────────────────────────────────────────────────────────
test("inferred inner state has no key, no origin and no way in", () => {
  const f = { key: "calendar_state", value: "in_meeting", origin: "observed_context", ref: "cal", at: T_NOW } as const;
  assert.doesNotThrow(() => assertContext([f]));
  assert.throws(() => assertContext([{ ...f, key: "mood" as never, value: "stressed" }]), /CONTEXT_KEY_NOT_ALLOWED/);
  assert.throws(() => assertContext([{ ...f, origin: "inferred" as never }]), /CONTEXT_ORIGIN/);
  assert.throws(() => assertContext([{ ...f, ref: "" }]), /CONTEXT_NO_REF/);
  assert.throws(() => schedule({ now: T_NOW, acts_by: null, context: [{ ...f, origin: "inferred" as never }] }), /CONTEXT_ORIGIN/);
});

// ─── 13. reasons carry typed origins; shapes are checked exhaustively ───────────────────────────────
test("a qualification cannot rest only on a model's proposal, and every stage reason says what it rests on", () => {
  const r = attend(base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge }));
  const rev = current(r.history);
  assert.deepEqual(validateRevision(rev, "QUALIFIED"), []);
  const modelOnly: Revision = { ...rev, reasons: [{ dimension: "relevance", origin: "model_proposal", ref: "gpt", text: "seems relevant" }] };
  assert.ok(validateRevision(modelOnly, "QUALIFIED").some(p => p.code === "MODEL_ONLY_BASIS"));
  assert.ok(validateRevision({ ...rev, reasons: [{ dimension: "relevance", origin: "computed_rule", ref: " ", text: "mentions the purpose" }] }).some(p => p.code === "REASON_WITHOUT_REF"));
  for (const s of r.stages) for (const x of s.reasons) { assert.ok(x.ref.trim(), s.stage); assert.notEqual(x.origin, "model_proposal"); }
  assert.deepEqual(r.stages.map(s => s.stage), [...STAGES]);
  for (const s of ["noticed", "used", "helpful"]) assert.equal(stageOf(r, s).outcome, "unknown");
  assert.equal(stageOf(r, "presented").outcome, "unknown", "nothing has been presented yet");
});

test("every combination of status, resolution and mode is checked: impossible shapes are rejected, possible ones are accepted", () => {
  const rows: string[] = []; let valid = 0;
  for (const status of STATUSES) for (const resolution of [null, ...RESOLUTIONS]) for (const mode of [null, ...DELIVERY_MODES]) {
    const rev: Revision = { decision_id: "d", revision: 1, prior: null, status, resolution, mode, non_interruptive: false, trigger: null, policy_version: "v", reasons: [{ dimension: "timing", origin: "computed_rule", ref: "r", text: "t" }], evaluated_at: T_NOW };
    const problems = validateRevision(rev).map(p => p.code);
    if (problems.length === 0) { valid++; rows.push(`${status}/${resolution}/${mode}`); }
    if (mode !== null && resolution === null) assert.ok(problems.includes("DELIVERY_WITHOUT_RESOLUTION"), `${status}/${resolution}/${mode}`);
    if (status === "PENDING" && mode === null) assert.ok(problems.includes("PENDING_WITHOUT_MODE"));
    if ((status === "WITHDRAWN" || status === "EXPIRED") && mode !== null) assert.ok(problems.includes("TERMINAL_WITH_MODE"));
  }
  assert.equal(STATUSES.length * (RESOLUTIONS.length + 1) * (DELIVERY_MODES.length + 1), 4 * 6 * 5);
  assert.ok(rows.includes("PENDING/BRIEF/QUEUE") && rows.includes("PENDING/BRIEF/DIGEST") && rows.includes("PENDING/SOURCE/AVAILABLE"));
  assert.ok(!rows.includes("PENDING/null/NOW") && !rows.includes("PENDING/BRIEF/null") && !rows.includes("WITHDRAWN/BRIEF/NOW"));
  assert.ok(valid > 0 && valid < 4 * 6 * 5);
});

test("a history chain must be numbered, adjacent and stop at a settled state", () => {
  const h = pending();
  const bad: Revision = { ...h[0]!, revision: 3, prior: { decision_id: "d", revision: 1 } };
  assert.ok(validateHistory([h[0]!, bad]).some(p => p.code === "REVISION_NUMBER" || p.code === "PRIOR_NOT_ADJACENT"));
  const exp = reevaluate({ history: h, circumstance: { kind: "deadline_passed", at: "2026-10-15T18:05:00.000Z" }, timing: tm, standing: ok, acts_by: T_DEPLOY });
  const after: Revision = { ...exp, revision: 3, prior: { decision_id: exp.decision_id, revision: 2 }, status: "PENDING", mode: "NOW" };
  assert.ok(validateHistory([h[0]!, exp, after]).some(p => p.code === "AFTER_TERMINAL"));
});

// ─── the evidence scope is part of the deliverable ──────────────────────────────────────────────────
import { EVIDENCE_SCOPE } from "../src/attention/index.ts";
test("the evidence scope names what is and is not established, and claims nothing it forbids itself", () => {
  assert.deepEqual(Object.keys(EVIDENCE_SCOPE).sort(), ["does_not_establish", "establishes", "fixture_scope", "model_mode", "observation_boundary"]);
  const est = EVIDENCE_SCOPE.establishes.join(" ").toLowerCase();
  for (const forbidden of ["real-model", "benefit", "recall", "prevalence", "noticed", "open-world", "semantic fidelity"]) assert.ok(!est.includes(forbidden), `establishes must not mention: ${forbidden}`);
  const dont = EVIDENCE_SCOPE.does_not_establish.join(" ").toLowerCase();
  for (const required of ["real-model", "noticed", "open-world", "semantic fidelity", "prevalence", "discovery"]) assert.ok(dont.includes(required), `does_not_establish must mention: ${required}`);
  assert.match(EVIDENCE_SCOPE.model_mode, /scripted/);
});

// ─── review counterexamples: selection governs presentation ─────────────────────────────────────────
const ids = (u: Unit[]) => u.map(x => x.id);
test("a rendering may use only units the compiler selected: a rejected claim is not displayed (reviewer budget case)", () => {
  const r = attend(base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge, budgetTokens: 30 }));
  assert.ok(r.selection!.selected.includes("c-qual") && !r.selection!.selected.includes("c-claim"), JSON.stringify(r.selection!.selected));
  assert.equal(r.resolution!.basis, "source_stands");
  assert.equal(r.resolution!.chosen, "SOURCE");
  const brief = r.resolution!.attempts.find(a => a.level === "BRIEF")!;
  assert.equal(brief.checks.find(c => c.name === "membership")!.ok, false);
  assert.match(brief.checks.find(c => c.name === "membership")!.detail, /did not select: c-claim/);
  assert.equal(r.content!.startsWith(contradictionRenderings[1]!.text), false, "the BRIEF was not shown");
});

test("when the budget selects nothing there is no summary at all: safe_resolution is no and the source stands (reviewer budget 1)", () => {
  const r = attend(base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge, budgetTokens: 1 }));
  assert.deepEqual(r.selection!.selected, []);
  assert.equal(stageOf(r, "selected").outcome, "no");
  assert.equal(stageOf(r, "safe_resolution").outcome, "no");
  assert.equal(r.resolution!.chosen, "SOURCE");
  assert.ok(!r.content!.includes(contradictionRenderings[1]!.text));
});

test("whatever the budget, an authored rendering that is chosen uses only selected units", () => {
  for (let budget = 1; budget <= 150; budget += 1) {
    const r = attend(base(contradiction, { renderings: contradictionRenderings, bridge: contradictionBridge, budgetTokens: budget }));
    if (r.resolution!.basis === "authored") for (const id of r.resolution!.rendering.unit_ids) assert.ok(r.selection!.selected.includes(id), `budget ${budget}: ${id} was not selected`);
    else assert.equal(r.resolution!.rendering.text, contradiction.source.text, `budget ${budget}`);
  }
});

test("an authored summary that names no unit is refused, and so is arbitrary text attached to a real unit (reviewer 'moon' case)", () => {
  const run = (renderings: { level: "BRIEF"; text: string; unit_ids: string[] }[]) =>
    chooseResolution({ units: contradiction.units!, selected: ids(contradiction.units!), source: contradiction.source, renderings, minimum: "BRIEF", declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  const unattached = run([{ level: "BRIEF", text: "The moon is cheese", unit_ids: [] }]);
  assert.equal(unattached.chosen, "SOURCE");
  assert.match(unattached.attempts.find(a => a.level === "BRIEF")!.checks[0]!.detail, /names no unit/);
  const attached = run([{ level: "BRIEF", text: "The moon is cheese", unit_ids: ["c-assume"] }]);
  assert.equal(attached.chosen, "SOURCE");
  const a = attached.attempts.find(x => x.level === "BRIEF")!;
  assert.equal(a.checks.find(c => c.name === "membership")!.ok, true, "the unit is real and selected");
  assert.equal(a.checks.find(c => c.name === "semantic_preservation")!.ok, false, "but its words are not in the text");
});

test("an item with no unit decomposition is not summarised: it falls back to the source, honestly", () => {
  const undecomposed: CandidateItem = { ...contradiction, units: undefined };
  const r = attend(base(undecomposed, { renderings: contradictionRenderings, bridge: contradictionBridge }));
  assert.equal(r.qualification!.outcome, "QUALIFIED");
  assert.equal(r.resolution!.basis, "source_stands");
  assert.equal(r.resolution!.failed_closed, false, "this is not a failure; there was nothing to select from");
  assert.equal(r.content!.startsWith(contradiction.source.text), true);
  assert.ok(r.resolution!.reasons.some(x => /no unit decomposition/.test(x.text)));
});

// ─── review counterexamples: the relation asked for ─────────────────────────────────────────────────
test("the relation a bridge asserts must be the one the subscription asks for; 'unrelated' qualifies nothing (reviewer case)", () => {
  const unrelated = { ...contradictionBridge, relation: "unrelated" as const, asserts: "this candidate is unrelated to the tracked claim" };
  const r1 = establishRelation(subscription, contradiction, unrelated);
  assert.equal(r1.status, "NOT_RELATED");
  const q = attend(base(contradiction, { renderings: contradictionRenderings, bridge: unrelated }));
  assert.equal(q.qualification!.outcome, "NOT_QUALIFIED");
  assert.equal(q.content, null);
  assert.equal(establishRelation(subscription, contradiction, { ...contradictionBridge, relation: "supports" }).status, "NOT_RELATED");
  assert.equal(establishRelation(subscription, contradiction, { ...contradictionBridge, relation: "weakens" }).status, "ESTABLISHED");
});

// ─── review counterexamples: context values ─────────────────────────────────────────────────────────
test("an unknown context value is refused and a missing or unknown calendar is not read as free (reviewer in_surgery case)", () => {
  const ctx = (value: string) => [{ key: "calendar_state" as const, value, origin: "observed_context" as const, ref: "calendar", at: T_NOW }];
  assert.throws(() => schedule({ now: T_NOW, acts_by: T_DEPLOY, context: ctx("in_surgery") }), /CONTEXT_VALUE_NOT_ALLOWED/);
  assert.throws(() => assertContext([{ key: "do_not_disturb", value: "maybe", origin: "declared_context", ref: "x", at: T_NOW }]), /CONTEXT_VALUE_NOT_ALLOWED/);
  assert.throws(() => assertContext([{ key: "next_break_at", value: "soon", origin: "declared_context", ref: "x", at: T_NOW }]), /INVALID_TIME/);
  for (const context of [[], ctx("unknown")]) {
    const t = schedule({ now: T_NOW, acts_by: T_DEPLOY, context });
    assert.equal(t.cost, "HIGH");
    assert.notEqual(t.mode, "NOW");
    assert.ok(t.reasons.some(x => x.ref === "calendar-unknown"));
  }
  assert.equal(schedule({ now: T_NOW, acts_by: T_DEPLOY, context: ctx("free") }).mode, "NOW");
});

test("each named unit's own words are checked, not only the claim and qualifier (mutation-driven)", () => {
  const rendering = { level: "BRIEF" as const, text: "A peer-reviewed analysis finds protocol P loses safety under crash faults when network delay is unbounded.", unit_ids: ["c-claim", "c-qual", "c-assume"] };
  const c = chooseResolution({ units: contradiction.units!, selected: ids(contradiction.units!), source: contradiction.source, renderings: [rendering], minimum: "BRIEF", declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  const a = c.attempts.find(x => x.level === "BRIEF")!;
  assert.equal(a.checks.find(x => x.name === "membership")!.ok, true);
  assert.equal(a.checks.find(x => x.name === "dependency_closure")!.ok, true);
  const sem = a.checks.find(x => x.name === "semantic_preservation")!;
  assert.equal(sem.ok, false);
  assert.match(sem.detail, /has-c-assume/);
  const empty = chooseResolution({ units: contradiction.units!, selected: ids(contradiction.units!), source: contradiction.source, renderings: [{ level: "BRIEF", text: "x", unit_ids: [] }], minimum: "BRIEF", declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW });
  assert.equal(empty.attempts.find(x => x.level === "BRIEF")!.checks.find(x => x.name === "membership")!.ok, false, "refused at membership, not only later");
});
