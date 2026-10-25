# R5 vs R6 — development

**Standing:** OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES.

## R5

| Metric | Value |
|---|---|
| Cases | 12 |
| Corruption detection | 1/5 (20.0%) |
| False acceptances | R6-D01, R6-D02, R6-D03, R6-D04 |
| Faithful accepted | 3/4 |
| False rejections | R6-D08 |
| Ambiguity grounded / clarified | 3/3 / 3/3 |
| Justified uncertainty clean | 3 |
| Invented uncertainty clean | 1 |
| Dual primary verdicts | none |
| Unnecessary clarifications | none |
| NOT_ASSESSED cases | none |
| Source-grounded cases | 7/12 |
| Transformation-grounded cases | 6/12 |
| Policy accuracy | 7/12 (58.3%) |
| Latency avg / max | 1143 ms / 1482 ms |

## R6

| Metric | Value |
|---|---|
| Cases | 12 |
| Corruption detection | 5/5 (100.0%) |
| False acceptances | none |
| Faithful accepted | 4/4 |
| False rejections | none |
| Ambiguity grounded / clarified | 3/3 / 3/3 |
| Justified uncertainty clean | 3 |
| Invented uncertainty clean | 1 |
| Dual primary verdicts | none |
| Unnecessary clarifications | none |
| NOT_ASSESSED cases | none |
| Source-grounded cases | 12/12 |
| Transformation-grounded cases | 11/12 |
| Policy accuracy | 12/12 (100.0%) |
| Latency avg / max | 1107 ms / 1330 ms |

## Case comparison

| Case | Type | Expected | R5 policy | R6 policy | R5 detected | R6 detected | Evidence (source/transformation) | R6 constraints | R6 epistemic |
|---|---|---|---|---|---|---|---|---|---|
| R6-D01 | CORRUPTION | PRESERVE_SOURCE | USE_TRANSFORMATION | PRESERVE_SOURCE | false | true | CHANGED_CANDIDATE:S/T | CHANGED_CANDIDATE/CONSTRAINT_CHANGE | CHANGED_CANDIDATE/ESTABLISHED_IN_SOURCE |
| R6-D02 | CORRUPTION | PRESERVE_SOURCE | USE_TRANSFORMATION | PRESERVE_SOURCE | false | true | CHANGED_CANDIDATE:S/T | CHANGED_CANDIDATE/CONSTRAINT_CHANGE | CHANGED_CANDIDATE/ESTABLISHED_IN_SOURCE |
| R6-D03 | CORRUPTION | PRESERVE_SOURCE | USE_TRANSFORMATION | PRESERVE_SOURCE | false | true | CHANGED_CANDIDATE:S/T | CHANGED_CANDIDATE/CONSTRAINT_CHANGE | CHANGED_CANDIDATE/ESTABLISHED_IN_SOURCE |
| R6-D04 | CORRUPTION | PRESERVE_SOURCE | USE_TRANSFORMATION | PRESERVE_SOURCE | false | true | CHANGED_CANDIDATE:S/T | CHANGED_CANDIDATE/CONSTRAINT_CHANGE | PRESERVED_CANDIDATE/ESTABLISHED_IN_SOURCE<br>CHANGED_CANDIDATE/ESTABLISHED_IN_SOURCE |
| R6-D05 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | false | false | PRESERVED_CANDIDATE:S/— | — | PRESERVED_CANDIDATE/ESTABLISHED_IN_SOURCE |
| R6-D06 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | PRESERVED_CANDIDATE:S/T | — | PRESERVED_CANDIDATE/ESTABLISHED_IN_SOURCE |
| R6-D07 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | USE_TRANSFORMATION | true | true | PRESERVED_CANDIDATE:S/T | — | PRESERVED_CANDIDATE/ESTABLISHED_IN_SOURCE |
| R6-D08 | FAITHFUL | USE_TRANSFORMATION | PRESERVE_SOURCE | USE_TRANSFORMATION | false | true | PRESERVED_CANDIDATE:S/T | — | PRESERVED_CANDIDATE/ESTABLISHED_IN_SOURCE |
| R6-D09 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | true | UNRESOLVED:S/T | — | UNRESOLVED/UNRESOLVED_IN_SOURCE |
| R6-D10 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | true | UNRESOLVED:S/T | PRESERVED_CANDIDATE/CONSTRAINT_PRESERVED | UNRESOLVED/UNRESOLVED_IN_SOURCE |
| R6-D11 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | true | UNRESOLVED:S/T | — | UNRESOLVED/UNRESOLVED_IN_SOURCE |
| R6-D12 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | PRESERVE_SOURCE | true | true | UNSUPPORTED_ADDITION_CANDIDATE:S/T | — | UNSUPPORTED_ADDITION_CANDIDATE/ESTABLISHED_IN_SOURCE |

## R6 misses and false outcomes

No missed corruptions.

## Uncertainty separation

- Justified uncertainty clean: R6-D09, R6-D10, R6-D11
- Invented uncertainty clean: R6-D12
- Dual primary verdicts: none
