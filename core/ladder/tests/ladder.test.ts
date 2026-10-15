import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	LadderError,
	RUNGS,
	bindingHash,
	check,
	confirmIntent,
	currentIntent,
	decision,
	defer,
	explainBack,
	inForce,
	probeBinding,
	propose,
	settle,
	translation,
	type Resolution,
	type Selector,
} from "../src/index.ts";
import { AT_MOST_ONCE, EXECUTED, RETRY_LIMIT, TRACE } from "../fixtures/queue.ts";

const priya = { type: "human", id: "priya" } as const;
const gpt = { type: "model", id: "gpt" } as const;
const settledAs = (optionId: string): Resolution[] => [settle(EXECUTED, optionId, priya, "the fear was a double charge")];
const run = (history: Resolution[]) => check(AT_MOST_ONCE, TRACE, [EXECUTED], history);

describe("the same requirement, three readings of one word", () => {
	it("passes flawlessly under 'completed job' while the card was charged twice", () => {
		const r = run(settledAs("completed"));
		assert.equal(r.verdict, "PASS");
		assert.equal(TRACE.filter((e) => e.job === "J1" && e.external_effect).length, 2, "the thing the owner feared happened, and the check passed");
	});

	it("fails under 'external effect', which is the reading the owner meant", () => {
		const r = run(settledAs("effect"));
		assert.equal(r.verdict, "FAIL");
		assert.match(r.detail, /J1 \(2\)/);
	});

	it("fails under 'attempt', and that reading contradicts the retry requirement", () => {
		const r = run(settledAs("attempt"));
		assert.equal(r.verdict, "FAIL");
		assert.match(r.detail, /J1 \(2\), J3 \(2\)/);
		assert.equal(check(RETRY_LIMIT, TRACE, [EXECUTED], []).verdict, "PASS", "the retries R2 allows are the executions R1 forbids");
	});
});

describe("checks run only on what has been settled", () => {
	it("an unsettled reading is INCONCLUSIVE, never a pass", () => {
		const r = run([]);
		assert.equal(r.verdict, "INCONCLUSIVE");
		assert.equal(r.reason, "UNSETTLED_INTERPRETATION");
		assert.deepEqual(r.blocked_on, ["executed"]);
	});

	it("a reading a model proposed is not a reading a person settled", () => {
		const r = run([propose(EXECUTED, "completed", gpt, "most natural")]);
		assert.equal(r.verdict, "INCONCLUSIVE");
	});

	it("a deferred decision stays open", () => {
		assert.equal(run([defer(EXECUTED, priya, "ask the owner")]).verdict, "INCONCLUSIVE");
	});

	it("a requirement that depends on no decision is checkable at once", () => {
		assert.equal(check(RETRY_LIMIT, TRACE, [EXECUTED], []).verdict, "PASS");
	});

	it("only a person settles or defers", () => {
		for (const fn of [() => settle(EXECUTED, "completed", gpt, "x"), () => defer(EXECUTED, gpt, "x")]) {
			assert.throws(fn, (e: unknown) => e instanceof LadderError && e.code === "NOT_A_PERSON");
		}
		assert.throws(() => settle(EXECUTED, "completed", priya, " "), (e: unknown) => e instanceof LadderError && e.code === "NO_REASON");
	});

	it("the latest resolution is the one in force, and the earlier ones are not erased", () => {
		const history = [propose(EXECUTED, "completed", gpt), ...settledAs("effect")];
		assert.equal(inForce(EXECUTED, history).resolution?.option_id, "effect");
		assert.equal(history.length, 2);
	});
});

describe("the binding stays inspectable", () => {
	it("a decision must name the words that prompted it", () => {
		assert.throws(() => decision({ id: "d", term: "retried", passage: "no such word here", options: EXECUTED.options }), (e: unknown) => e instanceof LadderError && e.code === "TERM_NOT_IN_PASSAGE");
		assert.throws(() => decision({ id: "d", term: "executed", passage: "executed", options: [EXECUTED.options[0]!] }), (e: unknown) => e instanceof LadderError && e.code === "TOO_FEW_OPTIONS");
	});

	it("a resolution carries the hash of the option, definition, term and passage it was made against", () => {
		const [r] = settledAs("effect");
		assert.equal(r!.binding_sha256, bindingHash(EXECUTED, "effect"));
		assert.notEqual(bindingHash(EXECUTED, "effect"), bindingHash(EXECUTED, "completed"));
	});

	it("an option that is redefined after it was settled is not honoured: the check reports a stale binding", () => {
		const history = settledAs("completed");
		const redefined = decision({
			id: "executed",
			term: "executed",
			passage: EXECUTED.passage.text,
			options: EXECUTED.options.map((o) => (o.id === "completed" ? { ...o, definition: "a run that finished, even if it was later rolled back" } : o)),
		});
		const r = check(AT_MOST_ONCE, TRACE, [redefined], history);
		assert.equal(r.verdict, "INCONCLUSIVE");
		assert.equal(r.reason, "STALE_BINDING");
	});

	it("a relabelled option is not honoured either", () => {
		const history = settledAs("completed");
		const relabelled = decision({ id: "executed", term: "executed", passage: EXECUTED.passage.text, options: EXECUTED.options.map((o) => (o.id === "completed" ? { ...o, label: "attempt" } : o)) });
		assert.equal(check(AT_MOST_ONCE, TRACE, [relabelled], history).reason, "STALE_BINDING");
	});
});

describe("translating between rungs", () => {
	const base = { id: "t1", from: RUNGS[0], to: RUNGS[2], decisions: [EXECUTED] } as const;

	it("a translation with an open choice cannot claim to preserve or to have narrowed", () => {
		for (const claimed of ["preserves", "narrows"] as const) {
			assert.equal(translation({ ...base, claimed, history: [] }).relation, "still_ambiguous");
		}
	});

	it("once the choice is settled it narrows, and the cost is counted: two readings set aside", () => {
		const t = translation({ ...base, claimed: "narrows", history: settledAs("effect") });
		assert.equal(t.relation, "narrows");
		assert.equal(t.interpretations_removed, 2);
		assert.deepEqual(t.unsettled, []);
	});

	it("whether the version kept the person's intent is theirs to say, and starts unasked", () => {
		const t = translation({ ...base, claimed: "narrows", history: settledAs("effect") });
		assert.equal(t.intent.status, "unasked");
		const confirmed = confirmIntent(t, priya, true, "yes, that is the double charge I was worried about");
		assert.equal(confirmed.intent.status, "confirmed");
		for (const type of ["model"] as const) {
			assert.throws(() => confirmIntent(t, { type, id: "x" }, true, "looks right"), (e: unknown) => e instanceof LadderError && e.code === "NOT_A_PERSON");
		}
	});

	it("explains the checked version back in plain language, with what was set aside", () => {
		const text = explainBack([EXECUTED], settledAs("effect"));
		assert.match(text, /"executed" is read as: external effect \(a committed effect outside the queue/);
		assert.match(text, /Not: attempt, completed job/);
		assert.match(text, /From: "A job must never be executed twice/);
		assert.match(explainBack([EXECUTED], []), /still open: attempt \/ completed job \/ external effect/);
	});
});

describe("does the name override the definition?", () => {
	const byDefinition: Selector = (_term, _passage, options) => options.find((o) => /committed effect/.test(o.definition))!.label;
	// A defective selector for the probe to catch: it chooses by what the label sounds like.
	const byName: Selector = (_term, _passage, options) => options.find((o) => /effect/i.test(o.label))?.label ?? options[0]!.label;

	it("a selector that follows the definition keeps choosing the same definition under any naming", () => {
		const r = probeBinding(EXECUTED, byDefinition);
		assert.equal(r.baseline, "a committed effect outside the queue, such as a charge or an email");
		assert.equal(r.stable, true);
	});

	it("a selector that follows the name is caught when the names move onto other definitions", () => {
		const r = probeBinding(EXECUTED, byName);
		assert.equal(r.stable, false);
		const rotated = r.variants.find((v) => v.variant.startsWith("labels rotated"))!;
		assert.equal(rotated.agrees_with_baseline, false);
	});

});

describe("review findings: what a later proposal, an edit, or a change of reading must not do", () => {
	it("a model proposing another reading does not unseat a reading a person settled", () => {
		const history = [...settledAs("effect"), propose(EXECUTED, "completed", gpt, "most natural")];
		assert.equal(inForce(EXECUTED, history).resolution?.option_id, "effect");
		const r = run(history);
		assert.equal(r.verdict, "FAIL", "still checked under the settled reading, not rendered inconclusive by the proposal");
		assert.deepEqual(r.readings, { executed: "effect" });
	});

	it("a proposal does not unseat a deferral either, and does stand when nothing has been decided", () => {
		assert.equal(inForce(EXECUTED, [defer(EXECUTED, priya, "ask the owner"), propose(EXECUTED, "completed", gpt)]).resolution?.status, "deferred");
		assert.equal(inForce(EXECUTED, [propose(EXECUTED, "completed", gpt)]).resolution?.status, "proposed");
		assert.equal(inForce(EXECUTED, [propose(EXECUTED, "completed", gpt), propose(EXECUTED, "effect", gpt)]).resolution?.option_id, "effect", "a later proposal replaces an earlier proposal");
	});

	it("a person's later settling or deferring does replace an earlier one", () => {
		assert.equal(inForce(EXECUTED, [...settledAs("completed"), settle(EXECUTED, "effect", priya, "on reflection")]).resolution?.option_id, "effect");
		assert.equal(inForce(EXECUTED, [...settledAs("completed"), defer(EXECUTED, priya, "not sure after all")]).resolution?.status, "deferred");
	});

	it("a confirmation is about the reading it was given for: change the reading and it no longer counts", () => {
		const mk = (history: Resolution[]) => translation({ id: "t", from: RUNGS[0], to: RUNGS[2], claimed: "narrows", decisions: [EXECUTED], history });
		const asCompleted = mk(settledAs("completed"));
		const confirmed = confirmIntent(asCompleted, priya, true, "yes, that is what I meant");
		assert.equal(currentIntent(asCompleted, confirmed.intent).status, "confirmed");
		// The reviewer's reproduction: settle completed, confirm, then settle effect.
		const asEffect = mk([...settledAs("completed"), settle(EXECUTED, "effect", priya, "no, the double charge")]);
		assert.notEqual(asEffect.fingerprint, asCompleted.fingerprint);
		const carried = currentIntent(asEffect, confirmed.intent);
		assert.equal(carried.status, "unasked");
		assert.equal(carried.stale, true);
	});

	it("a probe that never gets a valid answer from the selector is not 'stable'", () => {
		const r = probeBinding(EXECUTED, () => "no-such-label");
		assert.equal(r.stable, false);
		assert.equal(r.invalid_selection, true);
	});

	it("editing a decision's passage invalidates what was settled against the old words", () => {
		const edited = { ...EXECUTED, passage: { ...EXECUTED.passage, text: EXECUTED.passage.text + " (a later clause)" } };
		const r = check(AT_MOST_ONCE, TRACE, [edited], settledAs("completed"));
		assert.equal(r.verdict, "INCONCLUSIVE");
		assert.equal(r.reason, "STALE_BINDING");
	});

	it("the retry limit counts retries, not attempts: four attempts is three retries and is allowed, five is not", () => {
		const attempts = (n: number) => Array.from({ length: n }, (_, i) => ({ job: "J9", attempt: i + 1, status: "failed_transient" as const, external_effect: false }));
		assert.equal(check(RETRY_LIMIT, attempts(4), [EXECUTED], []).verdict, "PASS");
		assert.equal(check(RETRY_LIMIT, attempts(5), [EXECUTED], []).verdict, "FAIL");
	});

	it("a trace whose attempts are not numbered 1..n in order is refused rather than counted", () => {
		const bad = [{ job: "J9", attempt: 2, status: "failed_transient" as const, external_effect: false }, { job: "J9", attempt: 1, status: "completed" as const, external_effect: false }];
		const r = check(RETRY_LIMIT, bad, [EXECUTED], []);
		assert.equal(r.verdict, "FAIL");
		assert.match(r.detail, /not numbered 1\.\.n/);
	});
});
