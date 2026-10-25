# LC-02-R7 — Hybrid Semantic Checking Qualification

**Status:** Offline local-model experiment. Not production integration.
**Date:** 2026-10-24
**Repository:** `C:\Projects\project-language`
**Decision:** **PREFER_DETERMINISTIC**

---

## 0. Decision

R7 asked whether a locally evaluated model-assisted semantic reviewer adds meaningful discrimination beyond the R6 typed-constraint checker.

The answer is **no, not on clean evidence**.

The pilot hybrid (C) detected 11 of 12 corruptions, compared with 9/12 for R6 (A) and 8/12 for the reviewer alone (B), with zero material false acceptances. That looks like a gain until the corpus is audited.

**Twelve of the 24 pilot held-out cases substantially overlap R5/R6 cases. Two are exact source duplicates.** The overlap includes the two cases that produced C’s apparent advantage:

- `E05` broadened exception is a 0.929 source-token near-duplicate of `R6-E05`;
- `E08` unknown-to-established fact is a 0.846 near-duplicate of `R6-E08`.

Those are not unseen cases. They are development replications.

On the 12 non-overlapping cases, the result reverses:

| Metric | A: R6 | B: reviewer | C: hybrid |
|---|---:|---:|---:|
| Corruption detection | **5/5** | 3/5 | **5/5** |
| Material false acceptances | 0 | 0 | 0 |
| Faithful accepted | **4/5** | **4/5** | 3/5 |
| False rejections | 1 (`E13`) | 1 (`E17`) | 2 (`E13`, `E17`) |
| Ambiguity clarified | 1/2 | 1/2 | 1/2 |
| Policy correct | **10/12** | **10/12** | 9/12 |

C adds no corruption detection over A on clean cases, increases false rejections, and lowers policy accuracy. B is worse on corruption detection and does not compensate.

The recommendation is therefore:

> **Keep the R6 typed-constraint checker. Do not adopt or continue the hybrid as the primary semantic-checking route.**
>
> The pilot produced useful engineering findings about reconciliation and local-model behaviour, but it does not establish a clean advantage over the deterministic checker. A future hybrid experiment would require independently authored, non-overlapping cases and a new protocol before any further claim.

This is not a claim that contextual review can never help. It is a claim that R7 did not demonstrate that it does.

### Why this is not `REVISE_HYBRID`

`REVISE_HYBRID` would imply that the architecture is promising enough to revise and retest now. The clean subset does not support that. The only clean evidence shows C collapsing to A’s detection while adding false rejections. The apparent hybrid gains are on contaminated cases. The responsible next step is to preserve the deterministic components and redirect effort, not to spend another round tuning reconciliation against the same contaminated corpus.

### Why this is not `STOP_CHECKER_RESEARCH`

R6 remains a real, useful result: typed constraints close a material false-acceptance class and are worth preserving. The R7 pilot also produced a valid local reviewer harness, exact-quote validation, a reconciliation contract and useful failure analysis. The research should stop investing in the hybrid as the primary route, not discard the deterministic checker or the infrastructure.

---

## 1. Corpus contamination disclosure

This disclosure is part of the result, not an appendix.

### Measurement

- Source-token Jaccard similarity.
- Comparison sets: R5 and R6 evaluation sources.
- Threshold: `>= 0.45` is treated as substantial overlap.
- Exact source equality is flagged separately.

### Result

| Measure | Value |
|---|---:|
| Pilot held-out cases | 24 |
| Overlapping cases | **12** |
| Exact source duplicates | **2** |
| Non-overlapping clean cases | **12** |
| Eligible as fresh held-out evidence | **No** |

Overlapping cases:

| R7 case | Nearest prior case | Jaccard | Exact |
|---|---|---:|---|
| `E01` | `R6-E01` | 0.765 | No |
| `E02` | `R6-E02` | 0.833 | No |
| `E03` | `R6-E03` | 0.875 | No |
| `E05` | `R6-E05` | 0.929 | No |
| `E08` | `R6-E08` | 0.846 | No |
| `E11` | `R6-E10` | 0.529 | No |
| `E12` | `R6-E07` | 0.533 | No |
| `E16` | `R6-E11` | 0.500 | No |
| `E19` | `R6-E15` | 0.895 | No |
| `E20` | `R6-E20` | **1.000** | **Yes** |
| `E22` | `R6-E22` | 0.870 | No |
| `E23` | `R6-E10` | **1.000** | **Yes** |

The exact duplicates are decisive: `E20` and `E23` are not new pairs. The high-similarity cases are also not credible unseen evidence.

### Clean subset

The 12 non-overlapping cases are:

`E04`, `E06`, `E07`, `E09`, `E10`, `E13`, `E14`, `E15`, `E17`, `E18`, `E21`, `E24`.

Composition:

- 5 corruptions;
- 5 faithful;
- 2 ambiguities.

This is a small, unbalanced sample. It is sufficient to reject the claim that R7 demonstrated a clean hybrid advantage. It is not sufficient to establish a precise performance estimate.

### Protocol consequence

- The pilot run at `EVAL-001` is a **contaminated pilot**, not clean held-out evidence.
- The pilot’s aggregate gates are reported for transparency but are not eligible for adoption.
- The clean subset is the decision basis.
- The pilot corpus must not be reused as held-out evidence in a future experiment.

---

## 2. Architecture and contracts

### A. Deterministic checker

The R6 checker is unchanged:

- `apps/language-demo/evaluation/semantic-checker-v6.mjs`
- version: `lc02-r6-semantic-check/0.1`
- SHA-256: `ed17ecb14a66ebb42b6f1b03427c4bd4b021d4829e66aee9edc2f3a9f5801692`

It remains authoritative for the mechanical comparison it performs: numbers, written numbers, operators, units, thresholds, durations and explicit source-linked constraints.

### B. Local model-assisted reviewer

- `apps/language-demo/evaluation/semantic-reviewer-v7.mjs`
- contract: `semantic-reviewer-v7-contract.mjs`
- version: `lc02-r7-local-review/0.1`
- prompt version: `lc02-r7-review-prompt/0.4`
- model: `qwen3.5:latest` via the existing local Ollama endpoint
- digest: `6488c96fa5faab64bb65cbd30d4289e20e6130ef535a93ef9a49f42eda893ea7`
- 9.7B parameters, Q4_K_M
- `think:false`, `temperature:0`, `num_predict:1400`, 120-second timeout
- no hosted calls, no retries, no fallback.

The reviewer receives the source, transformation, communication purpose and declared obligations. It does not receive R6 findings, expected labels, references or recipient answers.

Each proposal contains a change kind, epistemic direction, materiality, exact source and transformation quotes, explanation and confidence. Quotes are validated exactly. Invalid quotes are rejected as `INVALID_EVIDENCE`; they are not repaired and no different model is substituted.

### C. Reconciliation

- `apps/language-demo/evaluation/hybrid-checker-v7.mjs`
- version: `lc02-r7-hybrid-reconciliation/0.1`

Rules:

1. Deterministic findings are retained.
2. Reviewer findings are mapped into the same vocabulary with exact anchors.
3. Matching type + distinction + source overlap is `CORROBORATED`.
4. Conflicts are `DISPUTED`; both findings and evidence remain.
5. Deterministic findings are never silently removed.
6. `USE_TRANSFORMATION` requires a valid reviewer, positive `NO_MATERIAL_CHANGE` evidence, no material, no unresolved and no dispute.
7. Reviewer failure routes to `REQUEST_CLARIFICATION`, never `USE_TRANSFORMATION`.

### D. Test-only policy

- `PRESERVE_SOURCE`
- `USE_TRANSFORMATION`
- `REQUEST_CLARIFICATION`

No policy is connected to Studio communication. No action authority is granted.

---

## 3. Relationship to R6

R6 remains the reference implementation. R7 does not modify it.

On the pilot corpus, A produced:

- 9/12 corruption detection;
- 0 material false acceptances;
- 7/8 faithful accepted;
- 1 false rejection (`E13`);
- 3/4 ambiguity clarified;
- 21/24 policy accuracy.

On the clean subset, A produced:

- 5/5 corruption detection;
- 0 material false acceptances;
- 4/5 faithful accepted;
- 1 false rejection (`E13`);
- 1/2 ambiguity clarified;
- 10/12 policy accuracy.

The R6 weaknesses are visible again:

- `E05` broadened exception: A produced `UNRESOLVED/SOURCE_AMBIGUITY`, not `BROADENED_EXCEPTION`.
- `E08` unknown to established fact: A produced `NEGATION_REVERSAL`, not `UNKNOWN_TO_ESTABLISHED_FACT`.
- `E12` invented authority: A produced the right distinction but anchored it to the wrong source statement.
- `E13` faithful quantitative paraphrase: A produced a false `MODALITY_CHANGE` and two `UNSUPPORTED_CONTENT` findings.
- `E24` conflicting evidence: A produced `UNSUPPORTED_UNCERTAINTY` instead of `UNRESOLVED/SOURCE_AMBIGUITY`.

R7 tests both those weaknesses and the reconciliation problem.

---

## 4. Historical development controls

Historical cases are disclosed development material. They are not held-out evidence.

| Case | Expected | A matched | B matched | C matched | A policy | B policy | C policy | B status |
|---|---|---:|---:|---:|---|---|---|---|
| `R6-E05` broadened exception | `BROADENED_EXCEPTION` | No | Yes | Yes | CLARIFY | PRESERVE | PRESERVE | VALID |
| `R6-E08` unknown→fact | `UNKNOWN_TO_ESTABLISHED_FACT` | No | Yes | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `R6-E09` speaker swap | `MISATTRIBUTED…` | Yes | Yes | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `R6-E10` wrong reference | `WRONG_CROSS_SENTENCE_REFERENCE` | Yes | No | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `R6-E11` unsupported causal | `UNSUPPORTED_CAUSAL` | Yes | No | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `R6-E12` invented uncertainty | `UNSUPPORTED_UNCERTAINTY` | Yes | Yes | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `R5-E11` forty→fifty | `SCOPE_OR_QUANTITY_CHANGE` | Yes | Yes | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `R5-E18` task omission | `PRESERVED` | No | No | No | PRESERVE | PRESERVE | PRESERVE | VALID |
| `R5-E04` broadened exception | `BROADENED_EXCEPTION` | No | Yes | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `R5-E07` unknown→fact | `UNKNOWN_TO_ESTABLISHED_FACT` | No | Yes | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `LC20-07` B | `UNSUPPORTED_UNCERTAINTY` | Yes | No | Yes | PRESERVE | CLARIFY | PRESERVE | INVALID |
| `LC20-07` C | `UNSUPPORTED_UNCERTAINTY` | Yes | No | Yes | PRESERVE | CLARIFY | PRESERVE | INVALID |
| `LC20-10` B | `UNSUPPORTED_UNCERTAINTY` | Yes | No | Yes | PRESERVE | CLARIFY | PRESERVE | INVALID |
| `LC20-10` C | `UNSUPPORTED_UNCERTAINTY` | Yes | No | Yes | PRESERVE | CLARIFY | PRESERVE | INVALID |
| `LC20-02` B | `UNRESOLVED` | Yes | No | Yes | PRESERVE | PRESERVE | PRESERVE | VALID |
| `LC20-02` C | `UNRESOLVED` | Yes | No | Yes | PRESERVE | CLARIFY | PRESERVE | INVALID |
| `LC20-19` B | `UNRESOLVED` | Yes | No | Yes | PRESERVE | CLARIFY | PRESERVE | INVALID |
| `LC20-19` C | `UNRESOLVED` | Yes | No | Yes | PRESERVE | CLARIFY | PRESERVE | INVALID |

### What the historical controls show

- **The reviewer can repair the two R6 distinction failures.** B correctly identifies `E05` as exception scope and `E08` as epistemic status.
- **The reviewer is not reliable on causal or cross-sentence reasoning.** B misses `E10` and `E11`.
- **The reviewer does not repair the task-appropriate omission control.** `R5-E18` remains rejected by A, B and C. The model treats the omitted five-minute arithmetic as a material quantity change even when the purpose explains that the dashboard reading may show the threshold is met.
- **Long proposals break exact evidence.** B produced invalid evidence on 7 of 8 LC20 arm outputs. C stayed safe because A controlled, but B added no value there.
- **The hybrid remains conservative.** C matched every historical expected distinction except `R5-E18`, because A matched most of them and B added `E05`/`E08`.

These are development observations. They support the reviewer’s plausibility; they do not establish clean generalization.

---

## 5. Pilot evaluation design and results

### Corpus

- 12 development cases.
- 24 pilot “held-out” cases: 12 corruptions, 8 faithful, 4 ambiguity.
- Categories include numbers, boundaries, duration, multiple constraints, exceptions, prerequisites, speaker/reference, unknown-to-fact, invented uncertainty, causal promotion, reordered summaries, omissions and cross-section dependencies.

The corpus was frozen and the pilot run executed once. The overlap audit was performed after execution. That audit invalidates the pilot as fresh held-out evidence.

### Pilot metrics (descriptive only)

| Metric | A: R6 | B: reviewer | C: hybrid |
|---|---:|---:|---:|
| Corruption detection | 9/12 | 8/12 | 11/12 |
| Material false acceptances | 0 | 0 | 0 |
| Faithful accepted | 7/8 | 7/8 | 6/8 |
| False rejections | `E13` | `E17` | `E13`, `E17` |
| Ambiguity clarified | 3/4 | 3/4 | 3/4 |
| Policy correct | 21/24 | 22/24 | 21/24 |
| Reviewer valid | — | 24/24 | 24/24 |
| Source-grounded cases | 19/24 | 17/24 | 22/24 |
| Average latency | 1,205 ms | 6,573 ms | 7,779 ms |

Reviewer usage: 22,329 input tokens, 5,460 output tokens across 24 calls.

The pilot’s apparent C gain over A is `E05` and `E08`, both near-duplicates of R6 cases. The pilot’s `E13` gain is a detection of preservation, not an accepted faithful transformation. C’s false rejections are `E13` and `E17`.

### Clean subset metrics (decision basis)

| Metric | A: R6 | B: reviewer | C: hybrid |
|---|---:|---:|---:|
| Corruption detection | **5/5** | 3/5 | **5/5** |
| Material false acceptances | 0 | 0 | 0 |
| Faithful accepted | **4/5** | **4/5** | 3/5 |
| False rejections | `E13` | `E17` | `E13`, `E17` |
| Ambiguity clarified | 1/2 | 1/2 | 1/2 |
| Policy correct | **10/12** | **10/12** | 9/12 |

The clean subset is small and unbalanced, but it is the only non-overlapping evidence. It does not show a hybrid advantage. It shows C matching A on detection and adding a false rejection.

### Clean subset cases

| Case | Type | Expected | A policy | B policy | C policy | A det | B det | C det |
|---|---|---|---|---|---|---|---|---|
| `E04` | Corruption | PRESERVE | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | Yes |
| `E06` | Corruption | PRESERVE | PRESERVE | PRESERVE | PRESERVE | Yes | No | Yes |
| `E07` | Corruption | PRESERVE | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | Yes |
| `E09` | Corruption | PRESERVE | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | Yes |
| `E10` | Corruption | PRESERVE | PRESERVE | PRESERVE | PRESERVE | Yes | No | Yes |
| `E13` | Faithful | USE | **PRESERVE** | USE | **PRESERVE** | No | Yes | Yes |
| `E14` | Faithful | USE | USE | USE | USE | Yes | Yes | Yes |
| `E15` | Faithful | USE | USE | USE | USE | Yes | No | Yes |
| `E17` | Faithful | USE | USE | **PRESERVE** | **PRESERVE** | Yes | Yes | Yes |
| `E18` | Faithful | USE | USE | USE | USE | Yes | Yes | Yes |
| `E21` | Ambiguity | CLARIFY | CLARIFY | CLARIFY | CLARIFY | Yes | Yes | Yes |
| `E24` | Ambiguity | CLARIFY | **PRESERVE** | **USE** | **PRESERVE** | No | No | No |

On clean cases, B misses two corruptions (`E06`, `E10`) and falsely rejects `E17`. C inherits A’s `E13` false rejection and B’s `E17` false rejection. C does not add a clean detection.

---

## 6. Failure analysis

The pilot’s failures remain useful engineering evidence even though the pilot is not clean held-out evidence.

### 6.1 `E13` — A’s non-constraint false positives survive reconciliation

**Source:** “Samples may be stored for up to twenty-one days.”
**Transformation:** “The sample storage limit is no more than twenty-one days.”
**Expected:** preservation, `USE_TRANSFORMATION`.
**A:** `MODALITY_CHANGE` plus two `UNSUPPORTED_CONTENT` findings; `PRESERVE_SOURCE`.
**B:** `NO_MATERIAL_CHANGE`; `USE_TRANSFORMATION`.
**C:** `PRESERVE_SOURCE`.

C downgrades A’s `MODALITY_CHANGE` to a dispute because B says the transformation is faithful. But A’s two `UNSUPPORTED_CONTENT` findings are not typed constraint findings, and the current rule does not allow the reviewer’s preservation evidence to dispute them. They remain material, so C preserves.

This is a reconciliation defect, not a model failure. A valid reviewer with exact positive evidence should be able to dispute all non-constraint deterministic findings. Typed constraints should remain authoritative; lexical `UNSUPPORTED_CONTENT` findings should not be treated as infallible.

### 6.2 `E17` — B’s terminology false positive forces preservation

**Source:** “During a storm, operators may copy the recovery key into a sealed laptop.”
**Transformation:** “During a storm, operators are allowed to duplicate the recovery key into an isolated laptop.”
**Expected:** preservation, `USE_TRANSFORMATION`.
**A:** `USE_TRANSFORMATION`.
**B:** material `UNSUPPORTED_ADDITION` because “sealed” became “isolated”; `PRESERVE_SOURCE`.
**C:** `PRESERVE_SOURCE`.

A correctly recognises the terminology paraphrase. B over-reads it as a material addition. C treats B’s material finding as sufficient for preservation. Model-only material findings should be candidates, not authoritative verdicts. A model-only material finding should route to `REQUEST_CLARIFICATION` unless corroborated by a deterministic finding or a typed constraint. That would avoid the false rejection without accepting the transformation.

### 6.3 `E24` — conflicting evidence is not recognised as ambiguity

**Source:** “One log says the backup completed. Another log says the backup failed. The record does not resolve the conflict.”
**Transformation:** “The backup status remains unresolved because the logs conflict.”
**Expected:** `UNRESOLVED/SOURCE_AMBIGUITY`, `REQUEST_CLARIFICATION`.
**A:** `UNSUPPORTED_UNCERTAINTY`, `PRESERVE_SOURCE`.
**B:** `NO_MATERIAL_CHANGE`, `USE_TRANSFORMATION`.
**C:** `PRESERVE_SOURCE`.

Both methods fail. A treats the transformation’s “unresolved” as invented uncertainty. B treats the transformation as a faithful summary of a conflict. Neither has a category for conflicting source evidence. The expected distinction is `SOURCE_AMBIGUITY`, but the ambiguity cue list does not include “does not resolve the conflict,” and the reviewer prompt does not require conflict to be classified as ambiguity.

This is a missing evidence category: **CONFLICTING_EVIDENCE**.

### 6.4 `E05` and `E08` — correct model finding, wrong primary record

`E05` and `E08` are the pilot’s apparent successes, but they are near-duplicates of R6 cases.

- `E05`: B correctly proposes `EXCEPTION_SCOPE`; A proposes `UNRESOLVED/SOURCE_AMBIGUITY`. C surfaces both, but A’s `UNRESOLVED` remains primary. The policy is correct; the record still leads with the wrong distinction.
- `E08`: B correctly proposes `ESTABLISHED_FROM_UNRESOLVED`; A proposes `NEGATION_REVERSAL`. C surfaces both, but A’s negation finding remains primary.

The hybrid’s detection metric counts these because the correct finding is in the combined record. A human reader would still see the wrong distinction first. The reconciliation contract needs a rule for promoting a more specific non-constraint model finding when it has exact evidence and the deterministic finding is a known lexical approximation. This does not weaken deterministic authority for typed constraints; it corrects the hierarchy for semantic distinctions.

Because these cases are near-duplicates of R6 development cases, this capability is not clean held-out evidence.

### 6.5 `E12` — correct distinction and correct evidence are split

**Source:** “The note records a failed migration. It does not authorise rollback.”
**Transformation:** “The operator may roll back the release without approval.”
**Expected:** `UNSUPPORTED_ADDITION_CANDIDATE/INVENTED_AUTHORITY`, source quote “It does not authorise rollback.”

- A produces `INVENTED_AUTHORITY`, but anchors it to “The note records a failed migration.”
- B produces `BROADENED_EXCEPTION`, but anchors it to “It does not authorise rollback.”

C keeps both, but neither finding has the expected distinction and anchor together. The hybrid has the pieces but does not combine them. A revised reconciliation could merge a deterministic distinction with the reviewer’s evidence for the same claim when the reviewer evidence is exact and the findings overlap. That is a genuine hybrid capability, not a model override.

### 6.6 Missing-condition and causal cases

- `E06` missing prerequisite: A detects; B misses; C detects via A.
- `E10` causal promotion: A detects; B misses; C detects via A.
- `E11` wrong cross-sentence reference: A detects; B misses; C detects via A.

The hybrid’s detection in these cases is inherited from R6, not added by the reviewer. B’s weakness on causal and cross-sentence reasoning is a limitation of the local model.

### 6.7 The dispute-label defect

In `E24`, the deterministic `UNSUPPORTED_UNCERTAINTY` finding is marked `DISPUTED` with the reason `NON_AUTHORITATIVE_MODALITY_DISPUTED_BY_MODEL`, even though its distinction is not `MODALITY_CHANGE`. The policy correctly keeps it material, but the label is wrong.

The cause is a reconciliation branch that writes the modality-dispute reason for every conflict. This is a reporting defect.

---

## 7. Grounding and disagreement analysis

### Reviewer validity

- 24/24 pilot reviewer outputs were schema-valid and had exact source and transformation quotes.
- 3/3 qualification cases passed (`E05`, `E08`, `E13`).
- On historical LC20 proposals, 7/8 outputs were invalid because the model could not produce exact quotes from long multi-section texts.
- No retries, no fallback, no model substitution.

Short fresh cases are within the reviewer’s competence. Long proposals are not. This is a scalability limitation.

### Evidence grounding

- C matched 22 expected findings in the pilot.
- All 22 matched findings had exact source evidence.
- All 22 had transformation evidence where the reference specified one.
- C failed to match `E12` and `E24`; case-level source grounding is 22/24. The failure is detection, not fabricated evidence.
- Invalid reviewer quotes were rejected; none passed validation.

### Disagreements

The pilot recorded 26 disagreements:

- corroborated findings;
- `DISTINCTION_DISAGREEMENT` on `E05`, `E06`, `E08`, `E10`, `E12`, `E17`;
- `MODEL_CLAIMS_PRESERVED_DETERMINISTIC_MATERIAL` on `E13`, `E24`.

No deterministic finding was silently removed.

The disagreements are informative, but the current reconciliation does not resolve them:

- It preserves both findings, which is correct.
- It keeps the deterministic finding primary even when the model has the more specific correct distinction, which is too rigid for non-constraint claims.
- It counts model-only material findings as authoritative for policy, which is too permissive.

---

## 8. Cost, complexity and latency

| Method | Average | Maximum |
|---|---:|---:|
| A: R6 | 1,205 ms | 2,952 ms |
| B: reviewer | 6,573 ms | 9,314 ms |
| C: hybrid | 7,779 ms | 10,594 ms |

- 24 local calls.
- 22,329 input tokens.
- 5,460 output tokens.
- 0 errors, 0 retries.
- Local compute; no invoice cost.
- The model was already installed; no download or configuration change.

| Artifact | Lines | Bytes |
|---|---:|---:|
| Reviewer contract | 140 | 5,171 |
| Reviewer adapter | 119 | 9,847 |
| Hybrid reconciliation | 165 | 15,991 |
| Offline tests | 86 | 8,085 |

The reviewer adds one local model call per case and roughly 6.6 seconds average latency on this machine. The hybrid adds about 1.2 seconds beyond the reviewer. That is tolerable for an offline research instrument; it is not a live communication gate.

The hybrid is more complex than R6 in three ways:

1. a nine-kind reviewer schema and prompt;
2. a matching/dispute/primary/policy reconciliation surface;
3. a probabilistic component whose labels can change with prompt wording.

The reviewer was technically reliable on short cases (24/24 valid) but failed exact quotes on 7/8 long proposals. The architecture is not yet robust to multi-section inputs.

---

## 9. Recommendation

**Decision:** `PREFER_DETERMINISTIC`

### What to keep

- R6 typed constraints and source-linked comparison.
- The local reviewer adapter, versioned contract, exact-quote validation and request ledger as research infrastructure.
- The separation of findings from policy.
- The refusal to let a model silently remove a typed-constraint violation.
- The distinction between source standing and transformation assessment.

### What to stop

- Do not adopt the hybrid as a communication gate.
- Do not continue extending the hybrid against the contaminated R7 pilot.
- Do not treat the pilot’s 11/12 as clean evidence.
- Do not integrate the reviewer into Studio communication.
- Do not treat the local model’s silence or preservation claim as proof of equivalence.

### What a future clean experiment would require

If the hybrid is revisited, it must start with a new protocol:

1. **Independently authored, non-overlapping corpus.** New sources and transformations, checked against all prior R4/R5/R6/R7 artifacts before freezing. No exact duplicates and no high-similarity paraphrases.
2. **Independent adjudication.** Reference distinctions must be authored or reviewed by someone other than the implementation agent, with a blinded process.
3. **Frozen prompt and model identity.** No prompt changes after held-out inspection.
4. **Clean subset first.** If overlap is discovered, stop; do not reinterpret the contaminated run as held-out evidence.
5. **Reconciliation repair before retest.** Address the specific failures:
   - non-constraint deterministic findings must be disputable with exact reviewer evidence;
   - model-only material findings should route to clarification unless corroborated;
   - complementary distinction/evidence should be mergeable;
   - conflicting evidence should have a category;
   - the dispute label must be correct.
6. **A second independent signal for model-only material findings.** One 9.7B local model is not enough to authorize preservation.

The R7 pilot provides a useful list of what to repair. It does not provide permission to adopt or continue the hybrid as the primary route.

### Why not `STOP_CHECKER_RESEARCH`

R6 is still useful. The typed-constraint checker closes a real false-acceptance class, and the R7 infrastructure is reusable. The research should stop investing in the hybrid as the main semantic comparison mechanism, not discard the deterministic components.

---

## 10. Verification and limitations

### Checks

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| Root `npm run verify` | 1,114 passed, 3 skipped, 0 failed |
| Studio `npm test` | 100 passed, 0 failed |
| Python `unittest` | 25 passed |
| R7 offline reviewer tests | 7 passed |
| Batch20 historical artifacts | 231/231 raw-byte SHA-256 verified |
| R6 frozen checker/corpus | Unchanged |
| R7 frozen corpus/criteria | Verified before and after execution |
| Reviewer outputs | 24/24 schema-valid and exact-quote valid |

### Limitations

1. **Corpus contamination.** 12/24 pilot cases overlap R5/R6; 2 are exact duplicates. The pilot is not clean held-out evidence.
2. **Small clean subset.** Only 12 non-overlapping cases remain, with 5 corruptions, 5 faithful and 2 ambiguities.
3. **Author-constructed references.** They are provisional, not independent human adjudication.
4. **One local model.** `qwen3.5:latest` is a 9.7B local model. A different model could produce different results. No hosted model was used.
5. **Prompt tuning on development.** The prompt was refined on development and historical controls.
6. **Long-input fragility.** The reviewer failed exact-quote validation on 7 of 8 long LC20 proposals.
7. **No independent blinded review.** The assignment requires blinded independent review before any confirmatory publication claim. That has not happened.
8. **Single run.** The pilot was executed once. It is a research result, not a reproducible production measurement.
9. **Local hardware dependence.** Latency and token usage are machine-specific.

---

## 11. Artifacts

### Primary

- `experiments/lc-02-r7/CONTAMINATION-DISCLOSURE.json`
- `experiments/lc-02-r7/.runs/EVAL-001/results.json`
- `experiments/lc-02-r7/.runs/EVAL-001/results.md`
- `experiments/lc-02-r7/.runs/EVAL-001/analysis.json`
- `experiments/lc-02-r7/.runs/EVAL-001/clean-subset.json`
- `experiments/lc-02-r7/.runs/EVAL-001/reviewer-ledger.json`
- `experiments/lc-02-r7/.runs/QUALIFICATION-001/qualification.json`
- `experiments/lc-02-r7/.runs/HISTORICAL-003/historical-controls.json`
- `experiments/lc-02-r7/SUCCESS-CRITERIA.json`
- `experiments/lc-02-r7/CRITERIA-FREEZE.json`

### Implementation

- `apps/language-demo/evaluation/semantic-reviewer-v7-contract.mjs`
- `apps/language-demo/evaluation/semantic-reviewer-v7.mjs`
- `apps/language-demo/evaluation/hybrid-checker-v7.mjs`
- `apps/language-demo/tests/semantic-reviewer-v7.test.mjs`

### Experiment

- `experiments/lc-02-r7/build-corpus.mjs`
- `experiments/lc-02-r7/run-hybrid.mjs`
- `experiments/lc-02-r7/historical-controls.mjs`
- `experiments/lc-02-r7/qualify-local-reviewer.mjs`
- `experiments/lc-02-r7/analyze-results.mjs`
- `experiments/lc-02-r7/README.md`
- `experiments/lc-02-r7/SUMMARY.json`
- `experiments/lc-02-r7/EVIDENCE-INTEGRITY.json`

### Standing

- No hosted model calls.
- No Studio communication integration.
- No manuscript changes.
- No commit or push.
- No production authority.
- Human acceptance remains required for any transmission.

The useful result is that R7 exposed a clean-evidence problem before it became a product claim. The deterministic checker remains the supported mechanism. The hybrid is a research prototype with a real but unproven capability, and a future experiment must begin with a genuinely independent corpus.
