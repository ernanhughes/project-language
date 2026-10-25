# LC-02-BATCH20-R3 — Exploratory Live Preparation

**Post-run update:** This preparation was approved by the user and executed once on 2026-10-23. See `LC-02-BATCH20-R3-LIVE-RESULTS.md`. The live run made 76 actual hosted requests (78 reservations, 2 aborted before transport by an instrument guard false positive) and preserved the failure. The preparation text below is retained as the pre-run record.

**Status at preparation:** preparation complete. **No live provider request had been made.** The run was **pending explicit user approval**.

**Frozen R2 protocol is unchanged:** `experiments/lc-02-batch20-r2/FROZEN-LIVE-PROTOCOL.json` still hashes to `26009e396fa890c85b573fdeec9f0c3be04e4433fbe84b55e8cbb986918959e3` and still records `live_execution_authorized: false`.

**New exploratory approval record is pending:** `baf151edbd24ba3342803e8406b7451c7d28580873de9b8801ddca5d93251bb6`.

**New exploratory protocol is pending:** `49ed0c4d778f4421eaa445f73ee5ac7a67243072461333e39b4532b07ac30604`.

---

## 1. What is being proposed

One exploratory execution of the frozen V2 experiment, with:

| Item | Value |
|---|---|
| Cases | 16 frozen V2 cases, unchanged |
| Arms | A ordinary, B AI-mediated, C Understanding-enhanced |
| Planned calls | 80 (5 per case) |
| Absolute ceiling | 100 |
| Retries / fallback / resume | None |
| Compiler condition | `BLANK_ENGLISH_FALLBACK` |
| Reference review | Model-based provisional; **not independent human adjudication** |
| Research standing | Exploratory, not confirmatory |
| Post-result tuning | Prohibited |
| Execution count | Once |

The existing R2 protocol is preserved. The new approval and protocol are separate, versioned records.

### Approval scope

The approval record explicitly accepts:

- Model-based rather than independent human reference review.
- `BLANK_ENGLISH_FALLBACK` as the compiler condition.
- Exploratory rather than confirmatory research standing.
- The sixteen frozen V2 cases.
- 80 planned calls, maximum 100, no retries or fallback.
- One execution, no post-result tuning, no claim of semantic superiority.

### Guard behaviour

`run-live.mjs` refuses to start unless:

1. The approval record is `APPROVED` and `exploratory_live_authorized: true`.
2. The approval hash, exploratory protocol hash and V2 design hash all match.
3. The R2 protocol hash still matches the frozen value.
4. The execution scope is exactly 16 cases, 80 planned, 100 maximum.
5. `OPENCODE_API_KEY` is present.
6. The output directory does not already exist.

The pending record was tested with the live runner and failed closed at `EXPLICIT_APPROVAL_REQUIRED`. No output directory or request was created.

---

## 2. Pre-execution revalidation

`experiments/lc-02-batch20-r3/PRE-EXECUTION-REVALIDATION.json` records **22 checks; all pass**.

Key checks:

| Check | Result |
|---|---|
| V1 design preserved | `2c88429b777baca7207aad13ea3041746bc0a99d0d96fcc217aed81856c78de4` |
| V2 design frozen | `c1ca37936300384536b3c94d5cf5b38076b3a813bf6c934c0a053b9bd6bc09d9` |
| R2 protocol unchanged | `26009e396fa890c85b573fdeec9f0c3be04e4433fbe84b55e8cbb986918959e3`; `live_execution_authorized: false` |
| Approval record pending | `baf151edbd24ba3342803e8406b7451c7d28580873de9b8801ddca5d93251bb6` |
| Exploratory protocol pending | `49ed0c4d778f4421eaa445f73ee5ac7a67243072461333e39b4532b07ac30604` |
| Frozen batch-20 artifacts | 146 / 146 re-hash exactly |
| V2 scripted dry run | 13 / 13 checks pass; 80 scripted, 0 hosted |
| Compiler hints only to C | Pass |
| Fresh sessions | 80 unique scripted sessions |
| Same source across arms | Pass |
| Same question across arms | Pass |
| Frozen references excluded | Pass |
| Source-relative contract | Pass |
| No implicit authority | Pass |
| Failure accounting | Provider failure preserved; bad span preserved and rejected |
| Compiler | `spacy/blank-en+sentencizer`; trained syntax unavailable |
| Model assignments | Match R2 protocol |
| Case source/question/reference hashes | Match V2 |
| Live output absent | Pass |
| Hosted requests so far | 0 |

---

## 3. Live runner

`experiments/lc-02-batch20-r3/run-live.mjs` reuses the existing batch engine (`executeArm`) and the frozen R2 model assignments.

It:

- Uses the V2 cases and questions exactly.
- Keeps A/B/C treatment differences as recorded in R2.
- Uses a fresh Studio/Runtime per arm.
- Sends compiler hints only to C.
- Records every `MODEL_REQUEST` in a local ledger.
- Enforces 80 planned / 100 maximum, 5 per case, and the $10 configured budget.
- Stops on cap, case-cap or budget violations.
- Preserves failed arms; no retry or repair.
- Writes `results.json`, `results.csv`, `COMPARISON.md`, `FAILURES.md`, `LIVE-REPORT.md`, `viewer.html`, `LIVE-ANALYSIS.md`, `LIVE-ANALYSIS.json`, `manifest.json` and `artifact-hashes.json`.
- Runs `analyze-live.mjs` after the result to separate:
  - ties where all methods succeeded,
  - ties where all methods failed,
  - mechanical failures,
  - unnecessary-abstention candidates,
  - missing-condition candidates,
  - C-only better/worse cases,
  - explanation flags.

The analysis labels are provisional candidates, not semantic verdicts.

---

## 4. What this run can and cannot answer

### Can answer, exploratorily

1. **Did the R1 source-relative prompt repairs reduce unnecessary abstention?**  
   V2 includes clear permission/prohibition/unknown/conflict cases and the repaired contract.

2. **Did the current Understanding inventory add measurable benefit or harm beyond AI mediation?**  
   C vs B is the primary comparison; B vs A tests the repaired mediation behaviour.

3. **Did mediation still identify genuine missing conditions?**  
   The analysis will list cases where A failed and B/C succeeded, subject to source-grounded review.

4. **Did C-only structure help or distort?**  
   C-only better/worse cases and explanation flags are reported separately.

### Cannot answer

- Whether atomic meaning decomposition with cross-sentence relationships improves communication: the compiler still emits zero relations and has no trained syntax.
- Whether a semantic checker is more useful than adding hints to the interpreter: not tested.
- Whether Language has a general advantage: 16 synthetic cases cannot establish that.
- Whether the full Understanding Compiler concept is validated: this is a limited baseline.

### Ceiling-effect caveat

Both model-based reviewers agreed with the reference label on all 16 cases. If ordinary communication already reaches the reference label on most cases, B and C have little room to improve **decision accuracy**. V2 can still show:

- whether mediation abstains where ordinary answers correctly,
- whether C adds unsupported qualifications or misses conditions,
- whether explanation fidelity or uncertainty calibration differs,
- whether C-only structure changes a decision.

It cannot demonstrate an accuracy gain that the ceiling does not permit. V2 is not being rewritten. A future experiment with longer, realistic passages and cross-section dependencies is the right next step for that question.

---

## 5. Research-question distinction

| Research question | V2 status |
|---|---|
| Did R1's prompt repairs reduce unnecessary uncertainty? | Testable exploratorily |
| Does the current Understanding inventory help beyond ordinary AI mediation? | Testable, but only for this limited implementation |
| Does atomic decomposition with relationships improve communication? | Not testable; capability not implemented sufficiently |
| Is a semantic checker more useful than interpreter hints? | Not tested |

This experiment must not be described as validation of the full Understanding architecture.

---

## 6. Architecture options after the run

The result should inform a decision among:

1. **Compiler as context** — continue improving the inventory supplied to the interpreter.
2. **Compiler as independent checker** — compare a proposed communication against the source and accept, repair or preserve it.
3. **Preserve the original** — route to ordinary communication when the source is already sufficient.

No architecture is selected in advance. A null result should not automatically justify a more complicated compiler.

---

## 7. Approval request

The approval record remains pending. No live request will be made until the user explicitly approves the recorded scope.

If approved, the commands are:

```powershell
node --experimental-transform-types experiments/lc-02-batch20-r3/finalize-approval.mjs `
  --approved-by "USER" `
  --statement "I approve the exploratory V2 run under the recorded limitations." `
  --approval-phrase "APPROVE LC-02-R3 V2 EXPLORATORY"

node --experimental-transform-types experiments/lc-02-batch20-r3/run-live.mjs `
  --out experiments/lc-02-batch20-r3/.runs/LIVE-V2-001
```

The approval record and protocol hashes will change when the approval is recorded; the new hashes must be used for the run.

---

## 8. Standing and exclusions

- No live provider request was made.
- No spaCy model was installed or downloaded.
- No V2 case, reference, prompt, profile or arm was changed.
- The R2 protocol was not modified.
- No manuscript, commit or push.
- A null or negative result is valid.
- Any positive result requires later confirmation on fresh unseen cases.
