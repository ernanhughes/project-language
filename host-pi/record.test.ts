import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../harness/session.ts";
import { documentRecord } from "./record.ts";
import * as retry from "../core/record/fixtures/retry-policy.ts";
import { agreement, type DocumentRecord } from "../core/record/src/index.ts";

const call = (name: string, args: Parameters<typeof fauxToolCall>[1]) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" });
const done = () => fauxAssistantMessage([fauxText("done")]);
const source = { id: retry.SOURCE_ID, text: retry.SOURCE };

async function start(record: DocumentRecord = retry.RECORD) {
	const ui = new UiRecorder();
	const h = await makeSession({ ui, extensions: [documentRecord({ source, record })] });
	return { h, ui };
}
type H = Awaited<ReturnType<typeof start>>["h"];
const texts = (h: H) => h.session.messages.filter((m) => m.role === "toolResult").map((m: any) => m.content[0].text as string);

test("three views drawn from one record agree about the exceptions, and each line names its record entry", async () => {
	const { h } = await start();
	h.faux.setResponses([call("render_from_record", { view: "diagram" }), call("render_from_record", { view: "table" }), call("render_from_record", { view: "timeline" }), done()]);
	await h.session.prompt("show me the policy three ways");
	const [diagram, table, timeline] = texts(h);
	const a = agreement(retry.RECORD, [{ name: "diagram", text: diagram! }, { name: "table", text: table! }, { name: "timeline", text: timeline! }], ["partition", "idempotent", "final"]);
	assert.equal(a.agree, true, JSON.stringify(a.disagreements));
	assert.match(diagram!, /\(x1\)/);
	assert.match(timeline!, /exception: partition exception applies to up to three retries/);
	h.dispose();
});

test("any element can be walked back to the words it came from", async () => {
	const { h } = await start();
	h.faux.setResponses([call("locate_in_source", { id: "partition" }), call("locate_in_source", { id: "nope" }), done()]);
	await h.session.prompt("where does the partition exception come from?");
	const [found, missing] = texts(h);
	assert.match(found!, /partition: characters \d+-\d+: "If the failure is a network partition/);
	const [, from, to] = /characters (\d+)-(\d+)/.exec(found!)!;
	assert.equal(retry.SOURCE.slice(Number(from), Number(to)).startsWith("If the failure is a network partition"), true, "the offsets point at those words");
	assert.match(missing!, /No record entry nope can be traced/);
	h.dispose();
});

test("the model has no way to edit the record: there is no such tool, and the record in force is unchanged", async () => {
	const { h } = await start();
	h.faux.setResponses([call("record_edit", { id: "limit", label: "unlimited retries" }), call("render_from_record", { view: "table" }), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[0]!, /not found|unknown tool|no such tool/i);
	assert.match(texts(h)[1]!, /up to three retries/);
	assert.ok(!texts(h)[1]!.includes("unlimited retries"));
	h.dispose();
});

test("/record says what the record is and is not, and names a claim the source cites no evidence for without ruling on it", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/record");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /9 claims, 3 relations, 0 qualifiers, each citing the source/);
	assert.match(view, /The source cites no evidence for: retries cause queue backlogs\. \(Recorded as stated; not judged\.\)/);
	assert.match(view, /It is not the source and not the truth/);
	h.dispose();
});

test("/record check reports a record that no longer traces to its source", async () => {
	const bad: DocumentRecord = { ...retry.RECORD, claims: retry.RECORD.claims.map((c) => (c.id === "limit" ? { ...c, passage: "A failed payment is retried forever" } : c)) };
	const { h, ui } = await start(bad);
	await h.session.prompt("/record check");
	assert.match(ui.notifications.at(-1)!.message, /PASSAGE_NOT_IN_SOURCE: limit/);
	const good = await start();
	await good.h.session.prompt("/record check");
	assert.match(good.ui.notifications.at(-1)!.message, /traceable, not that it is right/);
	h.dispose();
	good.h.dispose();
});

test("nothing notifies while the model works", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([call("render_from_record", { view: "diagram" }), done()]);
	await h.session.prompt("go");
	assert.equal(ui.notifications.length, 0);
	h.dispose();
});

test("a record that does not trace to its source is not rendered, so its views cannot look as consistent as a faithful one", async () => {
	const bad: DocumentRecord = { ...retry.RECORD, claims: retry.RECORD.claims.map((c) => (c.id === "limit" ? { ...c, passage: "" } : c)) };
	const { h } = await start(bad);
	h.faux.setResponses([call("render_from_record", { view: "table" }), done()]);
	await h.session.prompt("go");
	assert.match(texts(h)[0]!, /^Not rendered: the record does not trace to its source \(EMPTY_PASSAGE:limit\)/);
	h.dispose();
});
