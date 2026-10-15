// Preservation: when a representation is transformed, did it keep what mattered?
//
// This module is new. It composes two lifted providers and adds what Chapter 10
// requires that neither has:
//
//   core/evidence   observes the transformation: source and output, hash-pinned
//   core/verify     evaluates each declared obligation as a criterion, three-valued
//   (here)          declaration before the output, the four outcomes, content versus
//                   function, a profile with no total, and an instrument that has to
//                   be shown to notice a loss before a pass can mean anything
//
//   GAIN ≠ ADDITION          textual sameness ≠ communicative preservation
//   preservation ≠ truth
//
// Three-valued on purpose: FALSE is "lost", UNKNOWN is "could not be assessed".
// Missing evidence is not failure.
import { createHash } from "node:crypto";
import { recordStructured } from "../../evidence/src/capture.ts";
import type { EvidenceRecord } from "../../evidence/src/schema.ts";
import { evaluate } from "../../verify/src/evaluate.ts";
import { anchorOverlap, bestAnchorSegment, segmentsOf, splitKeepingSeparators, stuffTokens } from "./anchors.ts";
import type { EvidenceFieldCriterion, VerificationCriterion } from "../../verify/src/criterion.ts";

export type Dimension = "claim" | "relation" | "qualifier" | "number" | "uncertainty" | "provenance";
export const DIMENSIONS: readonly Dimension[] = ["claim", "relation", "qualifier", "number", "uncertainty", "provenance"];

/** Named so that nobody reads a clean profile as covering them. */
export const NOT_COVERED = ["emphasis", "truth of the source"] as const;
export const SCOPE_NOTE = "Reports whether the output kept what the source said, judged against the obligations declared before it. It says nothing about whether the source was right.";

export interface Obligation {
	id: string;
	dimension: Dimension;
	/** Plain language, written before the transformation. */
	statement: string;
	/** A verify criterion over the observed output. */
	criterion: VerificationCriterion;
	/** The lower-case regex sources the criterion requires, kept so the instrument can be probed. */
	patterns: string[];
	/** Relation obligations: the three parts, kept so a reversal can be tried. */
	parts?: { subject: string; verb: string; object: string };
	/** Anchored obligations: a short key phrase whose adjacent word pairs must survive, in order, within one sentence or line. */
	anchor?: { passage: string; min: number };
	/** mustNotSay only: a sample of the forbidden claim, so the instrument can be shown to notice it. */
	violation?: string;
}

const FIELD = "observation.output_lower";
const leaf = (operator: "MATCHES", expected: string): EvidenceFieldCriterion => ({ kind: "evidence_field", path: FIELD, operator, expected, evidence_kind: "structured_observation" });
const all = (criteria: VerificationCriterion[]): VerificationCriterion => (criteria.length === 1 ? criteria[0]! : { kind: "all", criteria });

/** The output must match every pattern. Patterns are regex sources, matched case-insensitively. */
export function mustSay(id: string, dimension: Dimension, statement: string, ...patterns: string[]): Obligation {
	const lower = patterns.map((p) => p.toLowerCase());
	return { id, dimension, statement, criterion: all(lower.map((p) => leaf("MATCHES", p))), patterns: lower };
}

/**
 * Keep a key phrase. The output must carry at least `min` of the phrase's adjacent word pairs inside one
 * sentence or line, so a bag of the same words does not count. Optional patterns must also match.
 * This defeats bag-of-words stuffing. It does not stop a producer copying the phrase and changing what surrounds it.
 */
export function mustKeep(id: string, dimension: Dimension, statement: string, passage: string, opts: { min?: number; patterns?: string[] } = {}): Obligation {
	if (id.includes(".")) throw new Error("an anchored obligation id cannot contain a dot: " + id);
	const min = opts.min ?? 0.66;
	const patterns = (opts.patterns ?? []).map((p) => p.toLowerCase());
	const anchorLeaf: EvidenceFieldCriterion = { kind: "evidence_field", path: "observation.anchors." + id, operator: "GTE", expected: min, evidence_kind: "structured_observation" };
	return { id, dimension, statement, criterion: all([anchorLeaf, ...patterns.map((p) => leaf("MATCHES", p))]), patterns, anchor: { passage, min } };
}

/** Subject, verb and object, in that order, close together. "A acquired B" is not "B acquired A". */
export function mustRelate(id: string, statement: string, parts: { subject: string; verb: string; object: string }): Obligation {
	const s = parts.subject.toLowerCase();
	const v = parts.verb.toLowerCase();
	const o = parts.object.toLowerCase();
	const pattern = `\\b${s}\\b[^.]{0,60}\\b${v}\\b[^.]{0,60}\\b${o}\\b`;
	return { id, dimension: "relation", statement, criterion: leaf("MATCHES", pattern), patterns: [pattern], parts: { subject: s, verb: v, object: o } };
}

/** The output must NOT match. For a claim the author has ruled out in advance. */
export function mustNotSay(id: string, dimension: Dimension, statement: string, pattern: string, violation?: string): Obligation {
	return { id, dimension, statement, criterion: { kind: "not", criterion: leaf("MATCHES", pattern.toLowerCase()) }, patterns: [], ...(violation !== undefined ? { violation } : {}) };
}

/** Function: can the recipient still do the thing the representation was for? */
export interface Probe {
	id: string;
	/** What the recipient needs to be able to find. */
	question: string;
	/** Matches the answer, case-insensitively. */
	answer: string;
}

export interface Declaration {
	declaration_id: string;
	declared_at: string;
	/** A hash of the obligations alone (not the time). An instrument validation is bound to this, so it cannot be asserted for obligations it never probed. */
	obligations_sha256: string;
	obligations: Obligation[];
	probes: Probe[];
	/** Set when this replaces an earlier declaration. */
	supersedes?: string;
}

const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x), "utf8").digest("hex");

/** Declare what must survive. Do this before the transformation; the id is a hash of the content. */
export function assertTime(label: string, value: string): void {
	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error("INVALID_TIME: " + label + " is not a parseable timestamp: " + String(value));
}

export function declare(input: { obligations: Obligation[]; probes?: Probe[]; at: string; supersedes?: string }): Declaration {
	assertTime("declaration time", input.at);
	const body = { obligations: input.obligations, probes: input.probes ?? [], declared_at: input.at, ...(input.supersedes ? { supersedes: input.supersedes } : {}) };
	return { declaration_id: `decl_${sha(body).slice(0, 16)}`, declared_at: input.at, obligations_sha256: sha(input.obligations), obligations: input.obligations, probes: input.probes ?? [], ...(input.supersedes ? { supersedes: input.supersedes } : {}) };
}

// ─── Observing the transformation ──────────────────────────────────────────

export interface Transformation {
	id: string;
	source: string;
	output: string;
	/** When the output came into existence. */
	output_at: string;
}

export function observe(t: Transformation, declaration?: Declaration): EvidenceRecord {
	// For each anchored obligation, how much of its key phrase's word order the best single segment of the output carries.
	const anchors: Record<string, number> = {};
	for (const o of declaration?.obligations ?? []) if (o.anchor) anchors[o.id] = anchorOverlap(o.anchor.passage, t.output);
	return recordStructured(
		"structured_observation",
		{ source_sha256: sha(t.source), output: t.output, output_lower: t.output.toLowerCase(), anchors },
		{ subject: `transformation:${t.id}`, source: { kind: "transformation" }, observed_at: t.output_at },
	);
}

// ─── Assessment ────────────────────────────────────────────────────────────

export type Outcome = "SURVIVED" | "LOST" | "NOT_ASSESSABLE";

export interface ObligationResult {
	id: string;
	dimension: Dimension;
	statement: string;
	outcome: Outcome;
	reason_code: string;
}

export interface FunctionResult {
	answerable: string[];
	not_answerable: string[];
	/** Answerable in both, and found sooner in the output than in the source. */
	easier: string[];
	/** Answerable in both, and found later in the output than in the source. */
	harder: string[];
	basis: string;
}

export type InstrumentStatus = "validated" | "unvalidated" | "not_checked";

export interface Profile {
	declaration_id: string;
	transformation_id: string;
	evidence_id: string;
	flags: ("OBLIGATIONS_DECLARED_AFTER_OUTPUT")[];
	obligations: ObligationResult[];
	by_dimension: Partial<Record<Dimension, { survived: number; lost: number; not_assessable: number }>>;
	/** Candidates for review, not verdicts. */
	possible_additions: string[];
	function: FunctionResult;
	instrument: InstrumentStatus;
	not_covered: readonly string[];
	scope: string;
}

const NUMBER = /\b\d+(?:[.,]\d+)?\b/g;
const ABSOLUTE = /\b(always|never|guarantee[sd]?|proves?|definitely|certainly|must|all|none)\b/gi;

/** Heuristic, and labelled as such: numbers and absolute words that the output has and the source does not. */
export function possibleAdditions(source: string, output: string): string[] {
	const out: string[] = [];
	const srcNumbers = new Set(source.match(NUMBER) ?? []);
	for (const n of new Set(output.match(NUMBER) ?? [])) if (!srcNumbers.has(n)) out.push(`number not in the source: ${n}`);
	const srcAbs = new Set((source.match(ABSOLUTE) ?? []).map((w) => w.toLowerCase()));
	for (const w of new Set((output.match(ABSOLUTE) ?? []).map((x) => x.toLowerCase()))) if (!srcAbs.has(w)) out.push(`absolute word not in the source: "${w}"`);
	return out;
}

function assessFunction(probes: readonly Probe[], source: string, output: string): FunctionResult {
	const r: FunctionResult = { answerable: [], not_answerable: [], easier: [], harder: [], basis: "characters read before the answer first appears; a proxy for effort, not a measurement of a person" };
	for (const p of probes) {
		const re = new RegExp(p.answer, "i");
		const inOut = output.search(re);
		const inSrc = source.search(re);
		if (inOut < 0) r.not_answerable.push(p.id);
		else {
			r.answerable.push(p.id);
			if (inSrc >= 0 && inOut < inSrc) r.easier.push(p.id);
			if (inSrc >= 0 && inOut > inSrc) r.harder.push(p.id);
		}
	}
	return r;
}

/** Evaluate each obligation over whatever was observed. With nothing observed, nothing is lost: it is not assessable. */
export function evaluateObligations(declaration: Declaration, records: EvidenceRecord[]): ObligationResult[] {
	return declaration.obligations.map((o) => {
		const e = evaluate(o.criterion, records);
		const outcome: Outcome = e.result === "TRUE" ? "SURVIVED" : e.result === "FALSE" ? "LOST" : "NOT_ASSESSABLE";
		return { id: o.id, dimension: o.dimension, statement: o.statement, outcome, reason_code: e.reason_code };
	});
}

/**
 * An instrument's standing is not something a caller can assert. A bare "validated" is not believed; "validated" comes only
 * from an actual validation (validateInstrument) whose probes were run against these same obligations.
 */
export function resolveInstrument(declaration: Declaration, instrument: InstrumentStatus | InstrumentValidation): InstrumentStatus {
	if (typeof instrument === "string") return instrument === "validated" ? "unvalidated" : instrument;
	return instrument.obligations_sha256 === declaration.obligations_sha256 ? instrument.status : "unvalidated";
}

export function assess(declaration: Declaration, t: Transformation, instrument: InstrumentStatus | InstrumentValidation = "not_checked"): Profile {
	assertTime("output time", t.output_at);
	const record = observe(t, declaration);
	const obligations = evaluateObligations(declaration, [record]);
	const by_dimension: Profile["by_dimension"] = {};
	for (const r of obligations) {
		const d = (by_dimension[r.dimension] ??= { survived: 0, lost: 0, not_assessable: 0 });
		if (r.outcome === "SURVIVED") d.survived += 1;
		else if (r.outcome === "LOST") d.lost += 1;
		else d.not_assessable += 1;
	}
	return {
		declaration_id: declaration.declaration_id,
		transformation_id: t.id,
		evidence_id: record.evidence_id,
		flags: Date.parse(declaration.declared_at) > Date.parse(t.output_at) ? ["OBLIGATIONS_DECLARED_AFTER_OUTPUT"] : [],
		obligations,
		by_dimension,
		possible_additions: possibleAdditions(t.source, t.output),
		function: assessFunction(declaration.probes, t.source, t.output),
		instrument: resolveInstrument(declaration, instrument),
		not_covered: NOT_COVERED,
		scope: SCOPE_NOTE,
	};
}

// ─── The check is an instrument too ────────────────────────────────────────

export type Mutation = { name: string; dimension: Dimension | "any"; apply: (text: string) => string | null };

const HEDGES: [RegExp, string][] = [
	[/\bmay\b/i, "does"],
	[/\bmight\b/i, "does"],
	[/\bcould\b/i, "does"],
	[/\bsometimes\b/i, "always"],
	[/\busually\b/i, "always"],
	[/\bapproximately\b/i, "exactly"],
	[/\bunclear\b/i, "settled"],
	[/\bis uncertain\b/i, "is certain"],
];

/** Remove the sentence or line containing the first match of any pattern. Lines count: a table row has no full stop. */
export const dropSentenceMatching = (patterns: string[]): Mutation => ({
	name: "drop the sentence that carries it",
	dimension: "any",
	apply: (text) => {
		// Split on sentence ends and on line breaks, keeping the separators so the rest is untouched.
		const parts = text.split(/(\n+|(?<=[.!?])[ \t]+)/);
		for (let i = 0; i < parts.length; i += 2) {
			if (patterns.some((p) => new RegExp(p, "i").test(parts[i]!))) {
				parts.splice(i, i + 1 < parts.length ? 2 : 1);
				return parts.join("").trim();
			}
		}
		return null;
	},
});

/** Weaken-to-certain: "may" becomes "does", and so on. */
export const strengthen: Mutation = {
	name: "turn a hedge into a certainty",
	dimension: "uncertainty",
	apply: (text) => {
		for (const [re, replacement] of HEDGES) if (re.test(text)) return text.replace(re, replacement);
		return null;
	},
};

/** Swap the subject and object of a relation. */
export const reverseRelation = (parts: { subject: string; object: string }): Mutation => ({
	name: "reverse the direction of the relation",
	dimension: "relation",
	apply: (text) => {
		const s = new RegExp(`\\b${parts.subject}\\b`, "i");
		const o = new RegExp(`\\b${parts.object}\\b`, "i");
		if (!s.test(text) || !o.test(text)) return null;
		return text.replace(new RegExp(`\\b(${parts.subject}|${parts.object})\\b`, "gi"), (m) => (m.toLowerCase() === parts.subject.toLowerCase() ? "\u0000S" : "\u0000O")).replaceAll("\u0000S", parts.object).replaceAll("\u0000O", parts.subject);
	},
});

/** Change the first number in the text. */
export const changeNumber: Mutation = {
	name: "change a number",
	dimension: "number",
	apply: (text) => {
		const m = text.match(NUMBER);
		// Only the first number, so what is probed is one change at a time.
		return m ? text.replace(new RegExp(NUMBER.source), (n) => String(Number(n.replace(",", ".")) + 1)) : null;
	},
};

/** The segment of a text that carries an obligation: the first matching one of its patterns, else the best anchor segment. */
function targetIndex(o: Obligation, text: string): number {
	const segs = segmentsOf(text);
	if (o.patterns.length > 0) return segs.findIndex((seg) => o.patterns.some((p) => new RegExp(p, "i").test(seg)));
	if (o.anchor) return bestAnchorSegment(o.anchor.passage, text).index;
	return -1;
}

function replaceSegment(text: string, index: number, replacement: string | null): string {
	const parts = splitKeepingSeparators(text);
	const at = index * 2;
	if (replacement === null) parts.splice(at, at + 1 < parts.length ? 2 : 1);
	else parts[at] = replacement;
	return parts.join("").trim();
}

/** Remove the sentence or line that carries this obligation, however it is expressed. */
export const dropCarrier = (o: Obligation): Mutation => ({
	name: "drop the sentence that carries it",
	dimension: "any",
	apply: (text) => {
		const i = targetIndex(o, text);
		return i < 0 ? null : replaceSegment(text, i, null);
	},
});

/**
 * Keep every word of the carrying sentence and destroy its order and punctuation: what a keyword-stuffer
 * produces. An obligation that still passes was never testing the content, only the vocabulary.
 */
export const stuffCarrier = (o: Obligation): Mutation => ({
	name: "keep the words, destroy the sentence (keyword-stuffing)",
	dimension: "any",
	apply: (text) => {
		const i = targetIndex(o, text);
		return i < 0 ? null : replaceSegment(text, i, stuffTokens(segmentsOf(text)[i]!));
	},
});

export interface MutationResult {
	mutation: string;
	applied: boolean;
	detected: boolean;
}

/**
 * Does a measure notice what it should? Start from a known-faithful output, break it one
 * way at a time, and see whether the measure's fingerprint changes. A measure that cannot
 * tell the broken text from the faithful one has told you nothing when it passes.
 */
export function probeMeasure(faithful: string, mutations: readonly Mutation[], fingerprint: (text: string) => unknown): MutationResult[] {
	const base = JSON.stringify(fingerprint(faithful));
	return mutations.map((m) => {
		const broken = m.apply(faithful);
		if (broken === null || broken === faithful) return { mutation: m.name, applied: false, detected: false };
		return { mutation: m.name, applied: true, detected: JSON.stringify(fingerprint(broken)) !== base };
	});
}

export interface InstrumentValidation {
	status: InstrumentStatus;
	/** The obligations these probes were run against. */
	obligations_sha256: string;
	faithful_passes: boolean;
	/** Obligations no mutation could be applied to. An obligation never probed has not been shown to notice anything. */
	unprobed: string[];
	probes: { obligation: string; results: MutationResult[] }[];
}

/**
 * Validate the obligations as an instrument. For each obligation, break the faithful output in the ways
 * that obligation is supposed to catch, and require that THAT obligation turns from SURVIVED to LOST.
 */
export function validateInstrument(declaration: Declaration, source: string, faithful: string, at: string, extra?: (o: Obligation) => Mutation[]): InstrumentValidation {
	const base = assess(declaration, { id: "faithful", source, output: faithful, output_at: at });
	const faithful_passes = base.obligations.every((o) => o.outcome === "SURVIVED");
	const probes = declaration.obligations.map((o) => {
		const mutations: Mutation[] = o.patterns.length > 0 || o.anchor ? [dropCarrier(o), stuffCarrier(o)] : [];
		if (o.violation !== undefined) mutations.push({ name: "add the forbidden claim", dimension: "any", apply: (text) => text + "\n" + o.violation });
		if (o.dimension === "uncertainty" || o.dimension === "qualifier") mutations.push(strengthen);
		if (o.dimension === "relation" && o.parts) mutations.push(reverseRelation(o.parts));
		if (o.dimension === "number") mutations.push(changeNumber);
		// Domain-specific ways to break this obligation, supplied by the caller who knows the rendering.
		if (extra) mutations.push(...extra(o));
		const results = probeMeasure(faithful, mutations, (text) => assess(declaration, { id: "m", source, output: text, output_at: at }).obligations.find((x) => x.id === o.id)!.outcome);
		return { obligation: o.id, results };
	});
	const applied = probes.flatMap((p) => p.results.filter((r) => r.applied));
	const unprobed = probes.filter((p) => !p.results.some((r) => r.applied)).map((p) => p.obligation);
	const status: InstrumentStatus = faithful_passes && applied.length > 0 && applied.every((r) => r.detected) && unprobed.length === 0 ? "validated" : "unvalidated";
	return { status, obligations_sha256: declaration.obligations_sha256, faithful_passes, unprobed, probes };
}

/** One line per obligation, with no total. */
export function renderProfile(p: Profile): string {
	const lines = [`Preservation profile for ${p.transformation_id} against ${p.declaration_id}`];
	if (p.instrument !== "validated") lines.push(`INSTRUMENT ${p.instrument.toUpperCase().replace("_", " ")}: a pass from this check does not show anything was preserved.`);
	for (const f of p.flags) lines.push(`FLAG ${f}: the obligations were written after the output existed.`);
	for (const o of p.obligations) lines.push(`  ${o.outcome.padEnd(14)} [${o.dimension}] ${o.statement}`);
	if (p.function.answerable.length + p.function.not_answerable.length > 0) {
		lines.push(`  function: answerable ${p.function.answerable.join(", ") || "none"}; not answerable ${p.function.not_answerable.join(", ") || "none"}`);
		if (p.function.easier.length) lines.push(`  easier than in the source: ${p.function.easier.join(", ")}`);
		if (p.function.harder.length) lines.push(`  harder than in the source: ${p.function.harder.join(", ")}`);
	}
	for (const a of p.possible_additions) lines.push(`  possible addition (for review, not a verdict): ${a}`);
	lines.push(`  not covered: ${p.not_covered.join("; ")}`, `  ${p.scope}`);
	return lines.join("\n");
}
