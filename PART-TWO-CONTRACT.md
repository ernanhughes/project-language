# Part II code contract: two recipients, two control paths

Status: first bounded pass. This documents what the code does and the minimum it relies on. It is not a claim that the schema captures meaning, and it does not describe the manuscript.

## 1. Two paths

| | Model side | Human side (the Radar) |
|---|---|---|
| Question | What may influence a model computation? | What is a person shown, at what resolution, and when? |
| Code | `core/admission` (+ `core/compiler`) | `core/radar/src/attention/` |
| Owns | permission, currentness, scope, model-context admission | qualification, selected units, safe resolution, delivery timing |
| Observed at | the provider callback (`observeDelivery`) | the interface call (`ctx.ui.notify` in the Pi adapter) |
| Receipt | `ModelDeliveryReceipt` | `HumanPresentationReceipt` |
| Does not show | human presentation, noticing, model use, benefit | that the person saw it, noticed it, used it, or benefited |

A model-delivery receipt cannot establish presentation to a person, and a presentation receipt cannot establish noticing, use or benefit. `presentationEstablished` accepts only a human receipt for exactly that decision revision and that content hash; a model receipt dressed with presentation fields is refused. `noticed`, `used` and `helpful` are the literal `"unknown"` on every receipt this code produces. Only a separate `HumanObservation` could change them; nothing here produces one.

A human-facing Radar may use a model internally. Admission governs what that model receives. The human gate governs what the person sees and when. These are different recipients and are observed separately.

## 2. The stages

`observed → retrieved → eligible → selected → assembled → qualified → safe_resolution → delivery_timing → presented → noticed → used → helpful`

Each stage record carries an outcome (`yes`, `no`, `unknown`, `not_reached`, `not_applicable`) and typed reasons. Retrieval proposes and grants nothing. There is no total importance score and no field that could hold one. Dimensions kept separate: relevance, permission, currentness, scope, novelty or knowledge state, dependency, evidence standing, resolution sufficiency, urgency, interruption cost, relation, preservation, timing.

A reason has `{dimension, origin, ref, text}`. `origin` is one of `declared_policy`, `declared_context`, `observed_context`, `source_fact`, `computed_rule`, `supplied_judgement`, `model_proposal`. A reason without a `ref` is invalid, and a qualification cannot rest only on `model_proposal`. This does not prove a reason was valid reasoning; it records what each reason rests on and refuses the unsupported shapes.

## 3. The radar axes

The lifted `decide` (kept unchanged, with its tests) folds selection, resolution and timing into one disposition and cannot produce `QUEUE`+`BRIEF` or `DIGEST`. The new code decides each axis with its own function:

| Axis | Function | Inputs it does not take |
|---|---|---|
| qualification | `qualify` (`matchSubscription`, `establishRelation`) | resolution, timing |
| selection | `selectUnits` (through `core/compiler`) | timing, subscription |
| resolution | `chooseResolution` | timing, urgency |
| delivery | `schedule` | resolution, relevance, confidence |
| observation | receipts | everything above |

Resolution is `GLANCE | BRIEF | SUMMARY | DETAIL | SOURCE`, chosen as the lowest level, no lower than the person's declared need (`MINIMUM_BY_NEED`), whose four obligations all hold. `NOTHING` is `Worthiness`, a gate before the ladder. Delivery is `NOW | QUEUE | DIGEST | AVAILABLE`, independently. The legacy `SIDECAR` is equivalent to non-interruptive `AVAILABLE` and nothing more (`LEGACY_EQUIVALENCE`).

## 4. The shared input contract (minimum)

`SourceVersion {id, version, text, sha256}`; `Unit {id, source_id, source_version, spans[], text, role, dependsOn[]}` (text must equal its spans, dependencies must exist and be acyclic: `validateUnits`); `Purpose {declared_by: "person", need}`; `Subscription {statement, anchor, relation, conditions[], exclusions[], version}`; `Bridge {supplied_by, relation, anchor_scope, candidate_scope, preserves_scope, argument_ref}` (the relation must be the one the subscription asks for; a bridge asserting `unrelated`, or a different relation, qualifies nothing); `CandidateItem {domain, scope, standing, validFrom/Until, grants[], units?}`; context facts limited to the keys `calendar_state, focus_mode, next_break_at, digest_at, do_not_disturb`, each declared or observed, each with a ref and a value from a fixed list (or an ISO time). An unknown value is refused, and a missing or `unknown` calendar state is not read as free: it is a high interruption cost. There is no key for mood, stress or boredom, and an `inferred` origin is refused.

This is the least needed to make the tested distinctions inspectable. Units are caller-supplied; this pass builds no decomposer. Knowledge state is a fixture-level list (`omissible`), not a ledger.

## 5. The four resolution obligations

Reported separately for each authored rendering. **A rendering may use only units the compiler selected** (`selectUnits`); a rendering that names no unit is refused, and an item with no unit decomposition, or whose selection is empty, is not summarised at all: the source stands.

1. membership: every unit named is in the stable unit set and was selected by the compiler;
2. nesting: a lower rendering's units are within the next higher one's;
3. dependency closure: every unit named brings what it depends on (a claim brings its qualifier);
4. semantic preservation: the rendering's words keep what each named unit says, and what a claim's qualifier says (`core/preservation`, anchored phrase plus every content word, check validated by mutation probes before it is believed).

Passing 1 to 3 says nothing about 4. A BRIEF can name the qualifier's unit and say only "safe". Obligation 4 is a conservative wording check, not a theory of meaning: it rejects paraphrase and can be satisfied by copying the right words around a different meaning. When no authored rendering passes, the source stands (fail closed).

## 6. Delivery lifecycle

`Revision {decision_id, revision, prior, status, resolution, mode, non_interruptive, trigger, policy_version, reasons, evaluated_at}`; status is `PENDING | DELIVERED | WITHDRAWN | EXPIRED`. Revisions are frozen. `reevaluate` appends; it takes no resolution and keeps the previous one. Circumstances: `meeting_ended`, `deadline_approaching`, `deadline_passed`, `evidence_stale`, `permission_revoked`, `superseded`. Permission, currentness, scope or standing lost on re-evaluation withdraws the decision. `DELIVERED`, `WITHDRAWN` and `EXPIRED` are not reopened by timing. `reopen` (a person's act) is for a withdrawn or expired decision only. It re-runs every gate on the candidate as it is now (nothing is taken on trust from the earlier decision), refuses with the causes if any gate fails, and otherwise appends a revision kept within reach (`AVAILABLE`, trigger `reopened`). Every revision it returns validates; `validateHistory` accepts a reopening only after `WITHDRAWN` or `EXPIRED`, never after `DELIVERED`.

Presentation is reconnected to the ledger through one definition of the text handed to the interface (`presentationText`): a receipt hashes that text, and `withObservation` checks each revision of a history against it, so `presented` becomes `yes` only for an interface call that actually happened. `NOW` items are presented when due; `QUEUE` and `DIGEST` items wait; `AVAILABLE` items are never pushed and are opened by the person (`/radar open <id>` in the Pi adapter).

## 7. Reuse decisions

| Existing | Reused? | How |
|---|---|---|
| `core/compiler` | yes, unchanged | `selectUnits` presents units as `ContextCandidate`s; `dependsOn` gives dependency closure; its trace gives the refusal reasons |
| `core/admission` | yes, unchanged | `observeDelivery` output is wrapped as `ModelDeliveryReceipt`; the admission harness is used in the example. Its `decide` is not reused: it parses configuration facts only |
| `core/preservation` | yes | `mustKeep`, `validateInstrument`, `assess` for obligation 4 |
| `core/relations` / `core/relate` | `cosineScore` only | retrieval ordering. Relation labelling is not used: a relation here needs a bridge |
| `core/remembering` | audited, not reused | its temporal, trust and retraction concepts inform later persistence; a durable personal ledger is out of this pass (the manuscript places persistence at Chapter 21) |
| `core/radar` `decide` | kept, not extended | new axes sit beside it; its limits are pinned by a test |
| `core/browser` `viewState` | no | terminality of a submission is not a pending-delivery lifecycle |
| `core/lens` | no | sentence heuristics are not a stable unit graph |

## 8. What is not here

A durable knowledge ledger, calendar integration, a real notification scheduler, open-web discovery, a personality or preference model, a universal fidelity theorem, a total importance score. Real-model behaviour, noticing, use and benefit are not observed anywhere in this slice. See `EVIDENCE_SCOPE` (`core/radar/src/attention/scope.ts`), printed by `npm run example:radar`.
