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
		const profile = checkRendering("approve_fix", "table", RECORD, source, lossy, AT, validation.status);
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
		const p = checkRendering("decide_to_open", "preview", RECORD, source, dropped, AT, validation.status, opts);
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
	it("the pipeline lists its stages; the plain page has none", () => {
		const b = browse("approve_fix", RECORD, source, AT);
		assert.ok(b.trace.length >= 7, "record, choose, and for each view: render, validate, check");
		assert.ok(b.trace.some((t) => t.stage.startsWith("validate the check")));
	});
});
