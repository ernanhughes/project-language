// Sidecar: material that sits beside a source, never inside it.
//
// This module is new. The lifted providers do not cover it: `lens` produces
// derived representations with lineage, and `evidence` records observations,
// but neither encodes the rules for what may appear beside a source and how it
// must be labelled. Those rules are the content of Chapter 8, so they live here
// and are enforced, not described.
//
//   SOURCE                what the author wrote            (never a sidecar item)
//   SEMANTIC_DERIVATION   what the system re-presented from the source
//   EXTERNAL_EVIDENCE     what was brought in from other material
//   MODEL_GENERATION      what a model produced in response
//
//   derived ≠ externally supported    retrieved ≠ verified    interactive ≠ authoritative
//
// The one structural rule: an item's layer is fixed by the constructor that made
// it, which is fixed by the mechanism that produced it. A producer cannot
// declare its own layer, because a value chosen by the party being inspected
// cannot gate the inspection.
import { createHash } from "node:crypto";

export type Layer = "SEMANTIC_DERIVATION" | "EXTERNAL_EVIDENCE" | "MODEL_GENERATION";
export type ItemKind = "derived" | "retrieved" | "interactive";
/** "re-presented" asserts nothing the source did not say. Everything else is a candidate. */
export type ItemStatus = "re-presented" | "candidate";

export const LAYER_OF: Readonly<Record<ItemKind, Layer>> = {
	derived: "SEMANTIC_DERIVATION",
	retrieved: "EXTERNAL_EVIDENCE",
	interactive: "MODEL_GENERATION",
};

export interface TextDoc {
	id: string;
	content: string;
}

export interface Anchor {
	source_id: string;
	source_sha256: string;
	/** Verbatim text from the source that this item re-presents. */
	quote: string;
}

export interface SidecarItem {
	id: string;
	kind: ItemKind;
	layer: Layer;
	status: ItemStatus;
	content: string;
	/** Derived items only. */
	anchor?: Anchor;
	/**
	 * Derived items only: how the record reads the quotation, in the system's words. NOT part of what is re-presented,
	 * and not checked against the source. It is shown separately and labelled, so an unsupported claim cannot be given the
	 * derived label by being written into `content`.
	 */
	gloss?: string;
	origin: {
		producer: string;
		/** Retrieved items only: where it came from, pinned by hash. */
		external?: { id: string; sha256: string; excerpt: string };
	};
	/** Interactive items: ids of what the answer drew on, if recorded. */
	drew_on: string[];
	/** Interactive items: what the answer cannot be trusted for. Required. */
	limits?: string;
}

export type SidecarProblem =
	| "MALFORMED"
	| "CONTENT_NOT_QUOTE"
	| "SOURCE_UNAVAILABLE"
	| "EXTERNAL_MISMATCH"
	| "DREW_ON_UNKNOWN"
	| "LAYER_KIND_MISMATCH"
	| "ID_MISMATCH"
	| "ANCHOR_MISSING"
	| "ANCHOR_NOT_IN_SOURCE"
	| "SOURCE_HASH_MISMATCH"
	| "EXTERNAL_ORIGIN_MISSING"
	| "EXCERPT_NOT_IN_EXTERNAL"
	| "STATUS_OVERCLAIMS"
	| "LIMITS_MISSING"
	| "LIMITS_TOO_SHORT"
	| "LIMITS_VACUOUS"
	| "LIMITS_NO_LIMITING_CONSTRUCTION"
	| "LIMITS_BOILERPLATE"
	| "EMPTY_CONTENT";

export class SidecarError extends Error {
	readonly problems: SidecarProblem[];
	constructor(problems: SidecarProblem[], message: string) {
		super(message);
		this.name = "SidecarError";
		this.problems = problems;
	}
}

export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

function seal(item: Omit<SidecarItem, "id">): SidecarItem {
	const id = `sc_${sha256(JSON.stringify(item)).slice(0, 16)}`;
	return { id, ...item };
}

/** Re-presents a passage of the source. It must be checkable against the source and nothing more. */
export function derivedItem(source: TextDoc, quote: string, producer = "derivation", gloss?: string): SidecarItem {
	if (quote.trim() === "") throw new SidecarError(["EMPTY_CONTENT"], "a derived item needs the passage it re-presents");
	if (!source.content.includes(quote)) throw new SidecarError(["ANCHOR_NOT_IN_SOURCE"], "the quoted passage is not in the source");
	return seal({
		kind: "derived",
		layer: LAYER_OF.derived,
		status: "re-presented",
		// What is re-presented is the quotation, verbatim. Nothing else can carry the derived label.
		content: quote,
		anchor: { source_id: source.id, source_sha256: sha256(source.content), quote },
		origin: { producer },
		drew_on: [],
		...(gloss !== undefined && gloss.trim() !== "" ? { gloss } : {}),
	});
}

/** Brought in from other material. Arrives as a candidate with its origin pinned; being found says only that something matched. */
export function retrievedItem(external: TextDoc, excerpt: string, producer = "retrieval"): SidecarItem {
	if (excerpt.trim() === "") throw new SidecarError(["EMPTY_CONTENT"], "a retrieved item needs an excerpt");
	if (!external.content.includes(excerpt)) throw new SidecarError(["EXCERPT_NOT_IN_EXTERNAL"], "the excerpt is not in the external document");
	return seal({
		kind: "retrieved",
		layer: LAYER_OF.retrieved,
		status: "candidate",
		content: excerpt,
		origin: { producer, external: { id: external.id, sha256: sha256(external.content), excerpt } },
		drew_on: [],
	});
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").replace(/\s+/g, " ").trim();
const VACUOUS = /^(no|none|nothing|nil|n a|na|unknown|not applicable|no limits?|no limitations?|no caveats?|no known (limits?|limitations?|caveats?))\b/;
const LIMITING = /\b(not|only|without|unchecked|unverified|untested|assum\w*|based on|depends?|may|might|could|cannot|can't|unable|limited|partial|incomplete|approximat\w*|estimate\w*|a single|just one|from (a|one|two|three|the))\b/;

/**
 * What a statement of limits has to be to count. This is lexical and cheap, and it is
 * deliberately honest about what it is: it rejects "None.", a stub, a limit with nothing
 * limiting in it, and the same limit pasted onto every answer. It does NOT make a limit true.
 * A determined producer can write "may be fully trusted" and pass. Presence and specificity,
 * not honesty.
 */
export function checkLimits(limits: string, prior: readonly string[] = []): SidecarProblem[] {
	const n = normalise(limits);
	if (n === "") return ["LIMITS_MISSING"];
	const out: SidecarProblem[] = [];
	if (VACUOUS.test(n)) out.push("LIMITS_VACUOUS");
	if (n.split(" ").length < 5) out.push("LIMITS_TOO_SHORT");
	if (!LIMITING.test(n)) out.push("LIMITS_NO_LIMITING_CONSTRUCTION");
	if (prior.some((p) => normalise(p) === n)) out.push("LIMITS_BOILERPLATE");
	return out;
}

/** A model's own answer. Always a candidate, and it must say, specifically, what it cannot be trusted for. */
export function generatedItem(input: { content: string; producer: string; drew_on?: string[]; limits: string; prior_limits?: readonly string[]; known_ids?: readonly string[] }): SidecarItem {
	const problems: SidecarProblem[] = [];
	// If the caller says what exists to be drawn on, a reference to something else is refused.
	if (input.known_ids !== undefined && (input.drew_on ?? []).some((id) => !input.known_ids!.includes(id))) problems.push("DREW_ON_UNKNOWN");
	if (input.content.trim() === "") problems.push("EMPTY_CONTENT");
	problems.push(...checkLimits(input.limits, input.prior_limits));
	if (problems.length > 0) throw new SidecarError(problems, `cannot place a model answer beside the source: ${problems.join(", ")}`);
	return seal({
		kind: "interactive",
		layer: LAYER_OF.interactive,
		status: "candidate",
		content: input.content,
		origin: { producer: input.producer },
		drew_on: input.drew_on ?? [],
		limits: input.limits,
	});
}

/**
 * Re-check an item that came back from storage. Constructors enforce these rules
 * on the way in; this is the check on the way back out, so an item that was
 * edited, forged or built by hand cannot present itself as something it is not.
 */
export function validateItem(item: SidecarItem, sources: ReadonlyMap<string, TextDoc> = new Map()): SidecarProblem[] {
	// A stored object may be anything. Check its shape before trusting a field of it.
	if (typeof item !== "object" || item === null) return ["MALFORMED"];
	const it = item as unknown as Record<string, unknown>;
	const origin = it["origin"] as Record<string, unknown> | undefined;
	if (
		typeof it["id"] !== "string" || typeof it["content"] !== "string" ||
		typeof it["kind"] !== "string" || !(it["kind"] in LAYER_OF) ||
		typeof it["layer"] !== "string" || typeof it["status"] !== "string" ||
		typeof origin !== "object" || origin === null || typeof origin["producer"] !== "string" ||
		!Array.isArray(it["drew_on"])
	) {
		return ["MALFORMED"];
	}
	const problems: SidecarProblem[] = [];
	if (LAYER_OF[item.kind] !== item.layer) problems.push("LAYER_KIND_MISMATCH");
	const { id, ...rest } = item;
	if (id !== "sc_" + sha256(JSON.stringify(rest)).slice(0, 16)) problems.push("ID_MISMATCH");
	if (item.content.trim() === "") problems.push("EMPTY_CONTENT");
	if (item.kind === "derived") {
		if (item.status !== "re-presented") problems.push("STATUS_OVERCLAIMS");
		if (!item.anchor) problems.push("ANCHOR_MISSING");
		else {
			// What is derived is the quotation and nothing else.
			if (item.content !== item.anchor.quote) problems.push("CONTENT_NOT_QUOTE");
			const source = sources.get(item.anchor.source_id);
			// A source that cannot be consulted is a failure, not a pass: an unchecked anchor is not a checked one.
			if (!source) problems.push("SOURCE_UNAVAILABLE");
			else {
				if (sha256(source.content) !== item.anchor.source_sha256) problems.push("SOURCE_HASH_MISMATCH");
				if (!source.content.includes(item.anchor.quote)) problems.push("ANCHOR_NOT_IN_SOURCE");
			}
		}
	} else {
		if (item.status !== "candidate") problems.push("STATUS_OVERCLAIMS");
		if (item.kind === "retrieved") {
			const ext = item.origin.external;
			if (!ext) problems.push("EXTERNAL_ORIGIN_MISSING");
			else if (item.content !== ext.excerpt || ext.id.trim() === "" || !/^[0-9a-f]{64}$/.test(ext.sha256)) problems.push("EXTERNAL_MISMATCH");
		}
		// The context-free rules are re-checked on the way back out. Boilerplate repetition needs the other items and is checked where they are known.
		if (item.kind === "interactive") problems.push(...checkLimits(item.limits ?? "").filter((p) => p !== "LIMITS_BOILERPLATE"));
	}
	return problems;
}

export const EMPTY_SIDECAR_TEXT = "Nothing to add here. The source stands on its own.";

const LABEL: Record<Layer, string> = {
	SEMANTIC_DERIVATION: "DERIVED FROM THE SOURCE · re-presented, not new",
	EXTERNAL_EVIDENCE: "FROM ELSEWHERE · candidate, not verified",
	MODEL_GENERATION: "MODEL ANSWER · candidate, may be wrong",
};

/**
 * The labelled view. Every item states its layer; none is styled as the source.
 * An empty sidecar says so: nothing is a legitimate output.
 */
export function renderSidecar(items: readonly SidecarItem[]): string {
	const lines = ["BESIDE THE SOURCE (not the source)"];
	if (items.length === 0) return [...lines, EMPTY_SIDECAR_TEXT].join("\n");
	for (const item of items) {
		lines.push("", `[${LABEL[item.layer]}]  ${item.id}`, `  ${item.content}`);
		if (item.anchor) lines.push(`  source ${item.anchor.source_id} ${item.anchor.source_sha256.slice(0, 12)}…: "${item.anchor.quote}"`);
		if (item.gloss) lines.push(`  record's reading (the system's words, not checked against the source): ${item.gloss}`);
		if (item.origin.external) lines.push(`  from ${item.origin.external.id} ${item.origin.external.sha256.slice(0, 12)}…`);
		if (item.kind === "interactive") {
			lines.push(`  produced by ${item.origin.producer}${item.drew_on.length ? `; drew on ${item.drew_on.join(", ")}` : "; drew on: not recorded"}`);
			lines.push(`  limits: ${item.limits}`);
		}
	}
	return lines.join("\n");
}

export type SidecarEventType = "shown" | "opened" | "used" | "dismissed" | "distracting" | "manual_search_needed";
export interface SidecarEvent {
	item_id: string | null;
	event: SidecarEventType;
}

/**
 * Two columns, deliberately not netted. A useful item and a distracting one are
 * not the same kind of thing, so there is no single score here to compute.
 */
export function ledgerColumns(events: readonly SidecarEvent[]): {
	benefit: { used: number; opened: number };
	cost: { shown: number; dismissed: number; distracting: number; manual_searches_still_needed: number };
} {
	const count = (e: SidecarEventType) => events.filter((x) => x.event === e).length;
	return {
		benefit: { used: count("used"), opened: count("opened") },
		cost: { shown: count("shown"), dismissed: count("dismissed"), distracting: count("distracting"), manual_searches_still_needed: count("manual_search_needed") },
	};
}
