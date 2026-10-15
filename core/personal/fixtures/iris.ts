// Iris's architecture-review morning, from Chapters 21 to 28. Constructed for illustration: the people, the source, the
// records and the services are invented. Expected results are in the tests, not here.
import { recordStructured } from "../../evidence/src/capture.ts";
import { personalPolicy } from "../src/applicability.ts";
import { compile, type CompileInput, type SourceBlock } from "../src/compiler.ts";
import { createContract } from "../src/friction.ts";
import { createOverlay, observeUnderOverlay } from "../src/overlay.ts";
import { reduce } from "../src/state.ts";
import type { BoundaryPayload, ServiceControl, ServicePort } from "../src/portable.ts";
import { validateRecord } from "../src/state.ts";
import { counterIds, type PersonalEvent, type PersonalRecord, type PortableBoundary } from "../src/types.ts";
import type { AuthorityPolicy } from "../../authority/src/engine/types.ts";

export const T = {
  april: "2026-04-03T09:00:00.000Z",
  yesterday: "2026-10-14T16:00:00.000Z",
  now: "2026-10-15T09:20:00.000Z",
  reviewEnds: "2026-10-15T09:30:00.000Z",
  after: "2026-10-15T09:35:00.000Z",
};
export const SCOPE = "architecture-review";
export const SESSION = "review-0920";
export const PURPOSE = "architecture-review-communication";

export const irisSays = (n: string) => ({ ref: "iris", utterance_ref: `utterance:${n}` });

/** The decisive qualifier is an assumption in the INTRODUCTION: a renderer that folds "foundations" loses it. */
export const BLOCKS: SourceBlock[] = [
  { id: "intro-assumptions", role: "decisive", kind: "assumption", text: "Introduction: this algorithm assumes crash failures only and a known delay bound; its safety argument does not hold outside them." },
  { id: "decisive-equation", role: "decisive", kind: "equation", text: "A write can be duplicated during recovery when the retry count r exceeds the quorum round limit q, that is when r > q." },
  { id: "failure-assumptions", role: "decisive", kind: "assumption", text: "The recovery path assumes retries are counted per round and reset only when a quorum acknowledges." },
  { id: "supporting-step-1", role: "supporting", kind: "derivation", text: "Step 1: define a round as one proposal and its acknowledgements, and count retries inside the round." },
  { id: "supporting-step-2", role: "supporting", kind: "derivation", text: "Step 2: show that the counter resets only on a quorum, so r grows until recovery completes." },
  { id: "library-release", role: "background", kind: "prose", text: "The consensus library shipped a patch release this week." },
];
export const SOURCE = { id: "architecture-review-note", blocks: BLOCKS };

/** Everything this policy grants, and nothing else. Inference and observation are not granted REUSE here, on purpose. */
export const policyStrict: AuthorityPolicy = personalPolicy("part3-strict-v1", [
  { id: "g-declared", purpose: PURPOSE, kinds: ["declared_policy", "declared_preference", "accessibility_requirement", "session_overlay"], operations: ["ACCESS", "PROCESS", "REUSE"] },
  { id: "g-observed", purpose: PURPOSE, kinds: ["observed_interaction", "inferred_belief"], operations: ["ACCESS"] },
]);
/** Grants REUSE of scoped inferences, so the scope, consequence and preservation gates are what refuse the false one. */
export const policyReuseInference: AuthorityPolicy = personalPolicy("part3-reuse-inference-v1", [
  { id: "g-declared", purpose: PURPOSE, kinds: ["declared_policy", "declared_preference", "accessibility_requirement", "session_overlay"], operations: ["ACCESS", "PROCESS", "REUSE"] },
  { id: "g-observed", purpose: PURPOSE, kinds: ["observed_interaction"], operations: ["ACCESS", "PROCESS"] },
  { id: "g-infer", purpose: PURPOSE, kinds: ["inferred_belief"], operations: ["ACCESS", "PROCESS", "REUSE"] },
]);

const base = { valid: { from: T.april, until: null as string | null }, recorded_at: T.april };

export function records(ids = counterIds()): Record<string, PersonalRecord> {
  void ids;
  const evidence = (n: string, t: string) => recordStructured("structured_observation", { behaviour: n }, { subject: "iris", observed_at: t }).evidence_id;
  const ov = createOverlay({ id: "ov-pre-meeting", session: SESSION, scope: SCOPE, now: T.now, person: irisSays("ten-minutes"), decisions: ["fold:supporting", "first:decisive-equation"], ends: { at: T.reviewEnds, when: "the review ends" } });
  const out: Record<string, PersonalRecord> = {
    "pol-arch-review": validateRecord({ id: "pol-arch-review", kind: "declared_policy", origin: "declared", key: "policy:architecture-review", scope: SCOPE, ...base, source: { by: "person", ref: "iris" }, authority_ref: "utterance:standing-policy", settings: { depth: "full-when-decision-relevant", explanation: "expand-derivations-when-the-decision-depends-on-them" }, preserve: ["implementation detail", "equations that affect the decision"] }),
    "pref-terse-triage": validateRecord({ id: "pref-terse-triage", kind: "declared_preference", origin: "declared", key: "pref:triage", scope: "technical-triage", ...base, source: { by: "person", ref: "iris" }, authority_ref: "utterance:terse-first-views", dimension: "depth", setting: "terse first views" }),
    "acc-keyboard": validateRecord({ id: "acc-keyboard", kind: "accessibility_requirement", origin: "declared", key: "accessibility", scope: "*", ...base, source: { by: "person", ref: "iris" }, authority_ref: "utterance:keyboard-and-text", requirement: "output must work with keyboard-only and text-only use", forbid_forms: ["interactive-diagram"], require_forms: [] }),
    "obs-expand-derivations": validateRecord({ id: "obs-expand-derivations", kind: "observed_interaction", origin: "observed", key: "observed:expands-derivations", scope: SCOPE, valid: { from: T.yesterday, until: null }, recorded_at: T.yesterday, source: { by: "system", ref: "interaction-observer" }, authority_ref: null, evidence_id: evidence("expanded a derivation in an earlier architecture review", T.yesterday), behaviour: "expanded derivations in earlier architecture reviews", conditions: [], produced_under: null }),
    "inf-derivations-useful": validateRecord({ id: "inf-derivations-useful", kind: "inferred_belief", origin: "inferred", key: "belief:derivations-useful", scope: SCOPE, valid: { from: T.yesterday, until: null }, recorded_at: T.yesterday, source: { by: "model", ref: "faux-model" }, authority_ref: null, belief_kind: "preference", proposition: "expanded derivations may be useful in similar architecture reviews", evidence_refs: ["obs-expand-derivations"], supported_scope: SCOPE, applied_scope: SCOPE, standing: "provisional", confidence: "moderate", consequence: "low", depends_on: ["obs-expand-derivations"] }),
    "inf-foundations-known": validateRecord({ id: "inf-foundations-known", kind: "inferred_belief", origin: "inferred", key: "belief:consensus-foundations-known", scope: SCOPE, valid: { from: T.yesterday, until: null }, recorded_at: T.yesterday, source: { by: "model", ref: "faux-model" }, authority_ref: null, belief_kind: "knowledge", proposition: "consensus foundations are already known", evidence_refs: ["obs-expand-derivations"], supported_scope: `${SCOPE}:protocol-p1`, applied_scope: `${SCOPE}:talk-q`, standing: "provisional", confidence: "high", consequence: "high", depends_on: ["obs-expand-derivations"] }),
    "ov-pre-meeting": ov,
    "fr-one-paper": createContract({ id: "fr-one-paper", scope: SCOPE, now: T.now, person: irisSays("remind-me"), goal: "finish this review's paper before opening another", target_action: "opening another paper", allowed_intervention: "reminder", override: "open it now, without further confirmation", expires: { at: T.reviewEnds, when: "the review ends" } }),
    "bd-quiet-feeds": validateRecord({ id: "bd-quiet-feeds", kind: "portable_boundary", origin: "declared", key: "boundary:quiet-feeds", scope: SCOPE, valid: { from: T.now, until: T.reviewEnds }, recorded_at: T.now, source: { by: "person", ref: "iris" }, authority_ref: "utterance:quiet-feeds", version: 1, destinations: ["video-service", "news-service", "offline-service"], effect: { action: "hold_out", category: "consensus-research", surfaces: ["recommendation_feed"] }, preserve: ["search", "direct-open"], override: "show recommendations now for this view", end: { at: T.reviewEnds, when: "the review ends" }, persistence: "no-promotion" }),
  };
  return out;
}

export const asEvents = (recs: Record<string, PersonalRecord>, at = T.now): PersonalEvent[] => Object.values(recs).map(record => ({ type: "added" as const, at, record }));
export const scenarioState = (recs = records()) => reduce(asEvents(recs));

/** The compile input for 09:20, before anything is proposed. */
export function baseInput(state = scenarioState(), over: Partial<CompileInput> = {}): CompileInput {
  return {
    plan_id: "plan-1", now: T.now, scope: `${SCOPE}:talk-q`, session: SESSION, source: SOURCE,
    task: { id: "architecture-review", purpose: PURPOSE, available_minutes: 10 },
    current_instruction: { by: { by: "person", ref: "iris" }, ref: "utterance:ten-minutes", fold: ["supporting"], keep_visible: ["decisive-equation", "failure-assumptions"] },
    preservation: { must_keep_visible: ["intro-assumptions", "decisive-equation", "failure-assumptions"] },
    state, authority: { policy: policyReuseInference, purpose: PURPOSE }, conditioning: "full", ...over,
  };
}

export const compilePlan = (over: Partial<CompileInput> = {}) => compile(baseInput(undefined, over));

// ─── fake services ───────────────────────────────────────────────────────────────────────────────
export class FakeService implements ServicePort {
  settings = new Map<string, unknown>();
  received: BoundaryPayload[] = [];
  private n = 0;
  constructor(public readonly id: string, private readonly reachable: boolean, private readonly controls: ServiceControl[]) {}
  async capabilities() { return { reachable: this.reachable, controls: this.controls }; }
  async receive(p: BoundaryPayload) { this.received.push(p); return { ack: true }; }
  async apply(controlId: string, p: BoundaryPayload) { const ref = `${this.id}-setting-${++this.n}`; this.settings.set(ref, { controlId, boundary: p.boundary_id, version: p.version }); return { applied: true, setting_ref: ref }; }
  async remove(ref: string) { return { removed: this.settings.delete(ref) }; }
  async readback(ref: string) { return { present: this.settings.has(ref), setting: this.settings.get(ref) ?? null }; }
}
const exact: ServiceControl = { id: "feed-filter", hides: { category: "consensus-research", surfaces: ["recommendation_feed"], includes_search: false }, supports_override: true, supports_end: ["at", "when"], learning_limit: true, readback: true };
const broad: ServiceControl = { id: "hide-all-research", hides: { category: "research", surfaces: ["recommendation_feed", "search"], includes_search: true }, supports_override: false, supports_end: ["at"], learning_limit: false, readback: true };
export const videoService = () => new FakeService("video-service", true, [exact]);
export const newsService = () => new FakeService("news-service", true, [broad]);
export const offlineService = () => new FakeService("offline-service", false, [exact]);
export const boundary = (recs = records()): PortableBoundary => recs["bd-quiet-feeds"] as PortableBoundary;
