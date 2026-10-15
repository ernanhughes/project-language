// The ladder: moving intent from ordinary language toward forms a machine can check.
//
// This module is new. No lifted provider covers it. It does not try to rank the
// rungs of the ladder (the chapter's point is that more formal is not better). It
// implements the four things about the move that can be enforced:
//
//   1. An interpretive choice is a declared decision with options, bound to the words
//      that prompted it. The binding is hashed so it stays inspectable.
//   2. Checks run only on what has been settled. An unsettled reading yields
//      INCONCLUSIVE, never a pass.
//   3. A model may propose a reading; only a person settles it, and only a person
//      can say the explained-back version still means what they meant.
//   4. An option's name must not be able to override its definition. A probe permutes
//      and renames the options and asks whether the chosen definition stays the same.
//
//   intent preservation ≠ checkability ≠ implementation conformance
//   type conformance ≠ semantic correctness
import { createHash } from "node:crypto";

const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x), "utf8").digest("hex");

export const RUNGS = [
	"natural prose",
	"controlled prose",
	"structured requirements",
	"schemas and constraints",
	"executable contracts",
	"state-transition representations",
	"formal specification or proof",
	"machine-native operational state",
] as const;
export type Rung = (typeof RUNGS)[number];

// ─── Decisions: words at the boundary ──────────────────────────────────────

export interface DecisionOption {
	/** Opaque identifier. Consumers key on this, not on the label. */
	id: string;
	/** What it is called on screen. */
	label: string;
	/** What it means. The definition is the contract. */
	definition: string;
}

export interface Decision {
	id: string;
	/** The word or phrase whose reading is being chosen. */
	term: string;
	/** The words of the original request that prompted the question. */
	passage: { text: string; sha256: string };
	options: DecisionOption[];
}

export function decision(input: { id: string; term: string; passage: string; options: DecisionOption[] }): Decision {
	if (input.options.length < 2) throw new LadderError("TOO_FEW_OPTIONS", "a decision needs at least two readings to be a decision");
	if (new Set(input.options.map((o) => o.id)).size !== input.options.length) throw new LadderError("DUPLICATE_OPTION", "option ids must be unique");
	if (!input.passage.includes(input.term)) throw new LadderError("TERM_NOT_IN_PASSAGE", "the term must appear in the passage that prompted the question");
	return { id: input.id, term: input.term, passage: { text: input.passage, sha256: sha(input.passage) }, options: input.options };
}

/** The binding: option name, definition, term and source passage, in one hash. */
export function bindingHash(d: Decision, optionId: string): string {
	const o = d.options.find((x) => x.id === optionId);
	if (!o) throw new LadderError("UNKNOWN_OPTION", `no option ${optionId} in decision ${d.id}`);
	return sha({ decision: d.id, term: d.term, passage: d.passage.sha256, option: o });
}

export type ResolutionStatus = "proposed" | "settled" | "deferred";
export type Actor = { type: "human" | "model"; id: string };

export interface Resolution {
	decision_id: string;
	option_id?: string;
	status: ResolutionStatus;
	by: Actor;
	/** Present when an option was chosen. */
	binding_sha256?: string;
	reason?: string;
}

export class LadderError extends Error {
	readonly code: "TOO_FEW_OPTIONS" | "DUPLICATE_OPTION" | "TERM_NOT_IN_PASSAGE" | "UNKNOWN_OPTION" | "NOT_A_PERSON" | "NO_REASON" | "BINDING_MISMATCH";
	constructor(code: LadderError["code"], message: string) {
		super(message);
		this.name = "LadderError";
		this.code = code;
	}
}

/** Anyone may propose a reading. The proposal carries the binding it was made against. */
export function propose(d: Decision, optionId: string, by: Actor, reason?: string): Resolution {
	return { decision_id: d.id, option_id: optionId, status: "proposed", by, binding_sha256: bindingHash(d, optionId), ...(reason ? { reason } : {}) };
}

/** Only a person settles a reading. */
export function settle(d: Decision, optionId: string, by: Actor, reason: string): Resolution {
	if (by.type !== "human") throw new LadderError("NOT_A_PERSON", `only a person settles an interpretation; got ${by.type}`);
	if (reason.trim() === "") throw new LadderError("NO_REASON", "settling needs a reason");
	return { decision_id: d.id, option_id: optionId, status: "settled", by, binding_sha256: bindingHash(d, optionId), reason };
}

/** A person may leave the choice open. */
export function defer(d: Decision, by: Actor, reason: string): Resolution {
	if (by.type !== "human") throw new LadderError("NOT_A_PERSON", `only a person defers an interpretation; got ${by.type}`);
	return { decision_id: d.id, status: "deferred", by, reason };
}

/**
 * The resolution in force for a decision: the latest. Returns it only if the binding it
 * carries still matches the declaration, so a relabelled or redefined option is not honoured.
 */
export function inForce(d: Decision, history: readonly Resolution[]): { resolution?: Resolution; stale: boolean } {
	const mine = history.filter((r) => r.decision_id === d.id);
	const latest = mine.at(-1);
	if (!latest) return { stale: false };
	if (latest.option_id && latest.binding_sha256 !== bindingHash(d, latest.option_id)) return { stale: true };
	return { resolution: latest, stale: false };
}

// ─── Checks run only on what has been settled ──────────────────────────────

export type Verdict = "PASS" | "FAIL" | "INCONCLUSIVE";

export interface Requirement<Trace> {
	id: string;
	text: string;
	/** Decisions whose readings this requirement depends on. */
	depends_on: string[];
	/** Given a trace and the chosen option id for each dependency, say whether the requirement holds. */
	holds: (trace: Trace, chosen: Readonly<Record<string, string>>) => { ok: boolean; detail: string };
}

export interface CheckResult {
	requirement: string;
	verdict: Verdict;
	reason: "CHECKED" | "UNSETTLED_INTERPRETATION" | "STALE_BINDING";
	/** For INCONCLUSIVE: which decisions blocked it. For PASS/FAIL: the readings it was checked under. */
	readings: Record<string, string>;
	blocked_on: string[];
	detail: string;
}

export function check<Trace>(req: Requirement<Trace>, trace: Trace, decisions: readonly Decision[], history: readonly Resolution[]): CheckResult {
	const chosen: Record<string, string> = {};
	const blocked: string[] = [];
	let stale = false;
	for (const id of req.depends_on) {
		const d = decisions.find((x) => x.id === id);
		if (!d) {
			blocked.push(id);
			continue;
		}
		const { resolution, stale: s } = inForce(d, history);
		stale ||= s;
		if (resolution?.status === "settled" && resolution.option_id) chosen[id] = resolution.option_id;
		else blocked.push(id);
	}
	if (blocked.length > 0) {
		return {
			requirement: req.id,
			verdict: "INCONCLUSIVE",
			reason: stale ? "STALE_BINDING" : "UNSETTLED_INTERPRETATION",
			readings: chosen,
			blocked_on: blocked,
			detail: `not checked: ${blocked.join(", ")} not settled by a person`,
		};
	}
	const r = req.holds(trace, chosen);
	return { requirement: req.id, verdict: r.ok ? "PASS" : "FAIL", reason: "CHECKED", readings: chosen, blocked_on: [], detail: r.detail };
}

// ─── Translation between rungs ─────────────────────────────────────────────

export type TranslationRelation = "preserves" | "narrows" | "expands" | "drops_part" | "contradicts" | "still_ambiguous";
export type IntentStatus = "unasked" | "confirmed" | "rejected";

export interface Translation {
	id: string;
	from: Rung;
	to: Rung;
	relation: TranslationRelation;
	/** Interpretations removed by the settled choices: each settled decision removes (options - 1). */
	interpretations_removed: number;
	unsettled: string[];
	/** What the person said when the explained-back version was put to them. */
	intent: { status: IntentStatus; by?: Actor; note?: string };
}

export function translation(input: { id: string; from: Rung; to: Rung; claimed: TranslationRelation; decisions: readonly Decision[]; history: readonly Resolution[] }): Translation {
	let removed = 0;
	const unsettled: string[] = [];
	for (const d of input.decisions) {
		const { resolution } = inForce(d, input.history);
		if (resolution?.status === "settled") removed += d.options.length - 1;
		else unsettled.push(d.id);
	}
	// A translation with open choices cannot claim to preserve or to have narrowed cleanly.
	const open = unsettled.length > 0;
	const relation: TranslationRelation = open && (input.claimed === "preserves" || input.claimed === "narrows") ? "still_ambiguous" : input.claimed;
	return { id: input.id, from: input.from, to: input.to, relation, interpretations_removed: removed, unsettled, intent: { status: "unasked" } };
}

/** Whether the more explicit version still says what the person meant is theirs to say. */
export function confirmIntent(t: Translation, by: Actor, confirmed: boolean, note: string): Translation {
	if (by.type !== "human") throw new LadderError("NOT_A_PERSON", `only a person can say whether the translation kept their intent; got ${by.type}`);
	return { ...t, intent: { status: confirmed ? "confirmed" : "rejected", by, note } };
}

/** Plain language, for the person to read back: each choice, in their own words, with what was set aside. */
export function explainBack(decisions: readonly Decision[], history: readonly Resolution[]): string {
	return decisions
		.map((d) => {
			const { resolution } = inForce(d, history);
			if (resolution?.status === "settled" && resolution.option_id) {
				const chosen = d.options.find((o) => o.id === resolution.option_id)!;
				const others = d.options.filter((o) => o.id !== chosen.id).map((o) => o.label);
				return `"${d.term}" is read as: ${chosen.label} (${chosen.definition}). Not: ${others.join(", ")}. From: "${d.passage.text}"`;
			}
			return `"${d.term}" is still open: ${d.options.map((o) => o.label).join(" / ")}. From: "${d.passage.text}"`;
		})
		.join("\n");
}

// ─── Does the name override the definition? ────────────────────────────────

export interface Presented {
	/** The label the selector sees. */
	label: string;
	definition: string;
}

/** A selector sees the term, the passage and the presented options, and names the label it chooses. */
export type Selector = (term: string, passage: string, options: readonly Presented[]) => string;

export interface BindingProbe {
	variant: string;
	/** The definition of the option the selector chose under this presentation. */
	chosen_definition: string | null;
	agrees_with_baseline: boolean;
}

/**
 * Present the same options under different names and orders, and ask whether the
 * selector keeps choosing the same DEFINITION. A selector that follows names instead
 * of definitions will change its answer when only the names change.
 */
export function probeBinding(d: Decision, selector: Selector): { baseline: string | null; stable: boolean; variants: BindingProbe[] } {
	const present = (labels: string[], order: number[]): Presented[] => order.map((i) => ({ label: labels[i]!, definition: d.options[i]!.definition }));
	const pick = (p: Presented[]): string | null => {
		const label = selector(d.term, d.passage.text, p);
		return p.find((x) => x.label === label)?.definition ?? null;
	};
	const real = d.options.map((o) => o.label);
	const n = d.options.length;
	const identity = [...Array(n).keys()];
	const reversed = [...identity].reverse();
	const opaque = d.options.map((_, i) => `option-${String.fromCharCode(65 + i)}`);
	// Rotate the labels so that each label sits on a different definition.
	const rotated = d.options.map((_, i) => real[(i + 1) % n]!);
	const baseline = pick(present(real, identity));
	const variants: [string, string[], number[]][] = [
		["reversed order", real, reversed],
		["opaque labels", opaque, identity],
		["labels rotated onto other definitions", rotated, identity],
	];
	const results = variants.map(([variant, labels, order]) => {
		const chosen = pick(present(labels, order));
		return { variant, chosen_definition: chosen, agrees_with_baseline: chosen === baseline };
	});
	return { baseline, stable: results.every((r) => r.agrees_with_baseline), variants: results };
}
