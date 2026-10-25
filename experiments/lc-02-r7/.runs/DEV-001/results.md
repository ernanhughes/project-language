# R7 three-way comparison — development

**Reviewer:** local qwen3.5:latest (ollama-local)

**Standing:** OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES.

## Metrics

| Metric | A: R6 deterministic | B: reviewer alone | C: hybrid |
|---|---:|---:|---:|
| Corruption detection | 7/8 | 6/8 | 8/8 |
| False acceptances | none | none | none |
| Faithful accepted | 2/3 | 3/3 | 2/3 |
| False rejections | R7-D07 | none | R7-D07 |
| Ambiguity clarified | 1/1 | 1/1 | 1/1 |
| Missing-condition correct | R7-D04 | none | R7-D04 |
| Exception-scope correct | none | R7-D05 | R7-D05 |
| Causal correct | R7-D12 | none | R7-D12 |
| Epistemic correct | R7-D06 | R7-D06 | R7-D06 |
| Source-grounded | 10/12 | 9/12 | 12/12 |
| Policy correct | 10/12 | 12/12 | 11/12 |

## Case comparison

| Case | Type | Expected | A policy | B policy | C policy | A det | B det | C det | C primary | Reviewer status |
|---|---|---|---|---|---|---|---|---|---|---|
| R7-D01 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D02 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D03 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D04 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | false | true | true | VALID |
| R7-D05 | CORRUPTION | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | PRESERVE_SOURCE | false | true | true | false | VALID |
| R7-D06 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D07 | FAITHFUL | USE_TRANSFORMATION | PRESERVE_SOURCE | USE_TRANSFORMATION | PRESERVE_SOURCE | false | true | true | false | VALID |
| R7-D08 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | true | true | VALID |
| R7-D09 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | true | true | VALID |
| R7-D10 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | false | true | true | UNAVAILABLE |
| R7-D11 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | true | true | VALID |
| R7-D12 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | false | true | true | VALID |

## Reviewer failures and disagreements

- **R7-D10**: UNAVAILABLE — PRESERVED_AMBIGUITY_MUST_NOT_BE_MATERIAL

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
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5872 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly changes the stated reservation limit from ninety seats to one hundred seats, violating the declared obligation that the numeric limit must survive.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D02

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 6407 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation narrows the scope of permissible loads by changing the limit from inclusive ('no more than') to exclusive ('fewer than'), violating the declared obligation that the inclusive boundary must survive.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D03

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 6782 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation changes the duration threshold from 'at least thirty minutes' (inclusive) to 'more than thirty minutes' (exclusive), narrowing the permitted range of cool-down times.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D04

- Expected: PRESERVE_SOURCE; MISSING_CANDIDATE/MISSING_PREREQUISITE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 8282 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly asserts that the contractor may enter the server room, ignoring the source's explicit statement that the safety briefing is not current, which is a required condition for entry.
- Assessments: EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
### R7-D05

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/BROADENED_EXCEPTION
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5316 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary false
- Summary: The transformation changes the scope of the maintenance account exception from 'when the change freeze is active' to 'when the change is unresolved', which constitutes a material change in the exception conditions.
- Assessments: EXCEPTION_SCOPE/NONE/true
### R7-D06

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/UNKNOWN_TO_ESTABLISHED_FACT
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 8401 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation contradicts the source by asserting that the supplier is approved and the file contains approval, whereas the source states the review is unresolved and contains neither approval nor rejection. This violates the declared obligation to maintain the unresolved status.
- Assessments: EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true; EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
### R7-D07

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 5495 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary false
- Summary: No material semantic change detected; faithful paraphrase of the deadline boundary.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D08

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 4885 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: The transformation faithfully paraphrases the source by reversing the order of the two required conditions without altering their meaning or scope.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D09

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 5631 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: The transformation faithfully paraphrases the core escalation rule while omitting an explicitly declared irrelevant detail (office location), which is permitted under task-appropriate omission guidelines.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D10

- Expected: REQUEST_CLARIFICATION; UNRESOLVED/SOURCE_AMBIGUITY
- Reviewer: UNAVAILABLE; policy REQUEST_CLARIFICATION; detected false; latency 6947 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
### R7-D11

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_UNCERTAINTY
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5220 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly converts a clear permission stated in the source into an expression of uncertainty, thereby adding unsupported doubt to the material fact regarding paging permissions.
- Assessments: EPISTEMIC_STATUS/UNCERTAINTY_ADDED/true
### R7-D12

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_CAUSAL
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 8025 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly resolves the uncertainty regarding the cause verification stated in the source text as a confirmed fact, contradicting the source's claim that the cause has not been verified.
- Assessments: NO_MATERIAL_CHANGE/NONE/false; EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
