// Stable units, and unit selection through the EXISTING compiler.
//
// Selection is not re-implemented here. Units are presented to core/compiler as context
// candidates: a claim's `dependsOn` is its qualifier, so the compiler's dependency closure
// refuses a claim whose qualifier was not admitted (REJECTED_DEPENDENCY). That is closure,
// and only closure. It says nothing about whether any wording is faithful.
import { createHash } from "node:crypto";
import {
  compileContext, defaultPolicy, estimateTokens,
  type ContextCandidate, type ContextRequest, type DecisionTrace,
} from "../../../compiler/src/core/index.ts";
import { AttentionError, type SourceVersion, type Unit } from "./types.ts";

export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export function sliceOf(source: SourceVersion, unit: Pick<Unit, "spans">): string {
  return unit.spans.map(s => source.text.slice(s.start, s.end)).join(" ");
}

export interface UnitProblem { unit: string; code: string; detail: string }

/** Units must be for this source version, with exact spans, resolvable acyclic dependencies. */
export function validateUnits(units: readonly Unit[], source: SourceVersion): UnitProblem[] {
  const out: UnitProblem[] = [];
  const ids = new Set<string>();
  if (sha256(source.text) !== source.sha256) out.push({ unit: "*", code: "SOURCE_HASH_MISMATCH", detail: source.id });
  for (const u of units) {
    if (ids.has(u.id)) out.push({ unit: u.id, code: "DUPLICATE_ID", detail: u.id });
    ids.add(u.id);
    if (u.source_id !== source.id || u.source_version !== source.version) out.push({ unit: u.id, code: "WRONG_SOURCE", detail: `${u.source_id}@${u.source_version}` });
    if (u.spans.length === 0) out.push({ unit: u.id, code: "NO_SPAN", detail: "a unit needs at least one span" });
    for (const s of u.spans) {
      if (!Number.isInteger(s.start) || !Number.isInteger(s.end) || s.start < 0 || s.end > source.text.length || s.start >= s.end)
        out.push({ unit: u.id, code: "BAD_SPAN", detail: JSON.stringify(s) });
    }
    if (!out.some(p => p.unit === u.id && p.code === "BAD_SPAN") && u.spans.length && sliceOf(source, u) !== u.text)
      out.push({ unit: u.id, code: "TEXT_NOT_SPAN", detail: "unit text is not the text at its spans" });
  }
  for (const u of units) for (const d of u.dependsOn) {
    if (!ids.has(d)) out.push({ unit: u.id, code: "UNKNOWN_DEPENDENCY", detail: d });
    if (d === u.id) out.push({ unit: u.id, code: "SELF_DEPENDENCY", detail: d });
  }
  // cycles
  const byId = new Map(units.map(u => [u.id, u]));
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, stack: string[]): void => {
    if (state.get(id) === 2 || !byId.has(id)) return;
    if (state.get(id) === 1) { out.push({ unit: id, code: "DEPENDENCY_CYCLE", detail: [...stack, id].join(">") }); return; }
    state.set(id, 1);
    for (const d of byId.get(id)!.dependsOn) visit(d, [...stack, id]);
    state.set(id, 2);
  };
  for (const u of units) visit(u.id, []);
  return out;
}

export interface UnitSelection {
  /** Unit ids the compiler admitted, in its order. */
  selected: string[];
  /** Units refused, with the compiler's own reason (e.g. REJECTED_DEPENDENCY, REJECTED_BUDGET). */
  rejected: { id: string; decision: string; reason: string }[];
  failure: string | null;
  trace: DecisionTrace;
}

/**
 * Choose units under a token budget. `required` units are MANDATORY; the others are
 * DISCRETIONARY and ordered by the caller-supplied relevance (a declared number, not a score
 * this module computes). Closure is the compiler's.
 */
export function selectUnits(
  units: readonly Unit[], source: SourceVersion, budgetTokens: number,
  opts: { required?: readonly string[]; ineligible?: readonly string[]; relevance?: Readonly<Record<string, number>>; asOf?: string; scope?: string } = {},
): UnitSelection {
  const problems = validateUnits(units, source);
  if (problems.length) throw new AttentionError("INVALID_UNITS", problems.map(p => `${p.unit}:${p.code}`).join(","));
  const required = new Set(opts.required ?? []);
  const ineligible = new Set(opts.ineligible ?? []);
  const candidates: ContextCandidate[] = units.map(u => ({
    candidateId: u.id, contentIdentity: u.id, representationId: "verbatim", formRank: 1, minRank: 1,
    sourceKind: "unit", sourceRef: `${source.id}@${source.version}`, kind: "evidence", content: u.text,
    tokenCount: estimateTokens(u.text)[0], tokenSource: "approximation",
    requirement: required.has(u.id) ? "MANDATORY" : "DISCRETIONARY", orderRole: "evidence",
    scopeEligible: !ineligible.has(u.id), scopeReason: ineligible.has(u.id) ? "declared ineligible by the caller" : "unit of a validated source version",
    freshnessEligible: true, freshnessReason: "source version pinned by hash",
    authorityEligible: true, authorityReason: "authority is decided before units are selected",
    dependsOn: [...u.dependsOn], groupId: null, groupRequired: false, coverageKeys: [],
    relevance: opts.relevance?.[u.id] ?? 1, isDefaultForm: true,
  }));
  const policy = defaultPolicy();
  const request: ContextRequest = {
    requestId: "units", taskId: "units", createdAt: opts.asOf ?? "2026-01-01T00:00:00.000Z",
    usableTokenBudget: budgetTokens, activeScope: opts.scope ?? source.id,
    requiredIds: [...required], policyVersion: policy.policyVersion,
  };
  const out = compileContext(request, candidates, policy);
  const entries = out.result.trace.entries ?? [];
  return {
    selected: out.bundle?.items.map(i => i.id) ?? [],
    rejected: entries.filter(e => e.decision !== "ADMITTED").map(e => ({ id: e.candidateId, decision: e.decision, reason: `${e.reasonCode}: ${e.reasonDetail}` })),
    failure: out.result.failure?.reason ?? null,
    trace: out.result.trace,
  };
}
