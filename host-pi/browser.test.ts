import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../harness/session.ts";
import { browser } from "./browser.ts";
import { COMPONENTS, EARLIER, RECORD, SOURCE, SOURCE_ID, THIS_SCOPE } from "../core/browser/fixtures/incident.ts";
import { renderDiagram, renderTable } from "../core/browser/src/index.ts";

const T = "2026-10-15T10:00:00.000Z";
const call = (name: string, args: Parameters<typeof fauxToolCall>[1]) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" });
const done = () => fauxAssistantMessage([fauxText("done")]);
const submit = (task: string, view: string, text: string, extra: Record<string, string> = {}) => call("submit_rendering", { task, view, text, ...extra });

const FAITHFUL_TABLE = renderTable(RECORD);
// Tidy and wrong: the third row no longer carries its condition.
const LOSSY_TABLE = FAITHFUL_TABLE.split("\n").map((l) => (l.includes("H3 stale") ? "| H3 stale replica promoted | none cited |  | uncertain |" : l)).join("\n");

async function start(maxAttempts = 2) {
	const ui = new UiRecorder();
	const h = await makeSession({
		ui,
		extensions: [browser({ source: { id: SOURCE_ID, text: SOURCE }, record: RECORD, corpus: [EARLIER], thisScope: THIS_SCOPE, about: "H2", audienceServices: ["ledger"], components: COMPONENTS, now: () => T, maxAttempts })],
	});
	return { h, ui };
}
type H = Awaited<ReturnType<typeof start>>["h"];
const texts = (h: H) => h.session.messages.filter((m) => m.role === "toolResult").map((m: any) => m.content[0].text as string);
const submissions = (h: H) => h.session.sessionManager.getEntries().filter((e: any) => e.customType === "browser-submission").map((e: any) => e.data);

test("the tidy-and-wrong table is refused with the row that lost its condition, repaired, and then shown", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([submit("approve_fix", "table", LOSSY_TABLE), submit("approve_fix", "table", FAITHFUL_TABLE), done()]);
	await h.session.prompt("build the comparison table");
	const [first, second] = texts(h);
	assert.match(first!, /^REPAIR/);
	assert.match(first!, /LOST\s+\[qualifier\] the H3 stale replica promoted row carries its condition/);
	assert.match(second!, /^SHOW/);
	assert.deepEqual(submissions(h).map((s: any) => [s.attempt, s.decision]), [[1, "REPAIR"], [2, "SHOW"]], "the failed attempt stays in the record");
	assert.equal(ui.notifications.length, 0, "nothing interrupted the reader");
	h.dispose();
});

test("after the allowed attempts, the reader is shown the source, not the lossy table", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([submit("approve_fix", "table", LOSSY_TABLE), submit("approve_fix", "table", LOSSY_TABLE), done()]);
	await h.session.prompt("build the table");
	assert.match(texts(h)[1]!, /^FALL_BACK_TO_SOURCE: still losing row-condition-q1 after 2 attempt/);
	await h.session.prompt("/browser show approve_fix");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /── table: the SOURCE \(the model's rendering was not allowed through\)/);
	assert.ok(view.includes(SOURCE), "the source is what ships");
	assert.ok(!view.includes("| H3 stale replica promoted | none cited |  | uncertain |"), "the lossy table does not");
	h.dispose();
});

test("the reader sees the checked rendering and a labelled margin, pulled on request", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([submit("approve_fix", "diagram", renderDiagram(RECORD)), submit("approve_fix", "table", FAITHFUL_TABLE), done()]);
	await h.session.prompt("build both views");
	assert.equal(ui.notifications.length, 0);
	await h.session.prompt("/browser show approve_fix");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /── diagram: the model's rendering, checked/);
	assert.match(view, /── table: the model's rendering, checked/);
	assert.match(view, /── beside the page \(margin\)/);
	assert.match(view, /\[DERIVED FROM THE SOURCE/);
	assert.match(view, /\[FROM ELSEWHERE · candidate, not verified\]/);
	assert.match(view, /relation claimed: possible .*, unconfirmed: scope not declared as shared/);
	h.dispose();
});

test("the model cannot force an outcome: a supplied 'decision' field is ignored", async () => {
	const { h } = await start();
	h.faux.setResponses([submit("approve_fix", "table", LOSSY_TABLE, { decision: "SHOW", obligations: "[]" }), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[0]!, /^REPAIR/);
	assert.equal(submissions(h)[0].decision, "REPAIR");
	h.dispose();
});

test("for a task that leaves the source alone, there is nothing to submit", async () => {
	const { h } = await start();
	h.faux.setResponses([submit("look_up_fact", "source_highlight", "The failover completed at 09:19."), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[0]!, /the source is shown as it is\. Nothing to submit/);
	assert.equal(submissions(h).length, 0);
	h.dispose();
});

test("a preview that drops the line saying it affects the reader's service is refused", async () => {
	const { h } = await start();
	const preview = ["INCIDENT REPORT 2026-03-17", "What failed: primary stopped accepting writes at 09:02.", "Disputed: Ana holds H2; Ben holds H1.", "Named components: checkout-api, ledger."].join("\n");
	h.faux.setResponses([submit("decide_to_open", "preview", preview), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[0]!, /^REPAIR/);
	assert.match(texts(h)[0]!, /LOST\s+\[claim\] says it affects ledger, which is her service/);
	h.dispose();
});

test("/browser gate reports the refusal rate and which checks have been validated", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([submit("approve_fix", "table", LOSSY_TABLE), submit("approve_fix", "table", FAITHFUL_TABLE), done()]);
	await h.session.prompt("go");
	await h.session.prompt("/browser gate");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /refused 1 of 2/);
	assert.match(view, /check for approve_fix\/table: validated/);
	h.dispose();
});

test("/browser trace lists the stages and makes no claim of benefit over the plain page", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/browser trace approve_fix");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /validate the check for table\s+validated/);
	assert.match(view, /This has not been measured against it; no benefit is claimed/);
	h.dispose();
});

test("a task that leaves the source unchanged is shown as the source", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/browser show look_up_fact");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /── source_highlight: the source/);
	assert.ok(view.includes(SOURCE));
	h.dispose();
});

test("review finding: the obligations are declared before the submission, and a submission dated earlier than the declaration is flagged", async () => {
	const times = ["2026-10-15T10:00:00.000Z", "2026-10-15T09:00:00.000Z"]; // factory (declaration), then the submission, which is earlier
	let i = 0;
	const ui = new UiRecorder();
	const h = await makeSession({
		ui,
		extensions: [browser({ source: { id: SOURCE_ID, text: SOURCE }, record: RECORD, corpus: [EARLIER], thisScope: THIS_SCOPE, about: "H2", audienceServices: ["ledger"], components: COMPONENTS, now: () => times[Math.min(i++, times.length - 1)]! })],
	});
	h.faux.setResponses([submit("approve_fix", "table", FAITHFUL_TABLE), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[0]!, /FLAG OBLIGATIONS_DECLARED_AFTER_OUTPUT/);
	h.dispose();
});

test("review finding: when the obligations were declared first, as they are in a real session, no late flag appears", async () => {
	const { h } = await start();
	h.faux.setResponses([submit("approve_fix", "table", FAITHFUL_TABLE), done()]);
	await h.session.prompt("go");
	assert.doesNotMatch(texts(h)[0]!, /FLAG/);
	h.dispose();
});

test("review finding: an accepted view is not replaced by a later attempt, and /browser show keeps showing it", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([submit("approve_fix", "table", FAITHFUL_TABLE), submit("approve_fix", "table", LOSSY_TABLE), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[0]!, /^SHOW/);
	assert.match(texts(h)[1]!, /This view is already accepted\. Further submissions are not taken/);
	assert.equal(submissions(h).length, 1, "the refused submission is not recorded as an attempt");
	await h.session.prompt("/browser show approve_fix");
	assert.match(ui.notifications.at(-1)!.message, /── table: the model's rendering, checked/);
	h.dispose();
});

test("review finding: a view handed back to the source stays handed back, and only the reader can reopen it", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([submit("approve_fix", "table", LOSSY_TABLE), submit("approve_fix", "table", LOSSY_TABLE), submit("approve_fix", "table", FAITHFUL_TABLE), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[1]!, /^FALL_BACK_TO_SOURCE/);
	assert.match(texts(h)[2]!, /already handed back to the source/);
	await h.session.prompt("/browser show approve_fix");
	assert.match(ui.notifications.at(-1)!.message, /── table: the SOURCE/);

	await h.session.prompt("/browser reset approve_fix");
	assert.match(ui.notifications.at(-1)!.message, /Reopened approve_fix/);
	h.faux.setResponses([submit("approve_fix", "table", FAITHFUL_TABLE), done()]);
	await h.session.prompt("try again");
	assert.match(texts(h).at(-1)!, /^SHOW/);
	assert.equal(submissions(h).length, 3, "the earlier submissions stay in the record");
	h.dispose();
});

test("review finding: a record that does not trace to the source sends every submission, and the view, back to the source", async () => {
	const broken = { ...RECORD, claims: RECORD.claims.map((c) => (c.id === "H1" ? { ...c, passage: "" } : c)) };
	const ui = new UiRecorder();
	const h = await makeSession({ ui, extensions: [browser({ source: { id: SOURCE_ID, text: SOURCE }, record: broken, corpus: [EARLIER], thisScope: THIS_SCOPE, about: "H2", audienceServices: ["ledger"], components: COMPONENTS, now: () => T })] });
	h.faux.setResponses([submit("approve_fix", "table", FAITHFUL_TABLE), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[0]!, /^FALL_BACK_TO_SOURCE: the record does not trace to the source \(EMPTY_PASSAGE:H1\)/);
	await h.session.prompt("/browser show approve_fix");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /── table: the SOURCE/);
	assert.ok(!view.includes("beside the page"), "no margin is built from a record that does not trace");
	h.dispose();
});

test("review finding: looking up a fact shows the source and says where the passage is", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/browser show look_up_fact failover completed");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /\(passage located at characters \d+-\d+: "failover completed"\)/);
	assert.ok(view.includes(SOURCE));
	await h.session.prompt("/browser show look_up_fact there is no such passage");
	assert.match(ui.notifications.at(-1)!.message, /\(passage not found: "there is no such passage"\)/);
	h.dispose();
});
