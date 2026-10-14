// Chapter 8: Enhanced Interaction.
//
// What may appear beside a source while someone reads it, and how can the reader
// always tell what came from the source and what came from elsewhere?
//
// Run:  npm run example:ch08
//
// No model is called. Part 1 uses the sidecar core directly. Part 2 runs it
// inside a Pi session with a scripted stand-in for the model, to show that the
// layer is decided by the door an item came through, not by what the producer says.
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../../harness/session.ts";
import { sidecar } from "../../host-pi/sidecar.ts";
import {
	derivedItem,
	generatedItem,
	ledgerColumns,
	renderSidecar,
	retrievedItem,
	validateItem,
	type SidecarItem,
	type TextDoc,
} from "../../core/sidecar/src/index.ts";

const rule = (title: string) => console.log(`\n── ${title} ${"─".repeat(Math.max(0, 66 - title.length))}`);

const paper: TextDoc = {
	id: "systems-paper",
	content: "The protocol is safe. It relies on the well-known impossibility result. Latency is bounded under partial synchrony.",
};
const theorem: TextDoc = {
	id: "flp-1985",
	content: "No deterministic consensus protocol tolerates a single crash in an asynchronous system.",
};

rule("PART 1: three kinds of content, three layers");
const derived = derivedItem(paper, "It relies on the well-known impossibility result.");
const retrieved = retrievedItem(theorem, "No deterministic consensus protocol tolerates a single crash in an asynchronous system.");
const answer = generatedItem({
	content: "The theorem assumes an asynchronous system; this paper assumes partial synchrony, so it may not apply.",
	producer: "scripted-model",
	drew_on: [derived.id, retrieved.id],
	limits: "A reading of two short passages. Not checked against the theorem's proof.",
});
console.log(renderSidecar([derived, retrieved, answer]));

rule("derived ≠ externally supported ≠ authoritative");
for (const item of [derived, retrieved, answer]) console.log(`${item.layer.padEnd(20)} status=${item.status}`);

rule("A passage the source does not contain cannot be 'derived' from it");
try {
	derivedItem(paper, "The protocol is unsafe.");
} catch (error) {
	console.log(`refused: ${(error as Error).message}`);
}

rule("A forged item is caught on the way back out");
const { id: _id, ...rest } = answer;
const forged: SidecarItem = { id: answer.id, ...rest, layer: "SEMANTIC_DERIVATION", status: "re-presented", content: "The paper proves the protocol is unsafe." };
console.log(`problems: ${validateItem(forged).join(", ")}`);

rule("Nothing is a legitimate output");
console.log(renderSidecar([]));

rule("Two columns, no total");
console.log(JSON.stringify(ledgerColumns([
	{ item_id: derived.id, event: "shown" },
	{ item_id: derived.id, event: "used" },
	{ item_id: answer.id, event: "shown" },
	{ item_id: answer.id, event: "dismissed" },
]), null, 2));
console.log("A useful item and a distracting one are not the same kind of thing, so there is no net score to compute.");

rule("PART 2: in a Pi session, the door decides the layer");
const ui = new UiRecorder();
const h = await makeSession({ ui, extensions: [sidecar({ source: paper, corpus: [theorem] })] });
h.faux.setResponses([
	// The scripted model tries to pass its answer off as a derivation of the source.
	fauxAssistantMessage([fauxToolCall("sidecar_propose", { content: "The paper proves the protocol safe.", limits: "None.", layer: "SEMANTIC_DERIVATION", status: "re-presented" })], { stopReason: "toolUse" }),
	fauxAssistantMessage([fauxToolCall("sidecar_search", { query: "consensus crash" })], { stopReason: "toolUse" }),
	fauxAssistantMessage([fauxText("done")]),
]);
await h.session.prompt("help me read this");
console.log(`notifications while the model worked: ${ui.notifications.length}   (nothing interrupted the reader)`);
await h.session.prompt("/sidecar");
console.log(ui.notifications.at(-1)!.message);
console.log("\nThe model asked for SEMANTIC_DERIVATION and re-presented. It got MODEL_GENERATION and candidate.");
h.dispose();
