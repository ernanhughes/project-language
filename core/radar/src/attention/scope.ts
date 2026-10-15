// What this slice can and cannot be cited for. Printed by the example, asserted by a test.
export interface EvidenceScope {
  establishes: string[];
  does_not_establish: string[];
  observation_boundary: string[];
  model_mode: string;
  fixture_scope: string;
}
export const EVIDENCE_SCOPE: EvidenceScope = {
  establishes: [
    "a declared subscription condition (peer-reviewed) is enforced as written; an unreviewed preprint does not match, and the subscription is not rewritten",
    "a relation to the tracked claim is UNRESOLVED unless a person or domain rule supplies a bridge that names both scopes and asserts the relation the subscription asks for; closeness and a model's assertion do not establish it",
    "unit selection goes through the existing compiler, a claim is not admitted without its qualifier, and a rendering may use only the units the compiler selected (an unattached summary is refused; an undecomposed item is not summarised)",
    "membership, nesting and dependency closure are reported separately from wording; a rendering that names the qualifier's unit and drops its words is rejected, and the resolution rises or the source stands",
    "QUEUE with BRIEF and DIGEST are reachable; timing takes no resolution and cannot change one",
    "a queued decision is re-evaluated as a new revision carrying the prior revision, the circumstance, the policy version and a reason; withdrawn, expired and delivered are not reopened by timing",
    "reopening re-runs every gate on the candidate as it is now, and applies only to withdrawn or expired decisions",
    "an unknown context value is refused, and an unobserved calendar is not read as free",
    "an AVAILABLE item is never pushed and can be opened by the person",
    "a keyword-stuffed decoy can be retrieved and is not eligible, qualified or presented",
    "a model-delivery receipt and a human-presentation receipt are different objects, and neither establishes the other",
    "a coverage report names its boundary and does not claim unseen information",
  ],
  does_not_establish: [
    "real-model language quality (the model is a scripted stand-in)",
    "that any person noticed, understood, used or benefited from anything (noticed, used and helpful stay unknown)",
    "that a presented message was actually rendered (the receipt records an interface call)",
    "cross-domain discovery: the bridge is supplied, nothing here finds a relation",
    "open-world coverage or recall",
    "general semantic fidelity: the wording check is anchored phrases and content words for named qualifiers, validated by mutation probes, and is defeated by copying the right words around different meaning",
    "ecological prevalence or any measure of how often these situations occur",
    "that the urgency and interruption-cost table is the right policy for a person",
  ],
  observation_boundary: [
    "model side: the provider callback in the Pi harness (core/admission), not a remote HTTP request",
    "human side: the call to the Pi UI notify function, not the person's screen or attention",
  ],
  model_mode: "scripted faux provider; demonstrates control flow and gates, not model quality",
  fixture_scope: "one invented afternoon, five invented candidates (core/radar/fixtures/afternoon.ts); expected results are written in the tests, not the fixture",
};

/** The same discipline for the Chapter 14 to 16 example (`npm run example:talk`). */
export const TALK_SCOPE: EvidenceScope = {
  establishes: [
    "a transcript in the youtube-transcript format becomes a hash-pinned source; a unit is one or more exact spans of it and walks back to timestamps",
    "a proposer can suggest which lines form a unit, its role and its dependencies, but cannot supply content; a proposal naming a missing line, no line, a duplicate, or an unaccepted dependency is refused with its reason",
    "a unit can join spans far apart (minute 4 and minute 53)",
    "fixed windows scored on their own words drop a qualifier that governs the loud result; whole units with dependencies keep it (a constructed contrast)",
    "a relevance judgement belongs to one purpose, needs a reason and a real citation, and a model's judgement waits for a person",
    "an inferred purpose is a suggestion beside the declared one and never replaces it",
    "a unit judged not relevant still travels with the unit that depends on it, with the reason; everything else is withheld with a reason and can be reopened",
    "a knowledge grade is derived from dated evidence, decays, treats exposure as no evidence of knowing, and treats a later mistake as a conflict",
    "a familiar term in another sense is not a known meaning; omission needs known in this sense AND not needed by anything shown",
    "the person can see the state with its evidence, correct it and forget it",
  ],
  does_not_establish: [
    "that any proposer, model or otherwise, finds good units; the proposals here are scripted",
    "that the judgements are right or that any system could make them; they are written by hand",
    "that the knowledge state is correct about any person, or how it would be kept between sessions; it is a value passed in",
    "anything about video, audio, slides or what nobody said; the input is a text transcript",
    "that readers would choose these boundaries, find the records usable, or read less as a result",
    "relevance, which is supplied; or concept extraction, which is supplied",
  ],
  observation_boundary: ["none: no host, no interface and no model are involved"],
  model_mode: "none; the proposer is a scripted function",
  fixture_scope: "one invented talk of 17 lines, nine units, three purposes (core/radar/fixtures/talk.ts); expected results are in the tests",
};
