// A constructed afternoon. Every source, candidate and value here is invented for this repository.
// The expected outcomes are written in the tests, not here, so the fixture is not its own oracle.
import { sha256 } from "../src/attention/units.ts";
import type {
  Bridge, CandidateItem, Grant, Purpose, SourceVersion, Subscription, Task, Unit,
} from "../src/attention/types.ts";
import type { Rendering } from "../src/attention/resolution.ts";
import type { ContextFact } from "../src/attention/delivery.ts";

export const T_NOW = "2026-10-15T14:40:00.000Z";
export const T_MEETING_ENDS = "2026-10-15T15:30:00.000Z";
export const T_AFTER = "2026-10-15T15:35:00.000Z";
export const T_DEPLOY = "2026-10-15T18:00:00.000Z";
export const T_DIGEST = "2026-10-16T09:00:00.000Z";

export const source = (id: string, text: string): SourceVersion => ({ id, version: "v1", text, sha256: sha256(text) });

/** A unit from a phrase found in the source; throws if the phrase is absent. */
export function unit(src: SourceVersion, id: string, phrase: string, role: Unit["role"], dependsOn: string[] = []): Unit {
  const start = src.text.indexOf(phrase);
  if (start < 0) throw new Error(`fixture: "${phrase}" not in ${src.id}`);
  return { id, source_id: src.id, source_version: src.version, spans: [{ start, end: start + phrase.length }], text: phrase, role, dependsOn };
}

export const purpose: Purpose = { id: "decide-before-18:00", declared_by: "person", text: "Decide whether tonight's deployment still rests on a sound assumption.", need: "decide" };
export const task: Task = { id: "afternoon", principal: "priya", purpose, scope: "distributed consensus", asOf: T_NOW };
const grant = (id: string): Grant[] => [{ id, principal: "priya", purpose: purpose.id }];

export const TRACKED_SCOPE = "protocol P, crash faults";

/** The subscription, as the person wrote it. The fixture never edits it to make a case pass. */
export const subscription: Subscription = {
  id: "sub-bounded-delay", version: 1, declared_by: "person",
  statement: "a new, peer-reviewed result relevant to the tracked claim",
  anchor: { claim_id: "tracked-claim", scope: TRACKED_SCOPE },
  relation: "weakens",
  conditions: [
    { kind: "standing", requires: ["peer_reviewed"], stated: "peer-reviewed" },
    { kind: "after", requires: ["2026-09-01T00:00:00.000Z"], stated: "new" },
  ],
  exclusions: ["tutorial"],
};

const item = (id: string, text: string, o: Partial<CandidateItem> & { standing: CandidateItem["standing"]; scope: string }): CandidateItem => ({
  id, source: source(`src-${id}`, text), text, domain: "distributed consensus",
  validFrom: "2026-10-10T00:00:00.000Z", validUntil: null, grants: grant(`g-${id}`), ...o,
});

// ── Case A: an unreviewed preprint that is otherwise on point ────────────────────────────────────
const preprintText = "A preprint reports that protocol P loses safety under crash faults when network delay is unbounded. It has not been reviewed.";
export const preprint: CandidateItem = item("preprint", preprintText, { standing: "preprint", scope: TRACKED_SCOPE });

// ── Case B: a different mechanism, no bridge ─────────────────────────────────────────────────────
const mechText = "A peer-reviewed paper shows a different mechanism M reaches safety without any network delay bound under crash faults, using a protocol P-like quorum.";
const mechSrc = source("src-mechanism", mechText);
const mechUnits = [
  unit(mechSrc, "m-qual", "under crash faults", "qualifier"),
  unit(mechSrc, "m-claim", "a different mechanism M reaches safety without any network delay bound", "claim", ["m-qual"]),
];
export const mechanism: CandidateItem = { ...item("mechanism", mechText, { standing: "peer_reviewed", scope: "mechanism M, no delay bound" }), source: mechSrc, units: mechUnits };
/** BRIEF is the least the person's need allows. It claims no relation. */
export const mechanismRenderings: Rendering[] = [
  { level: "BRIEF", text: "A different mechanism M reaches safety without any network delay bound under crash faults.", unit_ids: ["m-claim", "m-qual"] },
];
export const mechanismBridge = (supplied_by: Bridge["supplied_by"], argument_ref = "argument-1"): Bridge => ({
  id: "bridge-mech", supplied_by, relation: "weakens", anchor_scope: TRACKED_SCOPE, candidate_scope: "mechanism M, no delay bound",
  asserts: "M's technique applies to P, so P's safety no longer depends on bounded delay", argument_ref, preserves_scope: true,
});

// ── Case D: a qualifying contradiction, with a person's bridge, and a BRIEF that keeps the qualifier ─
const contraText = "A peer-reviewed analysis shows protocol P loses safety under crash faults when network delay is unbounded. The tracked deployment assumes bounded delay.";
const contraSrc = source("src-contradiction", contraText);
const contraUnits = [
  unit(contraSrc, "c-qual", "under crash faults when network delay is unbounded", "qualifier"),
  unit(contraSrc, "c-claim", "protocol P loses safety", "claim", ["c-qual"]),
  unit(contraSrc, "c-assume", "The tracked deployment assumes bounded delay.", "evidence"),
];
export const contradiction: CandidateItem = { ...item("contradiction", contraText, { standing: "peer_reviewed", scope: TRACKED_SCOPE }), source: contraSrc, units: contraUnits };
export const contradictionBridge: Bridge = {
  id: "bridge-contra", supplied_by: "person", relation: "weakens", anchor_scope: TRACKED_SCOPE, candidate_scope: TRACKED_SCOPE,
  asserts: "same protocol, same fault model: this is evidence against the bounded-delay assumption", argument_ref: "priya-note-7", preserves_scope: true,
};
export const contradictionRenderings: Rendering[] = [
  { level: "GLANCE", text: "Protocol P loses safety under crash faults when network delay is unbounded.", unit_ids: ["c-claim", "c-qual"] },
  { level: "BRIEF", text: "A peer-reviewed analysis finds protocol P loses safety under crash faults when network delay is unbounded. Candidate, not yet confirmed.", unit_ids: ["c-claim", "c-qual"] },
  { level: "SUMMARY", text: "A peer-reviewed analysis finds protocol P loses safety under crash faults when network delay is unbounded. The tracked deployment assumes bounded delay.", unit_ids: ["c-claim", "c-qual", "c-assume"] },
];

// ── Case C: membership holds, wording drops the qualifier ────────────────────────────────────────
const lossyText = "The mechanism is safe under crash faults. Liveness still needs delays to stabilise eventually.";
const lossySrc = source("src-lossy", lossyText);
const lossyUnits = [
  unit(lossySrc, "l-qual", "under crash faults", "qualifier"),
  unit(lossySrc, "l-claim", "The mechanism is safe", "claim", ["l-qual"]),
  unit(lossySrc, "l-live", "Liveness still needs delays to stabilise eventually.", "evidence"),
];
export const lossy: CandidateItem = { ...item("lossy", lossyText, { standing: "peer_reviewed", scope: TRACKED_SCOPE }), source: lossySrc, units: lossyUnits };
/** BRIEF names BOTH units (so membership, nesting and closure hold) and still says "safe". */
export const lossyRenderings: Rendering[] = [
  { level: "GLANCE", text: "The mechanism is safe.", unit_ids: ["l-claim", "l-qual"] },
  { level: "BRIEF", text: "The mechanism is safe.", unit_ids: ["l-claim", "l-qual"] },
  { level: "SUMMARY", text: "The mechanism is safe under crash faults. Liveness still needs delays to stabilise eventually.", unit_ids: ["l-claim", "l-qual", "l-live"] },
  { level: "DETAIL", text: "The mechanism is safe under crash faults. Liveness still needs delays to stabilise eventually.", unit_ids: ["l-claim", "l-qual", "l-live"] },
];
/** The same BRIEF without the qualifier's unit: dependency closure fails as well. */
export const lossyBriefNoQualifierUnit: Rendering = { level: "BRIEF", text: "The mechanism is safe.", unit_ids: ["l-claim"] };
export const lossyBridge: Bridge = { ...contradictionBridge, id: "bridge-lossy", asserts: "same fault model" };

// ── Case E: a keyword-stuffed decoy ──────────────────────────────────────────────────────────────
const decoyText = "protocol P safety crash faults network delay unbounded bounded delay weakens assumption peer reviewed result new safety protocol P crash faults delay";
export const decoy: CandidateItem = item("decoy", decoyText, { standing: "unreviewed", scope: "product marketing", domain: "marketing copy", grants: [] });

export const query = "protocol P safety under crash faults when network delay is unbounded";
export const corpus: CandidateItem[] = [preprint, mechanism, contradiction, lossy, decoy];

/** The meeting is on; the next break is at 15:30; the digest is tomorrow morning. */
export const inMeeting: ContextFact[] = [
  { key: "calendar_state", value: "in_meeting", origin: "observed_context", ref: "calendar:design-review", at: T_NOW },
  { key: "next_break_at", value: T_MEETING_ENDS, origin: "observed_context", ref: "calendar:design-review", at: T_NOW },
  { key: "digest_at", value: T_DIGEST, origin: "declared_context", ref: "policy:morning-digest", at: T_NOW },
];
export const meetingOver: ContextFact[] = [
  { key: "calendar_state", value: "free", origin: "observed_context", ref: "calendar:design-review", at: T_AFTER },
  { key: "digest_at", value: T_DIGEST, origin: "declared_context", ref: "policy:morning-digest", at: T_AFTER },
];

// ── the whole afternoon as attend() inputs ───────────────────────────────────────────────────────
import type { AttendInput } from "../src/attention/decision.ts";
export function afternoonInputs(): AttendInput[] {
  const common = { task, subscription, corpus, query, topK: 5, budgetTokens: 200, declaredAt: "2026-10-15T09:00:00.000Z", outputAt: T_NOW,
    timing: { now: T_NOW, acts_by: T_DEPLOY, context: inMeeting } };
  return [
    { ...common, item: preprint, renderings: [] },
    { ...common, item: mechanism, renderings: mechanismRenderings },
    { ...common, item: contradiction, renderings: contradictionRenderings, bridge: contradictionBridge },
    { ...common, item: lossy, renderings: lossyRenderings, bridge: lossyBridge },
    { ...common, item: decoy, renderings: [] },
  ];
}
