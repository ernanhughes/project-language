import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	EMPTY_SIDECAR_TEXT,
	LAYER_OF,
	SidecarError,
	derivedItem,
	generatedItem,
	ledgerColumns,
	renderSidecar,
	retrievedItem,
	sha256,
	validateItem,
	type SidecarItem,
	type TextDoc,
} from "../src/index.ts";

const PAPER: TextDoc = {
	id: "paper-1",
	content: "The protocol is safe. It relies on the well-known impossibility result. Latency is bounded under partial synchrony.",
};
const THEOREM: TextDoc = { id: "fischer-1985", content: "No deterministic consensus protocol tolerates a single crash in an asynchronous system." };

/** Rebuild an item with a correct id, as a forger who knows the id rule would. */
function reseal(item: Omit<SidecarItem, "id">): SidecarItem {
	return { id: `sc_${sha256(JSON.stringify(item)).slice(0, 16)}`, ...item };
}

describe("constructors fix the layer", () => {
	it("each kind lands in its own layer, chosen by the constructor", () => {
		const d = derivedItem(PAPER, "It relies on the well-known impossibility result.");
		const r = retrievedItem(THEOREM, "No deterministic consensus protocol tolerates a single crash");
		const g = generatedItem({ content: "The assumptions may not hold here.", producer: "model-x", limits: "Not checked against the theorem's proof." });
		assert.equal(d.layer, "SEMANTIC_DERIVATION");
		assert.equal(r.layer, "EXTERNAL_EVIDENCE");
		assert.equal(g.layer, "MODEL_GENERATION");
		assert.deepEqual(Object.values(LAYER_OF).sort(), ["EXTERNAL_EVIDENCE", "MODEL_GENERATION", "SEMANTIC_DERIVATION"]);
	});

	it("no sidecar layer is SOURCE", () => {
		assert.ok(!(Object.values(LAYER_OF) as string[]).includes("SOURCE"));
	});

	it("only derived content is 're-presented'; everything else is a candidate", () => {
		assert.equal(derivedItem(PAPER, "Latency is bounded under partial synchrony.").status, "re-presented");
		assert.equal(retrievedItem(THEOREM, "No deterministic consensus protocol").status, "candidate");
		assert.equal(generatedItem({ content: "x", producer: "m", limits: "l" }).status, "candidate");
	});
});

describe("derived: checkable against the source and nothing more", () => {
	it("refuses a passage the source does not contain", () => {
		assert.throws(() => derivedItem(PAPER, "The protocol is unsafe."), (e: unknown) => e instanceof SidecarError && e.problems.includes("ANCHOR_NOT_IN_SOURCE"));
	});

	it("is re-checked against the source later, and a changed source is caught", () => {
		const d = derivedItem(PAPER, "The protocol is safe.");
		const sources = new Map([[PAPER.id, PAPER]]);
		assert.deepEqual(validateItem(d, sources), []);
		const edited = new Map([[PAPER.id, { ...PAPER, content: "The protocol is unsafe. Latency is bounded." }]]);
		const problems = validateItem(d, edited);
		assert.ok(problems.includes("SOURCE_HASH_MISMATCH"));
		assert.ok(problems.includes("ANCHOR_NOT_IN_SOURCE"));
	});
});

describe("retrieved: arrives as a candidate with its origin pinned", () => {
	it("carries the external document id and hash, not the source's", () => {
		const r = retrievedItem(THEOREM, "No deterministic consensus protocol tolerates a single crash");
		assert.equal(r.origin.external?.id, "fischer-1985");
		assert.equal(r.origin.external?.sha256, sha256(THEOREM.content));
		assert.equal(r.anchor, undefined, "a retrieved item is never anchored as if it were in the source");
	});

	it("refuses an excerpt that is not in the external document", () => {
		assert.throws(() => retrievedItem(THEOREM, "Consensus is always possible."), (e: unknown) => e instanceof SidecarError && e.problems.includes("EXCERPT_NOT_IN_EXTERNAL"));
	});
});

describe("interactive: never authoritative", () => {
	it("cannot be placed without saying what it cannot be trusted for", () => {
		assert.throws(() => generatedItem({ content: "Yes.", producer: "m", limits: "  " }), (e: unknown) => e instanceof SidecarError && e.problems.includes("LIMITS_MISSING"));
	});
});

describe("validation on the way back out", () => {
	it("catches a forged layer even when the id was recomputed", () => {
		const g = generatedItem({ content: "A claim.", producer: "m", limits: "unchecked" });
		const { id: _id, ...rest } = g;
		const forged = reseal({ ...rest, layer: "SEMANTIC_DERIVATION" });
		assert.ok(validateItem(forged).includes("LAYER_KIND_MISMATCH"));
	});

	it("catches an overclaimed status", () => {
		const r = retrievedItem(THEOREM, "No deterministic consensus protocol");
		const { id: _id, ...rest } = r;
		assert.ok(validateItem(reseal({ ...rest, status: "re-presented" })).includes("STATUS_OVERCLAIMS"));
	});

	it("catches an edit to content as an id mismatch", () => {
		const g = generatedItem({ content: "A claim.", producer: "m", limits: "unchecked" });
		assert.ok(validateItem({ ...g, content: "A different claim." }).includes("ID_MISMATCH"));
	});

	it("catches a retrieved item with no external origin", () => {
		const r = retrievedItem(THEOREM, "No deterministic consensus protocol");
		const { id: _id, origin, ...rest } = r;
		assert.ok(validateItem(reseal({ ...rest, origin: { producer: origin.producer } })).includes("EXTERNAL_ORIGIN_MISSING"));
	});
});

describe("rendering", () => {
	it("labels every item with its layer and marks the whole as not the source", () => {
		const items = [
			derivedItem(PAPER, "The protocol is safe."),
			retrievedItem(THEOREM, "No deterministic consensus protocol"),
			generatedItem({ content: "Possibly inapplicable.", producer: "model-x", drew_on: ["fischer-1985"], limits: "Not a proof." }),
		];
		const text = renderSidecar(items);
		assert.match(text, /^BESIDE THE SOURCE \(not the source\)/);
		assert.match(text, /\[DERIVED FROM THE SOURCE/);
		assert.match(text, /\[FROM ELSEWHERE · candidate, not verified\]/);
		assert.match(text, /\[MODEL ANSWER · candidate, may be wrong\]/);
		assert.match(text, /limits: Not a proof\./);
		assert.match(text, /drew on fischer-1985/);
		for (const item of items) assert.ok(text.includes(item.id));
	});

	it("an empty sidecar says so; nothing is a legitimate output", () => {
		assert.match(renderSidecar([]), new RegExp(EMPTY_SIDECAR_TEXT));
	});
});

describe("the ledger has two columns and no total", () => {
	it("counts benefit and cost separately and offers no net score", () => {
		const cols = ledgerColumns([
			{ item_id: "a", event: "shown" },
			{ item_id: "a", event: "used" },
			{ item_id: "b", event: "shown" },
			{ item_id: "b", event: "dismissed" },
			{ item_id: "b", event: "distracting" },
			{ item_id: null, event: "manual_search_needed" },
		]);
		assert.deepEqual(cols.benefit, { used: 1, opened: 0 });
		assert.deepEqual(cols.cost, { shown: 2, dismissed: 1, distracting: 1, manual_searches_still_needed: 1 });
		for (const key of ["net", "score", "total"]) assert.ok(!(key in cols));
	});
});
