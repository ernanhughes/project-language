// Chapter 26: protection that travels. A boundary the person declared, carried to another service WITHOUT the history that
// produced it, applied only as exactly as the service allows, and reported honestly stage by stage.
//
//   DECLARED != CARRIED != RECEIVED != SUPPORTED != ENFORCED != VERIFIED
//
// Only fake services exist here. A service limitation never enlarges the instruction: a broader-only control is refused or
// the rule is returned for reformulation. Revocation and creation share one adapter path, `transmit`. Verification is its own
// act, a readback checked through core/verify, and nothing earlier implies it.
import { recordStructured } from "../../evidence/src/capture.ts";
import { assess, type Context } from "./applicability.ts";
import type { PersonalState } from "./state.ts";
import { PersonalError, type PortableBoundary } from "./types.ts";

export const STAGES = ["declared", "carried", "received", "supported", "enforced", "verified"] as const;
export type Stage = (typeof STAGES)[number];
export type StageState = "yes" | "no" | "unknown" | "not_attempted";

export interface ServiceControl {
  id: string;
  hides: { category: string; surfaces: string[]; includes_search: boolean };
  supports_override: boolean;
  supports_end: ("at" | "when")[];
  /** Whether the service can honour "behaviour under this boundary is not durable preference evidence". */
  learning_limit: boolean;
  readback: boolean;
}
export interface BoundaryPayload {
  boundary_id: string; version: number; authority_ref: string;
  effect: PortableBoundary["effect"]; preserve: string[]; override: string; end: PortableBoundary["end"]; persistence: "no-promotion";
}
export interface ServicePort {
  id: string;
  capabilities(): Promise<{ reachable: boolean; controls: ServiceControl[] }>;
  receive(payload: BoundaryPayload): Promise<{ ack: boolean }>;
  apply(controlId: string, payload: BoundaryPayload): Promise<{ applied: boolean; setting_ref: string | null }>;
  remove(settingRef: string): Promise<{ removed: boolean }>;
  readback(settingRef: string): Promise<{ present: boolean; setting: unknown }>;
}

/** The minimum a destination needs: the rule, its limits and the authority reference. No observations, inferences or history. */
export function minimalPayload(b: PortableBoundary): BoundaryPayload {
  return { boundary_id: b.id, version: b.version, authority_ref: b.authority_ref!, effect: b.effect, preserve: [...b.preserve], override: b.override, end: b.end, persistence: b.persistence };
}

export interface Fit { kind: "exact" | "partial" | "broader_only" | "none"; control?: ServiceControl; covered: string[]; unsupported: string[]; reasons: string[] }

/**
 * Which of the service's controls, if any, implements the requested boundary faithfully? A control that also hides search,
 * or another category, EXCEEDS the instruction and is never chosen. A control that covers only some of the requested surfaces is
 * a faithful partial application, provided it supports the override, the end conditions and the learning limit.
 */
export function fitControl(b: PortableBoundary, controls: readonly ServiceControl[]): Fit {
  const want = new Set(b.effect.surfaces);
  const needsSearch = b.preserve.includes("search");
  let broader: string | null = null; let best: Fit | null = null;
  for (const c of controls) {
    if (c.hides.category !== b.effect.category || (needsSearch && c.hides.includes_search)) { broader = `${c.id} would also hide ${c.hides.category !== b.effect.category ? `other material (${c.hides.category})` : "search results"}`; continue; }
    const ends = (["at", "when"] as const).filter(k => b.end[k] !== null);
    const missing = [!c.supports_override && "override", !ends.every(k => c.supports_end.includes(k)) && "the end condition", !c.learning_limit && "the temporary-learning limit"].filter(Boolean) as string[];
    if (missing.length) { broader = `${c.id} cannot support ${missing.join(", ")}`; continue; }
    const covered = c.hides.surfaces.filter(s => want.has(s)), extra = c.hides.surfaces.filter(s => !want.has(s));
    if (extra.length) { broader = `${c.id} would also act on surfaces the person did not name (${extra.join(", ")})`; continue; }
    if (covered.length === 0) continue;
    const unsupported = [...want].filter(s => !covered.includes(s));
    const fit: Fit = { kind: unsupported.length ? "partial" : "exact", control: c, covered, unsupported, reasons: [unsupported.length ? `covers ${covered.join(", ")}; does not cover ${unsupported.join(", ")}` : "covers every requested surface"] };
    if (!best || (best.kind === "partial" && fit.kind === "exact")) best = fit;
  }
  return best ?? { kind: broader ? "broader_only" : "none", covered: [], unsupported: [...want], reasons: [broader ?? "no control concerns this category"] };
}

export type BoundaryStatus =
  | "FAITHFUL" | "PARTIAL" | "REFORMULATE" | "NOT_SUPPORTED" | "DESTINATION_NOT_AUTHORISED" | "BOUNDARY_NOT_ACTIVE"
  | "UNCONFIRMED" | "REVOKED_APPLIED" | "REVOKE_REFUSED";

export interface BoundaryReceipt {
  receipt_id: string; boundary_id: string; version: number; service: string; operation: "apply" | "revoke"; at: string;
  stages: Record<Stage, StageState>;
  status: BoundaryStatus;
  fit: Fit["kind"] | null;
  setting_ref: string | null;
  unsupported: string[];
  reformulation: string | null;
  /** Which payload fields were sent. No field here carries history. */
  payload_keys: string[];
  mechanism: "fake-service adapter";
  /** What was checked, if anything. Null until verifyBoundary runs. */
  check_basis: string | null;
  limits: string[];
}

export interface TransmitContext { now: string; ids: (prefix: string) => string; state?: PersonalState; scope?: string; session?: string; priorSettingRef?: string | null }
const LIMITS = ["a setting read back is not proof that every future item is classified correctly", "an expiry that has not yet come has not been shown to execute"];

/** The ONE adapter path. Apply and revoke both go through it, so revocation is an enforcement event, not just a deleted source rule. */
async function transmit(b: PortableBoundary, svc: ServicePort, op: "apply" | "revoke", ctx: TransmitContext): Promise<BoundaryReceipt> {
  const payload = minimalPayload(b);
  const base = (): BoundaryReceipt => ({
    receipt_id: ctx.ids("breceipt"), boundary_id: b.id, version: b.version, service: svc.id, operation: op, at: ctx.now,
    stages: { declared: "yes", carried: "not_attempted", received: "not_attempted", supported: "not_attempted", enforced: "not_attempted", verified: "not_attempted" },
    status: "UNCONFIRMED", fit: null, setting_ref: null, unsupported: [], reformulation: null, payload_keys: Object.keys(payload).sort(), mechanism: "fake-service adapter", check_basis: null, limits: LIMITS,
  });
  const r = base();
  if (op === "apply" && ctx.state) {
    const a = assess(ctx.state, b.id, { now: ctx.now, scope: ctx.scope ?? b.scope, ...(ctx.session ? { session: ctx.session } : {}) } satisfies Context);
    if (!a.applicable) return { ...r, status: "BOUNDARY_NOT_ACTIVE", limits: [...LIMITS, a.reasons.join("; ")] };
  }
  if (!b.destinations.includes(svc.id)) return { ...r, status: "DESTINATION_NOT_AUTHORISED", limits: [...LIMITS, `${svc.id} is not a destination the person selected`] };
  let caps: Awaited<ReturnType<ServicePort["capabilities"]>>;
  try { caps = await svc.capabilities(); } catch { return { ...r, stages: { ...r.stages, carried: "unknown" }, status: "UNCONFIRMED" }; }
  if (!caps.reachable) return { ...r, stages: { ...r.stages, carried: "unknown" }, status: "UNCONFIRMED", limits: [...LIMITS, "the destination was unreachable: what happened there is unknown"] };
  r.stages.carried = "yes";
  let ack: boolean;
  try { ack = (await svc.receive(payload)).ack; } catch { return { ...r, stages: { ...r.stages, received: "unknown" }, status: "UNCONFIRMED" }; }
  r.stages.received = ack ? "yes" : "no";
  if (!ack) return { ...r, status: "NOT_SUPPORTED", limits: [...LIMITS, "the service did not acknowledge the rule"] };

  if (op === "revoke") {
    const ref = ctx.priorSettingRef ?? null;
    r.stages.supported = "yes";
    if (!ref) return { ...r, status: "UNCONFIRMED", limits: [...LIMITS, "no applied setting is known, so removal cannot be attempted or confirmed"] };
    try {
      const out = await svc.remove(ref);
      r.stages.enforced = out.removed ? "yes" : "no";
      return { ...r, setting_ref: ref, status: out.removed ? "REVOKED_APPLIED" : "REVOKE_REFUSED" };
    } catch { return { ...r, stages: { ...r.stages, enforced: "unknown" }, setting_ref: ref, status: "UNCONFIRMED" }; }
  }

  const fit = fitControl(b, caps.controls);
  r.fit = fit.kind;
  if (fit.kind === "broader_only" || fit.kind === "none") {
    r.stages.supported = "no";
    return { ...r, status: fit.kind === "broader_only" ? "REFORMULATE" : "NOT_SUPPORTED", unsupported: fit.unsupported, reformulation: fit.kind === "broader_only" ? `This service cannot apply the requested boundary: ${fit.reasons[0]}. A different rule for this service would be a new decision with its own scope; the original was not widened.` : null };
  }
  r.stages.supported = "yes";
  try {
    const out = await svc.apply(fit.control!.id, payload);
    r.stages.enforced = out.applied ? "yes" : "no";
    return { ...r, setting_ref: out.setting_ref, unsupported: fit.unsupported, status: !out.applied ? "NOT_SUPPORTED" : fit.kind === "partial" ? "PARTIAL" : "FAITHFUL" };
  } catch { return { ...r, stages: { ...r.stages, enforced: "unknown" }, unsupported: fit.unsupported, status: "UNCONFIRMED" }; }
}

export const applyBoundary = (b: PortableBoundary, svc: ServicePort, ctx: TransmitContext) => transmit(b, svc, "apply", ctx);
export const revokeBoundary = (b: PortableBoundary, svc: ServicePort, ctx: TransmitContext) => transmit(b, svc, "revoke", ctx);

/** A verifier that checks a readback against a criterion. `core/verify`'s VerificationEngine backs the default implementation. */
export interface Verifier { check(i: { claim: string; evidence: unknown; expect_present: boolean; at: string }): { result: "TRUE" | "FALSE" | "UNKNOWN"; verification_id: string } }

export function engineVerifier(engine: { check(i: { claim: unknown; criterion: unknown; evidence: unknown[]; evaluated_at?: string }): { receipt: { verification_id: string; evaluation: { result: "TRUE" | "FALSE" | "UNKNOWN" } } } }): Verifier {
  return {
    check: ({ claim, evidence, expect_present, at }) => {
      const out = engine.check({
        claim: { statement: claim, subject: "portable-boundary" },
        criterion: { kind: "evidence_field", path: "observation.present", operator: "EQUALS", expected: expect_present, evidence_kind: "structured_observation" },
        evidence: [evidence], evaluated_at: at,
      });
      return { result: out.receipt.evaluation.result, verification_id: out.receipt.verification_id };
    },
  };
}

/**
 * Verification is a separate act: read the setting back and check it against what the boundary requires. It runs only when
 * asked, never as a side effect of applying, and it can say FALSE or UNKNOWN. It is the only code that sets `stages.verified`.
 */
export async function verifyBoundary(receipt: BoundaryReceipt, svc: ServicePort, verifier: Verifier, now: string): Promise<BoundaryReceipt> {
  if (!receipt.setting_ref) return { ...receipt, check_basis: "no setting reference: nothing to read back" };
  const expectPresent = receipt.operation === "apply";
  let rb: Awaited<ReturnType<ServicePort["readback"]>>;
  try { rb = await svc.readback(receipt.setting_ref); } catch { return { ...receipt, stages: { ...receipt.stages, verified: "unknown" }, check_basis: "the readback failed: unknown" }; }
  const evidence = recordStructured("structured_observation", { present: rb.present, setting: rb.setting }, { subject: `${svc.id}:${receipt.setting_ref}`, observed_at: now });
  const out = verifier.check({ claim: `${svc.id} ${expectPresent ? "holds" : "no longer holds"} setting ${receipt.setting_ref}`, evidence, expect_present: expectPresent, at: now });
  return { ...receipt, stages: { ...receipt.stages, verified: out.result === "TRUE" ? "yes" : out.result === "FALSE" ? "no" : "unknown" }, check_basis: `setting read back and checked (verification ${out.verification_id}); content matching not independently checked` };
}

export function assertStagesSeparate(r: BoundaryReceipt): void {
  // later stages are never "yes" unless every earlier one is, except verified which is its own act and may be "not_attempted"
  const order = STAGES.map(s => r.stages[s]);
  for (let i = 1; i < 5; i++) if (order[i] === "yes" && order[i - 1] !== "yes") throw new PersonalError("STAGE_INFERRED", `${STAGES[i]} is yes but ${STAGES[i - 1]} is ${order[i - 1]}`);
}
