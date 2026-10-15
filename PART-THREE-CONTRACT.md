# Part III contract: personal mediation (Chapters 21–28)

What the code in `core/personal/`, `host-pi/personal.ts` and `examples/part-three-personal/` implements, and what it does not. Everything here is mechanism with a scripted model (rung C): it shows the distinctions hold and the refusals fire. It does not show that any personalisation helps anyone.

## Chapter table

| Chapter | Book obligation | Core mechanism | Pi surface | Executable scenario | Test coverage | Not established |
|---|---|---|---|---|---|---|
| 21 | The person as a declared input; what may persist; preference, benefit and policy are different; limits she cannot trade away by accident | `types.ts`, `state.ts` discriminated records with enforced origin and authority reference; `durable.ts` for standing records | `/personal run ch21`, `/personal state` | Priya's policy, terse-triage preference (does not apply to a review) and keyboard requirement | `state.test.ts`, durable tests in `mediation.test.ts` | That the dimension vocabulary covers real use |
| 22 | No universal best interface and no user type: separate sources of adaptation, each scoped; expertise is scoped; a requirement is not a preference; a preference is not authority | `state.ts` refusals (`PERSON_TYPE_REJECTED`, `INNER_STATE_INFERENCE_REJECTED`, forbidden performance/benefit fields); accessibility as a distinct kind; `applicability.ts` authority decision, never confidence | `personal_propose` (refused cases), `/personal run ch22` | An observation and two scripted proposals, one of them refused | `state.test.ts`, `mediation.test.ts`, `personal.test.ts` | That a real model proposes sensibly or refrains from typing a person |
| 23 | Memory as historical evidence; historical truth, applicability and authority are different; revision is not contradiction; origin changes what a memory may do; durable history is not current context; not everything persists; forgetting | `state.ts` (`reduce`, status, validity intervals), `applicability.ts` (`assess`, `findContradictions`, `authorizeUse`), `durable.ts` (supersession, retraction with a tombstone), `overlay.ts` promotion needs a person | `/personal state`, `why <id>`, `block`, durable store across sessions | Standing records survive into the next day's session; the observation never becomes a trait; a retracted item is kept as history and not applied | `state.test.ts`, durable tests in `mediation.test.ts`, `personal.test.ts` | That the retention policy is right; physical erasure |
| 24 | State is not policy; an overlay is scoped and ends; temporary instructions have bounded authority; shedding includes the effects; a standing rule needs a separate decision | `overlay.ts`, `deps.ts` (direct and transitive invalidation) | `/personal run ch24`, `end` | The ten-minute overlay; its end | `mediation.test.ts`, `personal.test.ts` | Detection of real changes in a person's state |
| 25 | Friction is a contract the person wrote; goal is not authority; weakest authorised form; an override changes the action, not the goal; repetition prompts reconsideration, not escalation; expiry | `friction.ts` | `/personal run ch25`, `override` | A reminder before opening another paper; three overrides | `mediation.test.ts`, `personal.test.ts` | That any friction helps |
| 26 | A protection travels without its history; a faithful adapter; a receipt says what is known; ending the rule everywhere | `portable.ts`: minimal payload, fit classification, one `transmit` path, separate `verifyBoundary` through `core/verify` | `/personal run ch26`, `apply`, `revoke`, `verify` | Exact fit, broader-only refusal, offline service | `mediation.test.ts`, `personal.test.ts` | That a real service honours a boundary |
| 27 | A belief must show its provenance and what it changes; visible, valid and authorised differ; consequence sets the bar; a correction must name what changes | `beliefs.ts` (`inspectBeliefs`, `checkScope`, `mayChangeCommunication`, `correctBelief`, `forgetBelief`, `blockRederivation`) | `/personal run ch27`, `why`, `correct <id> wrong or forget <reason>`, `block` | The overbroad belief refused; a correction that names its operation and what it did not do | `mediation.test.ts`, `personal.test.ts` | Correct handling of everything a real belief could affect |
| 28 | Composition of six inputs in one session; try subtracting before adding; separation is part of the proposal, not a safety proof; a path without optional personal conditioning; what survives the session | `compiler.ts` (precedence, typed conflicts, `subtract`, `explainWithout`, `compileGeneric`), `endOverlay` and expiry, receipts | `/personal run ch28`, `generic`, `why`, `end`, `receipts` | The composed ten-minute plan and its subtraction; the path without optional conditioning; end of review and a fresh interaction | `mediation.test.ts`, `personal.test.ts` | That the composed view communicates better; that this much state is enough |

## Providers reused

| Provider | Used for |
|---|---|
| `core/remembering` (`WriteService`) | Durable standing records, supersession, retraction (tombstone), JSON/in-memory stores. Inferences are stored as `proposal`, observations as `evidence`, never as preferences. |
| `core/authority` | The use decision (`ACCESS`, `PROCESS`, `INFER`, `RETAIN`, `REUSE`, `DISCLOSE`) against an explicit grant bound to a purpose and a kind. |
| `core/evidence` | Observation evidence records and readback evidence. |
| `core/verify` | The explicit-criteria readback check behind `verifyBoundary`. |
| `core/compiler` | Bounded assembly for the time budget. |

`core/vfs` is reachable through the optional `ProvenanceSink` port, which records `invalidated_by` edges; no vfs write is made by default. `core/language` is not touched.

## Narrow adapters, and why

- `durable.ts`: maps a personal record onto a remembering record and says honestly that deletion is retraction.
- `deps.ts`: transitive invalidation. vfs records provenance edges but has no "invalidated for current use" traversal, so this small graph is new.
- `portable.ts` `ServicePort`: the only seam to a destination; only fakes exist.
- `host-pi/personal.ts`: the Pi seam. It adds no domain logic.

## State lifetime and authority boundaries

| Kind | Lifetime | Who may create it |
|---|---|---|
| declared policy / preference / accessibility | durable (core/remembering), valid interval | a person, with an authority reference |
| session overlay, friction contract, portable boundary | ends with its stated time or condition | a person |
| observed interaction | evidence of an interaction, scoped | the system, with an evidence record |
| inferred belief | proposed; scoped; expiring; correctable | a model or system, as a proposal only |
| presentation plan | cached; invalidated when a dependency ends or is corrected | the compiler |

A typed `/personal` command is the person's own act. A model tool call (`personal_propose`) is never. A model's message text is never recorded.

## Path without optional personal conditioning

`/personal generic` (and `conditioning: "generic_only"` or `"no_optional"` in the core) compiles with no optional observation or inference conditioning the view. It is not an unpersonalised path: binding accessibility, preservation and a declared standing policy (and a live overlay) may still apply, which is why the plan's `mode` can remain `personalised`. The command shows the plan and the named difference from the conditioned one, labelled as an inspection aid, not causal proof.

## Correction operations

`/personal correct <belief-id> <wrong|forget> <reason>` performs exactly one named operation and reports what it did and did not do.

- `wrong`: the belief is recorded as incorrect (`belief_rejected`, by a person); history stays; every direct and transitive dependant (cached plans, behaviour observed under an overlay) is invalidated for current use and recomputed only when something recomputes it.
- `forget`: the retained item is retracted; dependants are invalidated; re-derivation is NOT blocked (`/personal block` is the separate act).

The reason is stored with the event and is never interpreted or turned into a preference. Narrowing a belief's scope, stopping one use, and revising a standing policy are different operations; they are not offered by this adapter, and the command says so rather than guessing. What was already shown or acted on is not reversed.

## Resource boundaries

The example is explicitly invoked (`npm run example:personal`); nothing runs in the background and nothing captures observations on its own. Storage is bounded: an in-memory remembering store and the session's in-memory entries, holding a fixed fixture of about a dozen records plus what a run appends. Nothing is written to the repository or the user's home. Personal history is not injected into any model context: the model sees only its own prompt and the `personal_propose` tool, and the plan is a view, not memory.

## Portable-boundary status semantics

Statuses: `FAITHFUL`, `PARTIAL`, `REFORMULATE` (only a broader control exists), `NOT_SUPPORTED`, `DESTINATION_NOT_AUTHORISED`, `BOUNDARY_NOT_ACTIVE`, `UNCONFIRMED` (unreachable or unknown), `REVOKED_APPLIED`, `REVOKE_REFUSED`. Stages are separate: declared, carried, received, supported, enforced, verified. A later stage is never `yes` unless the earlier ones are; `verified` is set only by `verifyBoundary`.

## Limitations

- Scripted model, fake services, one invented person and morning.
- Consequence bar, tokens-per-minute and friction ordering are declared policy, not measured.
- The session-entry checksum is an integrity marker, not protection against a hostile writer; it catches damage and casual forgery only.
- Physical erasure is unsupported; deletion is retraction with a tombstone.
- Correction offers only `wrong` and `forget`; scope narrowing, stopping one use and policy revision are not implemented in the adapter.
- No Part IV or Taint work; no manuscript changes.
