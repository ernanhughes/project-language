# R7 three-way comparison — development

**Reviewer:** scripted scripted (scripted-reviewer)

**Standing:** OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES.

## Metrics

| Metric | A: R6 deterministic | B: reviewer alone | C: hybrid |
|---|---:|---:|---:|
| Corruption detection | 7/8 | 0/8 | 7/8 |
| False acceptances | none | none | none |
| Faithful accepted | 2/3 | 0/3 | 0/3 |
| False rejections | R7-D07 | none | R7-D07 |
| Unnecessary clarifications | R7-D05 | R7-D01, R7-D02, R7-D03, R7-D04, R7-D05, R7-D06, R7-D07, R7-D08, R7-D09, R7-D11, R7-D12 | R7-D05, R7-D08, R7-D09 |
| Ambiguity clarified | 1/1 | 1/1 | 1/1 |
| Missing-condition correct | R7-D04 | none | R7-D04 |
| Exception-scope correct | none | none | none |
| Causal correct | R7-D12 | none | R7-D12 |
| Epistemic correct | R7-D06 | none | R7-D06 |
| Source-grounded | 10/12 | 0/12 | 10/12 |
| Policy correct | 10/12 | 1/12 | 8/12 |
| Latency avg / max | 959 / 995 ms | 0 / 1 ms | 0 / 0 ms |

**Reviewer usage:** 0 input tokens, 0 output tokens.

## Case comparison

| Case | Type | Expected | A policy | B policy | C policy | A det | B det | C det | C primary | Reviewer status |
|---|---|---|---|---|---|---|---|---|---|---|
| R7-D01 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | true | false | true | true | SCRIPTED |
| R7-D02 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | true | false | true | true | SCRIPTED |
| R7-D03 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | true | false | true | true | SCRIPTED |
| R7-D04 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | true | false | true | true | SCRIPTED |
| R7-D05 | CORRUPTION | PRESERVE_SOURCE | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | false | false | false | false | SCRIPTED |
| R7-D06 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | true | false | true | true | SCRIPTED |
| R7-D07 | FAITHFUL | USE_TRANSFORMATION | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | false | false | false | false | SCRIPTED |
| R7-D08 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | false | true | true | SCRIPTED |
| R7-D09 | FAITHFUL | USE_TRANSFORMATION | USE_TRANSFORMATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | false | true | true | SCRIPTED |
| R7-D10 | AMBIGUITY | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | REQUEST_CLARIFICATION | true | false | true | true | SCRIPTED |
| R7-D11 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | true | false | true | true | SCRIPTED |
| R7-D12 | CORRUPTION | PRESERVE_SOURCE | PRESERVE_SOURCE | REQUEST_CLARIFICATION | PRESERVE_SOURCE | true | false | true | true | SCRIPTED |

## Reviewer failures and disagreements

- **R7-D01**: SCRIPTED — null
- **R7-D02**: SCRIPTED — null
- **R7-D03**: SCRIPTED — null
- **R7-D04**: SCRIPTED — null
- **R7-D05**: SCRIPTED — null
- **R7-D06**: SCRIPTED — null
- **R7-D07**: SCRIPTED — null
- **R7-D08**: SCRIPTED — null
- **R7-D09**: SCRIPTED — null
- **R7-D10**: SCRIPTED — null
- **R7-D11**: SCRIPTED — null
- **R7-D12**: SCRIPTED — null

No reconciliation disagreements.

## Per-case reviewer detail

### R7-D01

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 1 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D02

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D03

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D04

- Expected: PRESERVE_SOURCE; MISSING_CANDIDATE/MISSING_PREREQUISITE
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D05

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/BROADENED_EXCEPTION
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: REQUEST_CLARIFICATION; detected false; primary false
- Summary: Scripted reviewer: no material change proposed.
### R7-D06

- Expected: PRESERVE_SOURCE; CHANGED_CANDIDATE/UNKNOWN_TO_ESTABLISHED_FACT
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D07

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: PRESERVE_SOURCE; detected false; primary false
- Summary: Scripted reviewer: no material change proposed.
### R7-D08

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D09

- Expected: USE_TRANSFORMATION; PRESERVED_CANDIDATE/PRESERVED
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D10

- Expected: REQUEST_CLARIFICATION; UNRESOLVED/SOURCE_AMBIGUITY
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: REQUEST_CLARIFICATION; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D11

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_UNCERTAINTY
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
### R7-D12

- Expected: PRESERVE_SOURCE; UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_CAUSAL
- Reviewer: SCRIPTED; policy REQUEST_CLARIFICATION; detected false; latency 0 ms
- Hybrid: PRESERVE_SOURCE; detected true; primary true
- Summary: Scripted reviewer: no material change proposed.
