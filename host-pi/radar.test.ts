import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSession, UiRecorder } from "../harness/session.ts";
import { INTERFACE_NAME, RECEIPT_ENTRY, REVISION_ENTRY, presentedMessage, radar } from "./radar.ts";
import { presentationEstablished, validateReceipt, validateHistory, type AttendInput, type HumanPresentationReceipt, type Revision, type StageRecord } from "../core/radar/src/attention/index.ts";
import { T_AFTER, T_NOW, afternoonInputs, meetingOver } from "../core/radar/fixtures/afternoon.ts";

async function start(opts: { ui?: boolean; standing?: (id: string) => { permission: boolean; current: boolean; scope: boolean; standing: boolean }; refresh?: (i: AttendInput) => AttendInput } = {}) {
  const ui = opts.ui === false ? undefined : new UiRecorder();
  let clock = T_NOW;
  const h = await makeSession({
    ...(ui ? { ui } : {}),
    extensions: [radar({ inputs: afternoonInputs(), contextAfter: () => meetingOver, configured_sources: ["feed-a", "feed-b"], boundary: "two configured feeds, one invented afternoon", now: () => clock, ...(opts.standing ? { standing: opts.standing } : {}), ...(opts.refresh ? { refresh: opts.refresh } : {}) })],
  });
  return { h, ui, tick: (t: string) => { clock = t; } };
}
type H = Awaited<ReturnType<typeof start>>["h"];
const entries = <T>(h: H, type: string) => h.session.sessionManager.getEntries().filter((e: any) => e.customType === type).map((e: any) => e.data as T);
const presented = (ui: UiRecorder) => ui.notifications.filter(n => n.message.startsWith("[radar "));

test("during the meeting nothing is presented: the contradiction waits at BRIEF, the rest is withheld or kept available", async () => {
  const { h, ui } = await start();
  await h.session.prompt("/radar run");
  assert.equal(presented(ui!).length, 0);
  assert.equal(entries(h, RECEIPT_ENTRY).length, 0);
  const revs = entries<Revision>(h, REVISION_ENTRY);
  const by = Object.fromEntries(revs.map(r => [r.decision_id, `${r.status}/${r.resolution}/${r.mode}`]));
  assert.equal(by["attn:contradiction"], "PENDING/BRIEF/QUEUE");
  assert.equal(by["attn:lossy"], "PENDING/SUMMARY/QUEUE");
  assert.equal(by["attn:mechanism"], "PENDING/BRIEF/AVAILABLE");
  assert.equal(by["attn:preprint"], "WITHDRAWN/null/null");
  assert.equal(by["attn:decoy"], "WITHDRAWN/null/null");
  h.dispose();
});

test("when the meeting ends the same decisions become NOW at the same resolution, and the interface is called with exactly that text", async () => {
  const { h, ui, tick } = await start();
  await h.session.prompt("/radar run");
  tick(T_AFTER);
  await h.session.prompt("/radar circumstance meeting_ended");
  const shown = presented(ui!);
  assert.deepEqual(shown.map(n => n.message.split("\n")[0]).sort(), ["[radar NOW BRIEF attn:contradiction r2]", "[radar NOW SUMMARY attn:lossy r2]"]);
  const receipts = entries<HumanPresentationReceipt>(h, RECEIPT_ENTRY);
  assert.equal(receipts.length, 2);
  for (const r of receipts) {
    assert.deepEqual(validateReceipt(r), []);
    assert.equal(r.interface, INTERFACE_NAME);
    assert.deepEqual([r.noticed, r.used, r.helpful], ["unknown", "unknown", "unknown"]);
  }
  const contra = receipts.find(r => r.decision_id === "attn:contradiction")!;
  const msg = shown.find(n => n.message.includes("attn:contradiction"))!.message;
  assert.equal(presentationEstablished([contra], "attn:contradiction", 2, msg), true);
  assert.equal(presentationEstablished([contra], "attn:contradiction", 2, msg + " "), false);
  // the BRIEF presented is the one that kept its qualifier
  assert.match(msg, /crash faults when network delay is unbounded/);
  // chains: queued → now → delivered; the lossy BRIEF was never offered
  const chain = entries<Revision>(h, REVISION_ENTRY).filter(r => r.decision_id === "attn:contradiction");
  assert.deepEqual(chain.map(r => `${r.revision}:${r.status}/${r.resolution}/${r.mode}`), ["1:PENDING/BRIEF/QUEUE", "2:PENDING/BRIEF/NOW", "3:DELIVERED/BRIEF/NOW"]);
  assert.deepEqual(validateHistory(chain), []);
  assert.ok(!shown.some(n => /^\[radar [A-Z]+ BRIEF attn:lossy/.test(n.message)));
  assert.ok(!shown.some(n => /attn:(preprint|decoy|mechanism)/.test(n.message)), "withheld and unresolved items are not pushed");
  h.dispose();
});

test("with no interface bound the decision stays PENDING and no presentation receipt exists", async () => {
  const { h, tick } = await start({ ui: false });
  await h.session.prompt("/radar run");
  tick(T_AFTER);
  await h.session.prompt("/radar circumstance meeting_ended");
  assert.equal(entries(h, RECEIPT_ENTRY).length, 0);
  const last = entries<Revision>(h, REVISION_ENTRY).filter(r => r.decision_id === "attn:contradiction").at(-1)!;
  assert.deepEqual([last.status, last.mode], ["PENDING", "NOW"]);
  h.dispose();
});

test("a revoked permission withdraws the queued item instead of delivering it, and reopening it is refused", async () => {
  let revoked = false;
  const { h, ui, tick } = await start({
    standing: (id) => ({ permission: !(revoked && id === "contradiction"), current: true, scope: true, standing: true }),
    refresh: (input) => (revoked && input.item.id === "contradiction" ? { ...input, item: { ...input.item, grants: [] } } : input),
  });
  await h.session.prompt("/radar run");
  revoked = true; tick(T_AFTER);
  await h.session.prompt("/radar circumstance meeting_ended");
  assert.ok(!presented(ui!).some(n => n.message.includes("attn:contradiction")));
  const last = entries<Revision>(h, REVISION_ENTRY).filter(r => r.decision_id === "attn:contradiction").at(-1)!;
  assert.equal(last.status, "WITHDRAWN");
  await h.session.prompt("/radar reopen contradiction");
  assert.ok(ui!.notifications.some(n => /cannot be reopened: .*permission:no-grant/.test(n.message)), JSON.stringify(ui!.notifications.slice(-2)));
  h.dispose();
});

test("coverage names its boundary and the decoy's several causes", async () => {
  const { h, ui } = await start();
  await h.session.prompt("/radar run");
  await h.session.prompt("/radar coverage");
  const text = ui!.notifications.at(-1)!.message;
  assert.match(text, /configured and observed sources only/);
  assert.match(text, /two configured feeds, one invented afternoon/);
  assert.match(text, /decoy reached \[observed,retrieved\] causes \[[^\]]*no-grant[^\]]*scope-mismatch/);
  assert.match(text, /never retrieved/);
  h.dispose();
});

test("the presented message format is stable and carries the revision", () => {
  assert.equal(presentedMessage({ decision_id: "attn:x", revision: 2, resolution: "BRIEF", mode: "NOW" }, "body"), "[radar NOW BRIEF attn:x r2]\nbody");
});

const stagesOf = (h: H, id: string) => entries<{ item_id: string; stages: StageRecord[] }>(h, "radar-stages").filter(s => s.item_id === id).at(-1)!.stages;
const outcome = (st: StageRecord[], s: string) => st.find(x => x.stage === s)!.outcome;

test("the stage ledger reconnects to the receipt: presented becomes yes only after the interface call, noticed stays unknown", async () => {
  const { h, tick } = await start();
  await h.session.prompt("/radar run");
  assert.equal(outcome(stagesOf(h, "contradiction"), "presented"), "unknown");
  tick(T_AFTER);
  await h.session.prompt("/radar circumstance meeting_ended");
  const st = stagesOf(h, "contradiction");
  assert.equal(outcome(st, "presented"), "yes");
  for (const s of ["noticed", "used", "helpful"]) assert.equal(outcome(st, s), "unknown", s);
  assert.equal(outcome(stagesOf(h, "decoy"), "presented"), "unknown", "something never presented is not recorded as presented");
  h.dispose();
});

test("an AVAILABLE item is reachable through the interface, only when the person asks, and a queued one is not opened that way", async () => {
  const { h, ui, tick } = await start();
  await h.session.prompt("/radar run");
  tick(T_AFTER);
  await h.session.prompt("/radar circumstance meeting_ended");
  assert.ok(!presented(ui!).some(n => n.message.includes("attn:mechanism")), "never pushed");
  await h.session.prompt("/radar open mechanism");
  const msg = presented(ui!).find(n => n.message.includes("attn:mechanism"))!.message;
  assert.match(msg, /^\[radar AVAILABLE BRIEF attn:mechanism r\d\]/);
  assert.match(msg, /relation to your tracked claim: not established/);
  const receipt = entries<HumanPresentationReceipt>(h, RECEIPT_ENTRY).find(r => r.decision_id === "attn:mechanism")!;
  assert.equal(receipt.mode, "AVAILABLE");
  assert.equal(presentationEstablished([receipt], "attn:mechanism", receipt.revision, msg), true);
  assert.equal(outcome(stagesOf(h, "mechanism"), "presented"), "yes");
  await h.session.prompt("/radar open preprint");
  assert.ok(ui!.notifications.at(-1)!.message.includes("only for items kept available") || /WITHDRAWN/.test(ui!.notifications.at(-1)!.message));
  h.dispose();
});

test("an unknown context value cannot authorise an interruption: the host refuses it and nothing is presented", async () => {
  const ui = new UiRecorder();
  let clock = T_NOW;
  const bad = [{ key: "calendar_state" as const, value: "in_surgery", origin: "observed_context" as const, ref: "calendar", at: T_AFTER }];
  const h = await makeSession({ ui, extensions: [radar({ inputs: afternoonInputs(), contextAfter: () => bad, configured_sources: ["f"], boundary: "b", now: () => clock })] });
  await h.session.prompt("/radar run");
  clock = T_AFTER;
  try { await h.session.prompt("/radar circumstance meeting_ended"); } catch { /* the command may surface the refusal as an error */ }
  assert.equal(presented(ui).length, 0);
  h.dispose();
});

test("running the Radar twice does not start a second history: each candidate keeps exactly one first revision", async () => {
  const { h, ui } = await start();
  await h.session.prompt("/radar run");
  const once = entries<Revision>(h, REVISION_ENTRY).length;
  await h.session.prompt("/radar run");
  const twice = entries<Revision>(h, REVISION_ENTRY);
  assert.equal(twice.length, once, "no revision was written by the second run");
  const firsts = twice.filter(r => r.revision === 1).map(r => r.decision_id);
  assert.equal(new Set(firsts).size, firsts.length, "no candidate has two r1");
  assert.match(ui!.notifications.at(-1)!.message, /already run/);
  assert.equal(entries(h, "radar-stages").length, 5, "stage records were not written again either");
  h.dispose();
});
