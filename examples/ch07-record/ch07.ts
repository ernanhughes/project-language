// Chapter 7: Meaning Becomes the Source.
//
// If a source can be rendered many ways, each rendering has to reinterpret it. What would it mean
// to keep one structured interpretation, and generate the renderings from that?
//
// Run:  npm run example:ch07
//
// No model is called. The record is written by hand and every entry is checked to cite the source.
// What is shown is the MECHANISM. The chapter's own prediction, that renderings made through a record
// agree more, contradict less and trace back further than renderings made directly, is an empirical
// bet this example cannot test. See "What this does not show" at the end.
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../../harness/session.ts";
import { documentRecord } from "../../host-pi/record.ts";
import * as retry from "../../core/record/fixtures/retry-policy.ts";
import * as breakers from "../../core/record/fixtures/breakers.ts";
import { agreement, evidenceStatus, locate, renderRecordDiagram, renderRecordTable, renderRecordTimeline, validateRecord } from "../../core/record/src/index.ts";
import { assess, declare, mustNotSay, mustSay } from "../../core/preservation/src/index.ts";

const rule = (title: string) => console.log(`\n── ${title} ${"─".repeat(Math.max(0, 66 - title.length))}`);
const AT = "2026-10-15T10:00:00.000Z";
const source = { id: retry.SOURCE_ID, text: retry.SOURCE };
const exceptions = ["partition", "idempotent", "final"];

rule("1. Direct generation: three renderings, three fresh readings of the same prose");
console.log(`source: "${retry.SOURCE.replace("Payments retry policy (constructed for illustration). ", "")}"\n`);
for (const r of retry.DIRECT) console.log(`${r.name}\n${r.text.split("\n").map((l) => "   " + l).join("\n")}\n`);
console.log("(These three are CONSTRUCTED to show the drift the chapter describes. They are not model output.)");
const direct = agreement(retry.RECORD, retry.DIRECT, exceptions);
for (const p of direct.per_rendering) console.log(`  ${p.name.padEnd(22)} carries ${p.carried.length} of ${exceptions.length} exceptions; missing: ${p.missing.join(", ") || "none"}`);
console.log(`\nEach is plausible alone. Together they describe three slightly different systems: ${direct.disagreements.length} of ${exceptions.length} exceptions are carried by some and not by others.`);

rule("2. One interpretation, kept: the semantic record");
console.log(`${retry.RECORD.claims.length} claims, ${retry.RECORD.relations.length} relations with direction, ${retry.RECORD.qualifiers.length} qualifiers; each cites the source verbatim.`);
console.log(`traceability problems: ${JSON.stringify(validateRecord(source, retry.RECORD))}`);
for (const r of retry.RECORD.relations) console.log(`  ${r.id}: ${retry.RECORD.claims.find((c) => c.id === r.from)!.label}  --${r.type}-->  ${retry.RECORD.claims.find((c) => c.id === r.to)!.label}`);

rule("3. Renderings drawn from the record");
const fromRecord = [
	{ name: "diagram", text: renderRecordDiagram(retry.RECORD) },
	{ name: "table", text: renderRecordTable(retry.RECORD) },
	{ name: "timeline", text: renderRecordTimeline(retry.RECORD) },
];
for (const r of fromRecord) console.log(`${r.name}\n${r.text.split("\n").map((l) => "   " + l).join("\n")}\n`);
const through = agreement(retry.RECORD, fromRecord, exceptions);
for (const p of through.per_rendering) console.log(`  ${p.name.padEnd(10)} carries ${p.carried.length} of ${exceptions.length} exceptions`);
console.log(`\nagree on the exceptions: ${through.agree}. That is by construction: the three are drawn from one reading.`);
console.log(`The check is that a phrase is present, not that the rendering means the same thing.`);

rule("4. Every element walks back to the words it came from");
for (const id of ["partition", "x3", "final"]) {
	const w = locate(retry.RECORD, source, id)!;
	console.log(`  ${id.padEnd(10)} chars ${String(w.start).padStart(3)}-${String(w.end).padEnd(3)} "${w.passage}"`);
}

rule("5. The record is not the source of truth");
const backlog = retry.RECORD.claims.find((c) => c.id === "backlog")!;
console.log(`source asserts: "${backlog.passage}."`);
console.log(`record keeps:   standing=${backlog.standing}, evidence=${evidenceStatus(retry.RECORD, "backlog")}`);
console.log(`The source cites nothing for the causal link. The record does not correct it or rule on it; it keeps what was said and what backs it.`);

rule("6. The sources that break the careless");
console.log(`"${breakers.SOURCE}"\n`);
const d = declare({
	at: AT,
	obligations: [
		mustSay("condition", "qualifier", "caffeine causes recall, and only if sleep is adequate", "caffeine\\] --causes--> \\[recall\\][^\\n]*\\n\\s*only if:[^\\n]*sleep is adequate"),
		mustSay("rejection", "claim", "screen time is only associated with poor sleep, source rejects causation", "screen time\\] --associated with \\(the source rejects causation\\)--> \\[poor sleep\\]"),
		mustNotSay("no-upgrade", "claim", "association is not drawn as a cause", "screen time\\] --causes"),
		mustSay("exception", "qualifier", "X outperformed Y, except in subgroup Z", "method x outperforms method y \\|[^\\n]*subgroup z"),
	],
});
// Each obligation is checked against the view it belongs to. Pooling the views would let one mask another.
const VIEW: Record<string, "diagram" | "table"> = { condition: "diagram", rejection: "diagram", "no-upgrade": "diagram", exception: "table" };
const run = (label: string, diagram: string, table: string) => {
	const o = (text: string) => assess(d, { id: label, source: breakers.SOURCE, output: text, output_at: AT }).obligations;
	const byView = { diagram: o(diagram), table: o(table) };
	return new Map(d.obligations.map((ob) => [ob.id, byView[VIEW[ob.id]!].find((x) => x.id === ob.id)!.outcome]));
};
const careless = run("careless", breakers.CARELESS.diagram, breakers.CARELESS.table);
const viaRecord = run("record", renderRecordDiagram(breakers.RECORD), renderRecordTable(breakers.RECORD));
console.log("careless pipeline:");
console.log(breakers.CARELESS.diagram.split("\n").map((l) => "   " + l).join("\n"));
console.log(breakers.CARELESS.table.split("\n").map((l) => "   " + l).join("\n"));
for (const [id, outcome] of careless) console.log(`   ${outcome.padEnd(9)} ${id}`);
console.log("\ndrawn from the record:");
console.log(renderRecordDiagram(breakers.RECORD).split("\n").map((l) => "   " + l).join("\n"));
for (const [id, outcome] of viaRecord) console.log(`   ${outcome.padEnd(9)} ${id}`);
console.log("\nThe careless pipeline is convicted however polished it looks: the arrow has lost its condition, an association has become a cause,");
console.log("and X beats Y with no footnote.");

rule("7. In a Pi session: the model asks the record; it cannot write to it");
const ui = new UiRecorder();
const h = await makeSession({ ui, extensions: [documentRecord({ source, record: retry.RECORD })] });
const call = (name: string, args: Parameters<typeof fauxToolCall>[1]) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" });
h.faux.setResponses([call("render_from_record", { view: "table" }), call("locate_in_source", { id: "partition" }), call("record_edit", { id: "limit", label: "unlimited retries" }), fauxAssistantMessage([fauxText("done")])]);
await h.session.prompt("Show me the retry policy as a table, and where the partition exception comes from.");
const results = h.session.messages.filter((m) => m.role === "toolResult").map((m: any) => m.content[0].text as string);
console.log(`locate_in_source → ${results[1]}`);
console.log(`record_edit      → ${results[2]!.split("\n")[0]}`);
await h.session.prompt("/record");
console.log("\n/record:\n" + ui.notifications.at(-1)!.message);
h.dispose();

rule("What this does not show");
console.log("- The chapter's bet: that renderings made through a record agree more, contradict less and trace back further than renderings");
console.log("  made directly. The 'direct' renderings above are constructed, and 'agreement' here is by construction. Untested.");
console.log("- Whether a model can build a record that passes the traceability check. This one is written by hand.");
console.log("- Whether the record's costs bite: a wrong record, omitted information, over-specified vague prose, false authority.");
console.log("- Anything about a reader. The record holds nothing about one, by design, so nothing here measures benefit.");
console.log("\nA separate example, examples/conversation-state, shows core/language, which keeps a CONVERSATION's state. It is a different record.");
