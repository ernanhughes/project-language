import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	GROUP_OF,
	RelationError,
	adjudicate,
	assertedRelation,
	classifyRelation,
	discover,
	findCandidates,
	shownAs,
	worthShowing,
	type Item,
} from "../src/index.ts";

const item = (id: string, text: string, scope?: string): Item => ({ id, text, ...(scope ? { scope } : {}) });

const CLAIM = item("claim", "The treatment improved outcomes in the trial.");
const OPPOSITE = item("opposite", "The treatment did not improve outcomes in the trial.");
const PARAPHRASE = item("paraphrase", "Outcomes were better in the trial because of the treatment.");

describe("similarity ≠ relationship", () => {
	it("a contradiction and a paraphrase sit at nearly the same distance from a claim", () => {
		const [contradiction, paraphrase] = [OPPOSITE, PARAPHRASE].map((x) => findCandidates(CLAIM, [x])[0]!);
		assert.ok(Math.abs(contradiction!.similarity - paraphrase!.similarity) < 0.15, "closeness cannot tell them apart");
		assert.equal(classifyRelation(CLAIM, OPPOSITE).relation, "CONTRADICTS");
		assert.equal(classifyRelation(CLAIM, PARAPHRASE).relation, "SUPPORTS");
	});

	it("a candidate list carries similarity and no label", () => {
		const c = findCandidates(CLAIM, [OPPOSITE])[0]!;
		assert.deepEqual(Object.keys(c).sort(), ["item", "similarity"]);
	});
});

describe("a label is a claim: how it arose and how far to trust it", () => {
	it("a classifier's output is only ever a proposal", () => {
		const r = classifyRelation(CLAIM, OPPOSITE);
		assert.equal(r.route, "classified");
		assert.equal(r.standing, "proposal");
		assert.match(r.by, /uncalibrated/);
		assert.ok(r.evidence.length > 0, "a label carries the spans it rests on");
	});

	it("UNKNOWN is an honest value: no label, no evidence, never shown as a relation", () => {
		const r = classifyRelation(item("w", "The event writer appends immutable records."), item("f", "Focus mode batches everything into the morning digest."));
		assert.equal(r.relation, "UNKNOWN");
		assert.equal(r.standing, "unknown");
		assert.deepEqual(r.evidence, []);
		assert.equal(shownAs(r), "relationship unknown");
		for (const task of ["check_a_claim", "understand", "stay_current", "build"] as const) assert.equal(worthShowing(r, task), false);
	});

	it("a relation asserted by a source must carry its citation", () => {
		assert.throws(() => assertedRelation(CLAIM, OPPOSITE, "CONTRADICTS", "symmetric", " "), (e: unknown) => e instanceof RelationError && e.code === "NO_CITATION");
		const r = assertedRelation(CLAIM, OPPOSITE, "CONTRADICTS", "symmetric", "Smith 2024, §4");
		assert.equal(r.standing, "asserted");
		assert.equal(r.citation, "Smith 2024, §4");
	});
});

describe("scope: a contradiction outside the relevant scope is not a contradiction", () => {
	const LARGE = "The method outperforms the baseline on large datasets.";
	const SMALL = "The method does not outperform the baseline on datasets under a thousand examples.";

	it("the classifier calls a scope condition a contradiction, so the record flags it and does not present it as one", () => {
		const r = classifyRelation(item("a", LARGE, "datasets of 10k+ examples"), item("b", SMALL, "datasets under 1k examples"));
		assert.equal(r.relation, "CONTRADICTS", "this is the classifier's mistake, kept visible");
		assert.deepEqual(r.caveats, ["SCOPE_UNCONFIRMED"]);
		assert.match(shownAs(r), /^possible contradiction, unconfirmed: scope not declared as shared/);
		assert.ok(!/^contradicts/.test(shownAs(r)));
	});

	it("undeclared scope is treated the same as differing scope", () => {
		const r = classifyRelation(item("a", LARGE), item("b", SMALL));
		assert.deepEqual(r.caveats, ["SCOPE_UNCONFIRMED"]);
	});

	it("only a declared, shared scope lets a contradiction stand without the flag", () => {
		const r = classifyRelation(item("a", CLAIM.text, "the 2024 trial"), item("b", OPPOSITE.text, "the 2024 trial"));
		assert.deepEqual(r.caveats, []);
		assert.equal(shownAs(r), "contradicts (proposed)");
	});
});

describe("adjudication: only a person confirms or corrects", () => {
	const wrong = () => classifyRelation(item("v1", "The retry budget is three attempts."), item("v2", "The retry budget has been updated to five attempts."));

	it("the classifier misses an explicit update; a person corrects it, with a reason", () => {
		const before = wrong();
		assert.notEqual(before.relation, "UPDATES", "the classifier's miss, kept visible");
		const after = adjudicate(before, { type: "human", id: "priya" }, { relation: "UPDATES", direction: "right_to_left", reason: "v2 states the new budget and says it replaces the old one" });
		assert.equal(after.relation, "UPDATES");
		assert.equal(after.route, "adjudicated");
		assert.equal(after.standing, "adjudicated");
		assert.equal(after.by, "person:priya");
		assert.notEqual(after.id, before.id, "the correction is a new record, not an overwrite");
	});

	it("a model or a classifier cannot adjudicate", () => {
		for (const type of ["model", "classifier"] as const) {
			assert.throws(() => adjudicate(wrong(), { type, id: "x" }, { relation: "UPDATES", reason: "trust me" }), (e: unknown) => e instanceof RelationError && e.code === "NOT_A_PERSON");
		}
	});

	it("adjudication without a reason is refused", () => {
		assert.throws(() => adjudicate(wrong(), { type: "human", id: "priya" }, { relation: "UPDATES", reason: "" }), (e: unknown) => e instanceof RelationError && e.code === "NO_REASON");
	});

	it("a person who takes a scope-flagged contradiction on themselves clears the flag", () => {
		const flagged = classifyRelation(item("a", "The method outperforms the baseline on large datasets."), item("b", "The method does not outperform the baseline on datasets under a thousand examples."));
		assert.deepEqual(flagged.caveats, ["SCOPE_UNCONFIRMED"]);
		const decided = adjudicate(flagged, { type: "human", id: "priya" }, { relation: "RELATED", reason: "different regimes; not a disagreement" });
		assert.deepEqual(decided.caveats, []);
		assert.equal(decided.relation, "RELATED");
	});
});

describe("stage 3: worth depends on the task, not on the pair", () => {
	const contradiction = classifyRelation(item("a", CLAIM.text, "trial"), item("b", OPPOSITE.text, "trial"));
	it("the same contradiction is worth showing to someone checking a claim and not to someone staying current", () => {
		assert.equal(worthShowing(contradiction, "check_a_claim"), true);
		assert.equal(worthShowing(contradiction, "stay_current"), false);
	});
	it("groups follow the vocabulary: evidence, succession, practical, resemblance", () => {
		assert.deepEqual(
			[GROUP_OF.SUPPORTS, GROUP_OF.CONTRADICTS, GROUP_OF.UPDATES, GROUP_OF.IMPLEMENTS, GROUP_OF.RELATED, GROUP_OF.UNKNOWN],
			["evidence", "evidence", "succession", "practical", "resemblance", "none"],
		);
	});
	it("mere resemblance is not grounds for checking a claim", () => {
		const related = { ...contradiction, relation: "RELATED" as const };
		assert.equal(worthShowing(related, "check_a_claim"), false);
	});
});

describe("the three stages in order", () => {
	it("returns candidates with their similarity, a labelled record each, and a show decision", () => {
		const corpus = [OPPOSITE, PARAPHRASE, item("noise", "Bread rises because yeast produces carbon dioxide.")];
		const found = discover(item("claim", CLAIM.text, "trial"), corpus, "check_a_claim", 3);
		assert.equal(found.length, 3);
		assert.ok(found.every((d) => d.record.standing !== "adjudicated"), "nothing is adjudicated by running the pipeline");
		assert.ok(found.some((d) => d.show));
		const noise = found.find((d) => d.candidate.item.id === "noise")!;
		assert.equal(noise.show, false);
	});

	it("honest gap: the taxonomy has no 'adds nothing', so a near-duplicate is labelled as support", () => {
		const a = item("a", "We evaluate retrieval on BEIR with nDCG@10 and find the dense model wins.");
		const b = item("b", "We evaluate retrieval on BEIR using nDCG@10 and observe the dense model wins.");
		const r = classifyRelation(a, b);
		assert.equal(r.relation, "SUPPORTS");
		assert.ok(findCandidates(a, [b])[0]!.similarity > 0.8, "closest in the corpus, and it contributes nothing");
		assert.ok(!(Object.keys(GROUP_OF) as string[]).includes("DUPLICATE"));
	});
});
