import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	GROUP_OF,
	RelationError,
	adjudicate,
	assertedRelation,
	classifyRelation,
	discover,
	effectiveRecords,
	findCandidates,
	novelty,
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
	// A miss that still exists: the second text contradicts the first without using a negation word.
	const wrong = () => classifyRelation(item("c1", "The cache is always invalidated on write."), item("c2", "Writes leave stale entries in the cache until the next refresh."));

	it("an explicit revision is now recognised without a date or version marker, in the right direction", () => {
		const r = classifyRelation(item("v1", "The retry budget is three attempts."), item("v2", "The retry budget has been updated to five attempts."));
		assert.equal(r.relation, "UPDATES");
		assert.equal(r.direction, "right_to_left", "the side that announces the revision updates the other");
		const flipped = classifyRelation(item("v2", "The retry budget has been updated to five attempts."), item("v1", "The retry budget is three attempts."));
		assert.equal(flipped.direction, "left_to_right");
	});

	it("a person still corrects a miss, with a reason: here the classifier reads a scope condition as a contradiction", () => {
		const miss = classifyRelation(item("a", "The method outperforms the baseline on large datasets.", "large"), item("b", "The method does not outperform the baseline on datasets under a thousand examples.", "small"));
		assert.equal(miss.relation, "CONTRADICTS", "the classifier's miss, kept visible");
		const fixed = adjudicate(miss, { type: "human", id: "iris" }, { relation: "RELATED", reason: "different regimes; not a disagreement" });
		assert.equal(fixed.relation, "RELATED");
	});

	it("a person corrects a miss that remains: a contradiction with no negation word", () => {
		const before = wrong();
		assert.equal(before.relation, "RELATED", "the classifier's miss, kept visible");
		const after = adjudicate(before, { type: "human", id: "iris" }, { relation: "CONTRADICTS", direction: "symmetric", reason: "the first says always invalidated; the second describes stale entries surviving a write" });
		assert.equal(after.relation, "CONTRADICTS");
		assert.equal(after.route, "adjudicated");
		assert.equal(after.standing, "adjudicated");
		assert.equal(after.by, "person:iris");
		assert.notEqual(after.id, before.id, "the correction is a new record, not an overwrite");
	});

	it("a model or a classifier cannot adjudicate", () => {
		for (const type of ["model", "classifier"] as const) {
			assert.throws(() => adjudicate(wrong(), { type, id: "x" }, { relation: "UPDATES", reason: "trust me" }), (e: unknown) => e instanceof RelationError && e.code === "NOT_A_PERSON");
		}
	});

	it("adjudication without a reason is refused", () => {
		assert.throws(() => adjudicate(wrong(), { type: "human", id: "iris" }, { relation: "UPDATES", reason: "" }), (e: unknown) => e instanceof RelationError && e.code === "NO_REASON");
	});

	it("a person who takes a scope-flagged contradiction on themselves clears the flag", () => {
		const flagged = classifyRelation(item("a", "The method outperforms the baseline on large datasets."), item("b", "The method does not outperform the baseline on datasets under a thousand examples."));
		assert.deepEqual(flagged.caveats, ["SCOPE_UNCONFIRMED"]);
		const decided = adjudicate(flagged, { type: "human", id: "iris" }, { relation: "RELATED", reason: "different regimes; not a disagreement" });
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

describe("the revision cue: a regression set, not an independent test", () => {
	// These eight pairs were written after the cue was first added, and one of them exposed a false positive
	// ("is now running") that was then fixed. They guard against regressions. They do not show the cue generalises.
	const rel = (a: string, b: string) => classifyRelation(item("a", a), item("b", b)).relation;

	it("recognises revision language in several wordings, with or without a changed number", () => {
		assert.equal(rel("The upload limit is 10 MB.", "The upload limit has been raised to 50 MB."), "UPDATES");
		assert.equal(rel("Passwords must be rotated every 90 days.", "The password rotation interval is now 180 days."), "UPDATES");
		assert.equal(rel("Version 2 of the API uses basic authentication.", "Version 3 of the API replaces basic authentication with tokens."), "UPDATES");
	});

	it("does not fire on revision words used in other senses", () => {
		assert.notEqual(rel("The report describes how the team replaces failed disks.", "Failed disks are replaced by the data centre staff."), "UPDATES");
		assert.notEqual(rel("The cluster is now running on three nodes.", "The cluster has three nodes in different zones."), "UPDATES", "'is now' alone is weak and needs a differing number");
		assert.notEqual(rel("Bread rises because yeast produces gas.", "The oven is now preheated to 220 degrees."), "UPDATES");
		assert.notEqual(rel("The dataset has 1,000 examples.", "The dataset has 1,000 examples and is split evenly."), "UPDATES");
	});

	it("known limit: 'no longer accepts' is read as a contradiction, because the negation rule claims it first", () => {
		assert.equal(rel("The parser accepts YAML configuration files.", "The parser no longer accepts YAML configuration files."), "CONTRADICTS");
	});
});

describe("the paper that is closest and contributes nothing (the chapter's opening)", () => {
	const reading = item("reading", "We evaluate retrieval on BEIR with nDCG@10 and find the dense model wins.", "BEIR retrieval evaluation");
	const nearCopy = item("near-copy", "We evaluate retrieval on BEIR using nDCG@10 and observe the dense model wins.", "BEIR retrieval evaluation");
	const different = item("different", "Sparse retrieval remains competitive when queries share vocabulary with documents.", "BEIR retrieval evaluation");

	it("the nearest item by similarity is the one that adds nothing, and the system now says so", () => {
		const found = discover(reading, [nearCopy, different], "check_a_claim", 2);
		assert.equal(found[0]!.candidate.item.id, "near-copy", "ranked first by similarity");
		assert.equal(found[0]!.redundant, true);
		assert.equal(found[0]!.show, false);
		assert.match(found[0]!.shown_as, /^adds nothing beyond what you are reading \(supports \(proposed\); \d+% new terms\)/);
		assert.equal(found[1]!.redundant, false);
	});

	it("novelty counts terms the candidate has that the subject lacks", () => {
		const n = novelty(reading, nearCopy);
		assert.ok(n.novelty < 0.25);
		assert.deepEqual(n.new_terms.sort(), ["observe"], "'using' is a stopword; 'with' and 'find' are too short or filtered");
		assert.ok(novelty(reading, different).novelty > 0.8);
	});

	it("a contradiction that repeats almost every word is NOT redundant: the negation is the news", () => {
		const claim = item("claim", "The treatment improved outcomes in the trial.", "the 2024 trial");
		const opposite = item("opposite", "The treatment did not improve outcomes in the trial.", "the 2024 trial");
		const [d] = discover(claim, [opposite], "check_a_claim", 1);
		assert.equal(d!.record.relation, "CONTRADICTS");
		assert.equal(d!.redundant, false);
		assert.equal(d!.show, true);
	});

	it("an update that repeats most words is not redundant either", () => {
		const [d] = discover(item("old", "The retry budget is three attempts."), [item("new", "The retry budget has been updated to five attempts.")], "stay_current", 1);
		assert.equal(d!.record.relation, "UPDATES");
		assert.equal(d!.redundant, false);
	});

	it("known limit: novelty is measured against the text being read, not against what the reader already knows", () => {
		const text = "retrieval benchmark evaluation results";
		assert.equal(novelty(item("a", text), item("b", "A new benchmark: retrieval evaluation results from 2026 are published.")).adds_nothing, false);
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

	it("'adds nothing' is not a relation, so it is not in the vocabulary; it is novelty relative to what is being read", () => {
		assert.ok(!(Object.keys(GROUP_OF) as string[]).includes("DUPLICATE"));
		assert.ok(!(Object.keys(GROUP_OF) as string[]).includes("ADDS_NOTHING"));
	});
});

describe("review findings: a person's ruling is not displaced, and confirming a label is not confirming a scope", () => {
	const old = item("retry-old", "The retry budget is three attempts.");
	const neu = item("retry-new", "The retry budget has been updated to five attempts.");
	const person = { type: "human", id: "iris" } as const;

	it("a later classification does not displace a person's adjudication of the same pair", () => {
		const classified = classifyRelation(old, neu);
		const ruled = adjudicate(classified, person, { relation: "UPDATES", reason: "v2 replaces v1" });
		const relabelled = classifyRelation(old, neu);
		const inForce = effectiveRecords([classified, ruled, relabelled]);
		assert.equal(inForce.length, 1);
		assert.equal(inForce[0]!.route, "adjudicated");
	});

	it("a later adjudication does replace an earlier one, and a later classification replaces an earlier classification", () => {
		const first = classifyRelation(old, neu);
		const a1 = adjudicate(first, person, { relation: "UPDATES", reason: "first view" });
		const a2 = adjudicate(a1, person, { relation: "RELATED", reason: "on reflection" });
		assert.equal(effectiveRecords([first, a1, a2])[0]!.relation, "RELATED");
		const c2 = classifyRelation(old, neu);
		assert.equal(effectiveRecords([first, c2]).length, 1);
	});

	it("records for different pairs do not interfere", () => {
		const other = item("other", "Bread rises because yeast produces gas.");
		const recs = effectiveRecords([adjudicate(classifyRelation(old, neu), person, { relation: "UPDATES", reason: "x" }), classifyRelation(old, other)]);
		assert.equal(recs.length, 2);
	});

	it("keeping a scope-bound relation does not clear the scope flag unless the person says the scope is shared", () => {
		const flagged = classifyRelation(item("a", "The method outperforms the baseline on large datasets.", "large"), item("b", "The method does not outperform the baseline on datasets under a thousand examples.", "small"));
		assert.deepEqual(flagged.caveats, ["SCOPE_UNCONFIRMED"]);
		const stamped = adjudicate(flagged, person, { reason: "looks right" });
		assert.deepEqual(stamped.caveats, ["SCOPE_UNCONFIRMED"], "a rubber stamp on the label is not evidence about the scope");
		assert.match(shownAs(stamped), /^possible contradiction, unconfirmed: scope not declared as shared \(label confirmed by a person; scope still not confirmed\)/);
		const confirmed = adjudicate(flagged, person, { reason: "both are about the same population", confirms_scope: true });
		assert.deepEqual(confirmed.caveats, []);
		assert.equal(shownAs(confirmed), "contradicts (confirmed by a person)");
	});

	it("changing to a relation that does not depend on scope drops the scope flag, since it no longer applies", () => {
		const flagged = classifyRelation(item("a", "The method outperforms the baseline on large datasets.", "large"), item("b", "The method does not outperform the baseline on datasets under a thousand examples.", "small"));
		assert.deepEqual(adjudicate(flagged, person, { relation: "RELATED", reason: "different regimes" }).caveats, []);
	});

	it("a person can supply the direction as well as the relation", () => {
		const r = adjudicate(classifyRelation(old, neu), person, { relation: "UPDATES", direction: "right_to_left", reason: "v2 replaces v1" });
		assert.equal(r.direction, "right_to_left");
	});
});
