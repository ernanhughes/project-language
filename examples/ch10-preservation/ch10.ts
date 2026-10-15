// Chapter 10: What Survived the Transformation?
//
// When a representation is transformed, how do we decide whether the transformation
// preserved what mattered?
//
// Run:  npm run example:ch10
//
// No model is called. Part 3 runs a Pi session with a scripted stand-in for the model.
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession } from "../../harness/session.ts";
import { preservation } from "../../host-pi/preservation.ts";
import { preservationReport } from "../../core/lens/src/engine/index.ts";
import {
	assess,
	changeNumber,
	declare,
	dropSentenceMatching,
	mustRelate,
	mustSay,
	probeMeasure,
	renderProfile,
	reverseRelation,
	strengthen,
	validateInstrument,
} from "../../core/preservation/src/index.ts";

const rule = (title: string) => console.log(`\n── ${title} ${"─".repeat(Math.max(0, 66 - title.length))}`);
const T0 = "2026-10-15T09:00:00.000Z"; // obligations declared
const T1 = "2026-10-15T10:00:00.000Z"; // output exists

const SOURCE =
	"Failed payments are retried up to 3 times. Idempotent requests are exempt from retry limits. " +
	"It is unclear how a third-party timeout should be handled. The policy comes from a 2024 design decision, ADR-17.";
const ONE_LINER = "Failed payments are retried up to 3 times.";
const FAITHFUL = "Failed payments are retried up to 3 times; idempotent requests are exempt. How a third-party timeout is handled is unclear. Source: ADR-17.";

rule("1. Declare what must survive, BEFORE the transformation");
const declaration = declare({
	at: T0,
	obligations: [
		mustSay("limit", "number", "retries stop after three attempts", "\\b3\\b"),
		mustSay("exception", "claim", "idempotent requests are exempt", "idempotent", "exempt"),
		mustSay("uncertainty", "uncertainty", "it is unclear how a third-party timeout is handled", "unclear", "third-party"),
		mustSay("source", "provenance", "the decision it comes from (ADR-17)", "adr-17"),
	],
});
console.log(`declaration ${declaration.declaration_id}, declared ${declaration.declared_at}`);
for (const o of declaration.obligations) console.log(`  [${o.dimension}] ${o.statement}`);

rule("2. The fluent one-liner, assessed");
console.log(`"${ONE_LINER}"\n`);
console.log(renderProfile(assess(declaration, { id: "one-liner", source: SOURCE, output: ONE_LINER, output_at: T1 })));

rule("3. A faithful rendering, assessed (a profile, not a score)");
console.log(renderProfile(assess(declaration, { id: "faithful", source: SOURCE, output: FAITHFUL, output_at: T1 })));

rule("4. Gain is not addition");
const fn = declare({
	at: T0,
	obligations: [mustSay("steps", "claim", "all three steps are present", "unplug", "wait", "replug")],
	probes: [{ id: "first-step", question: "what do I do first?", answer: "unplug" }],
});
const manual = "Devices sometimes hang. Step 1: unplug the device. Step 2: wait ten seconds. Step 3: replug it.";
const cases = [
	{ id: "compact", output: "Unplug the device, wait ten seconds, replug it.", note: "drops background, keeps the task" },
	{ id: "scrambled", output: "Wait ten seconds. Then replug it. Background: devices sometimes hang, many users report this, and it is more common after long uptime on older units. Finally, unplug the device.", note: "every step present, task harder" },
	{ id: "embellished", output: "Always unplug the device first, wait 30 seconds, then replug it.", note: "adds a number and an absolute" },
];
for (const c of cases) {
	const p = assess(fn, { id: c.id, source: manual, output: c.output, output_at: T1 });
	console.log(`${c.id.padEnd(12)} content: ${p.obligations[0]!.outcome.padEnd(9)} easier: ${JSON.stringify(p.function.easier).padEnd(15)} harder: ${JSON.stringify(p.function.harder).padEnd(15)} additions: ${p.possible_additions.length}   (${c.note})`);
	for (const a of p.possible_additions) console.log(`             possible addition, for review: ${a}`);
}
console.log(`\nText-to-text comparison would score "scrambled" as perfect. Function says otherwise.`);

rule("5. The check is an instrument too: does it notice a loss?");
const lensSource = "Acme acquired Beta in 2023. The effect may reduce errors by 20 percent. Latency is bounded under partial synchrony.";
const fingerprint = (text: string) => {
	const { notes: _notes, ...rest } = preservationReport(lensSource, text, "BRIEF");
	return rest;
};
console.log("The preservation report that ships in core/lens, probed with four ways of breaking a faithful text:\n");
for (const r of probeMeasure(lensSource, [dropSentenceMatching(["bounded"]), reverseRelation({ subject: "Acme", object: "Beta" }), strengthen, changeNumber], fingerprint)) {
	console.log(`  ${r.applied ? (r.detected ? "noticed     " : "NOT NOTICED ") : "n/a         "} ${r.mutation}`);
}
console.log("\nIt cannot tell \"Acme acquired Beta\" from \"Beta acquired Acme\", or \"may\" from \"does\". Its own notes call it a proxy.");
console.log("A pass from it would mean nothing for those losses.\n");

console.log("The same test on this chapter's own obligations, with a deliberately weak one added:");
const weak = declare({
	at: T0,
	obligations: [
		mustSay("limit", "number", "retries stop after 3 attempts (checked only by the digit 3)", "\\b3\\b"),
		mustRelate("acq", "Acme acquired Beta", { subject: "Acme", verb: "acquired", object: "Beta" }),
	],
});
const weakSource = "Retries stop after 3 attempts. The service has 3 replicas. Acme acquired Beta.";
const v = validateInstrument(weak, weakSource, weakSource, T1);
for (const p of v.probes) for (const r of p.results) console.log(`  ${p.obligation.padEnd(6)} ${r.applied ? (r.detected ? "noticed     " : "NOT NOTICED ") : "n/a         "} ${r.mutation}`);
console.log(`\ninstrument: ${v.status}. The digit-3 check passes when the limit has been removed, because "3" appears elsewhere.`);

rule("6. Preservation is not truth");
const falseSource = "Failed payments are retried up to 30 times.";
const falseDecl = declare({ at: T0, obligations: [mustSay("limit", "number", "the retry limit", "\\b30\\b")] });
console.log(assess(falseDecl, { id: "faithful-falsehood", source: falseSource, output: "Retries: up to 30 times.", output_at: T1 }).obligations[0]!.outcome, "← a false claim, faithfully kept");

rule("7. In a Pi session: the model repairs against a specification it cannot edit");
const h = await makeSession({
	extensions: [preservation({ declaration, source: SOURCE, faithfulReference: FAITHFUL, now: () => T1 })],
});
h.faux.setResponses([
	fauxAssistantMessage([fauxToolCall("submit_transformation", { output: ONE_LINER })], { stopReason: "toolUse" }),
	fauxAssistantMessage([fauxToolCall("submit_transformation", { output: FAITHFUL, obligations: "[]" })], { stopReason: "toolUse" }),
	fauxAssistantMessage([fauxText("done")]),
]);
await h.session.prompt("Give me a one-line version of the retry policy.");
const results = h.session.messages.filter((m) => m.role === "toolResult").map((m: any) => m.content[0].text as string);
console.log("attempt 1 →", results[0]!.split("\n").filter((l) => /LOST/.test(l)).length, "obligations lost");
console.log("attempt 2 →", results[1]!.split("\n").filter((l) => /LOST/.test(l)).length, "obligations lost");
console.log(`both attempts are in the session record: ${h.session.sessionManager.getEntries().filter((e: any) => e.customType === "preservation-profile").length}`);
console.log("(the model is a scripted stand-in; this shows the loop and the record, not that a model would repair on its own)");
h.dispose();
