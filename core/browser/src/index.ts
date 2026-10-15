// The semantic browser: the Part I pieces working on one kind of source.
//
//   SOURCE → RECORD → OBLIGATIONS → TASK → REPRESENTATION CHOICE → RENDERING
//          → MARGIN (sidecar, relations) → PRESERVATION CHECK → show / repair / fall back
//
// Composition, not a new idea. What is new here:
//   - a DOCUMENT record (claims, evidence, directed relations, qualifiers, disputes), each
//     entry citing a passage of the source verbatim. core/language models a conversation's
//     communication state and does not fit a document; that mismatch is reported, not hidden.
//   - a choice of representation by task, where "leave the source unchanged" is an output.
//   - a gate, applied to each view separately: a generated rendering is checked against the
//     obligations before anyone sees it. A gate whose instrument has not been shown to notice a
//     loss cannot authorise anything, and a view that cannot show it kept what mattered does not
//     ship: the source does.
//
// Why each view and not the whole: a hypothesis named in both a diagram and a table is "present"
// if either keeps it, so a check over the two together cannot see that one row lost its condition.
// Obligations are therefore tied to the view, and to the line, they belong on.
//
//   source ≠ record ≠ rendering      record ≠ source of truth
//   retrieval ≠ verification         preference ≠ benefit
import { classifyRelation, type RelationRecord } from "../../relations/src/index.ts";
import { derivedItem, retrievedItem, type SidecarItem } from "../../sidecar/src/index.ts";
import {
	assess,
	declare,
	mustSay,
	validateInstrument,
	type Declaration,
	type InstrumentValidation,
	type Mutation,
	type Obligation,
	type Profile,
} from "../../preservation/src/index.ts";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── The record ────────────────────────────────────────────────────────────

export type ClaimKind = "fact" | "hypothesis" | "evidence" | "conclusion" | "proposal";
export interface Claim {
	id: string;
	kind: ClaimKind;
	/** A short, distinctive phrase a rendering must carry to be said to carry this claim. */
	label: string;
	/** Verbatim text from the source. */
	passage: string;
	standing: "stated" | "disputed" | "uncertain";
	holder?: string;
}
export interface DocRelation {
	id: string;
	from: string;
	to: string;
	/** Direction is from → to. */
	type: "SUPPORTS" | "CONTRADICTS" | "UPDATES" | "IMPLEMENTS";
	passage: string;
}
export interface Qualifier {
	id: string;
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

export type RecordProblem = "PASSAGE_NOT_IN_SOURCE" | "UNKNOWN_CLAIM" | "DUPLICATE_ID" | "SELF_RELATION" | "GAP_WITHOUT_PASSAGE" | "DISPUTE_WITHOUT_HOLDER";

/** The record is a reading of the source and a reading can be wrong. This only checks that it is traceable. */
export function validateRecord(source: Source, record: DocumentRecord): { problem: RecordProblem; id: string }[] {
	const out: { problem: RecordProblem; id: string }[] = [];
	const ids = new Set<string>();
	const claimIds = new Set(record.claims.map((c) => c.id));
	const add = (problem: RecordProblem, id: string) => out.push({ problem, id });
	for (const entry of [...record.claims, ...record.relations, ...record.qualifiers]) {
		if (ids.has(entry.id)) add("DUPLICATE_ID", entry.id);
		ids.add(entry.id);
		if (!source.text.includes(entry.passage)) add("PASSAGE_NOT_IN_SOURCE", entry.id);
	}
	for (const r of record.relations) {
		if (!claimIds.has(r.from) || !claimIds.has(r.to)) add("UNKNOWN_CLAIM", r.id);
		if (r.from === r.to) add("SELF_RELATION", r.id);
	}
	for (const q of record.qualifiers) {
		if (!claimIds.has(q.applies_to)) add("UNKNOWN_CLAIM", q.id);
		if (q.status === "unknown" && q.gap && !source.text.includes(q.gap)) add("GAP_WITHOUT_PASSAGE", q.id);
	}
	for (const c of record.claims) if (c.kind === "conclusion" && c.standing === "disputed" && !c.holder) add("DISPUTE_WITHOUT_HOLDER", c.id);
	return out;
}

// ─── Task → representation ─────────────────────────────────────────────────

export type Task = "decide_to_open" | "approve_fix" | "follow_procedure" | "look_up_fact";
export type Representation = "preview" | "diagram" | "table" | "annotated_source" | "source_highlight";
export interface Choice {
	representations: Representation[];
	/** False means the reader is given the source as it is. That is a result, not a failure. */
	transforms_source: boolean;
	why: string;
}

export function choose(task: Task): Choice {
	switch (task) {
		case "decide_to_open":
			return { representations: ["preview"], transforms_source: true, why: "she needs to decide whether it concerns her; a false skip is the failure to avoid" };
		case "approve_fix":
			return { representations: ["diagram", "table"], transforms_source: true, why: "she needs the structure of the argument and a comparison" };
		case "follow_procedure":
			return { representations: ["annotated_source"], transforms_source: false, why: "the prose already does the job; changing its form invites loss of qualifiers" };
		case "look_up_fact":
			return { representations: ["source_highlight"], transforms_source: false, why: "the best representation is the source with the passage found; a generated view adds delay and risk" };
	}
}

// ─── Renderings (deterministic; a model's are submitted to the same gate) ──

export interface Rendering {
	task: Task;
	representation: Representation;
	text: string;
	/** True when `text` is the source byte for byte. */
	is_source: boolean;
}

export interface RenderOptions {
	audienceServices?: string[];
	components?: string[];
	query?: string;
}

const byId = (r: DocumentRecord) => new Map(r.claims.map((c) => [c.id, c]));

export function renderPreview(record: DocumentRecord, source: Source, opts: RenderOptions): string {
	const fail = record.claims.find((c) => c.kind === "fact")!;
	const disputes = record.claims.filter((c) => c.kind === "conclusion" && c.standing === "disputed");
	const named = (opts.components ?? []).filter((c) => source.text.includes(c));
	const concerns = (opts.audienceServices ?? []).filter((s) => named.includes(s));
	return [
		source.text.split("\n")[0],
		`What failed: ${fail.label}.`,
		disputes.length ? `Disputed: ${disputes.map((d) => `${d.holder} holds ${d.label}`).join("; ")}.` : "",
		`Named components: ${named.join(", ")}.`,
		concerns.length ? `Affects your service: ${concerns.join(", ")}.` : "Does not name your service.",
	].filter(Boolean).join("\n");
}

export function renderDiagram(record: DocumentRecord): string {
	const claims = byId(record);
	const lines = ["graph"];
	for (const r of record.relations) lines.push(`  [${claims.get(r.from)!.label}] --${r.type.toLowerCase()}--> [${claims.get(r.to)!.label}]   (${r.id})`);
	for (const h of record.claims.filter((c) => c.kind === "hypothesis")) {
		const q = record.qualifiers.find((x) => x.applies_to === h.id);
		const cited = record.relations.some((r) => r.to === h.id);
		if (q) lines.push(`  [${h.label}]  ${q.effect}: ${q.condition}${q.status === "unknown" ? ` -- UNKNOWN, ${q.gap}` : ""}   (${q.id})`);
		else if (!cited) lines.push(`  [${h.label}]  no evidence cited`);
	}
	const disputes = record.claims.filter((c) => c.kind === "conclusion" && c.standing === "disputed");
	if (disputes.length) lines.push(`  DISPUTED: ${disputes.map((d) => `${d.holder}: ${d.label}`).join(" | ")}`);
	const fix = record.claims.find((c) => c.kind === "proposal");
	if (fix) lines.push(`  PROPOSED FIX (${fix.holder}): ${fix.label}`);
	return lines.join("\n");
}

export function renderTable(record: DocumentRecord): string {
	const rows = ["| hypothesis | evidence | condition | standing |", "|---|---|---|---|"];
	for (const h of record.claims.filter((c) => c.kind === "hypothesis")) {
		const ev = record.relations.filter((r) => r.to === h.id).map((r) => `${byId(record).get(r.from)!.label} (${r.type.toLowerCase()})`).join("; ") || "none cited";
		const q = record.qualifiers.find((x) => x.applies_to === h.id);
		const cond = q ? `${q.effect}: ${q.condition}${q.status === "unknown" ? `; unknown, ${q.gap}` : ""}` : "";
		rows.push(`| ${h.label} | ${ev} | ${cond} | ${h.standing} |`);
	}
	return rows.join("\n");
}

/** The source, byte for byte, then a list of annotations keyed by the passage they refer to. */
export function renderAnnotated(record: DocumentRecord, source: Source): string {
	const notes = record.qualifiers.map((q) => `- "${q.passage}" => ${q.effect}: ${q.condition}${q.status === "unknown" ? ` (unknown: ${q.gap})` : ""}`);
	return `${source.text}\n\n--- annotations (the text above is the source, unchanged) ---\n${notes.join("\n")}`;
}

/** The source unchanged, with the location of the passage. */
export function renderHighlight(source: Source, query: string): { text: string; found: { start: number; end: number } | null } {
	const start = source.text.toLowerCase().indexOf(query.toLowerCase());
	return { text: source.text, found: start < 0 ? null : { start, end: start + query.length } };
}

export function renderView(task: Task, view: Representation, record: DocumentRecord, source: Source, opts: RenderOptions = {}): Rendering {
	const base = { task, representation: view };
	switch (view) {
		case "preview":
			return { ...base, text: renderPreview(record, source, opts), is_source: false };
		case "diagram":
			return { ...base, text: renderDiagram(record), is_source: false };
		case "table":
			return { ...base, text: renderTable(record), is_source: false };
		case "annotated_source":
			return { ...base, text: renderAnnotated(record, source), is_source: false };
		case "source_highlight":
			return { ...base, text: renderHighlight(source, opts.query ?? "").text, is_source: true };
	}
}

// ─── Obligations: derived from the record, and tied to the view and the line ─

export interface ObligationOptions extends RenderOptions {
	source?: Source;
}

const sameLine = (first: string, ...rest: string[]) => `${esc(first.toLowerCase())}${rest.map((r) => `[^\\n]*${r}`).join("")}`;

export function obligationsFor(task: Task, view: Representation, record: DocumentRecord, opts: ObligationOptions = {}): Obligation[] {
	const claims = record.claims;
	const hyps = claims.filter((c) => c.kind === "hypothesis");
	const disputes = claims.filter((c) => c.kind === "conclusion" && c.standing === "disputed");
	const fix = claims.find((c) => c.kind === "proposal");
	const gaps = record.qualifiers.filter((q) => q.status === "unknown");
	const gapAt = (q: Qualifier) => claims.find((c) => c.id === q.applies_to)!;
	if (view === "preview") {
		const o = [mustSay("failed", "claim", "what failed", esc(claims.find((c) => c.kind === "fact")!.label))];
		if (disputes.length) o.push(mustSay("disputed", "uncertainty", "that the cause is disputed", "disputed"));
		// A false skip must not happen: if her service is named in the source, the preview says so.
		for (const s of (opts.audienceServices ?? []).filter((x) => (opts.source?.text ?? "").includes(x))) o.push(mustSay(`names-${s}`, "claim", `says it affects ${s}, which is her service`, sameLine("affects your service", esc(s.toLowerCase()))));
		return o;
	}
	if (view === "diagram") {
		const o = hyps.map((h) => mustSay(`diagram-${h.id}`, "claim", `candidate cause in the diagram: ${h.label}`, esc(h.label)));
		if (disputes.length) o.push(mustSay("diagram-disputed", "uncertainty", `the conclusion is disputed, and by whom (${disputes.map((d) => d.holder).join(", ")})`, sameLine("disputed", ...disputes.map((d) => esc(d.holder!.toLowerCase())))));
		for (const q of gaps) o.push(mustSay(`diagram-gap-${q.id}`, "qualifier", `${gapAt(q).label}: ${q.effect} only if ${q.condition}; ${q.gap}`, sameLine(gapAt(q).label, "replication lag", "unknown")));
		if (fix) o.push(mustSay("diagram-proposer", "provenance", `who proposed the fix (${fix.holder}) and what it is (${fix.label})`, sameLine("proposed fix", esc(fix.holder!.toLowerCase()), esc(fix.label.toLowerCase()))));
		return o;
	}
	if (view === "table") {
		const o: Obligation[] = hyps.map((h) => mustSay(`row-${h.id}`, "claim", `a row for ${h.label}`, `\\|\\s*${esc(h.label.toLowerCase())}`));
		// The condition has to be on the same row as the hypothesis it conditions. This is the tidy-and-wrong case.
		for (const q of gaps) o.push(mustSay(`row-condition-${q.id}`, "qualifier", `the ${gapAt(q).label} row carries its condition (${q.condition}) and the gap`, sameLine(`| ${gapAt(q).label}`, "replication lag", "unknown")));
		return o;
	}
	// annotated_source, source_highlight: the source is shown; what must survive is the source.
	return [mustSay("source-intact", "claim", "the source text is intact", esc((opts.source?.text ?? "").slice(0, 60)))];
}

export function declarationFor(task: Task, view: Representation, record: DocumentRecord, at: string, opts: ObligationOptions = {}): Declaration {
	return declare({ obligations: obligationsFor(task, view, record, opts), at });
}

/** Ways to break a rendering that only someone who knows its shape can name. */
export function domainMutations(record: DocumentRecord): (o: Obligation) => Mutation[] {
	const conditions = record.qualifiers.map((q) => q.condition);
	return (o) =>
		o.dimension === "qualifier"
			? [
					{
						name: "keep the row, remove its condition",
						dimension: "qualifier",
						apply: (text) => {
							for (const c of conditions) {
								const re = new RegExp(`\\b${esc(c.split(" ").slice(0, 2).join(" "))}[^|\\n]*`, "i");
								if (re.test(text)) return text.replace(re, "");
							}
							return null;
						},
					},
				]
			: [];
}

// ─── The gate ──────────────────────────────────────────────────────────────

export type GateDecision =
	| { decision: "SHOW"; why: string }
	| { decision: "REPAIR"; why: string; lost: string[] }
	| { decision: "FALL_BACK_TO_SOURCE"; why: string; lost: string[] };

/**
 * A pure decision over a profile. Order matters:
 *  1. An instrument that has not been shown to notice a loss cannot authorise a generated rendering.
 *  2. Anything lost is repaired while attempts remain.
 *  3. Out of attempts, the source ships. A transformation that cannot show it preserved what mattered does not.
 */
export function gateDecision(profile: Profile, attempt: number, maxAttempts: number): GateDecision {
	const lost = profile.obligations.filter((o) => o.outcome !== "SURVIVED").map((o) => o.id);
	if (profile.instrument !== "validated") return { decision: "FALL_BACK_TO_SOURCE", why: `the check has not been shown to notice a loss (${profile.instrument}), so its pass cannot authorise this`, lost };
	if (lost.length === 0) return { decision: "SHOW", why: "every declared obligation survived" };
	if (attempt < maxAttempts) return { decision: "REPAIR", why: `${lost.length} obligation(s) lost; attempt ${attempt} of ${maxAttempts}`, lost };
	return { decision: "FALL_BACK_TO_SOURCE", why: `still losing ${lost.join(", ")} after ${attempt} attempt(s)`, lost };
}

/** Validate the check for this view against a known-faithful rendering built straight from the record. */
export function validateGate(task: Task, view: Representation, record: DocumentRecord, source: Source, at: string, opts: RenderOptions = {}): InstrumentValidation {
	const o: ObligationOptions = { ...opts, source };
	const faithful = renderView(task, view, record, source, o).text;
	return validateInstrument(declarationFor(task, view, record, at, o), source.text, faithful, at, domainMutations(record));
}

export function checkRendering(task: Task, view: Representation, record: DocumentRecord, source: Source, text: string, at: string, instrument: Profile["instrument"], opts: RenderOptions = {}): Profile {
	return assess(declarationFor(task, view, record, at, { ...opts, source }), { id: `${task}/${view}`, source: source.text, output: text, output_at: at }, instrument);
}

/** Refusals are worth watching. A gate that never refuses is either perfect or decorative, and perfect is unlikely. */
export function gateHealth(log: readonly { decision: GateDecision["decision"] }[]): { submissions: number; refusals: number; note: string } {
	const refusals = log.filter((l) => l.decision !== "SHOW").length;
	const note =
		log.length === 0
			? "no submissions yet"
			: refusals === 0
				? `never refused in ${log.length} submission(s): either every rendering was faithful or the gate is decorative; probe it before trusting it`
				: `refused ${refusals} of ${log.length}`;
	return { submissions: log.length, refusals, note };
}

// ─── The margin ────────────────────────────────────────────────────────────

export interface CorpusDoc {
	id: string;
	scope: string;
	content: string;
}

export interface Margin {
	derived: SidecarItem[];
	retrieved: SidecarItem[];
	relations: RelationRecord[];
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);

/**
 * Derived items from the record's qualifiers; retrieved items from other documents, each with the
 * relation it claims, labelled as a proposal and flagged where the scopes are not declared shared.
 */
export function buildMargin(source: Source, record: DocumentRecord, corpus: readonly CorpusDoc[], thisScope: string, about: string): Margin {
	const derived = record.qualifiers.map((q) => derivedItem({ id: source.id, content: source.text }, q.passage, `${q.effect}: ${q.condition}${q.status === "unknown" ? ` (unknown: ${q.gap})` : ""}`, "record"));
	const subject = record.claims.find((c) => c.id === about)!;
	const retrieved: SidecarItem[] = [];
	const relations: RelationRecord[] = [];
	for (const doc of corpus) {
		const sentences = doc.content.split(/(?<=[.!?])\s+/);
		const sw = words(subject.passage);
		const best = sentences.map((s) => ({ s, n: [...words(s)].filter((w) => sw.has(w)).length })).sort((a, b) => b.n - a.n)[0];
		if (!best || best.n < 2) continue;
		retrieved.push(retrievedItem({ id: doc.id, content: doc.content }, best.s, "margin-retrieval"));
		relations.push(classifyRelation({ id: subject.id, text: subject.passage, scope: thisScope }, { id: doc.id, text: best.s, scope: doc.scope }));
	}
	return { derived, retrieved, relations };
}

// ─── The pipeline, in order, with its stages visible ───────────────────────

export interface Stage {
	stage: string;
	note: string;
}

export interface ViewResult {
	rendering: Rendering;
	validation: InstrumentValidation | null;
	profile: Profile | null;
	decision: GateDecision;
	/** What the reader is actually given for this view. */
	shown: { text: string; is_source: boolean };
}

export interface Browsed {
	task: Task;
	choice: Choice;
	views: ViewResult[];
	trace: Stage[];
}

/** The deterministic path: render each view from the record, check it, show or fall back. */
export function browse(task: Task, record: DocumentRecord, source: Source, at: string, opts: RenderOptions = {}): Browsed {
	const trace: Stage[] = [{ stage: "record", note: `${record.claims.length} claims, ${record.relations.length} relations, ${record.qualifiers.length} qualifiers, each citing the source` }];
	const choice = choose(task);
	trace.push({ stage: "choose", note: `${choice.representations.join(" + ")}${choice.transforms_source ? "" : " (source unchanged)"}: ${choice.why}` });
	const views: ViewResult[] = choice.representations.map((view) => {
		const rendering = renderView(task, view, record, source, opts);
		trace.push({ stage: `render ${view}`, note: `${rendering.text.length} characters${rendering.is_source ? ", the source itself" : ""}` });
		if (!choice.transforms_source) {
			trace.push({ stage: `check ${view}`, note: "skipped: nothing was transformed" });
			return { rendering, validation: null, profile: null, decision: { decision: "SHOW", why: "the source is shown as it is" }, shown: { text: rendering.text, is_source: true } };
		}
		const validation = validateGate(task, view, record, source, at, opts);
		trace.push({ stage: `validate the check for ${view}`, note: `${validation.status}; faithful reference passes: ${validation.faithful_passes}` });
		const profile = checkRendering(task, view, record, source, rendering.text, at, validation.status, opts);
		const decision = gateDecision(profile, 1, 1);
		trace.push({ stage: `check ${view}`, note: `${decision.decision}: ${decision.why}` });
		return { rendering, validation, profile, decision, shown: decision.decision === "SHOW" ? { text: rendering.text, is_source: false } : { text: source.text, is_source: true } };
	});
	return { task, choice, views, trace };
}
