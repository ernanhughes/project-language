# LC-02-R4 — Independent Semantic Checking Experiment

**Status:** offline experiment complete. No hosted model call, manuscript change, commit or push.

**Recommendation:** **REVISE, do not integrate.** The checker detects most deliberate corruptions with exact source spans, but on the held-out evaluation it falsely rejected **2 of 6** faithful transformations and failed to distinguish justified uncertainty from interpreter-added uncertainty in the two justified-uncertainty cases tested (four arm outputs). It is not reliable enough to act as an automatic Preserve / Enhance / Clarify gate.

---

## 1. What was built

### Checking implementation

`apps/language-demo/evaluation/semantic-checker.mjs`

The checker accepts:

- the original source with exact text and SHA-256;
- the proposed transformation with exact text and SHA-256;
- declared purpose, audience and context;
- explicit preservation obligations;
- the interpretation profile.

It returns structured candidates:

| Finding | Meaning |
|---|---|
| `PRESERVED_CANDIDATE` | An obligated source meaning has a candidate counterpart. |
| `MISSING_CANDIDATE` | An obligated meaning or prerequisite has no adequate counterpart. |
| `CHANGED_CANDIDATE` | Aligned meanings differ in negation, modality, exception, temporal order, attribution, scope or reference. |
| `UNSUPPORTED_ADDITION_CANDIDATE` | A transformation unit or relation has no adequate source counterpart. |
| `UNRESOLVED` | The source leaves an important ambiguity and the checker cannot decide. |
| `NOT_ASSESSED` | The method could not assess the unit. |

Each finding records exact source and transformation spans, a distinction, severity, confidence, the method and `standing: CANDIDATE_REQUIRES_REVIEW`.

The output always records:

```json
{
  "action_authority": false,
  "human_acceptance": "REQUIRED_FOR_ANY_TRANSMISSION",
  "repair": "NOT_PERFORMED"
}
```

A finding is not a verified equivalence, correction or authority grant.

### Versioned contract

`apps/language-demo/evaluation/semantic-checker-contract.mjs`

- Version: `lc02-r4-semantic-check/0.1`
- Contract hash: `13e815f911d22156add00a4203ea43aeb1596f3c23dbd28b8a89a65cc5329753`
- Checker hash: `8c1dd8e5a4edc2ea84f93aff3c092ac39839d6d02c63456bd6bec715938609ee`
- Input schema is strict and rejects `reference`, `expected_decision`, `recipient_answer`, `self_assessment` and similar fields.
- Every emitted source and transformation span is validated against the exact text before return.

Human-readable contract: `experiments/lc-02-r4/CHECKER-CONTRACT.md`.

### Method

The checker is lexical/rule-based, not model-assisted:

1. Compile source and transformation with the local Understanding Compiler profile.
2. Align obligated source meanings to transformation units by normalized content-token overlap.
3. Compare modality, negation, conditions, prerequisites, exceptions, temporal direction, speaker/quotation, scope/quantity and unresolved references.
4. Flag transformation units with no adequate source counterpart as unsupported additions.
5. Validate every span exactly before returning.

It does not use the reference answer, the downstream recipient's answer or the original interpreter's self-assessment.

---

## 2. Evaluation corpus

24 pairs:

| Split | Corruptions | Faithful controls |
|---|---:|---:|
| Development | 6 | 6 |
| Held-out evaluation | 6 | 6 |

Corruption classes represented:

- Missing prerequisite
- Negation reversal
- Changed permission or obligation
- Broadened exception
- Incorrect temporal ordering
- Invented authority
- Unknown converted to established fact
- Misattributed quotation or speaker
- Wrong cross-sentence reference
- Unsupported causal relationship

Faithful controls represented:

- Paraphrased conditions
- Reordered but equivalent statements
- Equivalent temporal descriptions
- Qualified summaries
- Harmless terminology changes
- Task-appropriate omissions

The corpus is frozen in `experiments/lc-02-r4/fixtures/FREEZE.json`:

| File | SHA-256 |
|---|---|
| `development-cases.json` | `7a3c00b3a6b49124817d3e35fa7b09a9409ea85499b89b7e95a37babf0c1a9e0` |
| `development-references.json` | `ab425c08a3727b49294e3ba1b6a527866db2f8277c064036d333faffcbb8b7f2` |
| `evaluation-cases.json` | `d3526077de278c0b736908e74f2bd6134cdfac5a1f97bfbc303471344b1608b2` |
| `evaluation-references.json` | `b229412a1e62c45f9d4b45d3b0b2d9cca8b4ac6e0d30beb7ed7392b1d2f60724` |

References are author-constructed provisional. They are not independent human adjudication. Development was used for checker tuning; evaluation was run once after the final checker version and was not used for further tuning.

---

## 3. Results

### Summary

| Method | Split | Corruption detection | Faithful accepted | False rejections | Policy accuracy | Latency avg / max |
|---|---|---:|---:|---:|---:|---:|
| New checker | Development | 6/6 (100%) | 6/6 | 0/6 (0%) | 12/12 (100%) | 943 ms / 995 ms |
| New checker | Evaluation | **5/6 (83.3%)** | **4/6** | **2/6 (33.3%)** | **10/12 (83.3%)** | 938 ms / 1000 ms |
| Lexical baseline | Development | 0/6 | 0/6 | 6/6 (100%) | 6/12 (50%) | 943 ms / 1012 ms |
| Lexical baseline | Evaluation | 0/6 | 0/6 | 6/6 (100%) | 6/12 (50%) | 936 ms / 999 ms |

The lexical baseline is exact-quote matching. It never matches a paraphrase, so it rejects every faithful control. It also fails every corruption at the expected distinction level: it notices that text changed, but cannot identify what changed.

The new checker is materially better than exact matching, but not reliable enough to integrate.

### Detection by corruption class

| Class | Development | Evaluation |
|---|---|---:|
| Missing prerequisite | 1/1 | 1/1 |
| Negation reversal | 1/1 | 1/1 |
| Changed permission/obligation | 1/1 | — |
| Broadened exception | 1/1 | — |
| Incorrect temporal order | 1/1 | — |
| Invented authority | 1/1 | — |
| Unknown to established fact | — | 1/1 |
| Misattributed quotation/speaker | — | 1/1 |
| Wrong cross-sentence reference | — | 1/1 |
| Unsupported causal relationship | — | 0/1 |

### Held-out evaluation case results

| Case | Type | Expected policy | New policy | Expected finding matched | Material findings |
|---|---|---|---|---|---|
| R4-E01 | Corrupt: unknown-to-fact | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | UNKNOWN_TO_ESTABLISHED_FACT plus extra negation/reference flags |
| R4-E02 | Corrupt: misattribution | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | MISATTRIBUTED_QUOTATION_OR_SPEAKER |
| R4-E03 | Corrupt: wrong reference | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | WRONG_CROSS_SENTENCE_REFERENCE plus extra negation/unknown flags |
| R4-E04 | Corrupt: unsupported causal | PRESERVE_SOURCE | PRESERVE_SOURCE | **No** | Missing meaning + unsupported content; causal distinction missed |
| R4-E05 | Corrupt: missing prerequisite | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | MISSING_PREREQUISITE |
| R4-E06 | Corrupt: negation reversal | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | NEGATION_REVERSAL |
| R4-E07 | Faithful: paraphrase | USE_TRANSFORMATION | **PRESERVE_SOURCE** | **No** | False MISSING_PREREQUISITE |
| R4-E08 | Faithful: reordered | USE_TRANSFORMATION | **PRESERVE_SOURCE** | **No** | False MODALITY_CHANGE |
| R4-E09 | Faithful: omission | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |
| R4-E10 | Faithful: terminology | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |
| R4-E11 | Faithful: qualified summary | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |
| R4-E12 | Faithful: equivalent temporal | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |

Policy counts on evaluation: **8 PRESERVE_SOURCE, 4 USE_TRANSFORMATION, 0 REQUEST_CLARIFICATION**. Expected: 6 preserve, 6 use. The two extra preserves are the false rejections.

### Development case results

| Case | Type | Expected policy | New policy | Expected finding matched | Material findings |
|---|---|---|---|---|---|
| R4-D01 | Corrupt: missing prerequisite | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | MISSING_PREREQUISITE |
| R4-D02 | Corrupt: negation reversal | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | NEGATION_REVERSAL |
| R4-D03 | Corrupt: modality change | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | MODALITY_CHANGE |
| R4-D04 | Corrupt: broadened exception | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | BROADENED_EXCEPTION |
| R4-D05 | Corrupt: temporal order | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | TEMPORAL_ORDER |
| R4-D06 | Corrupt: invented authority | PRESERVE_SOURCE | PRESERVE_SOURCE | Yes | INVENTED_AUTHORITY |
| R4-D07 | Faithful: paraphrase | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |
| R4-D08 | Faithful: reordered | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |
| R4-D09 | Faithful: omission | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |
| R4-D10 | Faithful: terminology | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |
| R4-D11 | Faithful: summary | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |
| R4-D12 | Faithful: temporal | USE_TRANSFORMATION | USE_TRANSFORMATION | Yes | None |

Full development output: `experiments/lc-02-r4/.runs/DEV-004/results.md`.

### False-alarm analysis

**R4-E07 — paraphrased conditions.**  
Source: “only if the incident ticket is open and the audit log remains intact.”  
Transformation: “Provided the incident ticket stays open and the audit log is unaltered.”  
The checker did not recognise `unaltered` as equivalent to `intact`, so it reported the audit-log prerequisite as missing. This is a paraphrase-robustness failure.

**R4-E08 — reordered equivalent statements.**  
Source: “The release requires an accepted security review, an approved change ticket, and a named production owner.”  
Transformation: “All three records are present: a named production owner, an approved change ticket, and an accepted security review. The release requires all three.”  
The checker aligned the obligation to the first sentence, whose modality is assertion, and reported a modality change. It did not use the later “The release requires all three” sentence strongly enough. This is an alignment/obligation-selection failure.

Both false alarms would cause the policy to preserve a faithful transformation. That is the exact intervention risk the experiment was designed to detect.

### Missed detection

**R4-E04 — unsupported causal relationship.**  
Source: “The investigation note says the cause has not been verified and offers one possible explanation.”  
Transformation: “The checksum failure caused the replica to become stale. The investigation confirmed the causal link.”  
The checker found missing/unsupported content but did not identify the specific causal distortion. The causal cue `caused` was not recognised by the current cue set. This is a detection gap, not a justification for loosening the policy.

The adversarial negation case (R4-E06) was detected: the same keywords appear with the polarity reversed. The adversarial causal case (R4-E04) was missed even though the transformation used the same subject terms plus `caused` and `confirmed`; keyword presence alone did not help the baseline, and the new checker did not yet recognise the inflected causal cue.

### Source-span grounding and qualification integrity

- 20 findings were emitted across the 12 evaluation cases.
- Every finding had at least one exact source span.
- 19 of 20 had a transformation span; the missing case was a `MISSING_CANDIDATE`, where no transformation counterpart exists.
- `validateCheckOutput` validated every span against the exact source or transformation text.
- The checker identified the expected source meaning in 5 of 6 held-out corruptions.
- It did not produce a verified-equivalence verdict for any finding.

### Processing cost

- New checker: ~938 ms average, ~1,000 ms maximum per case on the evaluation split.
- Lexical baseline: ~936 ms average, ~999 ms maximum.
- Most cost is two local Python compiler invocations per case, not the rule comparison.
- This is not a production latency measurement and has not been tested on long documents.

---

## 4. Study of prior failures

Disclosed development cases, not held-out evidence. The checker was applied to the frozen B and C interpreter proposals from LC-02-BATCH20.

| Case | Expected distinction | B matched | C matched | Policy | Assessment |
|---|---|---|---|---|---|
| LC20-07 | Interpreter-added uncertainty about “recorded acceptance” | Yes | Yes | PRESERVE_SOURCE | Detected as unsupported uncertainty, with many extra unsupported-content findings. |
| LC20-10 | Interpreter-added uncertainty about metric identity | Yes | Yes | PRESERVE_SOURCE | Detected as unsupported uncertainty. |
| LC20-02 | Justified uncertainty about “known-good” | No | No | PRESERVE_SOURCE | Falsely treated as unsupported uncertainty, not `UNRESOLVED`. |
| LC20-19 | Justified uncertainty about recorded time | No | No | PRESERVE_SOURCE | Falsely treated as unsupported uncertainty, not `UNRESOLVED`. |

### What this means

The checker can identify the harmful LC20-07/LC20-10 doubts as **unsupported additions**. That is a genuine positive signal.

But it cannot distinguish those from the justified LC20-02/LC20-19 doubts. In all four justified-uncertainty arm outputs (LC20-02 and LC20-19, B and C) it produced `UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_UNCERTAINTY` and no `UNRESOLVED`. It would therefore preserve the source even when the mediated caution was legitimate. That is over-intervention, not safe checking.

The checker also emitted many extra `UNSUPPORTED_CONTENT` findings because the proposal text contains paraphrases and qualifications that do not align cleanly to the source. The policy result is correct for the harmful cases, but for the wrong reason: it is broadly suspicious of all added material.

---

## 5. Preserve / Enhance / Clarify policy simulation

The test-only policy is implemented in `policyDecision`:

| Condition | Outcome |
|---|---|
| Material `CHANGED_CANDIDATE`, `UNSUPPORTED_ADDITION_CANDIDATE` or `MISSING_CANDIDATE` | `PRESERVE_SOURCE` |
| `UNRESOLVED` or `NOT_ASSESSED` with no material finding | `REQUEST_CLARIFICATION` |
| At least one `PRESERVED_CANDIDATE` and no material finding | `USE_TRANSFORMATION` |

On the held-out evaluation this produced 8 preserves, 4 uses and 0 clarification requests. On the prior cases it produced 8 preserves. It never selected `REQUEST_CLARIFICATION`, including for the justified uncertainty cases where clarification would have been the appropriate outcome.

The policy has no action authority. It does not rewrite the accepted semantic record, does not repair the transformation, and does not override human acceptance. It is a simulation only.

---

## 6. Comparison with the existing compiler baseline

The existing compiler inventory is useful for candidate spans and prerequisites, but not sufficient as a checker:

- It emits zero cross-sentence relations.
- It classifies many units correctly but cannot compare a transformation against the source.
- The exact-quote baseline built on top of it detects no corruption at the expected distinction level and rejects every faithful paraphrase.
- The new checker improves detection but still over-rejects faithfulness and cannot separate justified from unsupported uncertainty.

This is consistent with the R2/R3 conclusion: the current compiler is a partial baseline, not a semantic checking engine.

---

## 7. Decision

### Adopt, revise or reject?

**Revise, do not integrate.**

The checker is a credible prototype:

- It detected 11 of 12 corruptions across development and evaluation at the expected distinction level.
- It grounded findings in exact source spans.
- It outperformed exact-quote matching decisively.
- It identified the harmful LC20-07/LC20-10 added doubts.

But it is not safe enough for a communication gate:

- It falsely rejected 2 of 6 held-out faithful transformations.
- It failed to recognise justified uncertainty in the two justified-uncertainty cases tested (LC20-02 and LC20-19, four arm outputs).
- It can produce many extra unsupported-content findings for paraphrased proposals.
- A 33% false-rejection rate would create a new form of unnecessary intervention.

### What to revise next

1. **Uncertainty grounding.** Map each transformation unknown to the source condition or open question it claims to address. If the source genuinely leaves that condition open, return `UNRESOLVED`, not `UNSUPPORTED_ADDITION_CANDIDATE`.
2. **Paraphrase robustness.** Add a controlled synonym/normalisation layer and require a content-token mismatch before declaring a missing prerequisite; do not rely on one lexical form.
3. **Obligation-aware alignment.** Select the transformation clause that matches the obligated meaning’s modality and content, not merely the highest bag-of-words overlap.
4. **Causal cue coverage.** Recognise inflected causal forms (`caused`, `resulted in`, `led to`) and require a source-grounded causal relation before accepting a causal transformation.
5. **Fresh evaluation.** The current 12 held-out cases are now disclosed. Any revised checker needs fresh unseen cases; do not report a rerun on these as held-out improvement.
6. **Live testing.** Do not run a live checker comparison until the false-rejection rate is substantially lower and the justified-uncertainty cases are handled correctly.

### What not to do

Do not integrate the checker into the communication path now. Do not describe its findings as verified equivalence. Do not use it to silently rewrite accepted records. Do not optimise solely for detecting more corruptions; a checker that rejects faithful communication is not a safe communication gate.

---

## 8. Tests and reproduction

```powershell
node --experimental-transform-types experiments/lc-02-r4/build-corpus.mjs
node --experimental-transform-types experiments/lc-02-r4/run-checker.mjs --split development --out experiments/lc-02-r4/.runs/DEV-004
node --experimental-transform-types experiments/lc-02-r4/run-checker.mjs --split evaluation --out experiments/lc-02-r4/.runs/EVAL-001
node --experimental-transform-types experiments/lc-02-r4/study-prior-failures.mjs
```

Test results:

| Suite | Result |
|---|---|
| Studio tests (including semantic-checker tests) | 90 pass, 0 fail |
| Python understanding tests | 25 pass, 0 fail |
| Root typecheck | pass |
| Root tests | 1114 pass, 3 skipped, 0 fail |

Evidence:

- `experiments/lc-02-r4/.runs/DEV-004/`
- `experiments/lc-02-r4/.runs/EVAL-001/`
- `experiments/lc-02-r4/.runs/PRIOR-FAILURES-001/`
- `experiments/lc-02-r4/fixtures/FREEZE.json`

No hosted model was called. No prior R1/R2/R3 case record, request, response or event was modified. R3's derived report was later corrected for actual-versus-reserved request accounting and failed-arm check logic; the underlying R3 requests, responses, events and case records were not altered. No manuscript, commit or push.

---

## 9. Limitations

- References are author-constructed provisional, not independent human adjudication.
- Development was used to tune the checker; evaluation was run once and not used for further tuning.
- The 24 cases are synthetic and short. They are not a population sample.
- The checker is lexical and rule-based; it has no semantic model of entailment.
- It has no cross-sentence relation inference and no robust coreference resolution.
- It does not measure whether a transformation is *useful*; only whether it differs from the source in flagged ways.
- It cannot distinguish justified uncertainty from unsupported uncertainty reliably; this is the central failure.
- The policy simulation is not a validated router and has no action authority.
- A negative result is valid. The next step is revision and fresh evaluation, not a rushed live deployment.

