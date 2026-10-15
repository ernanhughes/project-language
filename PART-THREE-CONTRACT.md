# Part III contract: personal mediation (Chapters 21–28)

What the code in `core/personal/`, `host-pi/personal.ts` and `examples/part-three-personal/` implements, and what it does not. Everything here is mechanism with a scripted model (rung C): it shows the distinctions hold and the refusals fire. It does not show that any personalisation helps anyone.

## Chapter table

| Chapter | Book obligation | Core mechanism | Pi surface | Executable scenario | Test coverage | Not established |
|---|---|---|---|---|---|---|
| 21 | Declared, observed and inferred are different things; preference ≠ performance ≠ policy; accessibility requirement ≠ preference | `types.ts`, `state.ts` discriminated records, origin and authority rules; durable standing records via `durable.ts` | `/personal run ch21`, `/personal state` | Priya's policy, terse-triage preference (does not apply to a review) and keyboard requirement | `state.test.ts`, durable tests in `mediation.test.ts` | That the dimension vocabulary covers real use |
| 22 | An observation is evidence of an interaction, not a trait; an inference proposes and cannot authorise itself; no person-types or inner state | observation records need evidence; inference starts `proposed`; `PERSON_TYPE_REJECTED`, `INNER_STATE_INFERENCE_REJECTED`; `proposeFromObservations`; `promoteToPolicy` needs a person | `/personal run ch22`; tool `personal_propose` | The observation; two scripted model proposals | `state.test.ts`, `mediation.test.ts`, `personal.test.ts` | That a real model proposes sensibly or refrains |
| 23 | The decisive qualifier survives every view; precedence is explicit; individually valid inputs can conflict; a generic path exists | `compiler.ts`: preservation/accessibility → instruction → overlay → policy → authorised inference → default; typed conflicts; budget through `core/compiler` | `/personal run ch23`, `generic`, `why` | The ten-minute plan; the generic view | `mediation.test.ts`, `personal.test.ts` | That the view communicates better |
| 24 | State is not policy; an overlay is scoped and ends; ending sheds effects; no promotion | `overlay.ts`, `deps.ts` (direct and transitive invalidation) | `/personal run ch24`, `end` | The ten-minute overlay; its end | `mediation.test.ts`, `personal.test.ts` | Detection of real changes in a person's state |
| 25 | Friction is a contract the person wrote; goal ≠ authority; weakest form; override is cheap and does not escalate | `friction.ts` | `/personal run ch25`, `override` | A reminder before opening another paper; three overrides | `mediation.test.ts`, `personal.test.ts` | That any friction helps |
| 26 | A protection travels without its history and is reported stage by stage | `portable.ts`: minimal payload, fit classification, one `transmit` path, separate `verifyBoundary` through `core/verify` | `/personal run ch26`, `apply`, `revoke`, `verify` | Exact fit, broader-only refusal, offline service | `mediation.test.ts`, `personal.test.ts` | That a real service honours a boundary |
| 27 | What the system believes must be visible; visible ≠ valid ≠ authorised; correction reaches dependents; forgetting ≠ preventing re-derivation | `beliefs.ts` | `/personal run ch27`, `why`, `correct`, `block` | The false overbroad belief; a correction and recompute | `mediation.test.ts`, `personal.test.ts` | Correct handling of everything a real belief could affect |
| 28 | The session ends; temporary things end; nothing is promoted; receipts prove only what ran | `endOverlay`, expiry by time, receipts in `compiler.ts`, `friction.ts`, `portable.ts` | `/personal run ch28`, `end`, `receipts` | End of review; a fresh interaction the next day | `personal.test.ts` | Anything about real long-term use |

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

## Generic path

With `conditioning: "generic_only"` or `"no_optional"` no observation or inference conditions the view. Preservation and accessibility still hold. `/personal generic` shows the plan and the named difference from the personalised one. Note: a declared policy and an overlay still apply on the no-optional path, so the plan's `mode` can remain `personalised`.

## Correction and invalidation

A correction by a person appends a `belief_rejected` event and the person's own replacement declaration. History stays. Every direct and transitive dependent (cached plans, behaviours observed under an overlay) is marked invalid for current use and recomputed only when something recomputes it. What was already shown is not reversed. Forgetting retracts the item and does not stop re-derivation; `block` is a separate act.

## Portable-boundary status semantics

Statuses: `FAITHFUL`, `PARTIAL`, `REFORMULATE` (only a broader control exists), `NOT_SUPPORTED`, `DESTINATION_NOT_AUTHORISED`, `BOUNDARY_NOT_ACTIVE`, `UNCONFIRMED` (unreachable or unknown), `REVOKED_APPLIED`, `REVOKE_REFUSED`. Stages are separate: declared, carried, received, supported, enforced, verified. A later stage is never `yes` unless the earlier ones are; `verified` is set only by `verifyBoundary`.

## Limitations

- Scripted model, fake services, one invented person and morning.
- Consequence bar, tokens-per-minute and friction ordering are declared policy, not measured.
- The session-entry checksum catches damage and casual forgery only.
- Physical erasure is unsupported; deletion is retraction with a tombstone.
- `/personal correct` accepts a free-text replacement stored as a `declared_preference` with dimension `depth`; it does not interpret the text.
- No Part IV or Taint work; no manuscript changes.
