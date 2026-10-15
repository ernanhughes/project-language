// Part II unit II-02: retrieval proposes membership; host records govern admission.
// No host, model, clock, storage or network access. The existing compiler assembles.
import { createHash } from "node:crypto";
import {
  compileContext, defaultPolicy, estimateTokens, renderBundleText, validateBundle,
  type ContextCandidate, type ContextRequest, type DecisionTrace,
} from "../../compiler/src/core/index.ts";
import { cosineScore } from "../../relate/src/engine/compatibility.ts";

export const BASE_COMMIT = "3239630af2755bead748c1a674fde515041e592a";
export const STRATEGIES = ["indiscriminate", "similarity_only", "constrained"] as const;
export type Strategy = typeof STRATEGIES[number];
export const STAGES = ["available", "retrieved", "eligible", "selected", "assembled", "delivered"] as const;
export type Stage = typeof STAGES[number];
export const digest = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export interface Task {
  id: string;
  principal: string;
  purpose: string;
  service: string;
  environment: string;
  asOf: string;
  query: string;
  maxBytes: number;
  maxEstimatedTokens: number;
}
export interface Source {
  id: string;
  source: { ref: string; text: string; sha256: string };
  kind: "configuration" | "note" | "instruction";
  standing: "declared" | "unverified";
  grants: { id: string; principal: string; purpose: string }[];
  validFrom: string;
  validUntil: string | null;
  supersededBy?: string;
  searchText?: string;
}
export interface Fact { service: string; environment: string; retryLimitAttempts: number }
export interface Decision {
  id: string;
  permission: boolean;
  current: boolean;
  standing: boolean;
  scope: boolean;
  data: boolean;
  eligible: boolean;
  reasons: string[];
  admissionReason: string;
}
export interface Transition {
  id: string;
  sourceRef: string;
  sourceSha256: string;
  stage: Stage;
  outcome: "yes" | "no" | "not_observed";
  reason: string;
}
export interface PacketItem {
  id: string;
  sourceRef: string;
  sourceSha256: string;
  admissionReason: string;
  kind: Source["kind"];
  raw: string;
}
export interface Plan {
  strategy: Strategy;
  task: Task;
  decisions: Decision[];
  retrievedIds: string[];
  selectedIds: string[];
  assembledIds: string[];
  packet: string;
  packetSha256: string;
  bytes: number;
  estimatedTokens: number;
  budgetFits: boolean;
  failure: string | null;
  compilerTrace: DecisionTrace | null;
  transitions: Transition[];
}

function time(value: string): number {
  const n = Date.parse(value);
  if (!Number.isFinite(n)) throw new Error("INVALID_TIME");
  return n;
}
function budget(n: number): boolean { return Number.isSafeInteger(n) && n >= 0 }

/** Narrow declared configuration schema; no semantic extraction from arbitrary text. */
export function parseFact(text: string): Fact | null {
  try {
    const x: unknown = JSON.parse(text);
    if (!x || typeof x !== "object" || Array.isArray(x)) return null;
    const r = x as Record<string, unknown>;
    if (Object.keys(r).sort().join(",") !== "environment,retryLimitAttempts,service") return null;
    if (typeof r.service !== "string" || typeof r.environment !== "string") return null;
    if (!Number.isSafeInteger(r.retryLimitAttempts) || (r.retryLimitAttempts as number) < 0) return null;
    return r as unknown as Fact;
  } catch { return null }
}

function validate(task: Task, sources: readonly Source[]): void {
  if (!budget(task.maxBytes) || !budget(task.maxEstimatedTokens)) throw new Error("INVALID_BUDGET");
  time(task.asOf);
  for (const key of ["id", "principal", "purpose", "service", "environment"] as const)
    if (!task[key]?.trim()) throw new Error("INVALID_TASK");
  const ids = new Set<string>();
  for (const s of sources) {
    if (!s.id || ids.has(s.id)) throw new Error("DUPLICATE_OR_EMPTY_ID");
    ids.add(s.id);
    if (!s.source.ref.trim() || digest(s.source.text) !== s.source.sha256) throw new Error("SOURCE_INTEGRITY");
    if (s.validUntil !== null && time(s.validUntil) <= time(s.validFrom)) throw new Error("INVALID_INTERVAL");
    time(s.validFrom);
    if (!["configuration", "note", "instruction"].includes(s.kind)) throw new Error("INVALID_KIND");
  }
}

/** Declared authority and time are independent gates, never a weighted score. */
export function decide(task: Task, s: Source): Decision {
  const grants = s.grants.filter(g => g.principal === task.principal && g.purpose === task.purpose && g.id.trim());
  const permission = grants.length > 0;
  const current = time(s.validFrom) <= time(task.asOf)
    && (s.validUntil === null || time(task.asOf) < time(s.validUntil)) && !s.supersededBy;
  const standing = s.standing === "declared";
  const fact = parseFact(s.source.text);
  const data = s.kind === "configuration" && fact !== null;
  const scope = fact !== null && fact.service === task.service && fact.environment === task.environment;
  const reasons = [!permission && "NO_APPLICABLE_GRANT", !current && "NOT_CURRENT",
    !standing && "UNACCEPTED_STANDING", !data && "NOT_CONFIGURATION_DATA", !scope && "TASK_SCOPE_MISMATCH"]
    .filter((x): x is string => typeof x === "string");
  return {
    id: s.id, permission, current: Boolean(current), standing, scope, data, eligible: reasons.length === 0, reasons,
    admissionReason: reasons.length ? reasons.join(";") : `grant=${grants.map(g => g.id).sort().join(",")}; current=${task.asOf}; declared configuration for ${task.service}/${task.environment}`,
  };
}

/** The baseline comparison alone ranks by lexical similarity. It grants no standing. */
export function retrieve(task: Task, sources: readonly Source[], k: number): string[] {
  if (!Number.isSafeInteger(k) || k < 0) throw new Error("INVALID_RETRIEVAL_LIMIT");
  return sources.map(s => ({ id: s.id, score: cosineScore(task.query, s.searchText ?? s.source.text) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, "en"))
    .slice(0, k).map(s => s.id);
}

export function planContext(task: Task, sources: readonly Source[], input: {
  strategy?: Strategy; requestedIds?: readonly string[]; topK?: number;
} = {}): Plan {
  validate(task, sources);
  const strategy = input.strategy ?? "constrained";
  if (!STRATEGIES.includes(strategy)) throw new Error("INVALID_STRATEGY");
  const byId = new Map(sources.map(s => [s.id, s]));
  const retrievedIds = [...new Set(input.requestedIds ?? (strategy === "similarity_only"
    ? retrieve(task, sources, input.topK ?? 3) : sources.map(s => s.id)))];
  if (retrievedIds.some(id => !byId.has(id))) throw new Error("UNKNOWN_SOURCE_ID");
  const decisions = sources.map(s => decide(task, s));
  const byDecision = new Map(decisions.map(d => [d.id, d]));
  const candidates: ContextCandidate[] = retrievedIds.map(id => {
    const s = byId.get(id)!; const d = byDecision.get(id)!;
    const item: PacketItem = { id, sourceRef: s.source.ref, sourceSha256: s.source.sha256,
      admissionReason: strategy === "constrained" ? d.admissionReason : `UNSAFE_SYNTHETIC_BASELINE:${strategy}`,
      kind: s.kind, raw: s.source.text };
    const content = JSON.stringify(item);
    return {
      candidateId: id, contentIdentity: id, representationId: "verbatim-json", formRank: 1, minRank: 1,
      sourceKind: "declared-source", sourceRef: s.source.ref, kind: "evidence", content,
      tokenCount: estimateTokens(content)[0], tokenSource: "approximation", requirement: "DISCRETIONARY", orderRole: "evidence",
      scopeEligible: d.scope && d.data && d.standing, scopeReason: d.reasons.join(";"),
      freshnessEligible: d.current, freshnessReason: "declared interval and supersession",
      authorityEligible: d.permission, authorityReason: "host-held principal/purpose grants",
      dependsOn: [], groupId: null, groupRequired: false, coverageKeys: [], relevance: 1, isDefaultForm: true,
    };
  });
  let selectedIds: string[]; let packet: string; let failure: string | null = null;
  let compilerTrace: DecisionTrace | null = null;
  if (strategy === "constrained") {
    const policy = defaultPolicy();
    const request: ContextRequest = { requestId: task.id, taskId: task.id, createdAt: task.asOf,
      usableTokenBudget: task.maxEstimatedTokens, activeScope: task.service, requiredIds: [], policyVersion: policy.policyVersion };
    const result = compileContext(request, candidates, policy);
    compilerTrace = result.result.trace;
    selectedIds = result.bundle?.items.map(i => i.id) ?? [];
    failure = result.result.failure?.reason ?? null;
    if (result.bundle && validateBundle(result.bundle, request, candidates, policy).length) throw new Error("INVALID_COMPILER_BUNDLE");
    packet = result.bundle ? renderBundleText(result.bundle) : "";
  } else {
    // Intentionally unsafe controls over invented data, not a model-selectable bypass.
    selectedIds = [...retrievedIds];
    packet = `[CONTEXT BUNDLE]\nid: ${task.id}\nitems: ${candidates.length}\n---\n${candidates.map(c => c.content).join("\n---\n")}\n[/CONTEXT BUNDLE]\n`;
  }
  const proposedBytes = Buffer.byteLength(packet, "utf8");
  const proposedTokens = estimateTokens(packet)[0];
  if (strategy === "constrained" && (proposedBytes > task.maxBytes || proposedTokens > task.maxEstimatedTokens)) {
    failure = "ASSEMBLED_BUDGET_EXCEEDED"; packet = "";
  }
  const assembledIds = packet ? [...selectedIds] : [];
  const bytes = Buffer.byteLength(packet, "utf8"); const estimatedTokens = estimateTokens(packet)[0];
  const transitions: Transition[] = sources.flatMap(s => STAGES.map(stage => {
    const d = byDecision.get(s.id)!;
    const member = stage === "available" ? true : stage === "retrieved" ? retrievedIds.includes(s.id)
      : stage === "eligible" ? retrievedIds.includes(s.id) && d.eligible
      : stage === "selected" ? selectedIds.includes(s.id) : stage === "assembled" ? assembledIds.includes(s.id) : false;
    return { id: s.id, sourceRef: s.source.ref, sourceSha256: s.source.sha256, stage,
      outcome: stage === "delivered" ? "not_observed" : member ? "yes" : "no",
      reason: stage === "delivered" ? "provider observation required" : stage === "eligible" ? d.admissionReason
        : member ? stage === "selected" && strategy !== "constrained" ? "BASELINE_BYPASS" : stage : failure ?? "not in this stage" };
  }));
  return { strategy, task: structuredClone(task), decisions, retrievedIds, selectedIds, assembledIds, packet,
    packetSha256: digest(packet), bytes, estimatedTokens, budgetFits: bytes <= task.maxBytes && estimatedTokens <= task.maxEstimatedTokens,
    failure, compilerTrace, transitions };
}

/** Pure observer: only the actual provider-visible text can establish delivery. */
export function observeDelivery(plan: Plan, providerText: string) {
  const count = plan.packet ? providerText.split(plan.packet).length - 1 : 0;
  const confirmed = plan.packet !== "" && count === 1;
  return { confirmed, packetSha256: plan.packetSha256, observedTextSha256: digest(providerText),
    deliveredIds: confirmed ? [...plan.assembledIds] : [],
    transitions: plan.transitions.map(t => t.stage === "delivered" ? { ...t,
      outcome: (confirmed && plan.assembledIds.includes(t.id) ? "yes" : "no") as Transition["outcome"],
      reason: confirmed ? "exact managed block observed once at provider callback" : "managed delivery not confirmed" } : t) };
}

/** Toy reader, independent of admission decisions. Never calls a model or sees the oracle. */
export function readAnswer(packet: string, task: Pick<Task, "service" | "environment">):
  { outcome: "answer"; value: number } | { outcome: "abstain"; reason: "NO_FACT" | "CONFLICT" } {
  const values = new Set<number>();
  for (const line of packet.split("\n")) {
    try {
      const item = JSON.parse(line) as PacketItem;
      if (item.kind !== "configuration") continue;
      const fact = parseFact(item.raw);
      if (fact?.service === task.service && fact.environment === task.environment) values.add(fact.retryLimitAttempts);
    } catch { /* framing and unstructured lines are not facts */ }
  }
  return values.size === 1 ? { outcome: "answer", value: [...values][0]! }
    : { outcome: "abstain", reason: values.size ? "CONFLICT" : "NO_FACT" };
}

/** Separate dimensions, not an aggregate score. Expected answer is evaluator-owned. */
export function evaluateDelivery(plan: Plan, providerText: string, expected: number) {
  const delivery = observeDelivery(plan, providerText);
  const decisions = new Map(plan.decisions.map(d => [d.id, d]));
  const delivered = delivery.deliveredIds.map(id => decisions.get(id)!);
  const answer = readAnswer(delivery.confirmed ? plan.packet : "", plan.task);
  return { delivery, answer, dimensions: {
    permissionViolations: delivered.filter(d => !d.permission).map(d => d.id),
    currentnessViolations: delivered.filter(d => !d.current).map(d => d.id),
    scopeOrSchemaViolations: delivered.filter(d => !d.scope || !d.data || !d.standing).map(d => d.id),
    provenanceCovered: delivered.every(d => Boolean(d.admissionReason)),
    budgetFits: plan.budgetFits, bytes: plan.bytes, estimatedTokens: plan.estimatedTokens,
    taskCorrect: answer.outcome === "answer" ? answer.value === expected : null,
    abstained: answer.outcome === "abstain", realModelUse: "unobserved", helpfulness: "unmeasured",
  } };
}
