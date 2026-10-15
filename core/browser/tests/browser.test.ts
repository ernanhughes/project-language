import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COMPONENTS, EARLIER, RECORD, SOURCE, SOURCE_ID, THIS_SCOPE } from "../fixtures/incident.ts";
import {
	browse,
	buildMargin,
	checkRendering,
	choose,
	declarationFor,
	gateDecision,
	gateHealth,
	renderDiagram,
	renderHighlight,
	renderTable,
	renderView,
	validateGate,
	validateRecord,
	viewState,
	type DocumentRecord,
	type Task,
} from "../src/index.ts";
import { assess, declare, mustSay } from "../../preservation/src/index.ts";
import { renderSidecar } from "../../sidecar/src/index.ts";
import { shownAs } from "../../relations/src/index.ts";
import { ITEM_KINDS } from "../../language/src/index.ts";

const source = { id: SOURCE_ID, text: SOURCE };
const AT = "2026-10-15T10:00:00.000Z";
const opts = { audienceServices: ["ledger"], components: COMPONENTS, query: "failover completed" };

describe("the record is traceable", () => {
	it("every entry of the fixture cites a passage of the source verbatim", () => {
		assert.deepEqual(validateRecord(source, RECORD), []);
	});

	it("catches an entry that cites a passage the source does not contain, a relation to nothing, and a duplicate id", () => {
		const bad: DocumentRecord = {
			...RECORD,
			claims: [...RECORD.claims, { ...RECORD.claims[0]!, passage: "this sentence is not in the report" }],
			relations: [...RECORD.relations, { id: "r9", from: "H1", to: "nope", type: "SUPPORTS", passage: "The volume graph supports H1" }],
		};
		const problems = validateRecord(source, bad).map((p) => p.problem);
		assert.ok(problems.includes("PASSAGE_NOT_IN_SOURCE"));
		assert.ok(problems.includes("UNKNOWN_CLAIM"));
		assert.ok(problems.includes("DUPLICATE_ID"));
	});

	it("a disputed conclusion must say who holds it", () => {
		const bad: DocumentRecord = { ...RECORD, claims: RECORD.claims.map((c) => (c.id === "ana" ? { ...c, holder: undefined } : c)) as DocumentRecord["claims"] };
		assert.ok(validateRecord(source, bad).some((p) => p.problem === "DISPUTE_WITHOUT_HOLDER"));
	});

	it("finding: the Chapter 7 record cannot hold a document's claims", () => {
		// core/language is conversation state: objective, decision, constraint, definition, ambiguity.
		for (const kind of ["hypothesis", "evidence", "claim", "relation", "qualifier"]) assert.ok(!(ITEM_KINDS as readonly string[]).includes(kind), kind);
	});
});

describe("same source, same record, different task, different representation", () => {
	it("the four readers get four different choices, and two of them leave the source alone", () => {
		const choices = (["decide_to_open", "approve_fix", "follow_procedure", "look_up_fact"] as Task[]).map((t) => choose(t));
		assert.deepEqual(choices.map((c) => c.representations.join("+")), ["preview", "diagram+table", "annotated_source", "source_highlight"]);
		assert.deepEqual(choices.map((c) => c.transforms_source), [true, true, false, false]);
	});

	it("looking up a fact returns the source itself, byte for byte, with the passage located", () => {
		const r = renderHighlight(source, "failover completed");
		assert.equal(r.text, SOURCE);
		assert.deepEqual(SOURCE.slice(r.found!.start, r.found!.end), "failover completed");
		assert.equal(renderView("look_up_fact", "source_highlight", RECORD, source, opts).is_source, true);
	});

	it("following the procedure shows the source unchanged, then annotations", () => {
		const text = renderView("follow_procedure", "annotated_source", RECORD, source).text;
		assert.ok(text.startsWith(SOURCE));
		assert.match(text, /annotations \(the text above is the source, unchanged\)/);
	});

	it("every arrow in the diagram can be traced to a record entry, and the third hypothesis carries its condition and its gap", () => {
		const d = renderDiagram(RECORD);
		for (const r of RECORD.relations) assert.ok(d.includes(`(${r.id})`), r.id);
		assert.match(d, /\[H3 stale replica promoted\]\s+H3 is ruled out only if this holds: replication lag was under one second -- UNKNOWN, the lag data has a gap from 09:00 to 09:06/);
		assert.match(d, /DISPUTED: Ana: H2 is the root cause \| Ben: H1 is the root cause/);
	});
});

describe("checking before showing", () => {
	it("the faithful views pass, and each shows what it was built from", () => {
		const b = browse("approve_fix", RECORD, source, AT);
		assert.deepEqual(b.views.map((v) => v.decision.decision), ["SHOW", "SHOW"]);
		assert.ok(b.views.every((v) => v.validation?.status === "validated"));
	});

	it("the tidy-and-wrong table: the third row loses its condition, the check sees it, and the table is repaired or the source ships", () => {
		const lossy = renderTable(RECORD).split("\n").map((l) => (l.includes("H3 stale") ? "| H3 stale replica promoted | none cited |  | uncertain |" : l)).join("\n");
		const validation = validateGate("approve_fix", "table", RECORD, source, AT);
		const profile = checkRendering("approve_fix", "table", RECORD, source, lossy, AT, validation);
		assert.deepEqual(profile.obligations.filter((o) => o.outcome === "LOST").map((o) => o.id), ["row-condition-q1"]);
		assert.equal(gateDecision(profile, 1, 2).decision, "REPAIR");
		const out = gateDecision(profile, 2, 2);
		assert.equal(out.decision, "FALL_BACK_TO_SOURCE");
		assert.match(out.why, /still losing row-condition-q1 after 2 attempt/);
	});

	it("a check over the diagram and table TOGETHER would not have seen it: the diagram still carries the condition", () => {
		const lossyTable = renderTable(RECORD).replace(/\| H3 stale replica promoted \|[^\n]*/, "| H3 stale replica promoted | none cited |  | uncertain |");
		const combined = `${renderDiagram(RECORD)}\n\n${lossyTable}`;
		const naive = declare({ at: AT, obligations: [mustSay("h3-condition", "qualifier", "H3 keeps its condition", "replication lag", "unknown")] });
		assert.equal(assess(naive, { id: "t", source: SOURCE, output: combined, output_at: AT }).obligations[0]!.outcome, "SURVIVED", "tidy and wrong, and passing");
		const perView = declarationFor("approve_fix", "table", RECORD, AT);
		assert.equal(assess(perView, { id: "t", source: SOURCE, output: lossyTable, output_at: AT }).obligations.find((o) => o.id === "row-condition-q1")!.outcome, "LOST");
	});

	it("an instrument that has not been shown to notice a loss cannot authorise even a faithful view", () => {
		const profile = checkRendering("approve_fix", "table", RECORD, source, renderTable(RECORD), AT, "unvalidated");
		assert.ok(profile.obligations.every((o) => o.outcome === "SURVIVED"));
		const d = gateDecision(profile, 1, 2);
		assert.equal(d.decision, "FALL_BACK_TO_SOURCE");
		assert.match(d.why, /has not been shown to notice a loss/);
	});

	it("the gate for each transforming view is validated by breaking a faithful rendering, including the row-level mutation", () => {
		for (const [task, view] of [["approve_fix", "diagram"], ["approve_fix", "table"], ["decide_to_open", "preview"]] as const) {
			const v = validateGate(task, view, RECORD, source, AT, opts);
			assert.equal(v.status, "validated", view);
		}
		const table = validateGate("approve_fix", "table", RECORD, source, AT);
		const row = table.probes.find((p) => p.obligation === "row-condition-q1")!;
		assert.ok(row.results.some((r) => r.mutation === "keep the row, remove its condition" && r.applied && r.detected));
	});

	it("an unchanged-source task skips the check, and says so", () => {
		const b = browse("look_up_fact", RECORD, source, AT, opts);
		assert.ok(b.trace.some((t) => /skipped: nothing was transformed/.test(t.note)));
		assert.equal(b.views[0]!.shown.text, SOURCE);
	});
});

describe("the false skip", () => {
	it("if her service is named in the source, the preview says it affects her", () => {
		const b = browse("decide_to_open", RECORD, source, AT, { ...opts, audienceServices: ["ledger"] });
		assert.match(b.views[0]!.shown.text, /Affects your service: ledger\./);
	});

	it("a preview that names the service in a list but drops the line that says it affects her is refused", () => {
		const honest = renderView("decide_to_open", "preview", RECORD, source, opts).text;
		const dropped = honest.split("\n").filter((l) => !l.startsWith("Affects your service")).join("\n");
		const validation = validateGate("decide_to_open", "preview", RECORD, source, AT, opts);
		const p = checkRendering("decide_to_open", "preview", RECORD, source, dropped, AT, validation, opts);
		assert.ok(p.obligations.some((o) => o.id === "names-ledger" && o.outcome === "LOST"), "'ledger' is still in the components line, and the check is not fooled");
	});

	it("for a reader whose service is not named, no such obligation is declared", () => {
		const d = declarationFor("decide_to_open", "preview", RECORD, AT, { ...opts, audienceServices: ["billing"], source });
		assert.ok(!d.obligations.some((o) => o.id.startsWith("names-")));
	});
});

describe("a gate that never refuses is worth distrusting", () => {
	it("says so after enough submissions with no refusal, and reports the refusal rate otherwise", () => {
		assert.match(gateHealth(Array(5).fill({ decision: "SHOW" })).note, /never refused in 5 submission\(s\).*decorative/);
		assert.equal(gateHealth([{ decision: "SHOW" }, { decision: "REPAIR" }]).note, "refused 1 of 2");
		assert.equal(gateHealth([]).note, "no submissions yet");
	});
});

describe("beside the page", () => {
	const margin = buildMargin(source, RECORD, [EARLIER], THIS_SCOPE, "H2");

	it("derived items are re-presentations of the source, anchored by quotation", () => {
		assert.equal(margin.derived.length, 1);
		assert.equal(margin.derived[0]!.layer, "SEMANTIC_DERIVATION");
		assert.ok(SOURCE.includes(margin.derived[0]!.anchor!.quote));
	});

	it("a retrieved item arrives from another document as an unverified candidate, never as the report's own text", () => {
		assert.equal(margin.retrieved[0]!.layer, "EXTERNAL_EVIDENCE");
		assert.equal(margin.retrieved[0]!.origin.external!.id, EARLIER.id);
		assert.ok(!SOURCE.includes(margin.retrieved[0]!.content));
	});

	it("the relation it claims is a proposal, flagged because the two incidents do not share a declared scope", () => {
		const r = margin.relations[0]!;
		assert.equal(r.standing, "proposal");
		assert.deepEqual(r.caveats, ["SCOPE_UNCONFIRMED"]);
		assert.match(shownAs(r), /^possible .*, unconfirmed: scope not declared as shared/);
	});

	it("the labelled view marks each item with where it came from", () => {
		const view = renderSidecar([...margin.derived, ...margin.retrieved]);
		assert.match(view, /\[DERIVED FROM THE SOURCE/);
		assert.match(view, /\[FROM ELSEWHERE · candidate, not verified\]/);
	});
});

describe("the cost is visible", () => {
	it("the pipeline lists its stages. This counts stages; it measures no cost and no plain-page baseline", () => {
		const b = browse("approve_fix", RECORD, source, AT);
		assert.ok(b.trace.length >= 7, "record, choose, and for each view: render, validate, check");
		assert.ok(b.trace.some((t) => t.stage.startsWith("validate the check")));
	});
});

describe("review findings: the gate checks the condition it claims to preserve, and the evidence", () => {
	const validation = () => validateGate("approve_fix", "table", RECORD, source, AT);
	const faithfulTable = renderTable(RECORD);
	const check = (text: string, view: "table" | "diagram" = "table") =>
		checkRendering("approve_fix", view, RECORD, source, text, AT, view === "table" ? validation() : validateGate("approve_fix", "diagram", RECORD, source, AT));
	const lost = (p: ReturnType<typeof check>) => p.obligations.filter((o) => o.outcome === "LOST").map((o) => o.id);

	it("the reviewer's reproduction: the threshold and the gap are altered, the cue words stay, and the row is now refused", () => {
		const altered = faithfulTable.replace("replication lag was under one second", "replication lag was over ten seconds").replace("09:00 to 09:06", "12:00 to 15:00");
		assert.notEqual(altered, faithfulTable);
		assert.ok(lost(check(altered)).includes("row-condition-q1"));
		assert.equal(check(altered).instrument, "validated", "and the check that refuses it is still one that was shown to notice a loss");
	});

	it("the instrument was probed by altering a condition's value, and noticed", () => {
		const row = validation().probes.find((p) => p.obligation === "row-condition-q1")!;
		for (const m of ["keep the row, remove its condition", "alter the condition, keeping its words", "alter the gap interval"]) {
			const r = row.results.find((x) => x.mutation === m)!;
			assert.ok(r.applied && r.detected, m);
		}
	});

	it("removing the evidence from the table is refused: the source cited it, the manager needs it", () => {
		const bare = faithfulTable.replace("volume graph (supports)", "none cited").replace("migration lock logs (supports)", "none cited").replace("partition report (contradicts)", "none cited");
		assert.deepEqual(lost(check(bare)).sort(), ["row-evidence-r1", "row-evidence-r2", "row-evidence-r3"]);
	});

	it("reversing an arrow in the diagram is refused", () => {
		const diagram = renderDiagram(RECORD);
		const reversed = diagram.replace("[volume graph] --supports--> [H1 disk full]", "[H1 disk full] --supports--> [volume graph]");
		assert.ok(lost(check(reversed, "diagram")).includes("diagram-rel-r2"));
		assert.deepEqual(lost(check(diagram, "diagram")), []);
	});

	it("both views still validate with the stronger obligations", () => {
		assert.equal(validateGate("approve_fix", "table", RECORD, source, AT).status, "validated");
		assert.equal(validateGate("approve_fix", "diagram", RECORD, source, AT).status, "validated");
	});
});

describe("review findings: the lifecycle of a view", () => {
	const sub = (decision: "SHOW" | "REPAIR" | "FALL_BACK_TO_SOURCE", task: Task = "approve_fix", view: "table" | "diagram" = "table") => ({ type: "submission" as const, task, view, decision });
	const reset = (task: Task = "approve_fix") => ({ type: "reset" as const, task });

	it("an accepted view stays accepted: a later rejected attempt does not unseat it (the reviewer's sequence)", () => {
		const st = viewState([sub("SHOW"), sub("FALL_BACK_TO_SOURCE")], "approve_fix", "table");
		assert.equal(st.state, "accepted");
		assert.equal(st.attempts, 1, "the later submission was not taken");
	});

	it("a view handed back to the source stays handed back: a later acceptance does not undo it", () => {
		assert.equal(viewState([sub("REPAIR"), sub("FALL_BACK_TO_SOURCE"), sub("SHOW")], "approve_fix", "table").state, "handed_back");
	});

	it("while the gate is still asking for repairs the view is open, and counts its attempts", () => {
		const st = viewState([sub("REPAIR")], "approve_fix", "table");
		assert.deepEqual({ state: st.state, attempts: st.attempts }, { state: "open", attempts: 1 });
	});

	it("only the reader reopens a task, and only that task", () => {
		const events = [sub("SHOW"), sub("REPAIR", "decide_to_open", "diagram" as never)];
		assert.equal(viewState([...events, reset()], "approve_fix", "table").state, "open");
		assert.equal(viewState([...events, reset("look_up_fact")], "approve_fix", "table").state, "accepted");
	});

	it("views are independent of each other", () => {
		const events = [sub("SHOW", "approve_fix", "table")];
		assert.equal(viewState(events, "approve_fix", "diagram").state, "open");
	});
});

describe("review findings: a record that does not trace to its source is not delivered, and neither are invented annotations", () => {
	const broken: DocumentRecord = { ...RECORD, claims: RECORD.claims.map((c) => (c.id === "H1" ? { ...c, passage: "" } : c)) };

	it("every view falls back to the source when the record fails validation", () => {
		const b = browse("approve_fix", broken, source, AT);
		assert.deepEqual(b.views.map((v) => v.decision.decision), ["FALL_BACK_TO_SOURCE", "FALL_BACK_TO_SOURCE"]);
		assert.match(b.views[0]!.decision.why, /the record does not trace to the source \(EMPTY_PASSAGE:H1\)/);
		assert.ok(b.views.every((v) => v.shown.text === SOURCE && v.shown.is_source));
		assert.ok(b.trace.some((t) => t.stage === "validate the record" && /FAILS/.test(t.note)));
	});

	it("the reviewer's reproduction: an invented qualifier cannot ride in as an annotation, because its condition is not in its passage", () => {
		const invented: DocumentRecord = {
			...RECORD,
			qualifiers: [...RECORD.qualifiers, { id: "q-invented", applies_to: "H1", condition: "restart the primary before approving", effect: "instruction", status: "holds", passage: "H1 disk full on the primary: the volume was at 98 percent at 08:50" }],
		};
		const b = browse("follow_procedure", invented, source, AT);
		assert.equal(b.views[0]!.decision.decision, "FALL_BACK_TO_SOURCE");
		assert.equal(b.views[0]!.shown.text, SOURCE, "the source alone; no annotation block");
		assert.ok(!b.views[0]!.shown.text.includes("restart the primary"));
	});

	it("a valid record's annotations carry only the condition and gap that lie inside the cited passage", () => {
		const b = browse("follow_procedure", RECORD, source, AT);
		const text = b.views[0]!.shown.text;
		assert.match(text, /=> condition: replication lag was under one second \(unknown: the lag data has a gap from 09:00 to 09:06\)/);
		assert.ok(!text.includes("is ruled out only if this holds"), "the system's gloss is left out");
	});

	it("looking up a fact needs no record and says where the passage is", () => {
		const b = browse("look_up_fact", broken, source, AT, { query: "failover completed" });
		assert.equal(b.views[0]!.decision.decision, "SHOW");
		const h = b.views[0]!.shown.highlight!;
		assert.equal(SOURCE.slice(h.start, h.end).toLowerCase(), "failover completed");
	});

	it("a query that is not in the source, or an empty one, is reported as not found rather than located at the start", () => {
		assert.equal(browse("look_up_fact", RECORD, source, AT, { query: "nothing like this" }).views[0]!.shown.highlight, null);
		assert.equal(browse("look_up_fact", RECORD, source, AT, { query: "" }).views[0]!.shown.highlight, null);
	});
});
