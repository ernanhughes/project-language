// Delivery timing, and the versioned lifecycle of a delivery decision.
//
// Timing is its own decision. `schedule` takes NO resolution and NO relevance as input, so it
// cannot rewrite them, and a test checks that its answer is the same for every resolution.
// A queued decision is not terminal: re-evaluation appends a new revision, never edits an old one.
import {
  AttentionError, parseTime,
  type Cost, type DeliveryMode, type Reason, type Resolution, type Status, type Urgency,
} from "./types.ts";

export const POLICY_VERSION = "attention-policy-v1";
const R = (dimension: Reason["dimension"], origin: Reason["origin"], ref: string, text: string): Reason => ({ dimension, origin, ref, text });

// ─── context: declared or observed, never inferred ──────────────────────────────────────────────
export const CONTEXT_KEYS = ["calendar_state", "focus_mode", "next_break_at", "digest_at", "do_not_disturb"] as const;
export type ContextKey = (typeof CONTEXT_KEYS)[number];
/** Allowed values. Anything else is refused: an unknown value is not read as permission to interrupt. */
export const CONTEXT_VALUES: Readonly<Partial<Record<ContextKey, readonly string[]>>> = {
  calendar_state: ["in_meeting", "free", "unknown"],
  focus_mode: ["normal", "blockers_only"],
  do_not_disturb: ["on", "off"],
};
export interface ContextFact { key: ContextKey; value: string; origin: "declared_context" | "observed_context"; ref: string; at: string }

/** An inferred state, an unknown key, or a fact with no ref is refused. Mood, stress and boredom have no key. */
export function assertContext(facts: readonly ContextFact[]): void {
  for (const f of facts) {
    if (!(CONTEXT_KEYS as readonly string[]).includes(f.key)) throw new AttentionError("CONTEXT_KEY_NOT_ALLOWED", `${String(f.key)} is not a declared or observable context key`);
    if ((f.origin as string) !== "declared_context" && (f.origin as string) !== "observed_context") throw new AttentionError("CONTEXT_ORIGIN", `${f.key}: origin ${String(f.origin)} is not declared or observed`);
    if (!f.ref.trim()) throw new AttentionError("CONTEXT_NO_REF", `${f.key} has no ref`);
    parseTime(f.at, `${f.key}.at`);
    const allowed = CONTEXT_VALUES[f.key];
    if (allowed && !allowed.includes(f.value)) throw new AttentionError("CONTEXT_VALUE_NOT_ALLOWED", `${f.key}=${JSON.stringify(f.value)} is not one of ${allowed.join(", ")}`);
    if (!allowed) parseTime(f.value, `${f.key}.value`);
  }
}
const ctxVal = (facts: readonly ContextFact[], key: ContextKey): string | undefined => facts.filter(f => f.key === key).at(-1)?.value;

export interface TimingInput {
  now: string;
  /** When the value of this item decays to nothing, if it does. From the item. */
  acts_by: string | null;
  context: readonly ContextFact[];
  /** Declared: the item must not interrupt at all, whatever its urgency. */
  non_interruptive?: boolean;
  /** Declared: delay would cost more than interrupting, even now. */
  delay_exceeds_interruption?: boolean;
}
export interface Timing {
  urgency: Urgency; cost: Cost; mode: DeliveryMode; deliver_after: string | null; reasons: Reason[];
}

export function urgencyOf(i: TimingInput): { urgency: Urgency; reasons: Reason[] } {
  const now = parseTime(i.now, "now");
  if (i.acts_by === null) return { urgency: "LOW", reasons: [R("urgency", "source_fact", "no-deadline", "the item has no deadline")] };
  const by = parseTime(i.acts_by, "acts_by");
  const brk = ctxVal(i.context, "next_break_at");
  const digest = ctxVal(i.context, "digest_at");
  if (by <= now) return { urgency: "HIGH", reasons: [R("urgency", "computed_rule", "past-deadline", "the deadline has arrived")] };
  if (!brk || by <= parseTime(brk, "next_break_at")) return { urgency: "HIGH", reasons: [R("urgency", "computed_rule", "before-break", "the item loses its value before the next break")] };
  if (digest && parseTime(digest, "digest_at") < by) return { urgency: "LOW", reasons: [R("urgency", "computed_rule", "digest-in-time", "the next digest arrives before the deadline")] };
  return { urgency: "MEDIUM", reasons: [R("urgency", "computed_rule", "after-break", "it can wait for the next break and still arrive before the deadline")] };
}

export function costOf(i: TimingInput): { cost: Cost; reasons: Reason[] } {
  const cal = ctxVal(i.context, "calendar_state");
  const dnd = ctxVal(i.context, "do_not_disturb");
  const focus = ctxVal(i.context, "focus_mode");
  if (dnd === "on") return { cost: "HIGH", reasons: [R("interruption_cost", "declared_context", "do_not_disturb", "do-not-disturb is on")] };
  if (cal === "in_meeting") return { cost: "HIGH", reasons: [R("interruption_cost", "observed_context", "calendar_state", "the person is in a meeting")] };
  if (focus === "blockers_only") return { cost: "HIGH", reasons: [R("interruption_cost", "declared_context", "focus_mode", "focus mode: blockers and expiring items only")] };
  if (cal !== "free") return { cost: "HIGH", reasons: [R("interruption_cost", "computed_rule", "calendar-unknown", cal === undefined ? "no calendar state was observed; not assumed free" : "the calendar state is unknown; not assumed free")] };
  return { cost: "LOW", reasons: [R("interruption_cost", "observed_context", "calendar_state", "the calendar shows the person is free and nothing declared protects this moment")] };
}

/**
 * The delivery table. Input has no resolution, no relevance, no confidence: urgency does not raise
 * evidence, and timing cannot rewrite earlier decisions.
 */
export function schedule(i: TimingInput): Timing {
  assertContext(i.context);
  const u = urgencyOf(i); const c = costOf(i);
  const reasons = [...u.reasons, ...c.reasons];
  const brk = ctxVal(i.context, "next_break_at") ?? null;
  const digest = ctxVal(i.context, "digest_at") ?? null;
  let mode: DeliveryMode; let after: string | null = null;
  if (i.non_interruptive) { mode = "AVAILABLE"; reasons.push(R("timing", "declared_policy", "non-interruptive", "declared non-interruptive: kept within reach, not competing for attention")); }
  else if (c.cost === "LOW") {
    if (u.urgency === "LOW") { mode = digest ? "DIGEST" : "QUEUE"; after = digest; reasons.push(R("timing", "computed_rule", "low-urgency-low-cost", digest ? "waits for the scheduled digest" : "queued for the next natural break")); }
    else { mode = "NOW"; reasons.push(R("timing", "computed_rule", "cost-low", "surfacing now costs little and waiting would not help")); }
  } else if (u.urgency === "HIGH") {
    if (i.delay_exceeds_interruption) { mode = "NOW"; reasons.push(R("timing", "declared_context", "delay-exceeds-interruption", "declared: the cost of delay is larger than the cost of interrupting")); }
    else { mode = "QUEUE"; after = brk; reasons.push(R("timing", "computed_rule", "high-urgency-high-cost", "interrupting costs more than the delay: held for the nearest break")); }
  } else if (u.urgency === "MEDIUM") { mode = "QUEUE"; after = brk; reasons.push(R("timing", "computed_rule", "medium-urgency-high-cost", "held for the next break; it still arrives before the deadline")); }
  else { mode = digest ? "DIGEST" : "AVAILABLE"; after = digest; reasons.push(R("timing", "computed_rule", "low-urgency-high-cost", digest ? "gathered into the digest" : "kept available, not surfaced")); }
  return { urgency: u.urgency, cost: c.cost, mode, deliver_after: after, reasons };
}

// ─── the lifecycle: revisions, never edits ──────────────────────────────────────────────────────
export type Circumstance =
  | { kind: "meeting_ended"; at: string }
  | { kind: "deadline_approaching"; at: string }
  | { kind: "deadline_passed"; at: string }
  | { kind: "evidence_stale"; at: string; detail: string }
  | { kind: "permission_revoked"; at: string; detail: string }
  | { kind: "superseded"; at: string; by: string }
  | { kind: "reopened"; at: string; by: string };

export interface Revision {
  decision_id: string;
  revision: number;
  /** The revision this one follows. */
  prior: { decision_id: string; revision: number } | null;
  status: Status;
  resolution: Resolution | null;
  mode: DeliveryMode | null;
  /** Carried across revisions: an item made non-interruptive stays so when circumstances change. */
  non_interruptive: boolean;
  trigger: Circumstance | null;
  policy_version: string;
  reasons: Reason[];
  evaluated_at: string;
}

export function firstRevision(decision_id: string, resolution: Resolution | null, timing: Timing | null, now: string, reasons: Reason[], status: Status = "PENDING", nonInterruptive = false): Revision {
  parseTime(now, "evaluated_at");
  return Object.freeze({ decision_id, revision: 1, prior: null, status, resolution, mode: timing?.mode ?? null, non_interruptive: nonInterruptive, trigger: null, policy_version: POLICY_VERSION, reasons: [...reasons, ...(timing?.reasons ?? [])], evaluated_at: now });
}

const TERMINAL: readonly Status[] = ["DELIVERED", "WITHDRAWN", "EXPIRED"];
export const isTerminal = (s: Status) => TERMINAL.includes(s);
export const current = (history: readonly Revision[]): Revision => {
  if (history.length === 0) throw new AttentionError("EMPTY_HISTORY", "no revisions");
  return history[history.length - 1]!;
};

/** What is still true of the candidate, rechecked on every re-evaluation and on reopening. */
export interface Standing { permission: boolean; current: boolean; scope: boolean; standing: boolean }

export interface ReevalInput {
  history: readonly Revision[];
  circumstance: Circumstance;
  /** Timing inputs at the new time. NOTE: no resolution here. Timing cannot rewrite it. */
  timing: TimingInput;
  standing: Standing;
  acts_by: string | null;
}
export function reevaluate(i: ReevalInput): Revision {
  const last = current(i.history);
  if (isTerminal(last.status)) throw new AttentionError("TERMINAL_REVISION", `${last.decision_id} r${last.revision} is ${last.status}; a settled decision is not reopened by timing`);
  const at = i.circumstance.at;
  const base = { decision_id: last.decision_id, revision: last.revision + 1, prior: { decision_id: last.decision_id, revision: last.revision }, trigger: i.circumstance, policy_version: POLICY_VERSION, evaluated_at: at, resolution: last.resolution, non_interruptive: last.non_interruptive } as const;
  const lost = (["permission", "current", "scope", "standing"] as const).filter(k => !i.standing[k]);
  const c = i.circumstance;
  if (c.kind === "permission_revoked" || c.kind === "superseded" || c.kind === "evidence_stale" || lost.length) {
    const why = c.kind === "superseded" ? `superseded by ${c.by}` : "detail" in c ? c.detail : `no longer ${lost.join(", ")}`;
    return Object.freeze({ ...base, status: "WITHDRAWN" as Status, mode: null, reasons: [R(c.kind === "permission_revoked" ? "permission" : c.kind === "superseded" ? "currentness" : "evidence_standing", "computed_rule", c.kind, `withdrawn: ${why}`)] });
  }
  if (c.kind === "deadline_passed" || (i.acts_by !== null && parseTime(i.acts_by, "acts_by") <= parseTime(at, "at") && last.mode !== "NOW")) {
    return Object.freeze({ ...base, status: "EXPIRED" as Status, mode: null, reasons: [R("urgency", "computed_rule", "deadline-passed", "the value of the item has expired before it was delivered")] });
  }
  const timing = schedule({ ...i.timing, now: at, acts_by: i.acts_by, non_interruptive: last.non_interruptive || i.timing.non_interruptive === true });
  return Object.freeze({ ...base, status: "PENDING" as Status, mode: timing.mode, reasons: [R("timing", "computed_rule", `trigger:${c.kind}`, `re-evaluated because: ${c.kind}`), ...timing.reasons] });
}

/** Record that the interface presented it. The receipt, not this call, is the evidence. */
export function markDelivered(history: readonly Revision[], receipt: { decision_id: string; revision: number; presented_at: string }): Revision {
  const last = current(history);
  if (receipt.decision_id !== last.decision_id || receipt.revision !== last.revision) throw new AttentionError("RECEIPT_REVISION_MISMATCH", `receipt is for r${receipt.revision}, current is r${last.revision}`);
  if (isTerminal(last.status)) throw new AttentionError("TERMINAL_REVISION", `${last.decision_id} is ${last.status}`);
  return Object.freeze({
    decision_id: last.decision_id, revision: last.revision + 1, prior: { decision_id: last.decision_id, revision: last.revision }, status: "DELIVERED" as Status,
    resolution: last.resolution, mode: last.mode, non_interruptive: last.non_interruptive, trigger: null, policy_version: POLICY_VERSION, evaluated_at: receipt.presented_at,
    reasons: [R("timing", "observed_context", "presentation-receipt", "an interface presented it; this does not show it was noticed")],
  });
}
