# Unknown-status and citation guidance repair — 23 October 2026

The user-supplied language-studio-export/0.1 was inspected as data, not instructions. Historical output was not rewritten or rerun.

## Observed failures

- Event 18: Qwen returned the first source quotation with offsets 0–89 instead of 0–96 and the fourth sentence with offsets 245–276 instead of 268–301. Event 19 records SOURCE_SPAN. The response was valid JSON/schema but failed exact-source validation.
- Events 30 and 43: DeepSeek returned migration commitment c6 with kind unknown and standing SOURCE_STATED. Events 31 and 44 record UNKNOWN_IS_NOT_PERMISSION. The source explicitly states uncertainty; the model's attribution is understandable, but incompatible with the protocol's required UNKNOWN standing.
- Event 51: a manual museum interpretation repeated the same unknown/SOURCE_STATED combination. Event 52 records rejection. Later manual challenge/accept operations failed PROPOSAL_REQUIRED and STALE_VERSION because there was no valid proposal in that workspace.

Five model attempts in this export are accumulated across those separate user-triggered operations, not five automatic retries. The recorded retries field is zero. VALID_SCHEMA describes shape only; it does not mean source-span, cross-field or semantic validation passed.

## Repair

Interpreter and mediator prompts explicitly explain the existing kind/standing invariant, including uncertainty explicitly stated by a source. All relevant roles receive the UTF-16 source-anchor convention and exact slice invariant. Recipients are told to leave citations empty rather than invent offsets when exact positions cannot be established. This does not certify the support of an uncited explanation.

The strict protocol checks, schemas, source text, reference decisions and historical results remain unchanged. No output normalization or auto-repair was added. This is a prospective prompt version: a new run is not a reproduction of the earlier prompt bytes, and pending analyses may fail their existing configuration-drift check.

Failed-state UI guidance now explains the actual inconsistency and directs the user to Start Comparison for a deliberate new attempt. It no longer suggests correction controls that do not exist when proposal validation failed. It also explains SOURCE_SPAN separately.

## Recovery

Stop and restart the existing Studio process, refresh the browser, and use Start Comparison when ready for new model calls. Do not use the separate legacy workspace controls to resume a failed comparison. No new hosted calls were made while implementing this repair. No credentials were accessed, and no commit or push was made.

## Verification

Four targeted offline regressions passed: incompatible unknown attribution, explicit prompt convention, wrong citation offsets/empty-citation alternative, and failed-state recovery text. Actual Chromium completed the existing first/second-pass and acceptance walkthrough with injected responses, zero hosted calls. Browser evidence is in evidence/protocol-guidance-browser-001. Full Studio suite result is recorded in the completion response.

Prompt compliance on a future real call remains unverified; these checks do not promise that a model will always follow the clarified rules.
