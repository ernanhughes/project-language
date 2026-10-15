import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../harness/session.ts";
import { preservation } from "./preservation.ts";
import { declare, mustSay } from "../core/preservation/src/index.ts";

const T0 = "2026-10-15T09:00:00.000Z";
const T1 = "2026-10-15T10:00:00.000Z";

const SOURCE =
	"Failed payments are retried up to 3 times. Idempotent requests are exempt from retry limits. " +
	"It is unclear how a third-party timeout should be handled. The policy comes from a 2024 design decision, ADR-17.";
const FAITHFUL = "Failed payments are retried up to 3 times; idempotent requests are exempt. How a third-party timeout is handled is unclear. Source: ADR-17.";
const ONE_LINER = "Failed payments are retried up to 3 times.";

const DECLARATION = declare({
	at: T0,
	obligations: [
		mustSay("limit", "number", "retries stop after three attempts", "\\b3\\b"),
		mustSay("exception", "claim", "idempotent requests are exempt", "idempotent", "exempt"),
		mustSay("uncertainty", "uncertainty", "it is unclear how a third-party timeout is handled", "unclear", "third-party"),
		mustSay("source", "provenance", "the decision it comes from (ADR-17)", "adr-17"),
	],
	probes: [{ id: "limit-visible", question: "how many retries?", answer: "\\b3\\b" }],
});

const submit = (output: string, extra: Record<string, string> = {}) => fauxAssistantMessage([fauxToolCall("submit_transformation", { output, ...extra })], { stopReason: "toolUse" });
const done = () => fauxAssistantMessage([fauxText("done")]);

async function start(faithfulReference?: string) {
	const ui = new UiRecorder();
	const h = await makeSession({ ui, extensions: [preservation({ declaration: DECLARATION, source: SOURCE, now: () => T1, ...(faithfulReference ? { faithfulReference } : {}) })] });
	return { h, ui };
}
type H = Awaited<ReturnType<typeof start>>["h"];
const profiles = (h: H) => h.session.sessionManager.getEntries().filter((e: any) => e.customType === "preservation-profile").map((e: any) => e.data);
const toolTexts = (h: H) => h.session.messages.filter((m) => m.role === "toolResult").map((m: any) => m.content[0].text as string);

test("a one-liner is told exactly what it lost, repairs, and the failed attempt stays in the record", async () => {
	const { h } = await start();
	h.faux.setResponses([submit(ONE_LINER), submit(FAITHFUL), done()]);
	await h.session.prompt("summarise the policy");
	const [first, second] = toolTexts(h);
	assert.match(first!, /LOST\s+\[claim\] idempotent requests are exempt/);
	assert.match(first!, /LOST\s+\[uncertainty\]/);
	assert.match(first!, /SURVIVED\s+\[number\] retries stop after three attempts/);
	assert.ok(!/LOST/.test(second!), "the repaired output keeps every obligation");
	const stored = profiles(h);
	assert.equal(stored.length, 2, "both attempts are kept; the failure is not overwritten");
	assert.deepEqual(stored.map((s: any) => s.attempt), [1, 2]);
	h.dispose();
});

test("the model cannot change the obligations: a supplied 'obligations' field is dropped and the declaration is the original", async () => {
	const { h } = await start();
	h.faux.setResponses([submit(ONE_LINER, { obligations: "[]", declaration_id: "decl_mine" }), done()]);
	await h.session.prompt("go");
	const [p] = profiles(h);
	assert.equal(p.profile.declaration_id, DECLARATION.declaration_id);
	assert.equal(p.profile.obligations.length, 4, "still four obligations");
	h.dispose();
});

test("obligations declared before the output do not carry the after-the-fact flag", async () => {
	const { h } = await start();
	h.faux.setResponses([submit(FAITHFUL), done()]);
	await h.session.prompt("go");
	assert.deepEqual(profiles(h)[0].profile.flags, []);
	h.dispose();
});

test("with no reference to test against, the profile says the instrument has not been checked", async () => {
	const { h } = await start();
	h.faux.setResponses([submit(FAITHFUL), done()]);
	await h.session.prompt("go");
	assert.match(toolTexts(h)[0]!, /INSTRUMENT NOT CHECKED: a pass from this check does not show anything was preserved/);
	h.dispose();
});

test("with a faithful reference that the checks can break, the instrument is validated and the warning goes away", async () => {
	const { h } = await start(FAITHFUL);
	h.faux.setResponses([submit(FAITHFUL), done()]);
	await h.session.prompt("go");
	assert.doesNotMatch(toolTexts(h)[0]!, /INSTRUMENT/);
	assert.equal(profiles(h)[0].profile.instrument, "validated");
	h.dispose();
});

test("a weak check is caught before it is trusted: a limit tested only by the digit '3' is announced as unvalidated", async () => {
	const weak = declare({ at: T0, obligations: [mustSay("limit", "number", "retries stop after 3 attempts", "\\b3\\b")] });
	const source = "Retries stop after 3 attempts. The service has 3 replicas.";
	const ui = new UiRecorder();
	const h = await makeSession({ ui, extensions: [preservation({ declaration: weak, source, faithfulReference: source, now: () => T1 })] });
	h.faux.setResponses([submit("The service has 3 replicas."), done()]);
	await h.session.prompt("go");
	const text = toolTexts(h)[0]!;
	assert.match(text, /SURVIVED\s+\[number\]/, "the limit was dropped and the check still passes");
	assert.match(text, /INSTRUMENT UNVALIDATED/, "and the profile says its pass cannot be relied on");
	await h.session.prompt("/preservation instrument");
	assert.match(ui.notifications.at(-1)!.message, /NOT NOTICED/);
	h.dispose();
});

test("a profile carries no total and says it is not about truth", async () => {
	const { h } = await start();
	h.faux.setResponses([submit(FAITHFUL), done()]);
	await h.session.prompt("go");
	const { profile } = profiles(h)[0];
	for (const key of ["score", "total", "fidelity", "overall"]) assert.ok(!(key in profile), key);
	assert.match(toolTexts(h)[0]!, /says nothing about whether the source was right/);
	assert.match(toolTexts(h)[0]!, /not covered: emphasis/);
	h.dispose();
});

test("/preservation shows the attempt history and the latest profile; nothing notifies while the model works", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([submit(ONE_LINER), submit(FAITHFUL), done()]);
	await h.session.prompt("go");
	assert.equal(ui.notifications.length, 0);
	await h.session.prompt("/preservation");
	const view = ui.notifications.at(-1)!.message;
	assert.match(view, /attempt 1: 1 kept, 3 lost/);
	assert.match(view, /attempt 2: 4 kept, 0 lost/);
	h.dispose();
});
