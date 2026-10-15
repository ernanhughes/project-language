// Chapter 23: historical truth, current applicability and authority are three decisions.
//
//   WAS TRUE  !=  IS STILL TRUE  !=  MAY GOVERN NOW
//
// `assess` answers the second question from the record and its context. `authorizeUse` answers the third by asking
// core/authority; confidence never enters it. The first is always yes: a retained record is history.
import { evaluate } from "../../authority/src/engine/index.ts";
import type { AuthorityPolicy, AuthorityReceipt, DataOperation, Verdict } from "../../authority/src/engine/types.ts";
import type { Entry, PersonalState, Status } from "./state.ts";
import { parseTime, type PersonalRecord } from "./types.ts";

export interface Context {
  now: string;
  /** The scope of the task at hand, e.g. "architecture-review:payments". */
  scope: string;
  /** The session now running. An overlay from another session is not inherited. */
  session?: string;
}

/** A record scope covers a task scope when they are equal or the task is a narrower part of it. */
export const scopeCovers = (recordScope: string, taskScope: string): boolean => recordScope === "*" || recordScope === taskScope || taskScope.startsWith(`${recordScope}:`);

export interface Assessment {
  id: string;
  kind: PersonalRecord["kind"];
  status: Status;
  /** True for anything retained. History is not corrected by pretending it never existed. */
  historical: true;
  applicable: boolean;
  reasons: string[];
}

const endAt = (r: PersonalRecord): string | null =>
  r.kind === "session_overlay" ? r.ends.at : r.kind === "friction_contract" ? r.expires.at : r.kind === "portable_boundary" ? r.end.at : null;

export function assess(state: PersonalState, id: string, ctx: Context): Assessment {
  const e = state.entries.get(id);
  if (!e) return { id, kind: "declared_preference", status: "retracted", historical: true, applicable: false, reasons: ["no such record"] };
  const r = e.record; const now = parseTime(ctx.now, "now"); const reasons: string[] = [];
  let applicable = true;
  const no = (why: string) => { applicable = false; reasons.push(why); };
  if (e.status !== "active") no(e.status === "superseded" ? `superseded by ${e.replaced_by}: kept as history, not projected into the present` : e.status === "corrected" ? `corrected by ${e.replaced_by}` : `${e.status}${e.note ? ": " + e.note : ""}`);
  if (now < parseTime(r.valid.from, "valid.from")) no("not yet valid");
  if (r.valid.until !== null && now >= parseTime(r.valid.until, "valid.until")) no("its validity interval has ended");
  const end = endAt(r);
  if (end !== null && now >= parseTime(end, "end")) no("its end time has passed");
  if (!scopeCovers(r.scope, ctx.scope)) no(`scope "${r.scope}" does not cover "${ctx.scope}"`);
  if (r.kind === "session_overlay" && ctx.session !== undefined && r.session !== ctx.session) no(`belongs to session "${r.session}", not "${ctx.session}": an overlay is not inherited`);
  if (r.kind === "inferred_belief" && ["rejected", "withdrawn"].includes(r.standing)) no(`standing ${r.standing}`);
  const inv = state.invalidated.get(id); if (inv !== undefined) no(`invalidated for current use: ${inv}`);
  if (applicable) reasons.push("describes the present within its scope");
  return { id, kind: r.kind, status: e.status, historical: true, applicable, reasons };
}

export const assessAll = (state: PersonalState, ctx: Context): Assessment[] => [...state.entries.keys()].map(id => assess(state, id, ctx));

/** The value a record asserts about its key, for deciding whether two records disagree. */
export function valueOf(r: PersonalRecord): string {
  switch (r.kind) {
    case "declared_preference": return `${r.dimension}=${r.setting}`;
    case "declared_policy": return JSON.stringify(Object.entries(r.settings).sort());
    case "accessibility_requirement": return `${r.requirement}|${[...r.forbid_forms].sort()}|${[...r.require_forms].sort()}`;
    case "inferred_belief": return r.proposition;
    case "observed_interaction": return r.behaviour;
    default: return r.id;
  }
}

export interface Contradiction { key: string; scope: string; records: string[]; why: string }
const overlaps = (a: PersonalRecord, b: PersonalRecord): boolean => {
  const aEnd = a.valid.until === null ? Infinity : Date.parse(a.valid.until), bEnd = b.valid.until === null ? Infinity : Date.parse(b.valid.until);
  return Date.parse(a.valid.from) < bEnd && Date.parse(b.valid.from) < aEnd;
};

/**
 * Same key, same scope, overlapping validity, different value, and neither replaces the other: a contradiction to resolve.
 * A later record that SUPERSEDES an earlier one is a revision through time, not a contradiction, and is not reported.
 * Neither is merged; both stay visible.
 */
export function findContradictions(state: PersonalState): Contradiction[] {
  const live = [...state.entries.values()].filter(e => e.status === "active" && ["declared_preference", "declared_policy", "accessibility_requirement", "inferred_belief"].includes(e.record.kind));
  const out: Contradiction[] = [];
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i]!.record, b = live[j]!.record;
    if (a.key !== b.key || a.scope !== b.scope || a.kind !== b.kind) continue;
    if (valueOf(a) === valueOf(b) || !overlaps(a, b) || a.supersedes === b.id || b.supersedes === a.id) continue;
    out.push({ key: a.key, scope: a.scope, records: [a.id, b.id], why: "same key, same scope, overlapping validity, incompatible values, neither supersedes the other: recency does not settle it" });
  }
  return out;
}

// ─── authority ────────────────────────────────────────────────────────────────────────────────────
export interface UseDecision { allowed: boolean; verdict: Verdict; receipt: AuthorityReceipt; why: string }
export const dataScopeOf = (r: PersonalRecord): string => `personal:${r.kind}`;

/** May this record be accessed, processed, inferred from, retained, reused or disclosed, for this purpose? Confidence is not an input. */
export function authorizeUse(
  r: PersonalRecord, operation: DataOperation, purpose: string, policy: AuthorityPolicy, now: string,
  opts: { necessary?: boolean; recipient?: string } = {},
): UseDecision {
  const receipt = evaluate({
    proposal_id: `use:${r.id}:${operation}:${purpose}`, purpose,
    data_uses: [{ source: { id: `${dataScopeOf(r)}:${r.id}`, kind: r.kind, scope: dataScopeOf(r) }, operation, necessary: opts.necessary ?? true, ...(opts.recipient ? { recipient: opts.recipient } : {}) }],
  }, policy, { now });
  const denied = receipt.data_receipts.flatMap(d => d.reasons).filter(x => !x.ok).map(x => `${x.code}: ${x.detail}`);
  return { allowed: receipt.verdict === "ALLOW", verdict: receipt.verdict, receipt, why: receipt.verdict === "ALLOW" ? "authorised" : denied.join("; ") || receipt.verdict };
}

/** A policy that grants the listed operations on the listed record kinds for one purpose. Everything else is refused. */
export function personalPolicy(version: string, grants: { id: string; purpose: string; kinds: PersonalRecord["kind"][]; operations: DataOperation[]; expires_at?: string }[]): AuthorityPolicy {
  return {
    version, actions: [],
    data_use: grants.map(g => ({
      id: g.id, purpose: g.purpose, data_scope: g.kinds.map(k => `personal:${k}:*`), permitted_operations: g.operations,
      ...(g.expires_at ? { expires_at: g.expires_at } : {}),
    })),
  };
}

export type { Entry };
