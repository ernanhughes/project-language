// What a Part III run establishes, and what it does not. Printed by the example and asserted by a test.
export interface EvidenceScope {
  establishes: string[];
  does_not_establish: string[];
  observation_boundary: string;
  model_mode: string;
  fixture_scope: string;
}

export const EVIDENCE_SCOPE: EvidenceScope = {
  establishes: [
    "declared, observed and inferred records are separate kinds with separate origins, and the state refuses a record that claims another's origin",
    "a person-type, a learning style or an inner state cannot be stored as a belief; a task condition can, as a scoped, expiring, correctable proposal",
    "an observation never promotes itself, and an inference starts as a proposal that cannot establish itself or authorise its own use",
    "history is kept and is not current applicability; supersession, correction, retraction, expiry and a contradiction are different outcomes with different reasons",
    "confidence never grants authority: use is decided by core/authority against an explicit grant, and by scope, consequence and preservation gates",
    "the decisive qualifier survives in the personalised and the generic view; individually valid inputs that cannot be met together yield a typed conflict, not a silent ranking",
    "an overlay is scoped and expiring; ending it invalidates what depended on it and promotes nothing; promotion into a policy needs a person",
    "a goal alone authorises no friction; the weakest authorised form is used; an override changes that action only and repeated overrides never raise the strength",
    "a portable boundary travels as a minimal payload; an exact control applies it, a broader-only control is refused, an unreachable service is unconfirmed; revocation uses the same path; declared, carried, received, supported, enforced and verified are reported separately",
    "a belief shows its provenance, scope, standing, confidence, authority decision and effects; a correction is appended and invalidates direct and transitive dependents; forgetting and preventing re-derivation are different operations",
    "a model's tool call can only add a proposal; its prose is never recorded; a forged, unsigned or malformed session entry is shown as ignored and gains no influence",
  ],
  does_not_establish: [
    "that any personalisation helps anyone, or that a person noticed, understood or used anything (no human evidence)",
    "that a real model proposes sensible inferences, or resists proposing person-types or inner states (the model here is scripted)",
    "that the consequence table, the time-per-token constant or the friction ordering are the right policies (they are declared policy, not measured)",
    "that any real service honours a boundary: the services are fakes, and a setting read back is not proof of future behaviour",
    "that physical erasure is possible: the durable backend retracts and keeps a tombstone",
    "that session entries are tamper-proof: the checksum is an integrity marker, not protection against a hostile writer",
    "that the correction vocabulary, the scope algebra or the communication dimensions cover real use",
  ],
  observation_boundary: "the Pi session entries and UI notify calls in the harness; fake services' own recorded state; the core/verify readback check",
  model_mode: "scripted faux provider",
  fixture_scope: "one invented architecture-review morning for one invented person, three fake services",
};
