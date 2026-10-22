# TRANSFER-01C — adjudication preparation and prospective freeze

Date: 2026-10-22. **Decision: READY_FOR_HUMAN_ADJUDICATION. Not READY_FOR_LIVE_EXECUTION.**

Human source/criteria decisions remain pending; no scientific freeze or comparative live authorization was created. This milestone made no model calls, endpoint probes, account access, credential reads, commits, pushes, manuscript/site edits or deployments. The user separately supplied one failed manual DeepSeek run during this work; it is not ignored or described as zero historical live activity.

## Incoming state and preservation

Starting HEAD: `c0caa864fd14293a748ab962fe9a358d88cf38ac`. Historical pre-01A HEAD `329660f` and externally created `c0caa86` remain intact. Initial index hash, exact Git status and hashes for 146 pre-existing experiment files, including ignored evidence, are in `evidence/transfer-01c-baseline.json`. Existing staged/unstaged tracked diffs were empty; many reports/implementation files were already untracked. They were not reset, stashed, amended, deleted or overwritten.

Original SOURCE, PLAIN, LINKED and CONTEXT code/prompts/fixtures remain byte-identical to incoming versions. Both prior source snapshots/qualification locks are preserved and verified. The negotiated extension and successful/negative/refused evidence paths are unchanged. A complete final inventory and exact added-file diff are supplied separately under `evidence/transfer-01c-*`.

## Human review materials

`docs/HUMAN-ADJUDICATION-PACK.md` explains distribution and disagreement resolution. `docs/human-review-v1/` contains:

- SOURCE-PACK.md / public-pack.json: five complete proposed source bundles, nine questions, neutral communicative objective and exact UTF-16 anchors. No model/arm identity, model outputs, other review or proposed answer labels are included.
- Separate R1/R2 initial-review templates with blank identity, date, decisions, rationale, qualifications, alternatives, additions, omissions, abstention, uncertainty and disagreement fields.
- A separately named author key with proposed supported answers and controls, for reveal AFTER initial submissions. It is process-sealed plaintext, not technically encrypted/access-controlled.
- Versioned review schema and file manifest. Source pack hash: `4322f3d31ca76f2f3d24f01c4c2139df748adc9a4ec9d7b58eb7a1dc84e6d01d`.

The two original pilot tasks stay PROPOSED_UNADJUDICATED. Negotiated-case source bundles explicitly distinguish original expression from recorded SIMULATED_HUMAN clarification; their bundle hashes do not masquerade as original-expression hashes. Training absence, held-out provenance and independent truth are not claimed.

The host-only validator rejects source/pack drift, invented anchors, missing questions and identical declared reviewer identities. Schema-valid or agreeing reviews never become automatic adjudication. Self-attested human origin is not authenticated identity; admitted loss of blinding is retained as UNBLINDED_REVIEW_RETAINED. Even complete validation records stay AWAITING_HUMAN_ADJUDICATION with live_authorized=false. No synthetic unit-test reviewer identity was written as a real human decision.

## Contract audit and role boundaries

This is an implementation self-audit backed by tests, not independent human review. Existing tests verify pending proposals do not accept meaning, reviewer challenges do not mutate accepted state, exact clarification/proposal binding, SIMULATED_HUMAN labels, retained constraints, historical/superseded state, stale/tampered/scope/expiry refusal and fresh-recipient isolation. Refused interpretations have no accepted envelope; no historical memory injection of pending/rejected proposals exists.

The recipient receives only its permitted accepted transfer plus novel question; the interpreter/reviewer do not see that question or the host answer key. Recipient decisions are separate from readback and compared only as authored diagnostics until human adjudication. Source hashes and schema validation do not establish semantic truth or genuine human acceptance. The bounded reducer is not the full Workbench kernel or a verified persistent Git thread store. Lack of a permitted live no-challenge branch and the unimplemented DIRECT_ONESHOT condition remain explicit design/implementation gates, not capabilities claimed by this package.

Baseline C is an advisory judge; WB C is a fresh recipient. An independent assessor remains a fourth logical role outside negotiation, regardless of reusing three model families in isolated sessions. No reviewer who helped revise a case is called its independent blind assessor.

## Resource comparisons and proposed outcomes

`docs/ROLE-AND-RESOURCE-PARITY.md` distinguishes practical DIRECT_ONESHOT (2 pipeline calls) versus NEGOTIATED (4), and ORDINARY_REVISED (existing DIRECT_REVISED, 4) versus NEGOTIATED (4). Final permitted source/clarification facts must match; differences in actual bytes, tokens, work and overhead are measured. Equal prompt bytes or equal maximum calls are not equal information or consumed inference. DIRECT_ONESHOT is prospective and not implemented; no additional runtime capability was added for it.

The 48-call main proposal remains unchanged/unapproved. A separate 40-call negotiation proposal has its own conditions and needs its own approval; no aggregate 88-call permission or dollar ceiling is inferred. Optional advisory assessment requires separately counted symmetric opportunities. Historical offline matched pairs only compare representations after equal clarification, not negotiation versus no review.

`docs/EXPERIMENT-FREEZE-V1.md` proposes source-bound applied-decision correctness with supporting rationale as primary, plus case-level complete reconstruction and separately measured omissions, additions, uncertainty, false permissions, corrections and abstention. All scheduled cases stay in coverage; infrastructure failure is distinct from semantic error. Correctness among all scheduled questions and conditional correctness among adjudicable responses are distinguished. Capacity limitations are not automatically recipient failure. Proposed rules are not finalized preregistration until humans accept them and a new execution lock exists. No confirmatory statistics were calculated.

## Transport, source proposal and gates

`docs/LIVE-TRANSPORT-QUALIFICATION.md` and its JSON record retain exact installed model/API/base identities, context/output ceilings, unknown immutable vendor revision, auth/header behavior and dated price metadata. Current official endpoint/auth differences are unresolved. Existing injected qualification covers serialization, streaming, truncation, usage, cancellation, budgets and privacy, but proves no remote availability, actual tokenization or invoice cost. No credentials or live probes were used to update the record.

`docs/proposed-pilot-lock-v1.json` covers 526 source/input/schema/model/provider material files and prompt hashes. SHA-256: `13a726f9e1b3108748669f17d5f5cd275e049504a05c1ecb6dff832648ac3173`. States are PROPOSED_NOT_FROZEN, HUMAN_REVIEW_PENDING and LIVE_EXECUTION_NOT_AUTHORIZED. Reviewer decisions, adjudication and spending approval are empty. This immutable-identity proposal is not a signed scientific freeze and activates no comparative runner.

Outstanding human decisions: two independent initial reviews; resolution of UNKNOWN/qualified-NO and question defects; final source-bound answer/rationale/alternative sets; named adjudication approval; exact study/case schedule; resource/token accounting and route/auth qualification; and separate execution/budget authorization. Matching labels alone cannot satisfy those gates.

## User-reported smoke failure and separately requested settings

The user supplied `artifacts/live-smoke-20261022-190311/`, which stopped after one DeepSeek request at RESPONSE_STREAM_LIMIT. This was the manual launcher's 128 KiB SSE framing guard, not demonstrated semantic failure; exact provider content/token usage was not retained. The failed directory and v1 source are preserved.

Separate V2 adds framed-stream diagnostics and a larger wire ceiling. The user's later explicit instruction requested 16K completion tokens and three retries per model: manual V3 uses 16,384 tokens per attempt, up to four attempts/model and twelve requests total, visible 1/2/4-second retry delays, no hidden SDK retries/fallback, and the unchanged US$1 estimate ceiling. Each attempt reserves and records separately; authentication/budget/privacy refusals stop early. Output and framing byte limits remain separate. No live calls were made to implement these changes. They are a new user-selected unadjudicated engineering profile, NOT changes to the comparative no-retry policy or an approved pilot. See `docs/MANUAL-SMOKE-V3.md` for the intentional manual command.

## Actual verification

| Check | Result |
|---|---|
| Combined experiment regressions | 65 passed, zero failed/skipped |
| Parent typecheck/full suite | Typecheck passed; 1,114 passed, three skipped, zero failed |
| Human pack | Five sources/nine questions; all exact anchors/hash bindings checked |
| Reviewer-negative controls | Drift, invented anchors, coverage, duplicate identities and unblinding behavior passed |
| Negotiation/source isolation | Prior tests re-executed; novel-question and accepted-envelope boundaries passed |
| Manual V2/V3 offline controls | Framing versus output limit; 16K serialized cap; three outer retries; early budget/auth stop passed |
| Historical evidence/source locks | Verified; full hashes and preservation results in final inventory |
| Real-browser changes | No new UI; structured review documents were selected. Prior 22 Chromium trace records preserved; no new browser pass claimed |
| Hugo | Not run: book/site unchanged |

An early V3 test caught a reservation exception being normalized into a generic provider failure; the visible retry layer now retains the local reservation code and stops without sending. No real request was used to find/fix it. Full verification logs are `evidence/transfer-01c-tests.log` and `transfer-01c-parent-verify.log`.

Stop: the next formal step is independent human adjudication, not live model execution. No Taint inference, unqualified Hallucination Energy, human-benefit claim or publication promotion was introduced.
