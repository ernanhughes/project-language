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
| Latency avg / max | 961 / 1020 ms | 6205 / 9363 ms | 7166 / 10322 ms |

**Reviewer usage:** 0 input tokens, 0 output tokens.

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
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5439 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly changes the reservation limit from ninety to one hundred seats.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D02

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5359 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation changes the autoclave load limit from an inclusive maximum of twelve trays to an exclusive maximum of fewer than twelve trays.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D03

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 6032 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation changes the boundary condition from inclusive ('at least') to exclusive ('more than'), narrowing the scope of when charging is permitted.
- Assessments: QUANTITY_OR_BOUNDARY/NONE/true
### R7-D04

- Expected: PRESERVE_SOURCE; MISSING_CANDIDATE/MISSING_PREREQUISITE
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 6606 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation narrows the exception scope by removing the requirement for a current safety briefing, which is explicitly stated as not current in the source text.
- Assessments: EXCEPTION_SCOPE/NONE/true
### R7-D05

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/BROADENED_EXCEPTION
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 6453 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary false
- Summary: The transformation narrows the exception scope by changing the condition from 'change freeze is active' to 'the change is unresolved', which alters the set of cases covered by the prohibition.
- Assessments: EXCEPTION_SCOPE/NONE/true
### R7-D06

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/UNKNOWN_TO_ESTABLISHED_FACT
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 9363 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation contradicts the source by asserting approval and presence of approval documents where the source states the review is unresolved and lacks both approval and rejection. This violates the declared obligation to maintain the unresolved status.
- Assessments: EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true; EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
### R7-D07

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 5790 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary false
- Summary: No material semantic change detected; faithful paraphrase of the deadline boundary.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D08

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 5612 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: The transformation faithfully reorders the release conditions from 'completed security review and an approved change ticket' to 'approved change ticket and a completed security review', preserving the exact same requirements.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D09

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: VALID; policy USE_TRANSFORMATION; detected true; latency 5927 ms
- Hybrid: USE_TRANSFORMATION; detected true; primary true
- Summary: The transformation faithfully summarizes the escalation rule by retaining the condition while omitting the irrelevant detail about office location as permitted by the task purpose.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D10

- Expected: REQUEST_CLARIFICATION; UNRESOLVED/SOURCE_AMBIGUITY
- Reviewer: VALID; policy USE_TRANSFORMATION; detected false; latency 4797 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
- Summary: No material semantic changes detected; faithful paraphrase of an unresolved status.
- Assessments: NO_MATERIAL_CHANGE/NONE/false
### R7-D11

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_UNCERTAINTY
- Reviewer: VALID; policy PRESERVE_SOURCE; detected true; latency 5266 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation adds uncertainty to a statement of fact from the source.
- Assessments: EPISTEMIC_STATUS/UNCERTAINTY_ADDED/true
### R7-D12

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_CAUSAL
- Reviewer: VALID; policy PRESERVE_SOURCE; detected false; latency 7817 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: The transformation incorrectly resolves the uncertainty regarding the cause verification that was explicitly stated in the source.
- Assessments: NO_MATERIAL_CHANGE/NONE/false; EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED/true
