# TRANSFER-01B-WB — Workbench reuse report

Date: 2026-10-22. **Decision: PASS_OFFLINE, with live/effectiveness gates unresolved.**

The user's additional Workbench reference was reviewed during TRANSFER-01B. Its useful semantics were incorporated into a separately versioned optional extension under `src/negotiated-v1/`. The original four arms, source locks, 01A evidence and newly qualified 01B baseline remain unchanged. The Python Workbench repository was read-only.

## Reused and deliberately distinct

`docs/WORKBENCH-CONTRACT-COMPARISON.md` compares roles, proposals, challenge/revision, human acceptance, corrections, semantic history, envelopes, isolation, evidence, budgets and assessment. Actual reference code and negotiation tests were inspected. No Python services, provider client, archived price catalogue, optional retries or hosted outcomes were copied into Pi.

The baseline roles stay sender A / recipient B / advisory evaluator C. The optional extension instead uses interpreter A / reviewer B / fresh recipient C. Reviewer B is not the independent evaluator. Host-only assessment stays outside the exchange and remains NOT_ADJUDICATED.

Existing `core/language` state validation/serialization and deterministic revision IDs, plus the Pi harness and shared reservation primitive, are reused. A small experiment reducer adds the missing pending-proposal, challenge, exact acceptance and envelope lifecycle. It is not a port of the full Workbench kernel, a verified persistent Git thread store, or a general authority system. Interpretation acceptance never creates a grant or executes an action.

## Cases and matched baseline

Three unadjudicated synthetic cases test a changed licensing condition with a separate retained publication boundary, licensing still unresolved, and a staging exception that does not relax production retention. Each pair has the same source, clarification, accepted facts and four request opportunities: initial interpretation, reviewer challenge, linked revision, fresh recipient.

DIRECT_REVISED receives the accepted facts in an ordinary record. NEGOTIATED receives a validated source-linked semantic-state envelope. Both get equivalent correction opportunities; this compares representations after clarification, not negotiation versus no review. The recipient sees only its transfer and a novel decision question, never the original conversation, pending interpretations or hidden answer key. Sender/reviewer never receive that novel question.

All responses are supplied faux outputs returned through real Pi sessions. Clarification and acceptance are explicitly SIMULATED_HUMAN throughout. There is no real human acceptance, live model inference, independent adjudication or communication-improvement evidence.

## Actual checks and evidence

- Eight new WB tests passed; final combined experiment suite 52 passed, zero failed/skipped. Parent typecheck/full suite passed during the same milestone: 1,114 passed, three skipped. Core/host/harness remained unchanged.
- One early WB test run failed because resolved_by reused its opening reference. The existing core validator correctly refused it. The adapter fixture now retains original opening evidence and a separate resolving clarification. The failed log remains; the core was not changed.
- Real Chromium exercised all six paired traces from the file-based viewer, exposing accepted state, exact transfer and fresh-recipient input/answer. Zero page errors or external requests; reload passed. Screenshots and browser version are in `artifacts/transfer-01b-wb-browser-001/`.
- `artifacts/transfer-01b-wb-001/` contains six traces / 24 faux requests, immutable-by-application output files and SHA-256 manifest. Receipt/HTML hashes verify. Actual model spend US$0; real token consumption UNKNOWN.
- Direct/negotiated wire bytes were 761/1,699 (license resolved), 741/1,536 (license unresolved) and 770/1,673 (staging). Each arm had four equal request opportunities. The structured envelope is larger here; no compression or benefit is claimed.
- Negative evidence is separate: `artifacts/transfer-01b-wb-negative-001/` deliberately makes negotiated answers wrong, without repair; `artifacts/transfer-01b-wb-refused-001/` refuses acceptance and stops before recipients (18 faux calls). These controls are not real-model failures or extra live requests.

Tests cover pending versus accepted state, model-invented acceptance, exact proposal binding, reviewed constraints, retained-boundary loss, stale/current revisions, tampering, scope/expiry, explicit refusal, historical retention, fresh-recipient isolation, equivalent baseline information and deliberately worsened negotiated outcomes. Mechanical matches are kept apart from primary NOT_ADJUDICATED judgments.

## Reproduce offline and remaining work

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types experiments/communication-transfer-v1/src/negotiated-v1/run.mjs experiments/communication-transfer-v1/artifacts/my-new-wb-run
node experiments/communication-transfer-v1/src/negotiated-v1/browser.mjs experiments/communication-transfer-v1/artifacts/my-new-wb-run/viewer.html experiments/communication-transfer-v1/artifacts/my-new-wb-browser
```

Only offline fixture execution exists; no provider credential or live switch is available. Use new output directories. Source/reference hashes are recorded in `evidence/transfer-01b-wb-source-snapshot.json`; the B qualification lock remains unchanged and still verifies.

`docs/NEGOTIATED-PILOT-V1.md` is the proposed comparative design. Independent human task/criteria review, exact live models/routes, token/billing controls, separate executable prospective lock and explicit call/spending authorization remain necessary. This extension is outside the unapproved 48-call main pilot; it receives no live request allowance from it. No automatic next-stage work starts.

No real models, credentials, book changes, Workbench changes, commits or pushes. Taint remains NOT_COMPUTED / NOT_TRANSMITTED.
