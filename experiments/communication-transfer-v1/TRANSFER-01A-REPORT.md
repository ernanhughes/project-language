# TRANSFER-01A — local implementation report

Date: 2026-10-22. Target: `C:\Projects\project-language`. Starting HEAD: `329660f679a5a87831f91fe1430c20ac9360dda8`.

**Recommendation: REFINE. Offline integration passes; real-model execution remains blocked.** This milestone establishes isolated Pi plumbing and traceability, not improved communication, model comprehension or human benefit. No real models, account probes, credentials, .env, saved authentication, manuscript edits, commits, pushes or publication were used.

## Delivered

- Real Pi 1.0.4 AgentSession/fauxProvider integration using the existing harness, no new provider framework and no production/core edits.
- Separate A sender, B receiver and blinded advisory C for SOURCE / PLAIN / LINKED / CONTEXT. Exact provider requests, actual assistant responses, source/quotation/span identity, context decisions and hashes are captured.
- Context schema and explicit synthetic permission, support, scope, expiry and conflict checks; active relevant / irrelevant / conflicting history ablations. Taint is not transmitted. Hallucination Energy remains NOT_COMPUTED.
- Write-once run directories, hash manifests and a verifier; bounded byte reservations, max calls, timeouts, no retries/fallback, failure evidence, independent host-only reference checks and a self-contained browser viewer.
- Pinned dataset metadata/import plan, contamination selection helper, separate assessment rubric and prospective non-executable three-model design with cost proposal.

## Actual verification

| Check | Observed result |
|---|---|
| Experiment suite | 24 passed, zero failed (`evidence/experiment-tests-qualification.log`) |
| Parent `npm run verify` | TypeScript check passed; 1,114 tests passed, three skipped, zero failed (`evidence/parent-verify.log`) |
| Real Chromium walkthrough | Four arm tabs and exact request/answer sections passed; reload passed; zero page errors or external requests |
| Final evidence hashes | `verify-evidence.mjs` passed for receipts and HTML |
| Production tracked diff | Empty within core/host/harness; no staged changes at final check |
| Hugo | Not run: no book/site files changed; target is a Node/Pi library repository |

Parent verification ran after the initial integration and tests. Subsequent edits stayed inside this experiment and were checked with the scoped suite/browser; parent source did not change. Three skipped tests are not claimed as passes.

Final run: `artifacts/transfer-01a-004/`. Twelve faux calls, zero hosted requests, US$0 model spend; 87,187 bytes reserved under the 300,000-byte aggregate allowance. Actual token usage is UNKNOWN; faux usage is not model token usage. Per-arm measured wire sizes and local A/B/C combined prompt latencies:

| Arm | Wire UTF-8 bytes | Local prompt latency, ms | Scripted answer |
|---|---:|---:|---|
| SOURCE | 556 | 11.78 | NO |
| PLAIN | 430 | 5.13 | NO |
| LINKED | 1,008 | 4.94 | NO |
| CONTEXT | 1,362 | 4.74 | NO |

All answers and affirmative C advice were supplied test doubles. These four matching decisions are not AI performance scores and do not demonstrate an advantage. SOURCE is the full-information comparator even though, for this short fixture, metadata makes the other structured wires larger. The equal non-SOURCE byte ceiling is enforced; equivalent real-model token budgets are not yet implemented.

The separate nine-faux-call ablation evidence is `evidence/history-ablations.json`: relevant context admitted one item; unrelated and contradictory variants admitted none with exclusions recorded. `evidence/budget-failure.json` preserves an exhausted allowance, the earlier completed sender and exact refused receiver context. These are deterministic controls, not real-model failures.

Screenshots and actual Chromium version/network/error log: `artifacts/browser-004/{SOURCE,PLAIN,LINKED,CONTEXT}.png` and `browser.json`. The viewer opens through `file://` without a server or credentials. Full-page screenshots contain the source, selection, delivery, recipient, advisory and separate authored diagnostic sections. Requests include temporary local working-directory identifiers; evidence is local, not cleared for publication.

Earlier artifacts were preserved. Run 001 was an implementation smoke: it parsed the queued faux text rather than the returned session message and used a generated role UUID. Runs 002/003 improved capture. Final 004 reads the actual returned assistant message and actual Pi session identity. Earlier runs are not substituted for the final capture. No original supplied demo, fixture or v0.1 test was overwritten; README and package scripts were intentionally updated to expose the new integration.

## Negative-control coverage and limits

Tests exercise missing conditions, reversed scope, stale/unsupported memory, conflicting history, data-context injection, missing/bad source spans, introduced assertions, UNKNOWN, wrong answer endorsed by a biased judge, duplicate-source leakage, capped reservations, timeout aborts, overwrite refusal and no-fetch execution. Recipient captures prove absence of host-only reference fields and the complete original source outside SOURCE. C gets source/task/anonymous answer only. No tools or history backchannels are available.

The injection test proves transport separation, not semantic robustness of an AI. Exact-quote checks do not detect every unsupported paraphrase or dishonest interpretation. Preservation remains an uncalibrated lexical diagnostic (`not_checked`), not semantic validation. The host rubric is structurally separate from C but was authored by the implementer, not an independent human. No independent agreement statistics, confirmatory p-values or scientific-freeze claims are appropriate.

Application code refuses overwriting existing run directories and hashes detect changes; this is not hardware-enforced immutable storage. Offline failures are retained, not repaired. No correction/negotiation loop or persistent personal-memory provider is claimed. Byte accounting and the faux adapter do not qualify production live token/spend enforcement.

## Why REFINE before a live proposal

1. External dataset selection is blocked: a complete prior Hallucination Energy fitting/calibration/evaluation ledger is missing. The pinned HaluEval revision, declared license, configuration/split/columns and deterministic exclusion plan are documented; no records or held-out IDs were invented.
2. Current official OpenCode Go endpoint paths differ from the installed Pi catalogue. API families/model IDs align, but route and Messages-path auth-header behavior need explicit offline qualification. No dependency or model configuration was changed and no endpoint was probed.
3. Real model tokenizer/budget enforcement, schema/stream truncation policy and a prospective executable source/settings lock remain future work. The offline runner has no live execution switch.
4. Independent rubric review, an independently authored second task, and judge-error assessment against human-adjudicated controls are pending. Do not convert authored fixture labels or C advice into independent gold.

See `docs/PROSPECTIVE-LIVE-DESIGN.md`: proposed A DeepSeek V4.1 Flash / B Qwen3.8 Flash / C GLM-5.3, A/B rotation, maximum 48 calls for two synthetic tasks, indicative US$0.44 un-cached list-price allowance and proposed US$1 cap. Those numbers are a review proposal only, not an approved or executable configuration. Actual billing and account availability are unverified. No live pilot begins from this report.

## Reproduce offline

From `C:\Projects\project-language\experiments\communication-transfer-v1`:

```powershell
npm test
npm run offline -- artifacts/my-new-run
npm run browser -- artifacts/my-new-run/viewer.html artifacts/my-new-browser-evidence
node src/verify-evidence.mjs artifacts/my-new-run
```

Use previously nonexistent directories. No authentication configuration is needed. Read `docs/TRANSFER-01A-PROTOCOL.md`, `docs/ASSESSMENT-RUBRIC.md`, `docs/DATASET-IMPORT-PLAN.md` and `docs/PROSPECTIVE-LIVE-DESIGN.md` before designing the next milestone.

## Inventory and preservation

`evidence/baseline.json` records starting HEAD/index hash, exact starting Git status and hashes of all pre-existing experiment files, including ignored artifacts. `evidence/final-inventory.json` lists exact final staged, unstaged and untracked paths and preservation results; `evidence/offline-source-lock.json` snapshots implementation/input/dependency source hashes, not a live experimental approval lock. Generated run/browser artifacts remain ignored under the existing artifacts rule and are listed separately. Existing `C:\Projects\language` manuscript/site/image changes were left untouched.

During work, HEAD advanced externally from `329660f` to `c0caa86` (`starter ai lang ai`) and that commit captured most experiment files. This agent did not issue a commit or push. The raw index hash therefore changed; it is not claimed unchanged. The concurrent commit is preserved, with no reset or amendment. Final status leaves the report, inventory and offline source snapshot untracked. Production core/host/harness changes relative to starting HEAD remain absent. The inventory records both HEADs and the exact observed status rather than treating the external commit as agent work.

Stop: no real-model pilot, manuscript promotion or next experiment is started.
