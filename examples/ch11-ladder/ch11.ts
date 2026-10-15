// Chapter 11: The Language Between Languages.
//
// Between ordinary human language and executable machine state, what kinds of
// representation are available, and what does each make easier or harder?
//
// Run:  npm run example:ch11
//
// No model is called. What is shown is the part of the chapter that can be enforced:
// a word's reading is a declared decision, checks run only on what a person has
// settled, and an option's name cannot be allowed to override its definition.
// Which rung is "better" is argument, not code, and nothing here ranks them.
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../../harness/session.ts";
import { ladder } from "../../host-pi/ladder.ts";
import { AT_MOST_ONCE, EXECUTED, REQUEST, RETRY_LIMIT, TRACE, type QueueTrace } from "../../core/ladder/fixtures/queue.ts";
import { RUNGS, check, confirmIntent, currentIntent, explainBack, inForce, probeBinding, propose, settle, translation, type Selector } from "../../core/ladder/src/index.ts";

const rule = (title: string) => console.log(`\n── ${title} ${"─".repeat(Math.max(0, 66 - title.length))}`);
const priya = { type: "human", id: "priya" } as const;
const gpt = { type: "model", id: "gpt" } as const;

rule("1. One requirement, four rungs of the ladder");
console.log(`${RUNGS[0]}:`, `"${REQUEST}"`);
console.log(`${RUNGS[1]}:`, `"Each job has at most one completed execution. A failed attempt marked transient may be retried up to 3 times."`);
console.log(`${RUNGS[2]}:`, `R1 completed executions per job <= 1;  R2 retries per job, cause = transient <= 3`);
console.log(`${RUNGS[4]}:`, `a test that fails when the constraint breaks`);
console.log(`\nGoing down, fewer readings are possible and more can be checked. The choice of what to count was forced`);
console.log(`at the third rung: you cannot write the count without deciding what "executed" means.`);

rule("2. The trace: job J1 was charged on a failed attempt, then retried and charged again");
for (const e of TRACE) console.log(`  ${e.job} attempt ${e.attempt}  ${e.status.padEnd(16)} external effect: ${e.external_effect}`);

rule("3. Until a person settles the reading, the check is INCONCLUSIVE, not a pass");
const r0 = check(AT_MOST_ONCE, TRACE, [EXECUTED], []);
console.log(`R1: ${r0.verdict}   ${r0.detail}`);
const r0m = check(AT_MOST_ONCE, TRACE, [EXECUTED], [propose(EXECUTED, "completed", gpt, "most natural")]);
console.log(`R1 with a model's proposal on file: ${r0m.verdict}   (a proposal is not a decision)`);
console.log(`R2 (depends on no reading): ${check(RETRY_LIMIT, TRACE, [EXECUTED], []).verdict}`);

rule("4. The same requirement under each reading of 'executed'");
for (const o of EXECUTED.options) {
	const r = check(AT_MOST_ONCE, TRACE, [EXECUTED], [settle(EXECUTED, o.id, priya, "demonstration")]);
	console.log(`${o.label.padEnd(16)} ${r.verdict.padEnd(5)} ${r.detail}`);
}
console.log(`\nUnder "completed job" the verification is flawless and the customer was still charged twice.`);
console.log(`It verified the wrong thing. Under "attempt" the requirement contradicts the retry rule it sits beside.`);

rule("5. Moving between rungs with the choice visible");
const history = [settle(EXECUTED, "effect", priya, "the fear was a customer being charged twice")];
console.log(explainBack([EXECUTED], history));
const t = translation({ id: "t1", from: RUNGS[0], to: RUNGS[2], claimed: "narrows", decisions: [EXECUTED], history });
console.log(`\nprose → structured: ${t.relation}; readings set aside: ${t.interpretations_removed}; your confirmation: ${t.intent.status}`);
const open = translation({ id: "t0", from: RUNGS[0], to: RUNGS[2], claimed: "narrows", decisions: [EXECUTED], history: [] });
console.log(`with the choice still open the same claim becomes: ${open.relation}`);
try {
	confirmIntent(t, gpt, true, "looks right");
} catch (error) {
	console.log(`a model tries to confirm it: ${(error as Error).message}`);
}
console.log(`a person: ${confirmIntent(t, priya, true, "yes, the double charge").intent.status}`);

rule("6. Does the name override the definition?");
const byDefinition: Selector = (_t, _p, options) => options.find((o) => /committed effect/.test(o.definition))!.label;
const byName: Selector = (_t, _p, options) => options.find((o) => /effect/i.test(o.label))?.label ?? options[0]!.label;
for (const [name, selector] of [["follows the definition", byDefinition], ["follows the name (simulated, deliberately defective)", byName]] as const) {
	const p = probeBinding(EXECUTED, selector);
	console.log(`selector that ${name}: ${p.stable ? "stable" : "UNSTABLE"}`);
	for (const v of p.variants) console.log(`   ${v.agrees_with_baseline ? "same   " : "CHANGED"} ${v.variant}`);
}
console.log(`\nThe second selector is invented to show that the probe can catch this failure. It is not a result about`);
console.log(`any real model. Whether a real selector follows names over definitions is a question to put to it.`);

rule("6b. A later proposal does not unseat a decision, and a confirmation belongs to the reading it was given for");
const decided = [settle(EXECUTED, "effect", priya, "the fear was a double charge"), propose(EXECUTED, "completed", gpt, "actually the most natural reading")];
console.log(`person settled "effect", then a model proposed "completed": in force = ${inForce(EXECUTED, decided).resolution?.option_id} (${inForce(EXECUTED, decided).resolution?.status})`);
console.log(`R1 under that: ${check(AT_MOST_ONCE, TRACE, [EXECUTED], decided).verdict}`);
const mk = (history: typeof decided) => translation({ id: "t", from: RUNGS[0], to: RUNGS[2], claimed: "narrows", decisions: [EXECUTED], history });
const asCompleted = mk([settle(EXECUTED, "completed", priya, "we only care that it finished once")]);
const confirmedThen = confirmIntent(asCompleted, priya, true, "yes, that is what I meant");
console.log(`confirmed for the "completed" reading: ${currentIntent(asCompleted, confirmedThen.intent).status}`);
const nowEffect = mk([settle(EXECUTED, "completed", priya, "x"), settle(EXECUTED, "effect", priya, "no, the double charge")]);
const carried = currentIntent(nowEffect, confirmedThen.intent);
console.log(`after the reading changed to "effect": ${carried.status}${carried.stale ? " (stale: " + carried.note + ")" : ""}`);

rule("7. In a Pi session: the model proposes, a person settles, and the check follows");
const ui = new UiRecorder();
const h = await makeSession({ ui, extensions: [ladder<QueueTrace>({ decisions: [EXECUTED], requirements: [AT_MOST_ONCE, RETRY_LIMIT], trace: TRACE })] });
const texts = () => h.session.messages.filter((m) => m.role === "toolResult").map((m: any) => m.content[0].text as string);
h.faux.setResponses([
	fauxAssistantMessage([fauxToolCall("interpretation_propose", { decision_id: "executed", option_id: "completed", reason: "the most natural reading", status: "settled" })], { stopReason: "toolUse" }),
	fauxAssistantMessage([fauxToolCall("check_requirement", { requirement_id: "R1" })], { stopReason: "toolUse" }),
	fauxAssistantMessage([fauxText("done")]),
]);
await h.session.prompt("Is the job queue correct?");
console.log("model's check, reading unsettled →", texts()[1]!.split("\n")[0]);
await h.session.prompt("/interpretation settle executed effect the fear was a customer being charged twice");
h.faux.setResponses([fauxAssistantMessage([fauxToolCall("check_requirement", { requirement_id: "R1" })], { stopReason: "toolUse" }), fauxAssistantMessage([fauxText("done")])]);
await h.session.prompt("Check again.");
console.log("model's check, person settled   →", texts()[2]!.split("\n").join(" | "));
console.log("(the model is a scripted stand-in; this shows who may do what, not that a model reasons well about the queue)");
h.dispose();
