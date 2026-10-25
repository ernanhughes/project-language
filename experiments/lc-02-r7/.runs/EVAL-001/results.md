# R7 three-way comparison — evaluation

**Reviewer:** local qwen3.5:latest (ollama-local)

**Standing:** OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES.

## Metrics

| Metric | A: R6 deterministic | B: reviewer alone | C: hybrid |
|---|---:|---:|---:|
| Corruption detection | 9/12 | 8/12 | 11/12 |
| False acceptances | none | none | none |
| Faithful accepted | 7/8 | 7/8 | 6/8 |
| False rejections | R7-E13 | R7-E17 | R7-E13, R7-E17 |
| Unnecessary clarifications | R7-E05 | none | none |
| Ambiguity clarified | 3/4 | 3/4 | 3/4 |
| Missing-condition correct | R7-E06 | none | R7-E06 |
| Exception-scope correct | none | R7-E05 | R7-E05 |
| Causal correct | R7-E10 | none | R7-E10 |
| Epistemic correct | none | R7-E08 | R7-E08 |
| Source-grounded | 19/24 | 17/24 | 22/24 |
| Policy correct | 21/24 | 22/24 | 21/24 |
| Latency avg / max | 1205 / 2952 ms | 6573 / 9314 ms | 7779 / 10594 ms |

**Reviewer usage:** 22329 input tokens, 5460 output tokens.

## Case comparison

| Case | Type | Expected | A policy | B policy | C policy | A det | B det | C det | C primary | Reviewer status |
|---|---|---|---|---|---|---|---|---|---|---|
| R7-E01 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-E02 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-E03 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-E04 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-E05 | CORRUPTION | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | PRESERVE_SOURCE | false | true | true | false | VALID |
| R7-E06 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | false | true | true | VALID |
| R7-E07 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-E08 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | false | true | true | false | VALID |
| R7-E09 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-E10 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | false | true | true | VALID |
| R7-E11 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | false | true | true | VALID |
| R7-E12 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | false | false | false | false | VALID |
| R7-E13 | FAITHFUL | USE_TRANSFORMATION | PRESERVE_SOURCE | USE_TRANSFORMATION | PRESERVE_SOURCE | false | true | true | false | VALID |
| R7-E14 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | true | true | VALID |
| R7-E15 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | false | true | true | VALID |
| R7-E16 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | false | true | true | VALID |
| R7-E17 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-E18 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | true | true | VALID |
| R7-E19 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | true | true | VALID |
| R7-E20 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | true | true | VALID |
| R7-E21 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | true | true | true | VALID |
| R7-E22 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | true | true | true | VALID |
| R7-E23 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | true | true | true | VALID |
| R7-E24 | AMBIGUITY | REQUEST_CLARIFICATION | PRESERVE_SOURCE | USE_TRANSFORMATION | PRESERVE_SOURCE | false | false | false | false | VALID |

## Reviewer failures and disagreements

No reviewer failures.

| Case | Kind | Deterministic | Reviewer | Note |
|---|---|---|---|---|
| R7-E01 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E02 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E03 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E04 | CORROBORATED | f2 | ra2 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E04 | CORROBORATED | f3 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E05 | DISTINCTION_DISAGREEMENT | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-E06 | DISTINCTION_DISAGREEMENT | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-E07 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E07 | CORROBORATED | f2 | ra2 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E08 | DISTINCTION_DISAGREEMENT | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-E09 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E10 | DISTINCTION_DISAGREEMENT | f1, f2 | ra2 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-E11 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E12 | DISTINCTION_DISAGREEMENT | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-E13 | MODEL_CLAIMS_PRESERVED_DETERMINISTIC_MATERIAL | f1, f2, f3 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-E14 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E17 | CORROBORATED | f1 | ra2 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E17 | DISTINCTION_DISAGREEMENT | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-E18 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E18 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E19 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E20 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E21 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E22 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E23 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-E24 | MODEL_CLAIMS_PRESERVED_DETERMINISTIC_MATERIAL | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |

## Per-case reviewer detail

### R7-E01

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5588 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly increased the batch limit from seventy to ninety files, contradicting the source text and the declared obligation to preserve the numeric limit.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-E02

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5544 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation changes the review queue boundary from inclusive (≤18) to exclusive (<18), violating the declared obligation that the inclusive boundary must survive.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-E03

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5365 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation changes the escalation threshold from 'at least eight' minutes to 'more than eight' minutes, narrowing the inclusive boundary to an exclusive one.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-E04

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 7198 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation changes the cache retention duration from twelve minutes to twenty minutes while preserving the requirement for a signed request for deletion.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true; NO_MATERIAL_CHANGE/NONE/false
### R7-E05

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/BROADENED_EXCEPTION
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 8188 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary false
- Summary: The transformation alters the condition for the key usage exception from 'audit ticket is closed' to 'audit is unresolved', changing the scope of the exception.
- Assessments: EXCEPTION_SCOPE/NONE/true
### R7-E06

- Expected: PRESERVE_SOURCE; MISSING_CANDIDATE/MISSING_PREREQUISITE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 5276 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation narrows the exception scope by removing the requirement for an assigned escort.
- Assessments: EXCEPTION_SCOPE/NONE/true
### R7-E07

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/MISATTRIBUTED_QUOTATION_OR_SPEAKER
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 8652 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly swapped the speakers (attribution) for both approval statements, changing Auditor to Lead and Lead to Auditor.
- Assessments: REFERENT_OR_SPEAKER/NONE/true; REFERENT_OR_SPEAKER/NONE/true
### R7-E08

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/UNKNOWN_TO_ESTABLISHED_FACT
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 6285 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary false
- Summary: The transformation incorrectly resolves an explicitly unresolved status from the source as a definitive fact.
- Assessments: EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
### R7-E09

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_UNCERTAINTY
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5575 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation adds uncertainty to a permission that the source states as fact.
- Assessments: EPISTEMIC_STATUS/UNCERTAINTY_ADDED/true
### R7-E10

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_CAUSAL
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 8299 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation asserts a causal link and resolves an explicitly unresolved status regarding the cause of failure, contradicting the source text.
- Assessments: CAUSAL/NONE/true; EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
### R7-E11

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/WRONG_CROSS_SENTENCE_REFERENCE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 5556 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation resolves an explicit ambiguity in the source by asserting a specific outcome (retention exception) as fact.
- Assessments: EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
### R7-E12

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/INVENTED_AUTHORITY
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 6021 ms
- Hybrid: PRESERVE_SOURCE; detected false; primary false
- Summary: The transformation grants rollback authority that the source explicitly denies.
- Assessments: EXCEPTION_SCOPE/NONE/true
### R7-E13

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 5664 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary false
- Summary: The transformation accurately restates the source's storage limit using an equivalent upper bound phrasing.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-E14

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 4714 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: No material semantic changes detected; only reordering of clauses.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-E15

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected false; latency 5426 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: The transformation faithfully summarizes the paging rule while omitting the irrelevant desk location statement as permitted by the task purpose.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-E16

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected false; latency 5851 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: No material semantic changes detected. The transformation faithfully preserves the causal qualification and uncertainty regarding the cause of staleness, with only minor grammatical variation ('failed' to 'failure').
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-E17

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 9314 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation is assessed as containing an unsupported addition regarding the laptop condition ('isolated' vs 'sealed') and a faithful paraphrase regarding the permission scope.
- Assessments: UNSUPPORTED_ADDITION/NONE/true; NO_MATERIAL_CHANGE/NONE/false
### R7-E18

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 6694 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: The transformation is a faithful paraphrase that reorders the source sentences without altering any rules, values, or conditions.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-E19

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 7893 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: The transformation is a faithful paraphrase of the source text with no material changes.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-E20

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 6404 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: No material semantic changes detected; the transformation faithfully combines the source obligations without alteration.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-E21

- Expected: REQUEST_CLARIFICATION; UNRESOLVED/SOURCE_AMBIGUITY
- Reviewer: VALID; policy REQUEST_CLARIFICATION; detected true; latency 7554 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
- Summary: The transformation preserves the unresolved status of the merger approval as required by the declared obligations.
- Assessments: EPISTEMIC_STATUS/AMBIGUITY_PRESERVED/true
### R7-E22

- Expected: REQUEST_CLARIFICATION; UNRESOLVED/SOURCE_AMBIGUITY
- Reviewer: VALID; policy REQUEST_CLARIFICATION; detected true; latency 8405 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
- Summary: The transformation preserves the epistemic status of the timestamp ambiguity as required by the declared obligation, framing the uncertainty around whether the request fell within the exception boundary.
- Assessments: EPISTEMIC_STATUS/AMBIGUITY_PRESERVED/true
### R7-E23

- Expected: REQUEST_CLARIFICATION; UNRESOLVED/SOURCE_AMBIGUITY
- Reviewer: VALID; policy REQUEST_CLARIFICATION; detected true; latency 6500 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
- Summary: The transformation accurately reflects the source's explicit ambiguity regarding 'the plan' without adding or resolving any information.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-E24

- Expected: REQUEST_CLARIFICATION; UNRESOLVED/SOURCE_AMBIGUITY
- Reviewer: VALID; policy USE_TRANSFORMATION; detected false; latency 5796 ms
- Hybrid: PRESERVE_SOURCE; detected false; primary false
- Summary: No material change detected; faithful paraphrase of the unresolved conflict status.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
