// Chapter 12: The Semantic Browser.
//
// The Part I pieces working on one source: a record, declared obligations, a task, a choice of
// representation, a rendering, a margin, and a check before anything is shown.
//
// Run:  npm run example:ch12
//
// No model is called. The record is written by hand (standing in for a maintainer) and every entry
// is checked to cite the source. Part 6 runs a Pi session with a scripted stand-in for the model.
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../../harness/session.ts";
import { browser } from "../../host-pi/browser.ts";
import { COMPONENTS, EARLIER, RECORD, SOURCE, SOURCE_ID, THIS_SCOPE } from "../../core/browser/fixtures/incident.ts";
import { browse, buildMargin, checkRendering, choose, declarationFor, gateDecision, renderDiagram, renderTable, validateGate, validateRecord, type Task } from "../../core/browser/src/index.ts";
import { assess, declare, mustSay } from "../../core/preservation/src/index.ts";
import { renderSidecar } from "../../core/sidecar/src/index.ts";
import { shownAs } from "../../core/relations/src/index.ts";
import { ITEM_KINDS } from "../../core/language/src/index.ts";

const rule = (title: string) => console.log(`\n── ${title} ${"─".repeat(Math.max(0, 66 - title.length))}`);
const source = { id: SOURCE_ID, text: SOURCE };
const AT = "2026-10-15T10:00:00.000Z";
const opts = { audienceServices: ["ledger"], components: COMPONENTS, query: "failover completed" };

rule("1. From the report to a record (every entry cites the source)");
console.log(`source: ${SOURCE.split("\n")[0]}`);
console.log(`record: ${RECORD.claims.length} claims, ${RECORD.relations.length} relations with direction, ${RECORD.qualifiers.length} qualifier`);
console.log(`problems found by the traceability check: ${JSON.stringify(validateRecord(source, RECORD))}`);
console.log(`\nA finding on the way: core/language, which keeps a CONVERSATION's state, has item kinds ${JSON.stringify(ITEM_KINDS)}.`);
console.log(`It has no place for a hypothesis, evidence, a directed relation or a qualifier. The record used here is core/record, the`);
console.log(`document record that Chapter 7 describes, and this module imports it. The two are different objects.`);

rule("2. What has to survive depends on who is asking");
for (const o of declarationFor("approve_fix", "table", RECORD, AT, { source }).obligations) console.log(`  [table]   ${o.statement}`);
for (const o of declarationFor("approve_fix", "diagram", RECORD, AT, { source }).obligations.slice(0, 3)) console.log(`  [diagram] ${o.statement}`);
console.log("  ...");

rule("3. One source, one record, four readers, four representations");
for (const task of ["decide_to_open", "approve_fix", "follow_procedure", "look_up_fact"] as Task[]) {
	const c = choose(task);
	const b = browse(task, RECORD, source, AT, opts);
	console.log(`${task.padEnd(17)} → ${c.representations.join(" + ").padEnd(18)} ${c.transforms_source ? "transforms " : "UNCHANGED  "} ${b.views.map((v) => v.decision.decision).join(", ")}`);
}
console.log(`\nLeaving the source alone is an output, not a failure to produce one.`);

rule("4. Checking before showing: the tidy-and-wrong table");
const lossy = renderTable(RECORD).split("\n").map((l) => (l.includes("H3 stale") ? "| H3 stale replica promoted | none cited |  | uncertain |" : l)).join("\n");
console.log("The table the reader would have seen:\n" + lossy.split("\n").filter((l) => l.includes("H3") || l.startsWith("| hyp")).join("\n"));
console.log("\nThe row has lost the condition it depends on and the data gap, and a reader would not know it was ever conditional.");
const validation = validateGate("approve_fix", "table", RECORD, source, AT);
const profile = checkRendering("approve_fix", "table", RECORD, source, lossy, AT, validation);
for (const o of profile.obligations.filter((x) => x.outcome !== "SURVIVED")) console.log(`  ${o.outcome}: ${o.statement}`);
console.log(`attempt 1 of 2 → ${gateDecision(profile, 1, 2).decision}`);
console.log(`attempt 2 of 2, still lossy → ${gateDecision(profile, 2, 2).decision}: the source ships, not the table`);

rule("5. Why the check looks at each view, not the two together");
const naive = declare({ at: AT, obligations: [mustSay("h3-condition", "qualifier", "H3 keeps its condition", "replication lag", "unknown")] });
const combined = `${renderDiagram(RECORD)}\n\n${lossy}`;
console.log(`check over diagram + table together: ${assess(naive, { id: "t", source: SOURCE, output: combined, output_at: AT }).obligations[0]!.outcome}   ← the diagram still carries the condition`);
console.log(`check over the table alone, tied to its row: ${profile.obligations.find((o) => o.id === "row-condition-q1")!.outcome}`);
console.log(`\nThe first version of this gate used the combined check. It refused to validate itself: dropping a hypothesis`);
console.log(`from one view left the other satisfying the obligation, and the instrument probe said NOT NOTICED.`);
console.log(`A second tightening came from shredding each view into a bag of its own words. The diagram's hypotheses were checked by label alone,`);
console.log(`and the preview's "disputed" by a single word; both survived shredding. They are now bound to structure (the bracketed node, the`);
console.log(`"Disputed: ... holds ... holds" shape), and the probe passes.`);
console.log(`\nA reviewer then found four more holes, now closed: the row check did not require the condition's actual words, so "over ten seconds"`);
console.log(`passed; nothing required each hypothesis to keep its evidence or each arrow its direction; an earlier acceptance could override a later`);
console.log(`fallback (a view is now closed once accepted or handed back, and only the reader reopens it); and the record was never validated before`);
console.log(`delivery. Each is now a test, and the instrument is probed by altering a value, removing evidence and reversing an arrow.`);

rule("6. Beside the page, labelled, pulled by the reader");
const m = buildMargin(source, RECORD, [EARLIER], THIS_SCOPE, "H2");
console.log(renderSidecar([...m.derived, ...m.retrieved]));
for (const r of m.relations) console.log(`\nrelation claimed: ${shownAs(r)}   [${r.route}]`);
console.log(`\nThe earlier incident is on a different cluster; no shared scope is declared, so it is shown as possible and unconfirmed.`);

rule("7. In a Pi session: the model writes, the gate decides what the reader sees");
const ui = new UiRecorder();
const h = await makeSession({ ui, extensions: [browser({ source, record: RECORD, corpus: [EARLIER], thisScope: THIS_SCOPE, about: "H2", audienceServices: ["ledger"], components: COMPONENTS, now: () => AT })] });
const call = (name: string, args: Parameters<typeof fauxToolCall>[1]) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" });
h.faux.setResponses([
	call("submit_rendering", { task: "approve_fix", view: "table", text: lossy }),
	call("submit_rendering", { task: "approve_fix", view: "table", text: renderTable(RECORD) }),
	call("submit_rendering", { task: "approve_fix", view: "diagram", text: renderDiagram(RECORD) }),
	fauxAssistantMessage([fauxText("done")]),
]);
await h.session.prompt("Prepare the fix-approval view.");
const verdicts = h.session.messages.filter((m) => m.role === "toolResult").map((x: any) => (x.content[0].text as string).split("\n")[0]);
verdicts.forEach((v, i) => console.log(`submission ${i + 1} → ${v}`));
console.log(`notifications while the model worked: ${ui.notifications.length}`);
await h.session.prompt("/browser gate");
console.log("\n/browser gate:\n" + ui.notifications.at(-1)!.message);
h.dispose();

rule("What this does not show");
console.log("- Nothing here compares the browser with the plain page. The stages cost time; no benefit is claimed.");
console.log("- The record was written by hand. Whether a model can build one that survives the traceability check is untested.");
console.log("- The gate catches the losses its obligations name, and its check is probed with shredding (a bag of the line's own words) as well as");
console.log("  dropping. It does not catch a producer that copies the right phrases in order around something else, or a shift in emphasis.");
console.log("- 'preference ≠ benefit' is a boundary in the chapter and nothing in this code measures either.");
