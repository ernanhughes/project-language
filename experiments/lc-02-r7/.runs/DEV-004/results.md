# R7 three-way comparison — development

**Reviewer:** local qwen3.5:latest (ollama-local)

**Standing:** OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES.

## Metrics

| Metric | A: R6 deterministic | B: reviewer alone | C: hybrid |
|---|---:|---:|---:|
| Corruption detection | 7/8 | 6/8 | 8/8 |
| False acceptances | none | none | none |
| Faithful accepted | 2/3 | 3/3 | 2/3 |
| False rejections | R7-D07 | none | none |
| Unnecessary clarifications | R7-D05 | none | R7-D07 |
| Ambiguity clarified | 1/1 | 0/1 | 1/1 |
| Missing-condition correct | R7-D04 | none | R7-D04 |
| Exception-scope correct | none | R7-D05 | R7-D05 |
| Causal correct | R7-D12 | none | R7-D12 |
| Epistemic correct | R7-D06 | R7-D06 | R7-D06 |
| Source-grounded | 10/12 | 9/12 | 12/12 |
| Policy correct | 10/12 | 11/12 | 11/12 |
| Latency avg / max | 996 / 1219 ms | 6330 / 8457 ms | 7326 / 9378 ms |

**Reviewer usage:** 11098 input tokens, 2814 output tokens.

## Case comparison

| Case | Type | Expected | A policy | B policy | C policy | A det | B det | C det | C primary | Reviewer status |
|---|---|---|---|---|---|---|---|---|---|---|
| R7-D01 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D02 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D03 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D04 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | false | true | true | VALID |
| R7-D05 | CORRUPTION | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | PRESERVE_SOURCE | false | true | true | false | VALID |
| R7-D06 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D07 | FAITHFUL | USE_TRANSFORMATION | PRESERVE_SOURCE | USE_TRANSFORMATION | REQUEST_CLARIFICATION | false | true | true | false | VALID |
| R7-D08 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | true | true | VALID |
| R7-D09 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | true | true | VALID |
| R7-D10 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | USE_TRANSFORMATION | REQUEST_CLARIFICATION | true | false | true | true | VALID |
| R7-D11 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D12 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | false | true | true | VALID |

## Reviewer failures and disagreements

No reviewer failures.

| Case | Kind | Deterministic | Reviewer | Note |
|---|---|---|---|---|
| R7-D01 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-D02 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-D03 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-D04 | DISTINCTION_DISAGREEMENT | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-D05 | DISTINCTION_DISAGREEMENT | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-D06 | CORROBORATED | f2 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-D07 | MODEL_CLAIMS_PRESERVED_DETERMINISTIC_MATERIAL | f1 | ra1 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |
| R7-D08 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-D09 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-D11 | CORROBORATED | f1 | ra1 | Deterministic and model-assisted findings agree on type, distinction and source evidence. |
| R7-D12 | DISTINCTION_DISAGREEMENT | f1, f2 | ra2 | Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim. |

## Per-case reviewer detail

### R7-D01

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5399 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly changes the reservation limit from ninety to one hundred seats.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D02

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5349 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation changes the load limit from an inclusive maximum of twelve trays to an exclusive limit of fewer than twelve trays.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D03

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 6066 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation narrows the scope of the cooling period requirement from an inclusive threshold ('at least') to an exclusive one ('more than'), changing the boundary condition.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D04

- Expected: PRESERVE_SOURCE; MISSING_CANDIDATE/MISSING_PREREQUISITE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 5929 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation narrows the exception scope by omitting the requirement that the safety briefing be current, which is a material condition in the source text.
- Assessments: EXCEPTION_SCOPE/NONE/true
### R7-D05

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/BROADENED_EXCEPTION
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 7063 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary false
- Summary: The transformation changes the exception condition from 'change freeze is active' to 'the change is unresolved', which alters the scope of the prohibition and violates the declared obligation.
- Assessments: EXCEPTION_SCOPE/NONE/true
### R7-D06

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/UNKNOWN_TO_ESTABLISHED_FACT
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 8457 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation contradicts the source by changing the status from 'unresolved' to 'approved' and asserting the presence of an approval where the source states there is neither.
- Assessments: EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true; EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
### R7-D07

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 5718 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary false
- Summary: No material semantic change detected; faithful paraphrase of the deadline boundary.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D08

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 4981 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: No material change detected; only reordering of conditions.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D09

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 6388 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: The transformation faithfully paraphrases the source by retaining the essential escalation condition while omitting the irrelevant detail about office location as permitted by the task purpose.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D10

- Expected: REQUEST_CLARIFICATION; UNRESOLVED/SOURCE_AMBIGUITY
- Reviewer: VALID; policy USE_TRANSFORMATION; detected false; latency 6846 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
- Summary: The transformation faithfully paraphrases the source's statement about an unresolved decision into a statement of uncertainty. This is a faithful semantic preservation without adding new facts or changing the epistemic status.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D11

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_UNCERTAINTY
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5535 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly converts a definitive permission into an uncertain state, adding unsupported epistemic doubt.
- Assessments: EPISTEMIC_STATUS/UNCERTAINTY_ADDED/true
### R7-D12

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_CAUSAL
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 8228 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly resolves the epistemic status of the cause verification from 'not verified' to 'verified', violating the requirement to maintain causal uncertainty.
- Assessments: NO_MATERIAL_CHANGE/NONE/false; EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
