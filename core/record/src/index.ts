// The semantic record of a DOCUMENT: claims, relations, qualifiers, sequence, evidence, spans.
//
//   SOURCE  ≠  SEMANTIC RECORD  ≠  RENDERING
//   SEMANTIC RECORD  ≠  SOURCE OF TRUTH
//   SEMANTIC RECORD  ≠  COMPLETE MEANING
//
// This is the record Chapter 7 describes. It is NOT core/language, which keeps a conversation's
// communication state (objectives, decisions, constraints, definitions, ambiguities) and has no
// place for a hypothesis, a directed relation or a qualifier. Both are real; they are different
// things, and the book had been calling them one.
//
// What the record is:  a derived, fallible, logged interpretation of what the source SAYS,
//   each entry citing a passage of the source verbatim, so any element of any rendering can be
//   walked back through it to the words it came from.
// What it deliberately is not:  it holds no rendering decisions and nothing about the reader.
//   Who finds what relevant arrives later, as a question put to the record, not as a field in it.
//
// The record stores what the source claims, including the source's own mistakes. If the source
// asserts a link its evidence does not support, the record keeps the claim and its evidential
// status ("none cited"), not a quietly corrected fact.

export type ClaimKind = "fact" | "provenance" | "hypothesis" | "evidence" | "conclusion" | "proposal" | "rule" | "entity";
export interface Claim {
	id: string;
	kind: ClaimKind;
	/** A short, distinctive phrase for the claim. Renderings are matched against it. */
	label: string;
	/** Other phrases that also count as carrying the claim. Lower case. */
	cues?: string[];
	/** Verbatim text from the source. */
	passage: string;
	standing: "stated" | "disputed" | "uncertain";
	holder?: string;
	/** Where order carries content (a sequence of steps, a timeline). */
	order?: number;
}

export type RelationType = "SUPPORTS" | "CONTRADICTS" | "UPDATES" | "IMPLEMENTS" | "EXCEPTION_TO" | "CAUSES" | "ASSOCIATED_WITH" | "OUTPERFORMS";
export interface DocRelation {
	id: string;
	/** Direction is from → to. */
	from: string;
	to: string;
	type: RelationType;
	passage: string;
	/** The source explicitly rejects this reading of the relation (for example "causation"). */
	rejects?: string;
}

export interface Qualifier {
	id: string;
	/** A claim or a relation. */
	applies_to: string;
	condition: string;
	effect: string;
	status: "holds" | "unknown";
	gap?: string;
	passage: string;
}

export interface DocumentRecord {
	source_id: string;
	claims: Claim[];
	relations: DocRelation[];
	qualifiers: Qualifier[];
}

export interface Source {
	id: string;
	text: string;
}

export type RecordProblem =
	| "PASSAGE_NOT_IN_SOURCE"
	| "EMPTY_PASSAGE"
	| "SOURCE_MISMATCH"
	| "UNKNOWN_FIELD"
	| "UNKNOWN_CLAIM"
	| "DUPLICATE_ID"
	| "SELF_RELATION"
	| "CONDITION_NOT_IN_PASSAGE"
	| "GAP_WITHOUT_PASSAGE"
	| "DISPUTE_WITHOUT_HOLDER";

/**
 * The only fields an entry may carry. A record is a reading of a source; it holds nothing about renderings or readers,
 * and this list is what enforces that for any record, not just the fixtures.
 */
const ALLOWED_FIELDS = {
	claim: new Set(["id", "kind", "label", "cues", "passage", "standing", "holder", "order"]),
	relation: new Set(["id", "from", "to", "type", "passage", "rejects"]),
	qualifier: new Set(["id", "applies_to", "condition", "effect", "status", "gap", "passage"]),
} as const;

/**
 * The record is a reading of the source and a reading can be wrong. This checks that it is traceable and well formed:
 * it is for THIS source, every entry cites a non-empty passage the source contains, no entry carries a field outside the
 * schema (so no reader or rendering information can ride along), relations and qualifiers point at things that exist, and
 * a qualifier's condition (and gap) appear in the passage it cites, so a condition cannot be invented.
 * It does not check that a label means what its passage means.
 */
export function validateRecord(source: Source, record: DocumentRecord): { problem: RecordProblem; id: string }[] {
	const out: { problem: RecordProblem; id: string }[] = [];
	const ids = new Set<string>();
	const claimIds = new Set(record.claims.map((c) => c.id));
	const targetIds = new Set([...claimIds, ...record.relations.map((r) => r.id)]);
	const add = (problem: RecordProblem, id: string) => out.push({ problem, id });
	if (record.source_id !== source.id) add("SOURCE_MISMATCH", record.source_id);

	const kinds: [string, readonly { id: string; passage: string }[], ReadonlySet<string>][] = [
		["claim", record.claims, ALLOWED_FIELDS.claim],
		["relation", record.relations, ALLOWED_FIELDS.relation],
		["qualifier", record.qualifiers, ALLOWED_FIELDS.qualifier],
	];
	for (const [, entries, allowed] of kinds) {
		for (const entry of entries) {
			if (ids.has(entry.id)) add("DUPLICATE_ID", entry.id);
			ids.add(entry.id);
			if (typeof entry.passage !== "string" || entry.passage.trim() === "") add("EMPTY_PASSAGE", entry.id);
			else if (!source.text.includes(entry.passage)) add("PASSAGE_NOT_IN_SOURCE", entry.id);
			for (const key of Object.keys(entry)) if (!allowed.has(key)) add("UNKNOWN_FIELD", entry.id + "." + key);
		}
	}
	for (const r of record.relations) {
		if (!claimIds.has(r.from) || !claimIds.has(r.to)) add("UNKNOWN_CLAIM", r.id);
		if (r.from === r.to) add("SELF_RELATION", r.id);
	}
	for (const q of record.qualifiers) {
		if (!targetIds.has(q.applies_to)) add("UNKNOWN_CLAIM", q.id);
		const passage = q.passage.toLowerCase();
		if (!passage.includes(q.condition.toLowerCase())) add("CONDITION_NOT_IN_PASSAGE", q.id);
		if (q.status === "unknown" && (!q.gap || !passage.includes(q.gap.toLowerCase()))) add("GAP_WITHOUT_PASSAGE", q.id);
	}
	for (const c of record.claims) if (c.kind === "conclusion" && c.standing === "disputed" && !c.holder) add("DISPUTE_WITHOUT_HOLDER", c.id);
	return out;
}

// ─── Traceability: from any element, back to the words ─────────────────────

export interface Located {
	id: string;
	passage: string;
	start: number;
	end: number;
}

/** Walk an entry back to its place in the source. Undefined if the id is unknown or the passage is not there. */
export function locate(record: DocumentRecord, source: Source, id: string): Located | undefined {
	const entry = [...record.claims, ...record.relations, ...record.qualifiers].find((e) => e.id === id);
	if (!entry) return undefined;
	const start = source.text.indexOf(entry.passage);
	return start < 0 ? undefined : { id, passage: entry.passage, start, end: start + entry.passage.length };
}

/**
 * What the record can say about support, and no more. "none_cited" means the source cites nothing for
 * it, not that it is false; the record models what was said.
 */
export function evidenceStatus(record: DocumentRecord, claimId: string): "cited" | "none_cited" {
	return record.relations.some((r) => r.type === "SUPPORTS" && r.to === claimId) ? "cited" : "none_cited";
}

// ─── Renderings drawn from the record ──────────────────────────────────────

/** Kinds of claim that assert something about the world and so owe the reader their support. Rules, entities and provenance do not. */
const OWES_EVIDENCE = new Set<ClaimKind>(["fact", "hypothesis", "conclusion"]);

const PHRASE: Partial<Record<RelationType, string>> = { EXCEPTION_TO: "is an exception to", ASSOCIATED_WITH: "is associated with" };
const phrase = (t: RelationType) => PHRASE[t] ?? t.toLowerCase().replaceAll("_", " ");

const claimOf = (r: DocumentRecord) => new Map(r.claims.map((c) => [c.id, c]));
const qualifiersOn = (r: DocumentRecord, id: string) => r.qualifiers.filter((q) => q.applies_to === id);

const conditionText = (q: Qualifier) => `${q.effect ? `${q.effect}: ` : ""}${q.condition}${q.status === "unknown" && q.gap ? ` (unknown: ${q.gap})` : ""}`;

/** Every relation with its direction, its attached conditions and what the source rejects; every id shown. */
export function renderRecordDiagram(record: DocumentRecord): string {
	const c = claimOf(record);
	const lines = ["graph"];
	const inGraph = new Set<string>();
	for (const r of record.relations) {
		inGraph.add(r.from).add(r.to);
		const verb = r.type.toLowerCase().replaceAll("_", " ");
		lines.push("  [" + c.get(r.from)!.label + "] --" + verb + (r.rejects ? " (the source REJECTS " + r.rejects + ")" : "") + "--> [" + c.get(r.to)!.label + "]   (" + r.id + ")");
		for (const q of qualifiersOn(record, r.id)) lines.push("      only if: " + conditionText(q) + "   (" + q.id + ")");
	}
	// Nodes that are in no relation still appear.
	for (const claim of record.claims) if (!inGraph.has(claim.id)) lines.push("  [" + claim.label + "]   (" + claim.id + ")");
	// Conditions attached to a claim are shown whether or not the claim is also the end of a relation.
	for (const claim of record.claims) for (const q of qualifiersOn(record, claim.id)) lines.push("  [" + claim.label + "] only if: " + conditionText(q) + "   (" + q.id + ")");
	return lines.join("\n");
}

/** One row per claim, then one row per relation, with their ids, the conditions on each and whether the source cited anything. */
export function renderRecordTable(record: DocumentRecord): string {
	const c = claimOf(record);
	const rows = ["| id | claim | kind | conditions | evidence | standing |", "|---|---|---|---|---|---|"];
	for (const claim of record.claims) {
		const cond = qualifiersOn(record, claim.id).map(conditionText).join("; ");
		const excs = record.relations.filter((r) => r.type === "EXCEPTION_TO" && r.to === claim.id).map((r) => "exception: " + c.get(r.from)!.label + " (" + r.id + ")").join("; ");
		const ev = OWES_EVIDENCE.has(claim.kind) ? evidenceStatus(record, claim.id).replace("_", " ") : "n/a";
		rows.push("| " + claim.id + " | " + claim.label + " | " + claim.kind + " | " + [cond, excs].filter(Boolean).join("; ") + " | " + ev + " | " + claim.standing + " |");
	}
	rows.push("", "| id | relation | conditions |", "|---|---|---|");
	for (const r of record.relations) {
		const conds = [...qualifiersOn(record, r.id).map((q) => conditionText(q) + " (" + q.id + ")"), ...(r.rejects ? ["the source REJECTS " + r.rejects] : [])].join("; ");
		rows.push("| " + r.id + " | " + c.get(r.from)!.label + " " + phrase(r.type) + " " + c.get(r.to)!.label + " | " + conds + " |");
	}
	return rows.join("\n");
}

/** The claims that carry an order, in order, with the conditions on them, then the exceptions that bear on them and theirs. A timeline without those is the drift to avoid. */
export function renderRecordTimeline(record: DocumentRecord): string {
	const c = claimOf(record);
	const ordered = record.claims.filter((x) => x.order !== undefined).sort((p, q) => p.order! - q.order!);
	const lines: string[] = [];
	for (const x of ordered) {
		lines.push(x.order + ". " + x.label + "   (" + x.id + ")");
		for (const q of qualifiersOn(record, x.id)) lines.push("      only if: " + conditionText(q) + "   (" + q.id + ")");
	}
	for (const r of record.relations.filter((x) => x.type === "EXCEPTION_TO")) {
		lines.push("   exception: " + c.get(r.from)!.label + " applies to " + c.get(r.to)!.label + "   (" + r.id + ")");
		for (const q of qualifiersOn(record, r.id)) lines.push("      only if: " + conditionText(q) + "   (" + q.id + ")");
	}
	return lines.join("\n");
}

// ─── Do several renderings agree? ──────────────────────────────────────────

/** Which claims a text carries, by label or cue. Crude on purpose: presence of a phrase, not understanding. */
export function carried(record: DocumentRecord, text: string): string[] {
	const t = text.toLowerCase();
	return record.claims.filter((c) => [c.label.toLowerCase(), ...(c.cues ?? [])].some((p) => t.includes(p))).map((c) => c.id);
}

export interface Agreement {
	per_rendering: { name: string; carried: string[]; missing: string[] }[];
	/** Claims that some renderings carry and others do not. */
	disagreements: string[];
	agree: boolean;
}

export function agreement(record: DocumentRecord, renderings: readonly { name: string; text: string }[], scope: readonly string[] = record.claims.map((c) => c.id)): Agreement {
	const per = renderings.map((r) => {
		const got = carried(record, r.text).filter((id) => scope.includes(id));
		return { name: r.name, carried: got, missing: scope.filter((id) => !got.includes(id)) };
	});
	const disagreements = scope.filter((id) => per.some((p) => p.carried.includes(id)) && per.some((p) => !p.carried.includes(id)));
	return { per_rendering: per, disagreements, agree: disagreements.length === 0 };
}
