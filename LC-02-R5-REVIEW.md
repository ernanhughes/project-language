# LC-02-R5 — Uncertainty Grounding and Meaning Alignment

**Status:** offline experiment complete. No hosted model call, manuscript change, commit or push.

**Recommendation:** **REVISE, do not adopt or integrate.** R5 improved faithful-control acceptance and, for the first time, correctly routed all four held-out genuine-ambiguity cases to clarification. But corruption detection fell below the prospective target, one corruption was accepted as a valid transformation, and the checker still cannot cleanly separate justified from invented uncertainty in the prior cases.

The most important result is not the aggregate accuracy. It is that **R5 can produce `UNRESOLVED`**, but it often produces it alongside `UNSUPPORTED_UNCERTAINTY` for the same material. That is a conflict signal, not a resolved epistemic judgment.

---

## 1. Root causes carried from R4

| R4 failure | Root cause | R5 response | Status |
|---|---|---|---|
| R4-E07: “unaltered” rejected as not “intact” | Single-token synonym gap; exact lexical matching | Added controlled synonym mapping and clause-level condition matching | Improved in development; a different false rejection remains in evaluation |
| R4-E08: reordered summary matched to wrong sentence | Whole-sentence alignment, no clause/modality preference | Added clause splitting, modality-aware alignment and obligation-to-clause matching | Improved in development; one evaluation faithful case still rejected |
| R4-E04: causal distortion missed | No inflected causal cue | Added `caused`, `causing`, `led to`, `resulted in` | Causal finding appears in evaluation, but is grounded to the effect span rather than the source’s unverified-cause statement |
| LC20-07/10: invented uncertainty detected | No uncertainty assessment | Added explicit uncertainty assessment and source-condition support | Still detected, but now mixed with `UNRESOLVED`; not a clean separation |
| LC20-02/19: justified uncertainty flagged | No source-grounded uncertainty model | Added uncertainty assessment, prerequisite support and `UNRESOLVED` | Justified cases now produce `UNRESOLVED`, but also still produce unsupported-uncertainty findings |
| R4 policy never selected clarification | Policy preferred a definite answer | Separated findings from policy and allowed `REQUEST_CLARIFICATION` | Evaluated ambiguity cases route correctly; prior cases still preserve |

The central R4 problem was not just missing vocabulary. It was the absence of an explicit account of **why** an uncertainty exists. R5 adds that account, but does not yet make it decisive.

---

## 2. Implementation changes

### Versioned contract

`apps/language-demo/evaluation/semantic-checker-v5-contract.mjs`

- Version: `lc02-r5-semantic-check/0.1`
- Contract hash: `92ab3570a00164123eac5045a838f64e9df8b23efd4592115f88925f9c8bb297`
- Checker hash: `2b11a67ca6b44c61523c3901cbb130fa6da81b0815ead3261f640cf848e902d5`

The new contract adds an `uncertainty_assessments` array alongside findings. Each assessment records:

- the uncertain claim;
- required conditions;
- explicitly established conditions;
- explicitly denied conditions;
- genuinely unresolved conditions;
- ambiguous referents;
- extra assumptions introduced by the transformation;
- `epistemic_scope: SOURCE_RELATIVE`;
- `status`: `SUPPORTED_UNCERTAINTY`, `UNSUPPORTED_UNCERTAINTY` or `INDETERMINATE`.

All findings and assessments carry exact source and transformation spans and `standing: CANDIDATE_REQUIRES_REVIEW`.

### Checker changes

`apps/language-demo/evaluation/semantic-checker-v5.mjs`

- Clause-level alignment, not whole-sentence alignment.
- Modality-aware matching: a source permission prefers a transformed permission clause, not a condition clause.
- Condition and exception clauses stay attached to their governing statement.
- Derived prerequisites from requirement/`only if`/`if`/`when` constructions.
- Controlled synonym normalisation (`unaltered`/`intact`, `keep`/`retain`, `completion`/`complete`, etc.). The map is bounded and inspectable; it is not a claim that synonyms are universally interchangeable.
- Causal cue coverage for inflected forms.
- Global containment guard before declaring a transformation clause unsupported.
- Uncertainty source selection prefers source units that explicitly leave a condition or reference open.
- Prerequisite checks search the full transformation sentence, not only the matched clause.
- Policy is a separate `policyAssessment` object; findings are not policy decisions.

The checker remains lexical/rule-based and uses the local Understanding Compiler inventory. It is not model-assisted and has no action authority.

---

## 3. Corpus

36 new pairs:

| Split | Corruptions | Faithful | Genuine ambiguity |
|---|---:|---:|---:|
| Development | 4 | 4 | 4 |
| Held-out evaluation | 12 | 8 | 4 |
| **Total** | **16** | **12** | **8** |

All required corruption classes are represented: missing prerequisite, negation reversal, changed permission/obligation, broadened exception, incorrect temporal ordering, invented authority, unknown-to-fact, misattributed quotation/speaker, wrong cross-sentence reference and unsupported causal relationship. The evaluation also includes a quantity/scope change.

Faithful controls cover paraphrased conditions, reordered statements, equivalent temporal descriptions, qualified summaries, terminology changes and task-appropriate omissions.

Genuine ambiguity cases cover an undecided vendor approval, recorded-time versus request-timestamp ambiguity, pronoun reference and the signed-known-good condition.

The corpus was frozen before execution:

| File | SHA-256 |
|---|---|
| `development-cases.json` | `c09f4dc6365aebfaa2281262a1987a7007c1dfe1172b551a91fef501529335c4` |
| `development-references.json` | `ed29863c8b10675e0d91bad719f073c81515325418614ded01b375a8900ed82c` |
| `evaluation-cases.json` | `60e738896aeb9212d0eb7e4de5a5b9ab63ec5ffb591e0fe44894fe40f7faf083` |
| `evaluation-references.json` | `2c909a845b1e341652fa30b22c8fb05d2b7eb2b63dd2309529c6a5182bb07eb9` |

Success criteria were frozen before the held-out run:

`experiments/lc-02-r5/SUCCESS-CRITERIA.json` — hash `98a9f5052a9a5ea04f54ad16cb13d6643dbf9c61e816431bbe72034dd7e50805`.

Development was used for tuning. Evaluation was run once and not used for further tuning.

---

## 4. Results

### Summary

| Method | Split | Corruption detection | Faithful accepted | False rejections | Ambiguity grounded / clarified | Policy accuracy | Latency avg / max |
|---|---|---:|---:|---:|---:|---:|---:|
| R5 checker | Development | 4/4 | 4/4 | 0/4 | 4/4 / 4/4 | 12/12 | 1201 ms / 1523 ms |
| R5 checker | **Evaluation** | **8/12 (66.7%)** | **6/8** | **2/8 (25%)** | **4/4 / 4/4** | **21/24 (87.5%)** | 1151 ms / 1310 ms |
| Lexical baseline | Evaluation | 0/12 | 0/8 | 8/8 (100%) | 0/4 / 0/4 | 12/24 (50%) | 1151 ms / 1410 ms |

The R5 checker is clearly better than exact-quote matching, but the held-out detection rate is lower than R4’s 5/6 (83.3%) and below the prospective target of 10/12.

### Policy results

Evaluation:

- `PRESERVE_SOURCE`: 13
- `USE_TRANSFORMATION`: 7
- `REQUEST_CLARIFICATION`: 4

Expected: 12 preserve, 8 use, 4 clarify. The one extra preserve and one fewer use reflect the two false rejections and the one false accept.

Development:

- `PRESERVE_SOURCE`: 4
- `USE_TRANSFORMATION`: 4
- `REQUEST_CLARIFICATION`: 4

### Success criteria

| Criterion | Target | Actual | Result |
|---|---|---|---:|
| Corruption detection | ≥ 10/12 | 8/12 | **FAIL** |
| Faithful acceptance | ≥ 6/8 | 6/8 | PASS |
| Ambiguity grounding | ≥ 3/4 | 4/4 | PASS |
| Unnecessary clarification | ≤ 1 | 0 | PASS |
| No corruption accepted | 0 | 1 (R5-E11) | **FAIL** |
| Evidence grounding | All findings source-grounded | All findings have source spans; one missing finding has no transformation span | PASS |
| Latency | < 2,000 ms average | 1,151 ms | PASS |

The decision rule therefore yields **REVISE**, not `ADOPT_FOR_FURTHER_EVALUATION`. The single false acceptance is a hard blocker even though aggregate policy accuracy is 87.5%.

### Evaluation case results

| Case | Type | Expected policy | Actual policy | Detection | Notes |
|---|---|---|---|---|---|
| R5-E01 | Corrupt: missing prerequisite | PRESERVE | PRESERVE | Yes | Missing prerequisite identified |
| R5-E02 | Corrupt: negation reversal | PRESERVE | PRESERVE | Yes | Negation identified |
| R5-E03 | Corrupt: modality change | PRESERVE | PRESERVE | Yes | Permission→obligation identified |
| R5-E04 | Corrupt: broadened exception | PRESERVE | PRESERVE | **No** | “unresolved” treated as epistemic uncertainty; exception change not identified |
| R5-E05 | Corrupt: temporal order | PRESERVE | PRESERVE | Yes | Reversal identified |
| R5-E06 | Corrupt: invented authority | PRESERVE | PRESERVE | Yes | Invented authority identified |
| R5-E07 | Corrupt: unknown→fact | PRESERVE | PRESERVE | **No** | Reported as negation reversal, not unknown-to-fact |
| R5-E08 | Corrupt: misattribution | PRESERVE | PRESERVE | Yes | Speaker swap identified |
| R5-E09 | Corrupt: wrong reference | PRESERVE | PRESERVE | Yes | Ambiguity resolved to one plan identified |
| R5-E10 | Corrupt: unsupported causal | PRESERVE | PRESERVE | **No** | Causal finding points to the effect span, not the source’s unverified-cause statement |
| R5-E11 | Corrupt: quantity change | PRESERVE | **USE_TRANSFORMATION** | **No** | Spelled-out “forty”/“fifty” not recognised as a numeric change |
| R5-E12 | Corrupt: modality change | PRESERVE | PRESERVE | Yes | Permission→obligation identified |
| R5-E13 | Faithful: paraphrase | USE | USE | Yes | Accepted |
| R5-E14 | Faithful: reorder | USE | USE | Yes | Accepted |
| R5-E15 | Faithful: temporal | USE | USE | Yes | Accepted |
| R5-E16 | Faithful: summary | USE | **PRESERVE** | **No** | False wrong-reference flag from a pronoun-initial source unit |
| R5-E17 | Faithful: terminology | USE | USE | Yes | Accepted |
| R5-E18 | Faithful: omission | USE | **PRESERVE** | **No** | False causal/missing-prerequisite flag for an implicit condition |
| R5-E19 | Faithful: paraphrase/summary | USE | USE | Yes | Accepted |
| R5-E20 | Faithful: reorder/terminology | USE | USE | Yes | Accepted |
| R5-E21 | Ambiguity: vendor decision | CLARIFY | CLARIFY | Yes | Grounded |
| R5-E22 | Ambiguity: recorded time | CLARIFY | CLARIFY | Yes | Grounded |
| R5-E23 | Ambiguity: pronoun | CLARIFY | CLARIFY | Yes | Grounded |
| R5-E24 | Ambiguity: known-good | CLARIFY | CLARIFY | Yes | Grounded |

### Development case results

Development reached 4/4 corruption detection, 4/4 faithful acceptance, 4/4 ambiguity grounding and 12/12 policy accuracy. This is **tuned development performance**, not held-out evidence. It is useful for regression control, not for claiming general improvement.

---

## 5. False-rejection and missed-corruption analysis

### False rejections

**R5-E16 — qualified summary rejected by a pronoun false positive.**  
Source: “It must delete the copy afterwards.”  
Transformation: “must delete it afterwards.”  
The source unit begins with “It,” which the R4/R5 compiler marks as a possible unresolved reference. The checker treated that generic pronoun marking as a genuine ambiguity and reported `WRONG_CROSS_SENTENCE_REFERENCE`. The pronoun is resolved by the preceding sentence. This is an over-broad ambiguity cue, not a real referential failure.

**R5-E18 — faithful omission rejected by an implicit condition.**  
Source: “The incident desk may page the engineer when lag exceeds twenty seconds for five minutes. The dashboard shows nine minutes.”  
Transformation: “The incident desk may page the engineer because the dashboard shows nine minutes above the threshold.”  
The checker treated the causal connective `because` as an unsupported addition and the omitted explicit threshold as a missing prerequisite. The source and transformation together support the intended relation, but the checker requires the condition to be restated in the same clause. This is an over-literal condition/causal rule.

### Missed corruptions

**R5-E04 — broadened exception.**  
The transformation changes “except when the incident ticket is closed” to “except when the incident is unresolved.” The checker’s uncertainty detector treated “unresolved” as an epistemic hedge, then produced unsupported-uncertainty findings. It did not identify the exception-scope change. The word “unresolved” is functioning as a status label for the incident, not as a doubt about a proposition.

**R5-E07 — unknown converted to fact.**  
Source: “The vendor approval has not been decided.”  
Transformation: “The vendor is approved.”  
The checker reported `NEGATION_REVERSAL` because of “not” in the source and the positive transformation. The more specific distinction is `UNKNOWN_TO_ESTABLISHED_FACT`. The policy still preserved the source, but the expected distinction was missed.

**R5-E10 — unsupported causal.**  
The checker did produce `UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_CAUSAL`, but its source span pointed to “The checksum failed during transfer” rather than the source’s unverified-cause statement, “The investigation says the cause has not been verified.” Under the strict source-grounding reference, this counts as a miss. The distinction was present; the evidence link was not.

**R5-E11 — quantity change accepted.**  
Source: “no more than forty records.”  
Transformation: “no more than fifty records.”  
The checker’s quantity detector only recognised digit tokens; spelled-out numbers were invisible. The transformation was accepted as `USE_TRANSFORMATION`. This is the most serious failure in the run because a corrupted transformation passed the policy.

### Incorrect alignments

At least six evaluation cases involved an alignment or scope issue:

- E04: exception scope;
- E07: distinction precedence;
- E10: source-span grounding for causal claim;
- E11: number-word normalisation;
- E16: pronoun/ambiguity cue scope;
- E18: condition attachment across a causal clause.

This is not a single synonym or threshold problem. It is the interaction of alignment, cue scope and evidence selection.

---

## 6. Evidence-grounded uncertainty judgments

### Held-out ambiguity cases

All four held-out ambiguity cases produced `UNRESOLVED`/`SOURCE_AMBIGUITY` and `REQUEST_CLARIFICATION`:

- R5-E21: undecided vendor approval;
- R5-E22: recorded time versus request timestamp;
- R5-E23: ambiguous “the plan”;
- R5-E24: signed known-good image condition.

This is a real improvement over R4, which had no explicit ambiguity cases and no clarification decisions. It shows that the R5 uncertainty assessment can preserve justified uncertainty when the source explicitly leaves it open.

### Prior failure cases

R5 was applied to the frozen LC20-07, LC20-10, LC20-02 and LC20-19 proposals. The results are less clean:

| Case | Harmful or justified? | `UNRESOLVED` findings | `UNSUPPORTED_UNCERTAINTY` findings | Policy |
|---|---|---:|---:|---|
| LC20-07 B | Harmful | 4 | 5 | PRESERVE_SOURCE |
| LC20-07 C | Harmful | 2 | 5 | PRESERVE_SOURCE |
| LC20-10 B | Harmful | 3 | 6 | PRESERVE_SOURCE |
| LC20-10 C | Harmful | 3 | 9 | PRESERVE_SOURCE |
| LC20-02 B | Justified | 6 | 9 | PRESERVE_SOURCE |
| LC20-02 C | Justified | 2 | 5 | PRESERVE_SOURCE |
| LC20-19 B | Justified | 5 | 7 | PRESERVE_SOURCE |
| LC20-19 C | Justified | 10 | 6 | PRESERVE_SOURCE |

The checker now produces `UNRESOLVED` for both harmful and justified cases, and it also continues to produce `UNSUPPORTED_UNCERTAINTY` for both. The signals co-occur rather than separate the categories. The policy preserves the source in all eight arm outputs, including the two justified cases where clarification would have been more appropriate.

This is an important negative result: **adding an uncertainty assessment field is not the same as grounding uncertainty.** The checker can describe the conditions, but it does not yet decide which description controls.

---

## 7. Comparison with R4

| Metric | R4 evaluation | R5 evaluation |
|---|---:|---:|
| Corruption cases | 6 | 12 |
| Corruption detection | 5/6 (83.3%) | 8/12 (66.7%) |
| Faithful cases | 6 | 8 |
| False rejection | 2/6 (33.3%) | 2/8 (25%) |
| Ambiguity cases | 0 | 4 |
| Ambiguity grounded/clarified | Not tested | 4/4 |
| Policy accuracy | 10/12 (83.3%) | 21/24 (87.5%) |
| False acceptance of corruption | 0 | 1 (R5-E11) |
| Latency | ~938 ms | ~1,151 ms |

R5 made genuine progress on false rejection and ambiguity handling. It did not preserve R4’s corruption detection rate on a larger set, and it introduced a false acceptance. The corpora differ, so the rates are not directly comparable; the qualitative pattern is still clear: R5 is better at caution and worse at decisive detection.

---

## 8. Remaining semantic limitations

- **Number words are not normalised.** “Forty” and “fifty” are invisible to the numeric scope check.
- **Pronoun-initial sentences are over-flagged as ambiguous.** A generic pronoun cue is not evidence of a genuine unresolved reference.
- **Exception scope is fragile.** “Unresolved” as an incident status can be misread as epistemic uncertainty.
- **Causal grounding is incomplete.** The checker can detect a causal cue but may attach the finding to the effect rather than the source’s uncertainty about the cause.
- **Condition attachment across clauses is fragile.** A condition may be implicit in a measurement or a preceding sentence; the checker often requires it to be restated in the same clause.
- **Uncertainty findings co-occur rather than resolve.** The checker can say both “this is grounded” and “this is unsupported” for the same material.
- **The compiler still has no cross-sentence relations.** All relationships are inferred by the checker’s local rules.
- **The corpus is small and synthetic.** 36 cases, author-constructed references, no independent human adjudication.
- **Development was tuned.** The perfect development result is not held-out evidence.
- **No live model was used.** This is a checker experiment, not a communication experiment.

---

## 9. Decision

**REVISE. Do not adopt for integration.**

R5 is a credible improvement in uncertainty representation and clarification routing, but it fails the central requirement: it does not reliably distinguish damaged communication from faithful communication, and it does not reliably distinguish justified from invented uncertainty.

The single false acceptance in evaluation is a hard blocker. A checker that accepts a numeric scope corruption is not safe as a Preserve / Enhance / Clarify gate, even if its aggregate policy accuracy is 87.5%.

The correct next step is a bounded R6 revision, not a live deployment:

1. Normalise number words and numeric ranges before scope comparison.
2. Require an explicit ambiguity marker (not merely a pronoun-initial sentence) before flagging cross-sentence reference.
3. Attach conditions and exceptions to their governing claim across clauses and sentences.
4. Ground causal findings to the source statement that establishes or denies the causal relation.
5. Separate `UNRESOLVED` from `UNSUPPORTED_UNCERTAINTY` by requiring a source span that leaves the condition open; do not emit both for the same claim without an explicit conflict finding.
6. Use fresh unseen cases for R6; do not reuse the 24 evaluation cases.
7. Keep the policy test-only until false acceptance is zero on a larger held-out set and justified uncertainty is cleanly separated.

A live checker comparison is not warranted yet.

---

## 10. Tests and evidence integrity

| Check | Result |
|---|---|
| Studio tests, including R4/R5 checker tests | 93 pass, 0 fail |
| Python understanding tests | 25 pass, 0 fail |
| Root typecheck | pass |
| Root tests | 1114 pass, 3 skipped, 0 fail |
| Frozen batch-20 artifacts | 146 / 146 exact |
| V1/V2 designs | hashes unchanged |
| R2 protocol | hash unchanged; `live_execution_authorized:false` |
| R3 approval/protocol | hashes unchanged |
| R4 corpus | four frozen files unchanged |

Evidence:

- `experiments/lc-02-r5/.runs/DEV-004/`
- `experiments/lc-02-r5/.runs/EVAL-001/`
- `experiments/lc-02-r5/.runs/PRIOR-FAILURES-002/`
- `experiments/lc-02-r5/SUMMARY.json`
- `experiments/lc-02-r5/EVIDENCE-INTEGRITY.json`
- `experiments/lc-02-r5/SUCCESS-CRITERIA.json`

No hosted model was called. No manuscript, commit or push.

---

## 11. Proposed next experiment, only if warranted

A bounded **R6 offline** revision is warranted, but it should not become another large architecture project.

Minimum R6 scope:

- 24 fresh held-out cases, not reused from R4 or R5.
- Explicit numeric/quantity cases with spelled-out numbers.
- Explicit pronoun and cross-sentence reference cases, including faithful pronoun use.
- Explicit exception-scope cases using status words such as “unresolved.”
- Explicit causal cases with both a true source-grounded relation and an unsupported causal claim.
- Explicit justified/invented uncertainty pairs, with required source spans.
- Prospective success criteria: zero false acceptances, at least 90% corruption detection, at least 75% faithful acceptance, at least 75% correct clarification on genuine ambiguity.

Do not run a live model comparison unless R6 clears those offline criteria. If R6 still cannot separate justified from invented uncertainty, the recommendation should shift from “revise the checker” to “do not use a checker as a communication gate.”

