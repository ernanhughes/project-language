// Retrieval, eligibility, subscription match, relation, qualification.
// Each is a separate decision with typed reasons. None of them is a score.
import { cosineScore } from "../../../relate/src/engine/compatibility.ts";
import {
  AttentionError, parseTime,
  type Bridge, type CandidateItem, type Reason, type Subscription, type Task,
} from "./types.ts";

const R = (dimension: Reason["dimension"], origin: Reason["origin"], ref: string, text: string): Reason => ({ dimension, origin, ref, text });

// ─── retrieval proposes; it grants nothing ──────────────────────────────────────────────────────
export interface Retrieved { id: string; similarity: number }
/** Lexical closeness to a query. It orders; it never admits, qualifies or establishes a relation. */
export function retrieve(query: string, corpus: readonly CandidateItem[], k: number): Retrieved[] {
  if (!Number.isSafeInteger(k) || k < 0) throw new AttentionError("INVALID_RETRIEVAL_LIMIT", String(k));
  return corpus.map(c => ({ id: c.id, similarity: cosineScore(query, c.text) }))
    .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id, "en")).slice(0, k);
}

// ─── eligibility: permission, currentness, scope. Independent booleans. ─────────────────────────
export interface Eligibility {
  permission: boolean; current: boolean; scope: boolean; eligible: boolean; reasons: Reason[];
  /** Only the reasons that failed. These are the causes of an ineligible item; the others are why it passed. */
  failed: Reason[];
}
export function eligibility(task: Task, c: CandidateItem): Eligibility {
  const reasons: Reason[] = []; const failed: Reason[] = [];
  const grants = c.grants.filter(g => g.principal === task.principal && g.purpose === task.purpose.id && g.id.trim());
  const permission = grants.length > 0;
  reasons.push(permission
    ? R("permission", "source_fact", grants.map(g => g.id).sort().join(","), `grant for ${task.principal} / ${task.purpose.id}`)
    : R("permission", "computed_rule", "no-grant", "no applicable grant"));
  if (!permission) failed.push(reasons.at(-1)!);
  const asOf = parseTime(task.asOf, "task.asOf");
  const current = parseTime(c.validFrom, "validFrom") <= asOf && (c.validUntil === null || asOf < parseTime(c.validUntil, "validUntil")) && !c.supersededBy;
  reasons.push(current
    ? R("currentness", "source_fact", `${c.validFrom}..${c.validUntil ?? "open"}`, `current at ${task.asOf}`)
    : R("currentness", "computed_rule", c.supersededBy ? `superseded-by:${c.supersededBy}` : "interval", "not current at the task time"));
  if (!current) failed.push(reasons.at(-1)!);
  const scope = c.domain === task.scope;
  reasons.push(scope
    ? R("scope", "computed_rule", "scope-equal", `domain "${c.domain}" is the task's scope`)
    : R("scope", "computed_rule", "scope-mismatch", `item domain "${c.domain}" is not the task scope "${task.scope}"`));
  if (!scope) failed.push(reasons.at(-1)!);
  return { permission, current: Boolean(current), scope, eligible: permission && Boolean(current) && scope, reasons, failed };
}

// ─── a subscription is matched as written. It is never rewritten. ───────────────────────────────
export interface Unmet { condition: string; stated: string; observed: string }
export interface SubscriptionMatch {
  matched: boolean; unmet: Unmet[]; excluded_by: string[]; subscription_version: number; reasons: Reason[];
}
export function matchSubscription(sub: Subscription, c: CandidateItem): SubscriptionMatch {
  const unmet: Unmet[] = []; const reasons: Reason[] = [];
  for (const cond of sub.conditions) {
    if (cond.kind === "standing") {
      const ok = cond.requires.includes(c.standing);
      reasons.push(R("evidence_standing", "computed_rule", `${sub.id}@${sub.version}`, `requires ${cond.requires.join("|")}; candidate is ${c.standing}`));
      if (!ok) unmet.push({ condition: `standing in [${cond.requires.join(", ")}]`, stated: cond.stated, observed: c.standing });
    } else {
      const ok = parseTime(c.validFrom, "validFrom") >= parseTime(cond.requires[0]!, "condition.after");
      if (!ok) unmet.push({ condition: `after ${cond.requires[0]}`, stated: cond.stated, observed: c.validFrom });
    }
  }
  const excluded_by = sub.exclusions.filter(x => c.text.toLowerCase().includes(x.toLowerCase()));
  return { matched: unmet.length === 0 && excluded_by.length === 0, unmet, excluded_by, subscription_version: sub.version, reasons };
}

// ─── a relation is established by a bridge or not at all ────────────────────────────────────────
export type RelationStatus = "ESTABLISHED" | "UNRESOLVED" | "NOT_RELATED";
export interface RelationResult { status: RelationStatus; reasons: Reason[]; why: string }
/**
 * Similarity, an embedding, or a model's assertion cannot establish that another item bears on the
 * tracked claim. Only an explicit bridge that names BOTH scopes and says it preserves them can, and
 * it must come from a person or a domain rule.
 */
export function establishRelation(sub: Subscription, c: CandidateItem, bridge?: Bridge): RelationResult {
  const unresolved = (why: string): RelationResult => ({
    status: "UNRESOLVED", why,
    reasons: [R("relation", "computed_rule", "no-bridge", why)],
  });
  if (!bridge) return unresolved(`no bridge connects "${c.scope}" to the tracked claim's scope "${sub.anchor.scope}"; closeness is not a relationship`);
  if (bridge.supplied_by === "model") return unresolved("a model's assertion is a proposal, not a bridge");
  if (!bridge.argument_ref.trim()) return unresolved("a bridge must cite its argument");
  if (!bridge.preserves_scope) return unresolved("the bridge does not claim to preserve scope");
  if (bridge.relation !== sub.relation) return {
    status: "NOT_RELATED", why: `the bridge asserts "${bridge.relation}"; the subscription asks about "${sub.relation}"`,
    reasons: [R("relation", "supplied_judgement", bridge.id, `${bridge.supplied_by} bridge asserts "${bridge.relation}", not the subscribed "${sub.relation}"`)],
  };
  if (bridge.anchor_scope !== sub.anchor.scope) return unresolved(`bridge is for scope "${bridge.anchor_scope}", not the tracked "${sub.anchor.scope}"`);
  if (bridge.candidate_scope !== c.scope) return unresolved(`bridge is for candidate scope "${bridge.candidate_scope}", not "${c.scope}"`);
  return {
    status: "ESTABLISHED", why: bridge.asserts,
    reasons: [R("relation", "supplied_judgement", bridge.id, `${bridge.supplied_by} bridge ${bridge.argument_ref}: ${bridge.asserts}`)],
  };
}

// ─── qualification ──────────────────────────────────────────────────────────────────────────────
export type Qualification = "QUALIFIED" | "UNRESOLVED" | "NOT_QUALIFIED";
export interface QualificationResult {
  outcome: Qualification;
  /** Only a QUALIFIED item is worth interrupting for; an UNRESOLVED one may be made available. */
  worth: "ATTENTION_WORTHY" | "NOTHING";
  match: SubscriptionMatch; relation: RelationResult | null; reasons: Reason[];
}
export function qualify(sub: Subscription, c: CandidateItem, elig: Eligibility, bridge?: Bridge): QualificationResult {
  const match = matchSubscription(sub, c);
  if (!elig.eligible) return { outcome: "NOT_QUALIFIED", worth: "NOTHING", match, relation: null, reasons: elig.failed };
  if (!match.matched) return {
    outcome: "NOT_QUALIFIED", worth: "NOTHING", match, relation: null,
    reasons: [R("evidence_standing", "computed_rule", `${sub.id}@${sub.version}`, `unmet: ${match.unmet.map(u => `${u.condition} (candidate: ${u.observed})`).join("; ") || "excluded: " + match.excluded_by.join(",")}`)],
  };
  const relation = establishRelation(sub, c, bridge);
  if (relation.status === "NOT_RELATED") return { outcome: "NOT_QUALIFIED", worth: "NOTHING", match, relation, reasons: relation.reasons };
  if (relation.status === "UNRESOLVED") return { outcome: "UNRESOLVED", worth: "ATTENTION_WORTHY", match, relation, reasons: relation.reasons };
  return { outcome: "QUALIFIED", worth: "ATTENTION_WORTHY", match, relation, reasons: [...match.reasons, ...relation.reasons] };
}
