# TRANSFER-01B — offline qualification report

Date: 2026-10-22. **Decision: READY_FOR_HUMAN_REVIEW. Not authorization for a live pilot.**

The offline instrument and proposed review materials are ready. Independent human adjudication, current remote route/auth compatibility, certified provider token accounting and spending authorization remain open. No real hosted/local model calls, account probes, credentials, manuscript/site edits, commits or pushes occurred.

## Repository reconciliation and preservation

Original 01A starting HEAD was `329660f679a5a87831f91fe1430c20ac9360dda8`. External commit `c0caa864fd14293a748ab962fe9a358d88cf38ac` captured most 01A work; that is also this milestone's starting HEAD. The earlier 01A report and two inventory/source-snapshot files were untracked at entry. They were preserved. Nothing was reset, stashed, amended or replaced.

`evidence/transfer-01b-baseline.json` captures all 62 pre-existing experiment files, including ignored artifacts and original locks. Final inventory/preservation checks are in `evidence/transfer-01b-final-inventory.json`. The original 01A source snapshot still verifies against its listed bytes. B adds new modules/fixtures/docs rather than editing the baseline implementation, historical fixtures, receipts or viewer. The original four-arm definitions remain unchanged.

## Implemented qualification

- Two new source-pinned synthetic tasks, technical-policy and research-interpretation, with three questions each; exact spans, supported decisions, permitted alternatives, critical distinctions, plausible additions and abstention conditions. Distinct author/reviewer approval fields remain false/null. All are PROPOSED_UNADJUDICATED; no training-independence or held-out claim.
- Same source/objective/questions across SOURCE, PLAIN, LINKED and CONTEXT; five synthetic historical-context variants. Only relevant valid history is admitted. Context exclusions do not prevent answering the basic task; current context is separately identified and cannot relax source obligations.
- Installed Pi 1.0.4 adapters exercised with injected SSE/HTTP fixtures and synthetic credentials. Exact URLs, API families, headers, bodies and hashes are captured. All network transports are replaced by local fixture functions; no endpoint availability is inferred.
- Versioned Zod contracts and JSON schemas, source/role/prompt/model/settings locks, preview matching, finite completion-cap checks, shared call/input/output/cost reservations, timeout/cancellation, zero retries/fallback, output/schema/truncation refusal and privacy-safe failure receipts. No live dispatch switch.
- Static side-by-side viewer with all 16 task/arm/history traces, actual Pi requests/responses, context candidates/exclusions, host-only NOT_ADJUDICATED assessment, resources, failures and hashes.

Primary scoring is deliberately not fabricated: exact-decision and quote diagnostics remain authored checks; claim entailment, semantic preservation, unsupported paraphrases and appropriate abstention require independent review. Advisory C mistakes are supplied adversarial controls, not empirical GLM error rates.

## Actual validation and observed evidence

| Check | Result |
|---|---|
| 01B qualification suite before WB extension | 44 experiment tests passed |
| Final combined suite including optional WB extension | 52 passed, zero failed/skipped |
| Parent `npm run verify` | Typecheck passed; 1,114 passed, three skipped, zero failed |
| Real Chromium 01B viewer | 16 traces across both tasks; side-by-side table, role request/answer disclosures, reload and keyboard navigation passed |
| Browser page errors / external requests | Zero / zero |
| Qualification source lock | Verified against actual source bytes and expected digest |
| Run HTML/receipt hashes | Verified for 01B and optional WB run |
| Hugo | Not run; no book/site changes |

Logs are preserved as `evidence/transfer-01b-*.log`. Parent verification ran after B implementation; the subsequent WB extension only adds experiment files and its scoped regression tests, with core/host/harness unchanged.

Locked offline run: `artifacts/transfer-01b-001/receipts.json`. Two tasks × eight conditions (SOURCE, PLAIN, LINKED and five CONTEXT variants) × three roles = **48 faux Pi calls**, with separate session/storage identities. This is different from the proposed future 48-call schedule with four arms and two model rotations. B's exact captured packet contains no answer key or complete original source outside SOURCE; C gets only source, questions and anonymous recipient answers.

Transport qualification: **21 intercepted fixture requests**, zero remote requests: six successful preview/replay calls plus 15 failure controls (429, 500, token-length termination, incomplete SSE, timeout for each role). Each failed transport had one intercepted attempt; none was retried. Shared transport reservations total 62,482 input admission units, 43,008 output tokens and US$0.11484522 estimated catalogue allowance. These are local reservations, not spend. Normalized usage numbers are injected test data, never actual provider usage. Actual model spend is US$0; external billing remains unknown/not applicable to mocks.

Relevant CONTEXT wire sizes were 2,227 bytes for deployment and 2,467 for study interpretation, under the equal non-SOURCE 3,000-byte ceiling. Other admitted-history counts are zero with reasons recorded. SOURCE/PLAIN/LINKED wire sizes and every request latency are in the receipt. Token counts for faux Pi remain UNKNOWN.

## Qualification discoveries and retained failures

1. An initial syntax error stopped the new tests before execution; its log remains. The next run caught two problems: an unsupported reasoning option at this direct Pi API layer and a visibility assertion comparing escaped JSON instead of parsed text.
2. Direct SimpleStreamOptions does not accept the string `off`. Passing it produced a null Qwen max_tokens value. The failed configuration was preserved separately; omission now produces a finite 2,048 cap and disabled Messages thinking. A request-body guard and both-family regression protect the correction. This was an implementation configuration error, not evidence of a model/provider failure.
3. Installed A/C requests use `/zen/go/v1/chat/completions` with Bearer; installed Qwen uses `/zen/go/v1/messages?beta=true` with x-api-key. Current official documentation uses newer `/inference/go/...` paths and Bearer guidance. No route, header or model was silently substituted. Remote compatibility remains unqualified.
4. UTF-8 request bytes plus framing allowance are explicitly conservative engineering admission units, not certified provider token counts. Oversized reported usage is refused; absent usage remains unknown. Local cost estimates cannot guarantee a provider invoice.

The two deliberately wrong judge controls record a false endorsement and a missed valid UNKNOWN without changing the primary NOT_ADJUDICATED status. No matching scripted decisions are reported as communication performance or a Language advantage. HaluEval remains disabled; Hallucination Energy and Taint are not computed or transmitted.

## Review documents and exact offline command

Read `docs/PILOT-CORPUS-V1.md`, `docs/INDEPENDENT-ASSESSMENT.md`, `docs/PROVIDER-QUALIFICATION.md`, `docs/provider-qualification-v1.json` and `docs/PROSPECTIVE-PILOT-V1.md`. Machine-readable contracts are in `fixtures/pilot-v1/schemas/`.

Qualification lock: `docs/qualification-lock-v1.json`.

SHA-256: `8e93e0f959f67256db95fe7c7d75275542e855c2d05521b1cc39e19fe5bde0f2`.

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types experiments/communication-transfer-v1/src/qualification/run.mjs experiments/communication-transfer-v1/artifacts/my-new-01b-run experiments/communication-transfer-v1/docs/qualification-lock-v1.json 8e93e0f959f67256db95fe7c7d75275542e855c2d05521b1cc39e19fe5bde0f2
node experiments/communication-transfer-v1/src/qualification/browser.mjs experiments/communication-transfer-v1/artifacts/my-new-01b-run/viewer.html experiments/communication-transfer-v1/artifacts/my-new-01b-browser
```

Use NEW output directories. No key is needed. The lock is an offline qualification lock with live_authorized=false, not a scientific freeze or real-run approval. No real-model command is provided.

## Remaining gates

Independent human source/rubric review; resolution of UNKNOWN versus qualified-NO alternatives; installed/current route and auth contract reconciliation; provider tokenizer/hidden usage/billing qualification; and separately approved exact models, request schedule, token caps and dollar allowance. The 48-call / US$1 proposal remains unapproved. Additional context-ablation live calls require separate scope and budget.

The user's later Workbench reference was incorporated as a separate optional extension, reported in `TRANSFER-01B-WB-REPORT.md`. It did not change the four-arm baseline or B lock. Stop at review readiness: no live inference, participant study, manuscript promotion or publication.
