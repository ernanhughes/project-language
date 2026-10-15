// Chapter 9: Similarity Is Not Discovery.
//
// When a system puts one piece of information beside another, what relationship is
// it claiming? Similarity is only one relation, and not the one that usually matters.
//
// Run:  npm run example:ch09
//
// No model is called. The classifier is core/relate's cue-based v0.1.
import { adjudicate, classifyRelation, discover, effectiveRecords, findCandidates, shownAs, worthShowing, type Item, type Relation } from "../../core/relations/src/index.ts";

const rule = (title: string) => console.log(`\n── ${title} ${"─".repeat(Math.max(0, 66 - title.length))}`);
const item = (id: string, text: string, scope?: string): Item => ({ id, text, ...(scope ? { scope } : {}) });

rule("1. Closeness cannot tell a contradiction from a paraphrase");
const claim = item("claim", "The treatment improved outcomes in the trial.", "the 2024 trial");
const opposite = item("opposite", "The treatment did not improve outcomes in the trial.", "the 2024 trial");
const paraphrase = item("paraphrase", "Outcomes were better in the trial because of the treatment.", "the 2024 trial");
for (const c of findCandidates(claim, [opposite, paraphrase])) {
	console.log(`${c.item.id.padEnd(11)} similarity ${c.similarity.toFixed(2)}   "${c.item.text}"`);
}
console.log(`\nOne says the opposite of the claim and one says the same thing, at nearly the same distance.`);
console.log(`  claim vs opposite   → ${shownAs(classifyRelation(claim, opposite))}`);
console.log(`  claim vs paraphrase → ${shownAs(classifyRelation(claim, paraphrase))}`);

rule("2. The nearest item can contribute nothing");
const reading = item("reading", "We evaluate retrieval on BEIR with nDCG@10 and find the dense model wins.", "BEIR retrieval evaluation");
const corpus = [
	item("near-copy", "We evaluate retrieval on BEIR using nDCG@10 and observe the dense model wins.", "BEIR retrieval evaluation"),
	item("different", "Sparse retrieval remains competitive when queries share vocabulary with documents.", "BEIR retrieval evaluation"),
];
for (const d of discover(reading, corpus, "check_a_claim")) {
	console.log(`${d.candidate.item.id.padEnd(10)} similarity ${d.candidate.similarity.toFixed(2)}   ${d.shown_as}`);
}
console.log(`\nThe near-copy ranks first by similarity and is labelled as support. "Adds nothing" is not a relation between two`);
console.log(`items; it is a property of a candidate relative to what the reader already has. Here that is measured against the text`);
console.log(`being read only (the share of the candidate's terms that are new), and it is not applied to a relation that carries news:`);
console.log(`a contradiction or an update stays visible however little of its wording is new. The reader's wider knowledge is a later question.`);

rule("3. A label is a claim, and this classifier is wrong some of the time");
// Seven pairs, labelled by hand for this demonstration. This is a probe, not an evaluation.
const probe: { name: string; a: Item; b: Item; expected: Relation }[] = [
	{ name: "negation flips meaning", a: claim, b: opposite, expected: "CONTRADICTS" },
	{ name: "paraphrase", a: claim, b: paraphrase, expected: "SUPPORTS" },
	{ name: "scope condition", a: item("a", "The method outperforms the baseline on large datasets."), b: item("b", "The method does not outperform the baseline on datasets under a thousand examples."), expected: "RELATED" },
	{ name: "contradiction, no negation word", a: item("a", "The cache is always invalidated on write."), b: item("b", "Writes leave stale entries in the cache until the next refresh."), expected: "CONTRADICTS" },
	{ name: "explicit update", a: item("a", "The retry budget is three attempts."), b: item("b", "The retry budget has been updated to five attempts."), expected: "UPDATES" },
	{ name: "unrelated", a: item("a", "The event writer appends immutable records."), b: item("b", "Focus mode batches everything into the morning digest."), expected: "UNKNOWN" },
	{ name: "near-duplicate", a: reading, b: corpus[0]!, expected: "SUPPORTS" },
];
let right = 0;
for (const p of probe) {
	const got = classifyRelation(p.a, p.b).relation;
	const ok = got === p.expected;
	if (ok) right += 1;
	console.log(`${ok ? "ok  " : "MISS"} ${p.name.padEnd(34)} expected ${p.expected.padEnd(11)} got ${got}`);
}
console.log(`\n${right} of ${probe.length}. Seven hand-picked pairs say nothing about accuracy in general; they show the kinds of error.`);
console.log(`(An earlier version of the classifier also missed "has been updated to". A narrow revision-language cue now catches it, and the`);
console.log(`classifier's own battery still passes. But that cue was added AFTER seeing this miss, so this probe is no longer an independent test of it.`);
console.log(`The scope condition is caught by the record, not by the label. The contradiction with`);
console.log(`no negation word is still missed: a cue-based classifier has no way to see it.)`);
console.log(`A wrong label does more damage than none, because it arrives with the authority of a structure.`);

rule("4. So the record says how the label arose and how far to trust it");
const flagged = classifyRelation(
	item("a", "The method outperforms the baseline on large datasets.", "datasets of 10k+ examples"),
	item("b", "The method does not outperform the baseline on datasets under a thousand examples.", "datasets under 1k examples"),
);
console.log(`classifier said ${flagged.relation}; route=${flagged.route}; standing=${flagged.standing}; caveats=${JSON.stringify(flagged.caveats)}`);
console.log(`shown as: ${shownAs(flagged)}`);
console.log(`\nThe scopes were declared and they differ, so the system does not claim a contradiction.`);

rule("5. A person corrects a miss; the correction is a new record");
const before = classifyRelation(probe[3]!.a, probe[3]!.b);
const after = adjudicate(before, { type: "human", id: "iris" }, { relation: "CONTRADICTS", direction: "symmetric", reason: "the first says always invalidated; the second describes stale entries surviving a write" });
console.log(`before: ${shownAs(before)}   [${before.route}]   ${before.id}`);
console.log(`after:  ${shownAs(after)}   [${after.route}]   ${after.id}`);
try {
	adjudicate(before, { type: "model", id: "gpt" }, { relation: "UPDATES", reason: "trust me" });
} catch (error) {
	console.log(`a model tries the same: ${(error as Error).message}`);
}

rule("5b. A person's ruling is not displaced, and confirming a label is not confirming a scope");
const ruled = after;
const relabelled = classifyRelation(probe[3]!.a, probe[3]!.b);
console.log(`history: ${[before, ruled, relabelled].map((r) => r.route).join(" → ")}`);
console.log(`in force: ${shownAs(effectiveRecords([before, ruled, relabelled])[0]!)}   [${effectiveRecords([before, ruled, relabelled])[0]!.route}]`);
console.log("A model asking for another label cannot replace a person's ruling on the same pair; the host refuses it and does not record it.");
const scoped = classifyRelation(item("a", "The method outperforms the baseline on large datasets.", "large"), item("b", "The method does not outperform the baseline on datasets under a thousand examples.", "small"));
console.log(`\nlabel confirmed, scope not:  ${shownAs(adjudicate(scoped, { type: "human", id: "iris" }, { reason: "looks right" }))}`);
console.log(`label and scope confirmed:   ${shownAs(adjudicate(scoped, { type: "human", id: "iris" }, { reason: "same population", confirms_scope: true }))}`);

rule("6. Whether to show it depends on what the reader is doing");
const contradiction = classifyRelation(claim, opposite);
for (const task of ["check_a_claim", "understand", "stay_current", "build"] as const) {
	console.log(`${task.padEnd(14)} ${worthShowing(contradiction, task) ? "show" : "hold back"}   ${shownAs(contradiction)}`);
}
console.log(`\nRelevance is not a property of the pair. It depends on the reader's task, which is why it is a separate step.`);
