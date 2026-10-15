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
