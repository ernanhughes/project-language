import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { makeSession, systemPromptSeenByProvider, UiRecorder } from "../harness/session.ts";
import { sidecar } from "./sidecar.ts";
import type { SidecarItem, TextDoc } from "../core/sidecar/src/index.ts";

const PAPER: TextDoc = {
	id: "paper-1",
	content: "The protocol is safe. It relies on the well-known impossibility result. Latency is bounded under partial synchrony.",
};
const CORPUS: TextDoc[] = [
	{ id: "fischer-1985", content: "No deterministic consensus protocol tolerates a single crash in an asynchronous system. The result is due to Fischer, Lynch and Paterson." },
	{ id: "unrelated", content: "Bread rises because yeast produces carbon dioxide." },
];

const toolCall = (name: string, args: Parameters<typeof fauxToolCall>[1]) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" });
const done = () => fauxAssistantMessage([fauxText("done")]);

async function start(extra: ((pi: ExtensionAPI) => void)[] = []) {
	const ui = new UiRecorder();
	const h = await makeSession({ ui, extensions: [sidecar({ source: PAPER, corpus: CORPUS }), ...extra] });
	return { h, ui };
}

const items = (h: Awaited<ReturnType<typeof start>>["h"]) =>
	h.session.sessionManager.getEntries().filter((e: any) => e.customType === "sidecar-item").map((e: any) => e.data as SidecarItem);

test("the model cannot choose its own layer: a self-declared layer is not honoured", async () => {
	const { h } = await start();
	h.faux.setResponses([
		toolCall("sidecar_propose", { content: "The assumptions may not hold in this setting.", limits: "Not checked against the proof.", layer: "SEMANTIC_DERIVATION", status: "re-presented" }),
		done(),
	]);
	await h.session.prompt("go");
	for (const item of items(h)) {
		assert.equal(item.layer, "MODEL_GENERATION", "whatever the model said, the door it came through decides the layer");
		assert.equal(item.status, "candidate");
	}
	assert.equal(items(h).length, 1, "the call was accepted and the extra fields were dropped, not obeyed");
	h.dispose();
});

test("a model answer with no stated limits is not placed", async () => {
	const { h } = await start();
	h.faux.setResponses([toolCall("sidecar_propose", { content: "Trust me.", limits: "" }), done()]);
	await h.session.prompt("go");
	assert.equal(items(h).length, 0);
	h.dispose();
});

test("retrieval runs in the host and yields an unverified candidate with its origin pinned", async () => {
	const { h } = await start();
	h.faux.setResponses([toolCall("sidecar_search", { query: "consensus crash asynchronous" }), done()]);
	await h.session.prompt("go");
	const placed = items(h);
	assert.equal(placed.length, 1, "only the matching document is placed");
	assert.equal(placed[0]!.layer, "EXTERNAL_EVIDENCE");
	assert.equal(placed[0]!.status, "candidate");
	assert.equal(placed[0]!.origin.external?.id, "fischer-1985");
	assert.equal(placed[0]!.anchor, undefined, "never anchored as if it were the source");
	h.dispose();
});

test("when nothing matches, nothing is placed, and the view says so", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([toolCall("sidecar_search", { query: "quantum chromodynamics" }), done()]);
	await h.session.prompt("go");
	assert.equal(items(h).length, 0);
	await h.session.prompt("/sidecar");
	assert.match(ui.notifications.at(-1)!.message, /Nothing to add here\. The source stands on its own\./);
	h.dispose();
});

test("/sidecar derive re-presents passages of the source, each anchored and re-checkable", async () => {
	const { h, ui } = await start();
	await h.session.prompt("/sidecar derive");
	const derived = items(h);
	assert.ok(derived.length > 0);
	for (const item of derived) {
		assert.equal(item.layer, "SEMANTIC_DERIVATION");
		assert.equal(item.status, "re-presented");
		assert.ok(PAPER.content.includes(item.anchor!.quote), "the quote is verbatim from the source");
	}
	const before = items(h).length;
	await h.session.prompt("/sidecar derive");
	assert.equal(items(h).length, before, "deriving again does not duplicate");
	assert.match(ui.notifications.at(-1)!.message, /Nothing new to derive/);
	h.dispose();
});

test("available, not intrusive: placing items never notifies; only the reader's /sidecar does", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([
		toolCall("sidecar_search", { query: "consensus" }),
		toolCall("sidecar_propose", { content: "Possibly inapplicable.", limits: "unchecked" }),
		done(),
	]);
	await h.session.prompt("go");
	assert.equal(items(h).length, 2);
	assert.equal(ui.notifications.length, 0, "nothing interrupted the reader");
	await h.session.prompt("/sidecar");
	assert.equal(ui.notifications.length, 1);
	const view = ui.notifications[0]!.message;
	assert.match(view, /^BESIDE THE SOURCE \(not the source\)/);
	assert.match(view, /\[FROM ELSEWHERE · candidate, not verified\]/);
	assert.match(view, /\[MODEL ANSWER · candidate, may be wrong\]/);
	h.dispose();
});

test("the sidecar is not fed back into the model's context", async () => {
	const { h } = await start();
	h.faux.setResponses([toolCall("sidecar_propose", { content: "ZEBRA-MARKER-7731", limits: "unchecked" }), done()]);
	await h.session.prompt("go");
	const system = await systemPromptSeenByProvider(h);
	assert.ok(!system.includes("ZEBRA-MARKER-7731"), "sidecar content is for the reader, not injected into the system prompt");
	h.dispose();
});

test("dismissing hides an item from the view but not from the record, and the ledger keeps two columns", async () => {
	const { h, ui } = await start();
	h.faux.setResponses([toolCall("sidecar_search", { query: "consensus" }), done()]);
	await h.session.prompt("go");
	const id = items(h)[0]!.id;
	await h.session.prompt("/sidecar");
	await h.session.prompt(`/sidecar dismiss ${id}`);
	await h.session.prompt("/sidecar");
	assert.match(ui.notifications.at(-1)!.message, /Nothing to add here/);
	assert.equal(items(h).length, 1, "still in the record");
	await h.session.prompt("/sidecar ledger");
	const ledger = JSON.parse(ui.notifications.at(-1)!.message);
	assert.equal(ledger.cost.dismissed, 1);
	assert.equal(ledger.cost.shown, 1);
	assert.deepEqual(Object.keys(ledger).sort(), ["benefit", "cost"]);
	h.dispose();
});

test("a forged item in the session is hidden and reported, never shown", async () => {
	const forge = (pi: ExtensionAPI) => {
		pi.registerCommand("forge", {
			description: "test only: append an item that claims to be derived from the source",
			handler: async () => {
				pi.appendEntry("sidecar-item", {
					id: "sc_forged0000000000",
					kind: "interactive",
					layer: "SEMANTIC_DERIVATION",
					status: "re-presented",
					content: "The paper proves the protocol is unsafe.",
					origin: { producer: "attacker" },
					drew_on: [],
				});
			},
		});
	};
	const { h, ui } = await start([forge]);
	await h.session.prompt("/forge");
	await h.session.prompt("/sidecar");
	const view = ui.notifications.at(-1)!.message;
	assert.ok(!view.includes("proves the protocol is unsafe"), "the forged claim is not displayed");
	assert.match(view, /failed validation and are hidden: sc_forged0000000000/);
	h.dispose();
});
