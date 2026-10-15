import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../harness/session.ts";
import { ladder } from "./ladder.ts";
import { AT_MOST_ONCE, EXECUTED, RETRY_LIMIT, TRACE, type QueueTrace } from "../core/ladder/fixtures/queue.ts";

const call = (name: string, args: Parameters<typeof fauxToolCall>[1]) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" });
const done = () => fauxAssistantMessage([fauxText("done")]);

async function start() {
	const ui = new UiRecorder();
	const h = await makeSession({ ui, extensions: [ladder<QueueTrace>({ decisions: [EXECUTED], requirements: [AT_MOST_ONCE, RETRY_LIMIT], trace: TRACE })] });
	return { h, ui };
}
type H = Awaited<ReturnType<typeof start>>["h"];
const toolTexts = (h: H) => h.session.messages.filter((m) => m.role === "toolResult").map((m: any) => m.content[0].text as string);
const resolutions = (h: H) => h.session.sessionManager.getEntries().filter((e: any) => e.customType === "ladder-resolution").map((e: any) => e.data);

test("before anyone settles the reading, a check is INCONCLUSIVE and says why; it is not a pass", async () => {
	const { h } = await start();
	h.faux.setResponses([call("check_requirement", { requirement_id: "R1" }), done()]);
	await h.session.prompt("is the queue correct?");
	assert.match(toolTexts(h)[0]!, /R1: INCONCLUSIVE/);
	assert.match(toolTexts(h)[0]!, /executed not settled by a person/);
	h.dispose();
});

test("a requirement that depends on no reading is checkable at once", async () => {
	const { h } = await start();
	h.faux.setResponses([call("check_requirement", { requirement_id: "R2" }), done()]);
	await h.session.prompt("go");
	assert.match(toolTexts(h)[0]!, /R2: PASS/);
	h.dispose();
});

test("the model can propose a reading, but a proposal does not unblock the check, whatever status it names", async () => {
	const { h } = await start();
	h.faux.setResponses([
		call("interpretation_propose", { decision_id: "executed", option_id: "completed", reason: "the most natural reading", status: "settled" }),
		call("check_requirement", { requirement_id: "R1" }),
		done(),
	]);
	await h.session.prompt("go");
	assert.match(toolTexts(h)[0]!, /Recorded as a proposal, not a decision/);
	assert.match(toolTexts(h)[1]!, /R1: INCONCLUSIVE/);
	assert.equal(resolutions(h)[0].status, "proposed");
	assert.equal(resolutions(h)[0].by.type, "model");
	h.dispose();
});

test("the model has no way to settle: there is no such tool", async () => {
	const { h } = await start();
	h.faux.setResponses([call("interpretation_settle", { decision_id: "executed", option_id: "completed", reason: "trust me" }), done()]);
	await h.session.prompt("go");
	assert.equal(resolutions(h).length, 0);
	assert.match(toolTexts(h)[0]!, /not found|unknown tool|no such tool/i);
	h.dispose();
});

test("the queue story: a flawless pass on the wrong reading, then a failure when the person corrects it", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/interpretation settle executed completed we only care that it finished once");
	h.faux.setResponses([call("check_requirement", { requirement_id: "R1" }), done()]);
	await h.session.prompt("check it");
	assert.match(toolTexts(h)[0]!, /R1: PASS \(readings: executed=completed\)/, "the check is flawless and verifies the wrong thing");

	await h.session.prompt("/interpretation settle executed effect the fear was a customer being charged twice");
	h.faux.setResponses([call("check_requirement", { requirement_id: "R1" }), done()]);
	await h.session.prompt("check it again");
	assert.match(toolTexts(h)[1]!, /R1: FAIL \(readings: executed=effect\)/);
	assert.match(toolTexts(h)[1]!, /J1 \(2\)/, "the double charge");

	assert.equal(resolutions(h).filter((r: any) => r.status === "settled").length, 2, "the first settlement is kept in the record, not overwritten");
	await h.session.prompt("/interpretation");
	assert.match(ui.notifications.at(-1)!.message, /\[settled: effect\]/);
	h.dispose();
});

test("settling needs a reason", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/interpretation settle executed completed");
	assert.match(ui.notifications.at(-1)!.message, /Not done: settling needs a reason/);
	assert.equal(resolutions(h).length, 0);
	h.dispose();
});

test("the person is shown the checked version in plain language, and only they can say it kept their intent", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/interpretation explain");
	assert.match(ui.notifications.at(-1)!.message, /still open/);
	assert.match(ui.notifications.at(-1)!.message, /your confirmation: unasked/);

	await h.session.prompt("/interpretation settle executed effect the fear was a double charge");
	await h.session.prompt("/interpretation explain");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /"executed" is read as: external effect/);
	assert.match(view, /Not: attempt, completed job/);
	assert.match(view, /narrows; readings set aside: 2/);

	await h.session.prompt("/interpretation confirm yes that is the double charge I meant");
	await h.session.prompt("/interpretation explain");
	assert.match(ui.notifications.at(-1)!.message, /your confirmation: confirmed/);
	h.dispose();
});

test("while a choice is open the translation does not claim to have narrowed anything", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([call("interpretation_propose", { decision_id: "executed", option_id: "effect", reason: "likely" }), done()]);
	await h.session.prompt("go");
	await h.session.prompt("/interpretation explain");
	assert.match(ui.notifications.at(-1)!.message, /still_ambiguous; readings set aside: 0; still open: executed/);
	h.dispose();
});

test("nothing notifies while the model works", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([call("interpretation_propose", { decision_id: "executed", option_id: "effect", reason: "x" }), call("check_requirement", { requirement_id: "R1" }), done()]);
	await h.session.prompt("go");
	assert.equal(ui.notifications.length, 0);
	h.dispose();
});

test("review finding: a confirmation does not survive a change of reading", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/interpretation settle executed completed we only care that it finished once");
	await h.session.prompt("/interpretation confirm yes that is what I meant");
	await h.session.prompt("/interpretation explain");
	assert.match(ui.notifications.at(-1)!.message, /your confirmation: confirmed/);

	await h.session.prompt("/interpretation settle executed effect no, the fear was a double charge");
	await h.session.prompt("/interpretation explain");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /"executed" is read as: external effect/);
	assert.match(view, /your confirmation: unasked \(your earlier answer was about a different reading\)/);
	h.dispose();
});

test("review finding: a model proposal after a person settled does not make the check inconclusive", async () => {
	const { h } = await start();
	await h.session.prompt("/interpretation settle executed effect the fear was a double charge");
	h.faux.setResponses([
		call("interpretation_propose", { decision_id: "executed", option_id: "completed", reason: "actually the most natural reading" }),
		call("check_requirement", { requirement_id: "R1" }),
		done(),
	]);
	await h.session.prompt("go");
	assert.match(toolTexts(h)[1]!, /R1: FAIL \(readings: executed=effect\)/, "still checked under the person's reading");
	assert.equal(resolutions(h).filter((r: any) => r.status === "proposed").length, 1, "the proposal is recorded in the history");
	h.dispose();
});
