// Relations: what a system is claiming when it puts one item beside another.
//
// This module is new. `core/relate` classifies a pair and returns an observation
// with a first-class UNKNOWN, and its README says plainly that the classifier is
// a cue-based v0.1 that is uncalibrated. It has no notion of how a label arose,
// how far it can be trusted, or whether it holds outside a scope. Those are the
// rules of Chapter 9, so they live here and are enforced:
//
//   similarity finds candidates  →  a relation step labels them  →  worth decides
//   (similarity can)                (similarity cannot)             (depends on the task)
//
//   similarity ≠ relationship
//
// A label is a claim and claims can be wrong, so every record says how it arose
// (route) and how far it can be trusted (standing). A classifier's output is
// only ever a proposal; only a person adjudicates. A contradiction asserted
// without a declared, shared scope is flagged and is not presented as one.
import { createHash } from "node:crypto";
import { classifyPair, cosineScore, type Direction, type EvidenceSpan, type Relation } from "../../relate/src/engine/index.ts";

export type { Direction, EvidenceSpan, Relation };

export interface Item {
	id: string;
	text: string;
	/** The conditions under which the item's claim holds (population, period, assumptions). */
	scope?: string;
}

/** How the label reached the record. */
export type Route = "asserted_by_source" | "classified" | "adjudicated";
/**
 * How far to trust it. There is no "verified" here: this module cannot establish truth.
 *   proposal     a classifier's guess; the weakest standing that is still a label
 *   asserted     an author's own claim about the relation, with a citation
 *   adjudicated  confirmed or corrected by a person
 *   unknown      no label; an honest value, not a failure
 */
export type Standing = "proposal" | "asserted" | "adjudicated" | "unknown";
export type Caveat = "SCOPE_UNCONFIRMED";

export interface RelationRecord {
	id: string;
	a: { id: string; scope?: string };
	b: { id: string; scope?: string };
	relation: Relation;
	direction: Direction;
	evidence: EvidenceSpan[];
	route: Route;
	standing: Standing;
	/** Who or what produced it, with version. */
	by: string;
	caveats: Caveat[];
	/** Asserted-by-source only: the citation. */
	citation?: string;
	/** Adjudicated only. */
	reason?: string;
}

export class RelationError extends Error {
	readonly code: "NOT_A_PERSON" | "NO_EVIDENCE" | "NO_CITATION" | "NO_REASON";
	constructor(code: RelationError["code"], message: string) {
		super(message);
		this.name = "RelationError";
		this.code = code;
	}
}

const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x), "utf8").digest("hex");
const seal = (r: Omit<RelationRecord, "id">): RelationRecord => ({ id: `rel_${sha(r).slice(0, 16)}`, ...r });

// ─── Stage 1: similarity finds candidates. It does not label them. ──────────

export interface Candidate {
	item: Item;
	similarity: number;
}

export function findCandidates(subject: Item, corpus: readonly Item[], k = 5): Candidate[] {
	return corpus
		.filter((c) => c.id !== subject.id)
		.map((item) => ({ item, similarity: cosineScore(subject.text, item.text) }))
		.sort((x, y) => y.similarity - x.similarity)
		.slice(0, k);
}

// ─── Stage 2: a relation step labels, and says how the label arose. ─────────

/** Evidence relations only hold within a scope; the others are not scope-bound in this check. */
const SCOPE_BOUND: ReadonlySet<Relation> = new Set(["CONTRADICTS", "SUPPORTS"]);

function scopeCaveats(relation: Relation, a: Item, b: Item): Caveat[] {
	if (!SCOPE_BOUND.has(relation)) return [];
	const declaredAndShared = a.scope !== undefined && b.scope !== undefined && a.scope === b.scope;
	return declaredAndShared ? [] : ["SCOPE_UNCONFIRMED"];
}

/** Label a pair with the classifier. The result is a proposal, never more. */
export function classifyRelation(a: Item, b: Item): RelationRecord {
	const o = classifyPair(a.text, b.text, { id: a.id, kind: "text", ...(a.scope ? { scope: a.scope } : {}) }, { id: b.id, kind: "text", ...(b.scope ? { scope: b.scope } : {}) });
	const unknown = o.relation === "UNKNOWN" || o.evidence.length === 0;
	const relation: Relation = unknown ? "UNKNOWN" : o.relation;
	return seal({
		a: { id: a.id, ...(a.scope ? { scope: a.scope } : {}) },
		b: { id: b.id, ...(b.scope ? { scope: b.scope } : {}) },
		relation,
		direction: unknown ? "not_applicable" : o.direction,
		evidence: unknown ? [] : o.evidence,
		route: "classified",
		standing: unknown ? "unknown" : "proposal",
		by: `${o.producer.plugin}@${o.producer.version} (cue-based, uncalibrated)`,
		caveats: unknown ? [] : scopeCaveats(relation, a, b),
	});
}

/** The author's own claim about a relation, with the citation that carries it. */
export function assertedRelation(a: Item, b: Item, relation: Relation, direction: Direction, citation: string): RelationRecord {
	if (citation.trim() === "") throw new RelationError("NO_CITATION", "a relation asserted by a source must carry its citation");
	return seal({
		a: { id: a.id, ...(a.scope ? { scope: a.scope } : {}) },
		b: { id: b.id, ...(b.scope ? { scope: b.scope } : {}) },
		relation,
		direction,
		evidence: [],
		route: "asserted_by_source",
		standing: "asserted",
		by: `author of ${a.id}`,
		caveats: scopeCaveats(relation, a, b),
		citation,
	});
}

/** A person confirms or corrects a label. Nothing else can adjudicate. */
export function adjudicate(
	record: RelationRecord,
	by: { type: "human" | "model" | "classifier"; id: string },
	input: { relation?: Relation; direction?: Direction; reason: string; /** The person asserts the two items share the scope in which the relation holds. Without it, a scope flag stays. */ confirms_scope?: boolean },
): RelationRecord {
	if (by.type !== "human") throw new RelationError("NOT_A_PERSON", `only a person adjudicates; got ${by.type}`);
	if (input.reason.trim() === "") throw new RelationError("NO_REASON", "adjudication needs a reason");
	const { id: _id, ...rest } = record;
	return seal({
		...rest,
		relation: input.relation ?? record.relation,
		direction: input.direction ?? record.direction,
		route: "adjudicated",
		standing: (input.relation ?? record.relation) === "UNKNOWN" ? "unknown" : "adjudicated",
		by: `person:${by.id}`,
		// Confirming a label is not confirming a scope. The flag clears only if the person says the scope is shared, or if the
		// relation they settle on is not one that depends on scope at all.
		caveats: SCOPE_BOUND.has(input.relation ?? record.relation) && !input.confirms_scope ? record.caveats : [],
		reason: input.reason,
	});
}

// ─── Which record is in force for a pair ───────────────────────────────────

/**
 * The records in force: the latest per pair, except that a person's adjudication is not displaced by a later
 * record that is not itself an adjudication. A model that asks for another classification adds nothing to the
 * pair once a person has ruled on it. Earlier records are history, not deleted.
 */
export function effectiveRecords(history: readonly RelationRecord[]): RelationRecord[] {
	const byPair = new Map<string, RelationRecord>();
	for (const r of history) {
		const key = r.a.id + "|" + r.b.id;
		const held = byPair.get(key);
		if (held?.route === "adjudicated" && r.route !== "adjudicated") continue;
		byPair.set(key, r);
	}
	return [...byPair.values()];
}

// ─── How a label may be shown ───────────────────────────────────────────────

export type Group = "evidence" | "explanation" | "succession" | "practical" | "resemblance" | "none";

export const GROUP_OF: Readonly<Record<Relation, Group>> = {
	SUPPORTS: "evidence",
	CONTRADICTS: "evidence",
	UPDATES: "succession",
	IMPLEMENTS: "practical",
	RELATED: "resemblance",
	UNKNOWN: "none",
};

/** What the reader is trying to do. Relevance is a property of the task, not of the pair. */
export type Task = "check_a_claim" | "understand" | "stay_current" | "build";

const WANTED: Readonly<Record<Task, readonly Group[]>> = {
	check_a_claim: ["evidence"],
	understand: ["explanation", "evidence"],
	stay_current: ["succession"],
	build: ["practical", "succession"],
};

const NOUN: Readonly<Record<Relation, string>> = { SUPPORTS: "support", CONTRADICTS: "contradiction", UPDATES: "update", IMPLEMENTS: "implementation", RELATED: "resemblance", UNKNOWN: "relationship" };

/** The words a record may be shown with. A flagged contradiction is not shown as a contradiction. */
export function shownAs(r: RelationRecord): string {
	if (r.relation === "UNKNOWN") return "relationship unknown";
	const name = r.relation.toLowerCase();
	const caveat = r.caveats.includes("SCOPE_UNCONFIRMED");
	const standing = r.standing === "proposal" ? "proposed" : r.standing === "asserted" ? "asserted by the source" : caveat ? "label confirmed by a person; scope still not confirmed" : "confirmed by a person";
	if (caveat) return `possible ${NOUN[r.relation]}, unconfirmed: scope not declared as shared (${standing})`;
	return `${name} (${standing})`;
}

/**
 * Stage 3, deliberately small: is this label worth the reader's attention for this task?
 * UNKNOWN is never shown as a relation. Resemblance alone is not grounds for checking a claim.
 */
export function worthShowing(r: RelationRecord, task: Task): boolean {
	const group = GROUP_OF[r.relation];
	return group !== "none" && WANTED[task].includes(group);
}

// ─── "Adds nothing" is not a relation ──────────────────────────────────────
//
// The chapter opens on a paper that is the nearest thing in the corpus and contributes nothing.
// No label in the vocabulary says that, because it is not a relation between two items: it is a
// property of a candidate relative to what the reader already has. Here "what the reader already
// has" is only the text they are reading. Their wider knowledge is a later question.

export interface Novelty {
	/** Fraction of the candidate's content terms (words of four letters or more, and numbers) not found in the subject. */
	novelty: number;
	new_terms: string[];
	adds_nothing: boolean;
}

const STOP = new Set(
	"this,that,these,those,with,from,have,been,were,which,their,there,than,then,them,into,over,such,also,when,what,while,about,would,could,should,using,uses,used,based,while".split(","),
);
const contentTerms = (text: string): Set<string> => new Set((text.toLowerCase().match(/[a-z]{4,}|\d[\d.,]*/g) ?? []).filter((t) => !STOP.has(t)));

/** Relations that carry information of their own, whatever the vocabulary overlap. A negation is new even when every other word repeats. */
const CARRIES_NEWS: ReadonlySet<Relation> = new Set(["CONTRADICTS", "UPDATES", "IMPLEMENTS"]);

export function novelty(subject: Item, candidate: Item, threshold = 0.25): Novelty {
	const have = contentTerms(subject.text);
	const terms = [...contentTerms(candidate.text)];
	const fresh = terms.filter((t) => !have.has(t));
	const n = terms.length === 0 ? 0 : fresh.length / terms.length;
	return { novelty: n, new_terms: fresh, adds_nothing: terms.length >= 4 && n < threshold };
}

export interface Discovery {
	candidate: Candidate;
	record: RelationRecord;
	novelty: Novelty;
	/** Held back because it adds nothing beyond the text being read AND its relation carries no news of its own. */
	redundant: boolean;
	shown_as: string;
	show: boolean;
}

/** The three stages in order. */
export function discover(subject: Item, corpus: readonly Item[], task: Task, k = 5): Discovery[] {
	return findCandidates(subject, corpus, k).map((candidate) => {
		const record = classifyRelation(subject, candidate.item);
		const nov = novelty(subject, candidate.item);
		// A contradiction, update or implementation is news even when the wording barely differs. Only a bare
		// support or resemblance that repeats the subject is redundant.
		const redundant = nov.adds_nothing && !CARRIES_NEWS.has(record.relation) && record.relation !== "UNKNOWN";
		const shown_as = redundant ? `adds nothing beyond what you are reading (${shownAs(record)}; ${Math.round(nov.novelty * 100)}% new terms)` : shownAs(record);
		return { candidate, record, novelty: nov, redundant, shown_as, show: !redundant && worthShowing(record, task) };
	});
}
