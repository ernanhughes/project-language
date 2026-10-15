import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DIMENSIONS,
	assess,
	evaluateObligations,
	changeNumber,
	declare,
	dropSentenceMatching,
	mustKeep,
	mustNotSay,
	mustRelate,
	mustSay,
	possibleAdditions,
	probeMeasure,
	renderProfile,
	reverseRelation,
	strengthen,
	validateInstrument,
	type Declaration,
} from "../src/index.ts";
import { preservationReport } from "../../lens/src/engine/index.ts";

const T0 = "2026-10-15T09:00:00.000Z";
const T1 = "2026-10-15T10:00:00.000Z";

// The chapter's example: a payments retry policy.
const SOURCE =
	"Failed payments are retried up to 3 times. Idempotent requests are exempt from retry limits. " +
	"It is unclear how a third-party timeout should be handled. The policy comes from a 2024 design decision, ADR-17.";

// Anchored: each obligation names a short key phrase whose word order must survive within one sentence.
const OBLIGATIONS = [
	mustKeep("limit", "number", "retries stop after three attempts", "retried up to 3 times"),
	mustKeep("exception", "claim", "idempotent requests are exempt", "idempotent requests are exempt"),
	mustKeep("uncertainty", "uncertainty", "it is unclear how a third-party timeout is handled", "third-party timeout", { patterns: ["unclear"] }),
	mustKeep("source", "provenance", "the decision it comes from (ADR-17)", "ADR-17"),
];
const decl = (at = T0): Declaration => declare({ obligations: OBLIGATIONS, at });

const FAITHFUL =
	"Failed payments are retried up to 3 times; idempotent requests are exempt. How a third-party timeout is handled is unclear. Source: ADR-17.";
const ONE_LINER = "Failed payments are retried up to 3 times.";

const profile = (output: string, d = decl(), at = T1) => assess(d, { id: "t", source: SOURCE, output, output_at: at });
const outcomes = (p: ReturnType<typeof profile>) => Object.fromEntries(p.obligations.map((o) => [o.id, o.outcome]));

describe("declaring what must survive", () => {
	it("a faithful rendering keeps every declared obligation", () => {
		assert.deepEqual(Object.values(outcomes(profile(FAITHFUL))), ["SURVIVED", "SURVIVED", "SURVIVED", "SURVIVED"]);
	});

	it("the one-liner keeps the headline and loses the rest, and the profile says which", () => {
		assert.deepEqual(outcomes(profile(ONE_LINER)), { limit: "SURVIVED", exception: "LOST", uncertainty: "LOST", source: "LOST" });
	});

	it("an empty output is an observed empty output, so everything is lost; no observation at all is not assessable", () => {
		assert.ok(profile("").obligations.every((o) => o.outcome === "LOST"));
		const none = evaluateObligations(decl(), []);
		assert.ok(none.every((o) => o.outcome === "NOT_ASSESSABLE"), "missing evidence is not failure");
		assert.ok(none.every((o) => o.reason_code === "NO_APPLICABLE_EVIDENCE"));
	});

	it("obligations declared after the output existed are flagged", () => {
		assert.deepEqual(profile(FAITHFUL, decl(T1), T0).flags, ["OBLIGATIONS_DECLARED_AFTER_OUTPUT"]);
		assert.deepEqual(profile(FAITHFUL, decl(T0), T1).flags, []);
	});

	it("a declaration is identified by its content, so an amendment is a different declaration", () => {
		const amended = declare({ obligations: OBLIGATIONS.slice(0, 3), at: T0, supersedes: decl().declaration_id });
		assert.notEqual(amended.declaration_id, decl().declaration_id);
		assert.equal(amended.supersedes, decl().declaration_id);
	});
});

describe("a profile, not a score", () => {
	it("reports by dimension and offers no total", () => {
		const p = profile(ONE_LINER);
		assert.deepEqual(p.by_dimension.number, { survived: 1, lost: 0, not_assessable: 0 });
		assert.deepEqual(p.by_dimension.claim, { survived: 0, lost: 1, not_assessable: 0 });
		for (const key of ["score", "total", "fidelity", "overall"]) assert.ok(!(key in p), key);
		assert.ok(DIMENSIONS.includes("relation"));
	});

	it("names what it does not cover, and says it is not about truth", () => {
		const p = profile(FAITHFUL);
		assert.ok(p.not_covered.includes("emphasis"));
		assert.match(p.scope, /says nothing about whether the source was right/);
	});

	it("preserving a falsehood faithfully still scores as preserved", () => {
		const falseSource = "Failed payments are retried up to 30 times.";
		const d = declare({ obligations: [mustSay("limit", "number", "the retry limit", "\\b30\\b")], at: T0 });
		const p = assess(d, { id: "t", source: falseSource, output: "Retries: up to 30 times.", output_at: T1 });
		assert.equal(p.obligations[0]!.outcome, "SURVIVED");
	});
});

describe("relations and direction", () => {
	const d = declare({ obligations: [mustRelate("acq", "Acme acquired Beta", { subject: "Acme", verb: "acquired", object: "Beta" })], at: T0 });
	const src = "Acme acquired Beta in 2023.";
	const run = (output: string) => assess(d, { id: "t", source: src, output, output_at: T1 }).obligations[0]!.outcome;

	it("keeps the relation when the order is right and loses it when the direction reverses", () => {
		assert.equal(run("Acme acquired Beta."), "SURVIVED");
		assert.equal(run("Beta acquired Acme."), "LOST", "almost every word survives and the meaning reverses");
	});
});

describe("additions are candidates for review, not verdicts", () => {
	it("flags a number and an absolute word the source does not have", () => {
		const found = possibleAdditions(SOURCE, "Failed payments are always retried up to 5 times.");
		assert.ok(found.some((f) => f.includes("number not in the source: 5")));
		assert.ok(found.some((f) => f.includes('"always"')));
	});
	it("says nothing about a faithful output", () => {
		assert.deepEqual(possibleAdditions(SOURCE, FAITHFUL), []);
	});
	it("an author can also rule a claim out in advance", () => {
		const d = declare({ obligations: [mustNotSay("no-unlimited", "claim", "must not say retries are unlimited", "unlimited|forever")], at: T0 });
		assert.equal(assess(d, { id: "t", source: SOURCE, output: "Retries continue forever.", output_at: T1 }).obligations[0]!.outcome, "LOST");
		assert.equal(assess(d, { id: "t", source: SOURCE, output: FAITHFUL, output_at: T1 }).obligations[0]!.outcome, "SURVIVED");
	});
});

describe("content is not function", () => {
	const d = declare({
		obligations: [mustSay("steps", "claim", "all three steps are present", "unplug", "wait", "replug")],
		probes: [{ id: "first-step", question: "what do I do first?", answer: "unplug" }],
		at: T0,
	});
	const src = "Devices sometimes hang. Step 1: unplug the device. Step 2: wait ten seconds. Step 3: replug it.";
	const scattered = "Wait ten seconds. Then replug it. Background: devices sometimes hang, many users report this, and it is more common after long uptime on older units. Finally, unplug the device.";
	const compact = "Unplug the device, wait ten seconds, replug it.";

	it("scrambled steps keep every word and make the first step harder to find", () => {
		const p = assess(d, { id: "t", source: src, output: scattered, output_at: T1 });
		assert.equal(p.obligations[0]!.outcome, "SURVIVED", "content survives");
		assert.deepEqual(p.function.harder, ["first-step"], "function does not");
	});

	it("a compact rendering drops detail and makes the task easier: gain, not addition", () => {
		const p = assess(d, { id: "t", source: src, output: compact, output_at: T1 });
		assert.equal(p.obligations[0]!.outcome, "SURVIVED");
		assert.deepEqual(p.function.easier, ["first-step"]);
		assert.deepEqual(p.possible_additions, []);
	});

	it("a rendering that cannot answer the probe says so", () => {
		const p = assess(d, { id: "t", source: src, output: "Devices sometimes hang.", output_at: T1 });
		assert.deepEqual(p.function.not_answerable, ["first-step"]);
	});
});

describe("the check is an instrument too", () => {
	it("a check that actually discriminates is validated", () => {
		const v = validateInstrument(decl(), SOURCE, FAITHFUL, T1);
		assert.equal(v.faithful_passes, true);
		assert.equal(v.status, "validated");
	});

	it("a check that looks for a word that appears elsewhere passes when it should fail, and validation says so", () => {
		// "retries stop after three" checked by the word '3' alone. The word survives in an unrelated place.
		const weak = declare({ obligations: [mustSay("limit", "number", "retries stop after 3 attempts", "\\b3\\b")], at: T0 });
		const source = "Retries stop after 3 attempts. The service has 3 replicas.";
		const faithful = "Retries stop after 3 attempts. The service has 3 replicas.";
		const v = validateInstrument(weak, source, faithful, T1);
		assert.equal(v.status, "unvalidated");
		const drop = v.probes[0]!.results.find((r) => r.mutation.startsWith("drop"))!;
		assert.equal(drop.applied, true);
		assert.equal(drop.detected, false, "the limit was removed and the check still passes");
	});

	it("an unvalidated instrument is announced in the profile", () => {
		const text = renderProfile(assess(decl(), { id: "t", source: SOURCE, output: FAITHFUL, output_at: T1 }, "unvalidated"));
		assert.match(text, /INSTRUMENT UNVALIDATED: a pass from this check does not show anything was preserved/);
	});

	it("an instrument is not validated against a 'faithful' output it fails", () => {
		const v = validateInstrument(decl(), SOURCE, ONE_LINER, T1);
		assert.equal(v.faithful_passes, false);
		assert.equal(v.status, "unvalidated");
	});
});

describe("keyword-stuffing", () => {
	const survives = (d: Declaration, source: string, output: string) =>
		Object.fromEntries(assess(d, { id: "t", source, output, output_at: T1 }).obligations.map((o) => [o.id, o.outcome]));
	const stuffed = "3 idempotent exempt unclear third-party adr-17";
	const patternOnly = declare({
		at: T0,
		obligations: [
			mustSay("limit", "number", "retries stop after three attempts", "\\b3\\b"),
			mustSay("exception", "claim", "idempotent requests are exempt", "idempotent", "exempt"),
			mustSay("uncertainty", "uncertainty", "it is unclear how a third-party timeout is handled", "unclear", "third-party"),
			mustSay("source", "provenance", "the decision it comes from (ADR-17)", "adr-17"),
		],
	});

	it("a bag of the right words satisfies pattern-only obligations (this is the weakness)", () => {
		const out = survives(patternOnly, SOURCE, stuffed);
		assert.ok(Object.values(out).every((o) => o === "SURVIVED"));
	});

	it("the instrument probe now says so: pattern-only obligations are reported as not noticing stuffing, and the check is unvalidated", () => {
		const v = validateInstrument(patternOnly, SOURCE, FAITHFUL, T1);
		assert.equal(v.status, "unvalidated");
		const missed = v.probes.filter((p) => p.results.some((r) => r.applied && !r.detected && r.mutation.includes("keyword-stuffing"))).map((p) => p.obligation);
		// Plain-word patterns survive being shredded. Hyphenated ones ("third-party", "adr-17") happen to be broken by the shredding itself.
		assert.deepEqual(missed.sort(), ["exception", "limit"], "these obligations were testing the vocabulary, not the content");
	});

	it("anchored obligations about content are not met by the same bag of words", () => {
		const out = survives(decl(), SOURCE, stuffed);
		assert.deepEqual({ limit: out["limit"], exception: out["exception"], uncertainty: out["uncertainty"] }, { limit: "LOST", exception: "LOST", uncertainty: "LOST" });
		// The source obligation IS the reference "ADR-17". A bag that contains it has kept exactly what that obligation names.
		assert.equal(out["source"], "SURVIVED");
	});

	it("and the anchored declaration validates, stuffing probe included", () => {
		const v = validateInstrument(decl(), SOURCE, FAITHFUL, T1);
		assert.equal(v.status, "validated");
		assert.deepEqual(v.unprobed, []);
		assert.ok(v.probes.every((p) => p.results.some((r) => r.mutation.includes("keyword-stuffing") && r.applied && r.detected)));
	});

	it("known limit: copying the key phrases in order, around nonsense, still passes. The check keeps phrases; it cannot tell what the sentence around them now says", () => {
		const phrasesOnly = "Failed payments are retried up to 3 times. Banana idempotent requests are exempt banana. Third-party timeout unclear. ADR-17.";
		const out = survives(decl(), SOURCE, phrasesOnly);
		assert.ok(Object.values(out).every((o) => o === "SURVIVED"));
	});

	it("an obligation no probe can be applied to is reported as unprobed and keeps the check unvalidated", () => {
		const d = declare({ at: T0, obligations: [mustNotSay("no-unlimited", "claim", "must not say retries are unlimited", "unlimited|forever")] });
		const v = validateInstrument(d, SOURCE, FAITHFUL, T1);
		assert.deepEqual(v.unprobed, ["no-unlimited"]);
		assert.equal(v.status, "unvalidated");
	});

	it("a forbidden-claim obligation given a sample of the forbidden claim can be probed and validated", () => {
		const d = declare({ at: T0, obligations: [mustNotSay("no-unlimited", "claim", "must not say retries are unlimited", "unlimited|forever", "Retries continue forever.")] });
		const v = validateInstrument(d, SOURCE, FAITHFUL, T1);
		assert.deepEqual(v.unprobed, []);
		assert.equal(v.status, "validated");
	});
});

describe("probing a measure the lifted code already contains", () => {
	// core/lens ships a heuristic preservation report. Run the chapter's own test on it.
	const src = "Acme acquired Beta in 2023. The effect may reduce errors by 20 percent. Latency is bounded under partial synchrony.";
	const fingerprint = (text: string) => {
		const { notes: _n, ...rest } = preservationReport(src, text, "BRIEF");
		return rest;
	};

	it("lens's report, as it stood when this test was first written, missed a reversed relation and a hedge turned into a certainty; it now notices both", () => {
		const results = probeMeasure(src, [dropSentenceMatching(["bounded"]), reverseRelation({ subject: "Acme", object: "Beta" }), strengthen], fingerprint);
		const by = Object.fromEntries(results.map((r) => [r.mutation, r.detected]));
		assert.equal(by["drop the sentence that carries it"], true);
		assert.equal(by["reverse the direction of the relation"], true, "the report is now order-aware");
		assert.equal(by["turn a hedge into a certainty"], true, "the report is now hedge-aware");
	});

	it("it still cannot see a one-word substitution inside a long sentence: the instrument test finds what remains", () => {
		const antonym = { name: "swap a word for its opposite", dimension: "any" as const, apply: (t: string) => t.replace("reduce", "increase") };
		assert.equal(probeMeasure(src, [antonym], fingerprint)[0]!.detected, false);
	});

	it("a changed number is noticed by its numeric check", () => {
		assert.equal(probeMeasure(src, [changeNumber], fingerprint)[0]!.detected, true);
	});
});

describe("review findings: what an instrument's standing may be", () => {
	it("a check cannot be labelled validated while one of its obligations has no probe (the reviewer's reproduction)", () => {
		const d = declare({
			at: T0,
			obligations: [mustSay("positive", "claim", "says alpha", "alpha"), mustNotSay("negative", "claim", "must not say forbidden", "forbidden")],
		});
		const v = validateInstrument(d, "Alpha.", "Alpha.", T1);
		assert.notEqual(v.status, "validated");
		assert.ok(v.unprobed.includes("negative"), "the forbidden-claim obligation was never shown to notice anything");
	});

	it("a caller cannot assert that an instrument is validated: a bare 'validated' is not believed", () => {
		const p = assess(decl(), { id: "t", source: SOURCE, output: FAITHFUL, output_at: T1 }, "validated");
		assert.equal(p.instrument, "unvalidated");
	});

	it("only a validation of THESE obligations counts; one for other obligations is not believed", () => {
		const other = declare({ at: T0, obligations: [mustKeep("elsewhere", "claim", "something else", "retried up to 3 times")] });
		const forOther = validateInstrument(other, SOURCE, FAITHFUL, T1);
		assert.equal(forOther.status, "validated");
		const p = assess(decl(), { id: "t", source: SOURCE, output: FAITHFUL, output_at: T1 }, forOther);
		assert.equal(p.instrument, "unvalidated", "its probes were run against different obligations");
	});

	it("the same obligations declared at a different time still carry their validation", () => {
		const v = validateInstrument(decl(T0), SOURCE, FAITHFUL, T1);
		const later = declare({ obligations: OBLIGATIONS, at: "2026-10-15T09:30:00.000Z" });
		assert.notEqual(later.declaration_id, decl(T0).declaration_id);
		assert.equal(assess(later, { id: "t", source: SOURCE, output: FAITHFUL, output_at: T1 }, v).instrument, "validated");
	});

	it("an unparseable timestamp is refused rather than silently compared", () => {
		assert.throws(() => declare({ obligations: OBLIGATIONS, at: "yesterday-ish" }), /INVALID_TIME/);
		assert.throws(() => assess(decl(), { id: "t", source: SOURCE, output: FAITHFUL, output_at: "not a time" }), /INVALID_TIME/);
	});

	it("the number mutation changes only the first number, as it says", () => {
		const out = changeNumber.apply("Retries: 3 times, then 30 minutes, then 300 seconds.")!;
		assert.equal(out, "Retries: 4 times, then 30 minutes, then 300 seconds.");
	});
});
