import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../harness/session.ts";
import { relations } from "./relations.ts";
import type { Item, RelationRecord } from "../core/relations/src/index.ts";

const SUBJECT: Item = { id: "reading", text: "The method outperforms the baseline on large datasets.", scope: "datasets of 10k+ examples" };
const CORPUS: Item[] = [
	{ id: "small-data", text: "The method does not outperform the baseline on datasets under a thousand examples.", scope: "datasets under 1k examples" },
	{ id: "same-trial", text: "The method does not outperform the baseline on large datasets.", scope: "datasets of 10k+ examples" },
	{ id: "retry-old", text: "The retry budget is three attempts." },
	{ id: "retry-new", text: "The retry budget has been updated to five attempts." },
	{ id: "bread", text: "Bread rises because yeast produces carbon dioxide." },
];

const call = (name: string, args: Parameters<typeof fauxToolCall>[1]) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" });
const done = () => fauxAssistantMessage([fauxText("done")]);

async function start(subject: Item = SUBJECT) {
	const ui = new UiRecorder();
	const h = await makeSession({ ui, extensions: [relations({ subject, corpus: CORPUS })] });
	return { h, ui };
}
type H = Awaited<ReturnType<typeof start>>["h"];
const records = (h: H) => h.session.sessionManager.getEntries().filter((e: any) => e.customType === "relation-record").map((e: any) => e.data as RelationRecord);
const toolText = (h: H) => (h.session.messages.filter((m) => m.role === "toolResult").at(-1) as any).content[0].text as string;

test("finding candidates returns closeness and no label", async () => {
	const { h } = await start();
	h.faux.setResponses([call("relations_find", { k: 3 }), done()]);
	await h.session.prompt("go");
	const text = toolText(h);
	assert.match(text, /similarity \d\.\d\d  \(unlabelled\)/);
	assert.doesNotMatch(text, /contradict|support|update/i);
	assert.equal(records(h).length, 0, "finding records no claim about a relationship");
	h.dispose();
});

test("a label asked for by the model is recorded as a proposal, whatever standing the model names", async () => {
	const { h } = await start();
	h.faux.setResponses([call("relations_label", { candidate_id: "same-trial", standing: "adjudicated", route: "adjudicated" }), done()]);
	await h.session.prompt("go");
	const [r] = records(h);
	assert.equal(records(h).length, 1);
	assert.equal(r!.route, "classified");
	assert.equal(r!.standing, "proposal");
	h.dispose();
});

test("the model has no way to adjudicate: there is no such tool", async () => {
	const { h } = await start();
	h.faux.setResponses([call("relations_label", { candidate_id: "retry-new" }), call("relations_adjudicate", { candidate_id: "retry-new", relation: "UPDATES", reason: "trust me" }), done()]);
	await h.session.prompt("go");
	assert.ok(records(h).every((r) => r.standing !== "adjudicated"));
	assert.match(toolText(h), /not found|unknown tool|no such tool/i);
	h.dispose();
});

test("a contradiction across differing scopes is shown as possible and unconfirmed, not as a contradiction", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([call("relations_label", { candidate_id: "small-data" }), done()]);
	await h.session.prompt("go");
	assert.match(toolText(h), /possible contradiction, unconfirmed: scope not declared as shared/);
	await h.session.prompt("/relations");
	assert.match(ui.notifications.at(-1)!.message, /small-data\s+possible contradiction, unconfirmed/);
	h.dispose();
});

test("the same wording within a declared, shared scope stands as a proposed contradiction", async () => {
	const { h } = await start();
	h.faux.setResponses([call("relations_label", { candidate_id: "same-trial" }), done()]);
	await h.session.prompt("go");
	assert.match(toolText(h), /same-trial: contradicts \(proposed\)/);
	h.dispose();
});

test("a person corrects the classifier's miss; the earlier record stays in the history", async () => {
	const { h, ui } = await start({ id: "retry-old", text: "The retry budget is three attempts." });
	h.faux.setResponses([call("relations_label", { candidate_id: "retry-new" }), done()]);
	await h.session.prompt("go");
	assert.notEqual(records(h)[0]!.relation, "UPDATES", "the classifier's miss");
	await h.session.prompt("/relations adjudicate retry-new UPDATES the new text states the budget and says it replaces the old one");
	const all = records(h);
	assert.equal(all.length, 2, "a correction is a new record, not an overwrite");
	assert.equal(all[1]!.standing, "adjudicated");
	assert.equal(all[1]!.by, "person:reader");
	await h.session.prompt("/relations");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /retry-new\s+updates \(confirmed by a person\)/);
	assert.equal(view.split("retry-new").length - 1, 1, "only the record in force is shown");
	h.dispose();
});

test("adjudication without a reason is refused", async () => {
	const { h, ui } = await start({ id: "retry-old", text: "The retry budget is three attempts." });
	h.faux.setResponses([call("relations_label", { candidate_id: "retry-new" }), done()]);
	await h.session.prompt("go");
	await h.session.prompt("/relations adjudicate retry-new UPDATES");
	assert.match(ui.notifications.at(-1)!.message, /Not adjudicated: adjudication needs a reason/);
	assert.equal(records(h).length, 1);
	h.dispose();
});

test("unknown is a normal answer and is never shown as a relation", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([call("relations_label", { candidate_id: "bread" }), done()]);
	await h.session.prompt("go");
	assert.equal(records(h)[0]!.relation, "UNKNOWN");
	await h.session.prompt("/relations check_a_claim");
	assert.match(ui.notifications.at(-1)!.message, /bread\s+relationship unknown.*hold back for check_a_claim/);
	h.dispose();
});

test("worth depends on the task: the same record is shown for one task and held back for another", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([call("relations_label", { candidate_id: "same-trial" }), done()]);
	await h.session.prompt("go");
	await h.session.prompt("/relations check_a_claim");
	assert.match(ui.notifications.at(-1)!.message, /show for check_a_claim/);
	await h.session.prompt("/relations stay_current");
	assert.match(ui.notifications.at(-1)!.message, /hold back for stay_current/);
	h.dispose();
});

test("available, not intrusive: nothing notifies while the model works, and an unlabelled session claims nothing", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([call("relations_find", {}), call("relations_label", { candidate_id: "same-trial" }), done()]);
	await h.session.prompt("go");
	assert.equal(ui.notifications.length, 0);
	const fresh = await start();
	await fresh.h.session.prompt("/relations");
	assert.match(fresh.ui.notifications.at(-1)!.message, /No relations have been labelled\. Nothing is claimed/);
	h.dispose();
	fresh.h.dispose();
});
