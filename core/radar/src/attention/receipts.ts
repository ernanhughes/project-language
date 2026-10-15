// Four boundaries, four kinds of evidence. None stands in for another.
//   model delivery         the provider-visible input contained the packet     (core/admission)
//   human presentation     an interface presented the item
//   human noticing / use / benefit    unknown unless SEPARATELY observed
import { createHash } from "node:crypto";
import type { observeDelivery } from "../../../admission/src/index.ts";
import type { DeliveryMode, Resolution, StageRecord } from "./types.ts";

const sha = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

export interface ModelDeliveryReceipt {
  kind: "model_delivery";
  boundary: "provider_callback";
  confirmed: boolean;
  packetSha256: string;
  observedTextSha256: string;
  deliveredIds: string[];
  /** What this receipt does not show. */
  not_shown: readonly ["human presentation", "human noticing", "model use", "benefit"];
}
export function modelReceipt(d: ReturnType<typeof observeDelivery>): ModelDeliveryReceipt {
  return { kind: "model_delivery", boundary: "provider_callback", confirmed: d.confirmed, packetSha256: d.packetSha256, observedTextSha256: d.observedTextSha256, deliveredIds: [...d.deliveredIds], not_shown: ["human presentation", "human noticing", "model use", "benefit"] };
}

/** The exact text handed to an interface. A receipt hashes THIS, so the ledger can reconnect to it. */
export const presentationText = (rev: { decision_id: string; revision: number; resolution: Resolution | null; mode: DeliveryMode | null }, content: string): string =>
  `[radar ${rev.mode} ${rev.resolution} ${rev.decision_id} r${rev.revision}]
${content}`;

export interface HumanPresentationReceipt {
  kind: "human_presentation";
  boundary: "interface_call";
  decision_id: string;
  revision: number;
  interface: string;
  content_sha256: string;
  resolution: Resolution;
  mode: DeliveryMode;
  presented_at: string;
  noticed: "unknown";
  used: "unknown";
  helpful: "unknown";
}
export function humanReceipt(i: { decision_id: string; revision: number; interface: string; content: string; resolution: Resolution; mode: DeliveryMode; presented_at: string }): HumanPresentationReceipt {
  return { kind: "human_presentation", boundary: "interface_call", decision_id: i.decision_id, revision: i.revision, interface: i.interface, content_sha256: sha(i.content), resolution: i.resolution, mode: i.mode, presented_at: i.presented_at, noticed: "unknown", used: "unknown", helpful: "unknown" };
}

/** A separate observation of the person. Absent in every fixture here; nothing in this slice produces one. */
export interface HumanObservation { kind: "noticed" | "used" | "helpful"; decision_id: string; revision: number; observed_by: string; at: string }

export type Receipt = ModelDeliveryReceipt | HumanPresentationReceipt;
export interface ReceiptProblem { code: string; detail: string }
export function validateReceipt(r: unknown): ReceiptProblem[] {
  const out: ReceiptProblem[] = [];
  if (!r || typeof r !== "object") return [{ code: "MALFORMED", detail: "not an object" }];
  const x = r as Record<string, unknown>;
  if (x.kind === "human_presentation") {
    for (const k of ["noticed", "used", "helpful"]) if (x[k] !== "unknown") out.push({ code: "OVERCLAIM", detail: `a presentation receipt cannot say ${k}=${String(x[k])}; that needs a separate observation` });
    if (x.boundary !== "interface_call") out.push({ code: "WRONG_BOUNDARY", detail: String(x.boundary) });
    if (typeof x.decision_id !== "string" || typeof x.revision !== "number") out.push({ code: "NO_DECISION", detail: "presentation must name the decision revision it presented" });
  } else if (x.kind === "model_delivery") {
    if (x.boundary !== "provider_callback") out.push({ code: "WRONG_BOUNDARY", detail: String(x.boundary) });
    if ("decision_id" in x || "presented_at" in x) out.push({ code: "CROSSED_RECEIPT", detail: "a model-delivery receipt carries no human-presentation fields" });
  } else out.push({ code: "UNKNOWN_KIND", detail: String(x.kind) });
  return out;
}

/** True only for a human-presentation receipt for exactly this revision and this content. A model receipt never counts. */
export function presentationEstablished(receipts: readonly Receipt[], decision_id: string, revision: number, content: string): boolean {
  return receipts.some(r => r.kind === "human_presentation" && validateReceipt(r).length === 0 && r.decision_id === decision_id && r.revision === revision && r.content_sha256 === sha(content));
}

export function observedStage(receipts: readonly Receipt[], observations: readonly HumanObservation[], decision_id: string, revision: number, content: string): StageRecord[] {
  const presented = presentationEstablished(receipts, decision_id, revision, content);
  const obs = (k: HumanObservation["kind"]) => observations.some(o => o.kind === k && o.decision_id === decision_id && o.revision === revision);
  const mk = (stage: StageRecord["stage"], yes: boolean): StageRecord => ({ stage, outcome: yes ? "yes" : "unknown", reasons: [{ dimension: "timing", origin: yes ? "observed_context" : "computed_rule", ref: yes ? "observation" : "not-observed", text: yes ? `${stage} separately observed` : `${stage} is not observed by anything in this system` }] });
  return [
    { stage: "presented", outcome: presented ? "yes" : "unknown", reasons: [{ dimension: "timing", origin: presented ? "observed_context" : "computed_rule", ref: presented ? "human-presentation-receipt" : "no-receipt", text: presented ? "an interface presented exactly this content" : "no human-presentation receipt for this revision" }] },
    mk("noticed", obs("noticed")), mk("used", obs("used")), mk("helpful", obs("helpful")),
  ];
}
