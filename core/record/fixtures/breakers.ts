// Three sources that are easy to state and easy to destroy (Chapter 7).
// Concrete instances of "A causes B only under C", "D is associated with E, but the source rejects
// causation" and "X outperformed Y except in subgroup Z". Invented for illustration.
import type { DocumentRecord } from "../src/index.ts";

export const SOURCE_ID = "three-breakers";

export const SOURCE =
	"Caffeine improves recall only when sleep is adequate. " +
	"Screen time is associated with poor sleep, but the authors explicitly reject a causal reading. " +
	"Method X outperformed Method Y except in subgroup Z.";

export const RECORD: DocumentRecord = {
	source_id: SOURCE_ID,
	claims: [
		{ id: "caffeine", kind: "entity", label: "caffeine", passage: "Caffeine improves recall", standing: "stated" },
		{ id: "recall", kind: "entity", label: "recall", passage: "Caffeine improves recall", standing: "stated" },
		{ id: "screen", kind: "entity", label: "screen time", passage: "Screen time is associated with poor sleep", standing: "stated" },
		{ id: "sleep", kind: "entity", label: "poor sleep", passage: "Screen time is associated with poor sleep", standing: "stated" },
		{ id: "x", kind: "entity", label: "Method X", passage: "Method X outperformed Method Y", standing: "stated" },
		{ id: "y", kind: "entity", label: "Method Y", passage: "Method X outperformed Method Y", standing: "stated" },
	],
	relations: [
		{ id: "ra", from: "caffeine", to: "recall", type: "CAUSES", passage: "Caffeine improves recall only when sleep is adequate" },
		{ id: "rd", from: "screen", to: "sleep", type: "ASSOCIATED_WITH", rejects: "causation", passage: "Screen time is associated with poor sleep, but the authors explicitly reject a causal reading" },
		{ id: "rx", from: "x", to: "y", type: "OUTPERFORMS", passage: "Method X outperformed Method Y except in subgroup Z" },
	],
	qualifiers: [
		{ id: "qa", applies_to: "ra", condition: "sleep is adequate", effect: "holds only", status: "holds", passage: "only when sleep is adequate" },
		{ id: "qx", applies_to: "rx", condition: "subgroup Z", effect: "does not hold in", status: "holds", passage: "except in subgroup Z" },
	],
};

/** What a careless pipeline produces: the arrow without the condition, the association upgraded to a cause, the ranking without its footnote. */
export const CARELESS = {
	diagram: "graph\n  [caffeine] --causes--> [recall]\n  [screen time] --causes--> [poor sleep]",
	table: "| method | result |\n|---|---|\n| Method X | outperformed Method Y |",
};
