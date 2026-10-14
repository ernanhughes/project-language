import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../harness/session.ts";
import { authorityGate } from "./authority.ts";
import type { AuthorityPolicy, AuthorityReceipt } from "../core/authority/src/engine/types.ts";

const NOW = "2026-10-14T12:00:00.000Z";

const POLICY: AuthorityPolicy = {
	version: "skeleton-v1",
	data_use: [],
	actions: [
		{ id: "read-ok", purpose: "review-code", action_scope: ["tool:read"], approval: "none" },
		{ id: "write-asks", purpose: "review-code", action_scope: ["tool:write"], approval: "required" },
	],
};

const bash = (command: string) => fauxAssistantMessage([fauxToolCall("bash", { command })], { stopReason: "toolUse" });
const write = (path: string, content: string) => fauxAssistantMessage([fauxToolCall("write", { path, content })], { stopReason: "toolUse" });

async function run(response: ReturnType<typeof bash>, ui?: UiRecorder) {
	const receipts: { tool: string; receipt: AuthorityReceipt }[] = [];
	const h = await makeSession({
		ui,
		extensions: [authorityGate({ policy: POLICY, purpose: "review-code", now: () => NOW, onReceipt: (receipt, tool) => receipts.push({ tool, receipt }) })],
	});
	h.faux.setResponses([response, fauxAssistantMessage([fauxText("done")])]);
	await h.session.prompt("go");
	const result = h.session.messages.find((m) => m.role === "toolResult") as any;
	return { h, result, receipts };
}

test("a tool with no grant is denied and its effect never happens", async () => {
	const { h, result, receipts } = await run(bash("touch ran.flag"));
	assert.equal(result.isError, true);
	assert.match(result.content[0].text, /Authority: denied/);
	assert.equal(existsSync(join(h.cwd, "ran.flag")), false, "a blocked call must have no effect");
	assert.equal(receipts[0]?.receipt.verdict, "DENY");
	h.dispose();
});

test("a granted tool proceeds", async () => {
	const { h, result, receipts } = await run(fauxAssistantMessage([fauxToolCall("read", { path: "nothing.txt" })], { stopReason: "toolUse" }));
	// The file does not exist, so the tool itself errors; what matters is that Authority let it run.
	assert.equal(receipts[0]?.receipt.verdict, "ALLOW");
	assert.doesNotMatch(result.content[0].text, /Authority:/);
	h.dispose();
});

test("an approval-required grant blocks when there is no way to ask", async () => {
	const { h, result, receipts } = await run(write("out.txt", "x"));
	assert.equal(receipts[0]?.receipt.verdict, "REQUIRE_APPROVAL");
	assert.equal(result.isError, true);
	assert.match(result.content[0].text, /no way to ask/);
	assert.equal(existsSync(join(h.cwd, "out.txt")), false);
	h.dispose();
});

test("an approval-required grant runs once the user confirms", async () => {
	const ui = new UiRecorder();
	ui.confirmAnswers = [true];
	const { h, result } = await run(write("out.txt", "x"), ui);
	assert.equal(ui.confirms.length, 1);
	assert.equal(result.isError, false);
	assert.equal(existsSync(join(h.cwd, "out.txt")), true);
	h.dispose();
});

test("a declined approval blocks the effect", async () => {
	const ui = new UiRecorder();
	ui.confirmAnswers = [false];
	const { h, result } = await run(write("out.txt", "x"), ui);
	assert.equal(result.isError, true);
	assert.equal(existsSync(join(h.cwd, "out.txt")), false);
	h.dispose();
});

test("a malformed policy fails closed instead of allowing", async () => {
	const h = await makeSession({
		extensions: [authorityGate({ policy: { version: "", data_use: [], actions: [] }, purpose: "review-code" })],
	});
	h.faux.setResponses([bash("touch ran.flag"), fauxAssistantMessage([fauxText("done")])]);
	await h.session.prompt("go");
	const result = h.session.messages.find((m) => m.role === "toolResult") as any;
	assert.equal(result.isError, true);
	assert.match(result.content[0].text, /fail-closed/);
	assert.equal(existsSync(join(h.cwd, "ran.flag")), false);
	h.dispose();
});

test("each decision is written to the session as a durable entry", async () => {
	const { h } = await run(bash("touch ran.flag"));
	const entries = h.session.sessionManager.getEntries().filter((e: any) => e.customType === "authority-receipt");
	assert.equal(entries.length, 1);
	h.dispose();
});
