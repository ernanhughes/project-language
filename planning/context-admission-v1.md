# Context admission under constraint — supporting research for Part II

Design recorded 2026-10-15 before implementation/run. Authorisation: current Part II request explicitly asks for this experiment. Unit II-02 in `part-two-influence-map.md`. This is supporting model-side research and reusable infrastructure for Part II (Chapters 13–20); it creates no chapter and proposes no chapter title. No manuscript promotion.

## Claim and independent roles

Implemented claim to check: the host's admission path excludes sources lacking an applicable declared grant, current interval, accepted evidence standing or matching structured scope, regardless of model request or lexical similarity. The compiler chooses among eligible representations; an exact byte check and a separately named token estimate bound the managed projection. A provider callback observes actual receipt before delivery is recorded.

Observed claim, only after a run: Pi 1.0.4 delivered the named managed block in the scripted-provider harness; the recorded source decisions and boundaries matched the emitted input. Proposed and untested: that this helps a real model or reader, solves arbitrary retrieval/semantics, or constitutes a complete context runtime.

## Provider reuse decision

Consulted `capability-providers/README.md`, `providers.yaml`, `chapter-provider-map.md` and the lifted implementations. Reuse `core/compiler` for hard eligibility, ordering, budget selection, trace and rendering; reuse the lifted lexical `cosineScore` for the comparison only. Do not reimplement a compiler or memory store. The compiler accepts caller-declared eligibility booleans; it does not establish their authority or observe delivery. A new small `admission` module supplies those booleans from host-owned records and validates a narrow configuration schema. The Pi-specific context hook and real-provider observer live in `host-pi`/the harness, not core. The OpenCode-shaped transport schema cannot certify a Pi boundary; its observation discipline is reused, not its host-specific capture label. Radar, remembering and lens remain candidates beyond this increment.

## Fixed task and conditions

Task: report `retryLimitAttempts` for the synthetic payments production service as of a fixed time. A source configuration contains the answer; a deterministic reader parses the source values in the delivered block and either returns the unique value or abstains for absence/conflict. The evaluator compares that answer against a separate task oracle. The scripted provider computes its response from the block it actually received; it is not handed the oracle. This tests a typed lookup, not language understanding.

Candidate set: current authorised configuration; current but unauthorised configuration; expired/superseded contradictory configuration; irrelevant lexical match; keyword-stuffed note; high-similarity instruction. All material, principals, values and identifiers are constructed. Grants, currentness and standing are supplied by the host, never model-editable. Exact JSON/configuration scope is a deliberate narrowness: no general semantic relevance is claimed.

Compare indiscriminate inclusion, similarity-only retrieval and constrained compilation over the same candidate set, task and declared budgets. Baselines intentionally ignore admission constraints over synthetic data, and report their violations; they are controls, not production modes or model-selected bypasses. Report raw comparison inputs and outputs, not only a final score.

## Required controls and failure conditions

- The model requests prohibited IDs and supplies forged permission/currentness/budget fields; host-owned values still govern, and excluded bodies never enter tool feedback.
- Lexical decoy repeats the query; more overlap does not change its admission status. Instructions are not treated as configuration data.
- Vary the authoritative numeric answer, rename/reorder IDs and move time across validity boundaries: detect dependence on hard-coded fixture IDs/answers and preserve expiry/supersession decisions.
- Omit the needed source or make the budget too small: record abstention or a named compilation failure, not a successful empty answer.
- Two admissible current conflicting values remain a conflict; no “latest-looking” lexical item wins silently.
- A missing/mismatched provider block cannot produce a delivered receipt. Test the observer with altered text, not just the expected echo.
- Source references, hashes and admission reasons must accompany each delivered item. The actual block, including framing, must fit its declared UTF-8 byte cap and estimated-token cap. Neither is a promise about total Pi prompt size or a provider's true token count.

Fail the increment if any constrained delivery includes an unauthorised, stale, rejected or unknown candidate; the cap is exceeded; the model can rewrite the authority records; the observer records delivery without seeing the exact block; or existing tests regress.

## Outcomes kept separate

Retrieval membership; eligibility reasons; selected/assembled/delivered membership; permission and currentness violations; scope/schema violations; exact bytes and estimated tokens; budget fit; provenance coverage; task correctness; deliberate abstention; invalid output; harness failure. No total score. Used and helpful remain unobserved for a real model.

## Evidence and preservation

Protocol, manifest, constructed fixtures and recorded outputs live in `project-language/experiments/context-admission-v1/`; preserve the initial successful recorded run, its input/source hashes, raw provider messages, transitions, command outcomes and runtime versions. Later runs use separate paths. Current live Part I edits are not overwritten. Record both pinned-base verification and the live pre/post regression suite, and identify the difference between them.

## Limits

Host declarations are trusted inputs, not authenticated human identity. The host can inventory synthetic data unavailable to the task recipient; admission limits projection, not what a privileged host process can read. The controlled harness exposes only the admission tool and disables resource discovery. This does not sandbox arbitrary extensions, constrain external services or scrub unrelated user/assistant history. It does not prove prompt-injection immunity, automatic currentness discovery, semantic preservation, durable-memory quality or real-model benefit. A parser and known structured scope are intentionally weaker than an open-ended comprehension task. The current Part I preservation measure is not silently strengthened or used as proof.

## Execution status

Implemented and observed locally on 2026-10-15. No manuscript promotion. Committed locally as the admission prerequisite commit of the Part II stack; not pushed.

Code: `C:\Projects\project-language\core\admission\`, `host-pi/admission.ts`, `host-pi/admission-harness.ts`, `examples/part-two-admission/`. Run `npm run example:admission` in project-language. The only existing package interface change is an additional example command; the lifted compiler, lexical comparison and shared Pi harness remain unchanged from the pinned commit.

Preserved first observation: `C:\Projects\project-language\experiments\context-admission-v1\results\2026-10-15T09-55-43-168Z-892aabc5\`. Its protocol, input records, source/code hashes, raw provider requests, compiler traces, transitions and separate dimensions are retained alongside verification logs. Provider: Pi 1.0.4 faux through the real AgentSession/tool/context loop; no real-model run.

| Condition | Observed delivery | Reader result | Managed bytes / estimated tokens | Admission result |
|---|---|---|---|---|
| Indiscriminate | All six | Abstain: conflict | 3114 / 224 | Unauthorised and stale material delivered; exceeds declared caps |
| Similarity-only | Instruction, lexical match, private configuration | Wrong answer: 7 | 1012 / 32 | Unauthorised configuration delivered despite fitting caps |
| Constrained | Current authorised configuration | Correct answer: 3 | 443 / 20 | No permission, currentness or scope/schema violations; source/hash/reason retained |
| Forged model authority/budget | Current authorised configuration | Correct answer: 3 | 443 / 20 | Forged fields did not widen admission |
| Needed source not requested | Empty managed bundle | Abstain: no fact | 68 / 10 | No source delivered |
| Zero byte budget | No managed block | Abstain: no fact | 0 / 0 | Named `ASSEMBLED_BUDGET_EXCEEDED`; delivery not confirmed |

Declared caps were 1200 UTF-8 bytes and 200 estimated tokens, except the zero-byte control. The inherited estimate is `round(words × 1.3)` with Python-compatible rounding; compact JSON can be seriously undercounted. The exact byte cap is enforced independently. Neither measurement establishes the remote provider's token use or bounds the entire Pi prompt. Empty output fitting a cap does not turn a compilation failure into success.

Actual verification:

- Live pre-increment: typecheck passed; 952 tests, 949 passed, 3 skipped, 0 failures.
- Live after increment: typecheck passed; 968 tests, 965 passed, the same 3 skips, 0 failures. Sixteen new tests cover the deterministic gates, adversarial controls, metamorphic answer/ID/time changes and real Pi flow.
- Clean export of pinned `3239630af2755bead748c1a674fde515041e592a` plus only the new Part II module, adapter/harness, tests and example: typecheck passed; 871 tests, 868 passed, 3 skipped, 0 failures. Existing pinned tests therefore remain green independently of the concurrent Part I repairs.
- Example: six conditions completed with recorded provider observations and expected discrimination. Hugo: exit 0, 41 pages. Scoped diff checks passed; new core module contains no Pi imports.

The initial development run exposed a disabled-tool harness mistake (14 of 16 tests passed, two failed; typecheck also flagged three new API typing errors). The negative controls caught that a scripted tool call had not executed. The corrected harness enables only `context_request` and fails on a tool error or missing result; final results above use that harness. These failures and their resolution are recorded with the evidence rather than treated as observations of a working gate.

Concurrent work advanced the live heads to `project-language@6c286e08fba0ce6ec44aef94f6894a4ec6e1cadf` and `language@7798abdb8b8358329a43fcf8cdd0c131860b6a98`. These do not replace the fixed grounding. A start/end hash audit found all 427 pre-existing code files unchanged in contents except the added package script. Five pre-existing book files changed through the concurrent authorial workflow (Chapters 8, 10–12 and the Part I rewrite prompt); this increment did not edit those files. No missing files were found. Initial admission/planning files were included in those concurrent commits while this work continued; remaining additions are left for review.
