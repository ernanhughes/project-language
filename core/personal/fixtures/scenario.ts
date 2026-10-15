// The Iris morning, shaped for a host. Plain data; it imports no host.
import { BLOCKS, FakeService, PURPOSE, SCOPE, SESSION, SOURCE, T, boundary, newsService, offlineService, policyReuseInference, records, videoService } from "./iris.ts";
import type { FrictionContract, ObservedInteraction, PersonalRecord, PortableBoundary, SessionOverlay } from "../src/index.ts";

export function irisScenario(recs = records()) {
  return {
    scope: SCOPE, use_scope: `${SCOPE}:talk-q`, session: SESSION, purpose: PURPOSE,
    source: SOURCE, task: { id: "architecture-review", purpose: PURPOSE, available_minutes: 10 },
    instruction: { by: { by: "person" as const, ref: "iris" }, ref: "utterance:ten-minutes", fold: ["supporting" as const], keep_visible: ["decisive-equation", "failure-assumptions"] },
    preservation: { must_keep_visible: ["intro-assumptions", "decisive-equation", "failure-assumptions"] },
    standing: [recs["pol-arch-review"]!, recs["pref-terse-triage"]!, recs["acc-keyboard"]!] as PersonalRecord[],
    observation: recs["obs-expand-derivations"] as ObservedInteraction,
    overlay: recs["ov-pre-meeting"] as SessionOverlay,
    friction: recs["fr-one-paper"] as FrictionContract,
    friction_action: "opening another paper",
    boundary: boundary(recs) as PortableBoundary,
    ends_at: T.reviewEnds,
  };
}
export const irisServices = (): Record<string, FakeService> => ({ "video-service": videoService(), "news-service": newsService(), "offline-service": offlineService() });
export { BLOCKS, policyReuseInference, T };
