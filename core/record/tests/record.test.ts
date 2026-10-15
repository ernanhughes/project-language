import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as retry from "../fixtures/retry-policy.ts";
import * as breakers from "../fixtures/breakers.ts";
import {
	agreement,
	evidenceStatus,
	locate,
	renderRecordDiagram,
	renderRecordTable,
	renderRecordTimeline,
	validateRecord,
	type DocumentRecord,
} from "../src/index.ts";
import { assess, declare, mustNotSay, mustSay } from "../../preservation/src/index.ts";

const rSource = { id: retry.SOURCE_ID, text: retry.SOURCE };
const bSource = { id: breakers.SOURCE_ID, text: breakers.SOURCE };
const AT = "2026-10-15T10:00:00.000Z";
const survives = (d: ReturnType<typeof declare>, source: string, output: string) =>
	Object.fromEntries(assess(d, { id: "t", source, output, output_at: AT }).obligations.map((o) => [o.id, o.outcome]));

describe("a record is a traceable reading of a source", () => {
	it("both fixtures cite the source verbatim for every entry", () => {
		assert.deepEqual(validateRecord(rSource, retry.RECORD), []);
		assert.deepEqual(validateRecord(bSource, breakers.RECORD), []);
	});

	it("catches an entry whose passage the source does not contain, a relation to nothing, and a qualifier on nothing", () => {
		const bad: DocumentRecord = {
			...retry.RECORD,
			claims: [...retry.RECORD.claims, { id: "ghost", kind: "fact", label: "ghost", passage: "This sentence is not in the policy.", standing: "stated" }],
			relations: [...retry.RECORD.relations, { id: "x9", from: "limit", to: "nowhere", type: "SUPPORTS", passage: "A failed payment is retried up to three times" }],
			qualifiers: [{ id: "q9", applies_to: "nowhere", condition: "c", effect: "e", status: "holds", passage: "A failed payment is retried up to three times" }],
		};
		const problems = validateRecord(rSource, bad);
		assert.ok(problems.some((p) => p.problem === "PASSAGE_NOT_IN_SOURCE" && p.id === "ghost"));
		assert.ok(problems.some((p) => p.problem === "UNKNOWN_CLAIM" && p.id === "x9"));
		assert.ok(problems.some((p) => p.problem === "UNKNOWN_CLAIM" && p.id === "q9"));
	});

	it("any element can be walked back to the exact words and place in the source", () => {
		const where = locate(retry.RECORD, rSource, "partition")!;
		assert.equal(retry.SOURCE.slice(where.start, where.end), where.passage);
		assert.match(where.passage, /network partition/);
		const q = locate(breakers.RECORD, bSource, "qa")!;
		assert.equal(breakers.SOURCE.slice(q.start, q.end), "only when sleep is adequate");
		assert.equal(locate(retry.RECORD, rSource, "no-such-id"), undefined);
	});

	it("the two fixtures carry only schema fields (the enforcement is the next test)", () => {
		const allowed = new Set(["id", "kind", "label", "cues", "passage", "standing", "holder", "order", "from", "to", "type", "rejects", "applies_to", "condition", "effect", "status", "gap"]);
		for (const entry of [...retry.RECORD.claims, ...retry.RECORD.relations, ...retry.RECORD.qualifiers, ...breakers.RECORD.claims, ...breakers.RECORD.relations, ...breakers.RECORD.qualifiers]) {
			for (const key of Object.keys(entry)) assert.ok(allowed.has(key), `unexpected field ${key}`);
		}
		for (const forbidden of ["view", "audience", "reader", "format", "layout", "novelty", "relevance"]) assert.ok(!allowed.has(forbidden));
	});
});

describe("review findings: validation that was missing", () => {
	const base = retry.RECORD;
	const withClaim = (extra: Record<string, unknown>) => ({ ...base, claims: [...base.claims, { id: "z", kind: "fact", label: "z", passage: "The policy follows ADR-17", standing: "stated", ...extra }] }) as unknown as DocumentRecord;

	it("an empty passage is refused: every string contains the empty string", () => {
		const problems = validateRecord(rSource, withClaim({ passage: "" }));
		assert.ok(problems.some((p) => p.problem === "EMPTY_PASSAGE" && p.id === "z"));
		assert.ok(validateRecord(rSource, withClaim({ passage: "   " })).some((p) => p.problem === "EMPTY_PASSAGE"));
	});

	it("a record for a different source is refused", () => {
		const problems = validateRecord({ id: "some-other-document", text: retry.SOURCE }, retry.RECORD);
		assert.ok(problems.some((p) => p.problem === "SOURCE_MISMATCH"));
	});

	it("a reader or rendering field cannot ride along on any record: the schema is enforced, not assumed", () => {
		for (const field of ["audience", "view", "reader", "novelty", "layout"]) {
			const problems = validateRecord(rSource, withClaim({ [field]: "x" }));
			assert.ok(problems.some((p) => p.problem === "UNKNOWN_FIELD" && p.id === "z." + field), field);
		}
	});

	it("a qualifier's condition has to appear in the passage it cites: a condition cannot be invented", () => {
		const bad: DocumentRecord = { ...breakers.RECORD, qualifiers: [{ ...breakers.RECORD.qualifiers[0]!, condition: "the customer is an adult" }] };
		assert.ok(validateRecord(bSource, bad).some((p) => p.problem === "CONDITION_NOT_IN_PASSAGE"));
		assert.deepEqual(validateRecord(bSource, breakers.RECORD), []);
	});
});

describe("review findings: qualifiers and ids in the renderings", () => {
	// The reviewer's reproduction: a qualifier on a claim that is also the end of a relation.
	const withAdults: DocumentRecord = {
		...breakers.RECORD,
		qualifiers: [...breakers.RECORD.qualifiers, { id: "qadult", applies_to: "caffeine", condition: "only when sleep is adequate", effect: "applies", status: "holds", passage: "only when sleep is adequate" }],
	};

	it("a condition attached to a claim that is a relation endpoint now appears in the diagram", () => {
		assert.match(renderRecordDiagram(withAdults), /\[caffeine\] only if: .*only when sleep is adequate.*\(qadult\)/);
	});

	it("conditions on ordered claims and on exceptions appear in the timeline", () => {
		const rec: DocumentRecord = {
			...retry.RECORD,
			qualifiers: [
				{ id: "q-r3", applies_to: "r3", condition: "after 1 minute", effect: "timing", status: "holds", passage: "after 1 minute, 5 minutes and 30 minutes" },
				{ id: "q-x1", applies_to: "x1", condition: "network partition", effect: "applies when", status: "holds", passage: "If the failure is a network partition, the payment is not retried" },
			],
		};
		assert.deepEqual(validateRecord(rSource, rec), []);
		const t = renderRecordTimeline(rec);
		assert.match(t, /3\. retry 3 after 30 minutes {3}\(r3\)\n {6}only if: .*after 1 minute.*\(q-r3\)/);
		assert.match(t, /exception: partition exception applies to up to three retries {3}\(x1\)\n {6}only if: .*network partition.*\(q-x1\)/);
	});

	it("every row of the table names its record entry, so a reader can ask for it", () => {
		const table = renderRecordTable(retry.RECORD);
		for (const entry of [...retry.RECORD.claims, ...retry.RECORD.relations]) assert.match(table, new RegExp("\\| " + entry.id + " \\|"), entry.id);
	});

	it("every line of the diagram, the timeline and every table row names a record id", () => {
		for (const text of [renderRecordDiagram(retry.RECORD), renderRecordTimeline(retry.RECORD)]) {
			for (const line of text.split("\n").filter((l) => l.trim() && l.trim() !== "graph")) assert.match(line, /\([a-z0-9-]+\)/, line);
		}
		const rows = renderRecordTable(retry.RECORD).split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| id") && !l.startsWith("|---"));
		for (const row of rows) assert.ok(retry.RECORD.claims.concat(retry.RECORD.relations as never[]).some((e) => row.startsWith("| " + (e as { id: string }).id + " |")), row);
	});
});

describe("source ≠ record ≠ rendering; record ≠ source of truth", () => {
	it("a link the source asserts with no evidence is stored as asserted, with its evidential status, not corrected", () => {
		const backlog = retry.RECORD.claims.find((c) => c.id === "backlog")!;
		assert.equal(backlog.standing, "stated");
		assert.equal(evidenceStatus(retry.RECORD, "backlog"), "none_cited");
		const row = renderRecordTable(retry.RECORD).split("\n").find((l) => l.includes("retries cause queue backlogs"))!;
		assert.match(row, /none cited/);
		assert.ok(!/false|incorrect|wrong/i.test(row), "the record models what was said; it does not rule on it");
	});

	it("the record is not the source: the source can be re-read and the record rebuilt", () => {
		const copy = structuredClone(retry.RECORD);
		copy.claims[0]!.label = "a different label";
		assert.deepEqual(validateRecord(rSource, copy), [], "a different reading still cites the same words");
		assert.notDeepEqual(copy, retry.RECORD);
	});
});

describe("one interpretation, reused: renderings drawn from the record agree", () => {
	const exceptions = ["partition", "idempotent", "final"];
	const fromRecord = [
		{ name: "diagram", text: renderRecordDiagram(retry.RECORD) },
		{ name: "table", text: renderRecordTable(retry.RECORD) },
		{ name: "timeline", text: renderRecordTimeline(retry.RECORD) },
	];

	it("diagram, table and timeline all carry every exception", () => {
		const a = agreement(retry.RECORD, fromRecord, exceptions);
		assert.equal(a.agree, true, JSON.stringify(a.disagreements));
		for (const p of a.per_rendering) assert.deepEqual(p.carried.sort(), [...exceptions].sort(), p.name);
	});

	it("every line of every record-drawn rendering names a record id, so it can be traced", () => {
		for (const r of fromRecord.filter((x) => x.name !== "table")) {
			const lines = r.text.split("\n").filter((l) => l.trim() && l.trim() !== "graph" && !l.trim().startsWith("only if"));
			for (const line of lines) assert.match(line, /\([a-z0-9]+\)/, `${r.name}: ${line}`);
		}
	});

	it("the same three renderings made independently disagree about the exceptions (constructed to show the drift the chapter describes)", () => {
		const a = agreement(retry.RECORD, retry.DIRECT, exceptions);
		assert.equal(a.agree, false);
		assert.deepEqual(a.disagreements.sort(), [...exceptions].sort());
		const friday = a.per_rendering.find((p) => p.name.startsWith("Friday"))!;
		assert.ok(friday.missing.includes("partition"), "the table left out the exception row");
	});

	it("this checks that a phrase is present. It does not know whether the rendering means the same thing", () => {
		const claimsText = "partition idempotent final";
		assert.equal(agreement(retry.RECORD, [{ name: "list of words", text: claimsText }], exceptions).per_rendering[0]!.carried.length, 3);
	});
});

describe("the sources that break the careless", () => {
	const d = declare({
		at: AT,
		obligations: [
			mustSay("condition", "qualifier", "caffeine causes recall, and only if sleep is adequate", "caffeine\\] --causes--> \\[recall\\][^\\n]*\\n\\s*only if:[^\\n]*sleep is adequate"),
			mustSay("rejection", "claim", "screen time is only associated with poor sleep, and the source rejects causation", "screen time\\] --associated with \\(the source rejects causation\\)--> \\[poor sleep\\]"),
			mustNotSay("no-upgrade", "claim", "association is not drawn as a cause", "screen time\\] --causes"),
			mustSay("exception", "qualifier", "X outperformed Y, except in subgroup Z", "method x outperforms method y \\|[^\\n]*subgroup z"),
		],
	});
	const diagram = renderRecordDiagram(breakers.RECORD);
	const table = renderRecordTable(breakers.RECORD);

	it("drawn from the record, the condition, the rejection and the exception all survive", () => {
		assert.deepEqual(survives(d, breakers.SOURCE, diagram), { condition: "SURVIVED", rejection: "SURVIVED", "no-upgrade": "SURVIVED", exception: "LOST" }, "the exception lives in the table, not the diagram");
		assert.equal(survives(d, breakers.SOURCE, table).exception, "SURVIVED");
	});

	it("a careless pipeline is convicted however polished it looks: arrow without its condition, an association upgraded to a cause, a ranking without its footnote", () => {
		const out = survives(d, breakers.SOURCE, breakers.CARELESS.diagram);
		assert.equal(out.condition, "LOST");
		assert.equal(out.rejection, "LOST");
		assert.equal(out["no-upgrade"], "LOST", "the system has asserted what the source denied");
		assert.equal(survives(d, breakers.SOURCE, breakers.CARELESS.table).exception, "LOST");
	});

	it("the record carries relation, direction, qualification, exception and rejection as separate attached structure", () => {
		const ra = breakers.RECORD.relations.find((r) => r.id === "ra")!;
		assert.equal(ra.type, "CAUSES");
		assert.equal(breakers.RECORD.qualifiers.find((q) => q.applies_to === "ra")!.condition, "sleep is adequate");
		assert.equal(breakers.RECORD.relations.find((r) => r.id === "rd")!.rejects, "causation");
		assert.equal(breakers.RECORD.qualifiers.find((q) => q.applies_to === "rx")!.condition, "subgroup Z");
	});
});
