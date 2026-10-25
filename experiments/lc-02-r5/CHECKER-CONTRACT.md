# R5 semantic checker contract

**Version:** `lc02-r5-semantic-check/0.1`

**Code:** `apps/language-demo/evaluation/semantic-checker-v5-contract.mjs`

**Standing:** heuristic candidates, not verified semantic equivalence.

## Inputs

- `source`: identified original communication (`id`, exact `text`, SHA-256 `hash`, optional provenance).
- `transformation`: proposed communication (`id`, exact `text`, SHA-256 `hash`, optional provenance).
- `context`: purpose, audience and declared context.
- `obligations`: declared preservation obligations with exact source quotes.
- `profile`: `technical-policy` or `general`.
- `method`: `HEURISTIC_SOURCE_ALIGNMENT` or `LEXICAL_BASELINE`.

The input schema is strict and rejects `reference`, `expected_decision`, `recipient_answer`, `self_assessment` and similar answer-bearing fields.

## Findings

- `PRESERVED_CANDIDATE`
- `MISSING_CANDIDATE`
- `CHANGED_CANDIDATE`
- `UNSUPPORTED_ADDITION_CANDIDATE`
- `UNRESOLVED`
- `NOT_ASSESSED`

Each finding records exact source and transformation spans, distinction, severity, confidence, method and `standing: CANDIDATE_REQUIRES_REVIEW`.

## Uncertainty assessment

Each uncertain transformed claim receives:

- `claim`
- `source_spans`
- `transformation_spans`
- `required_conditions`
- `established_conditions`
- `denied_conditions`
- `unresolved_conditions`
- `ambiguous_referents`
- `extra_assumptions`
- `epistemic_scope: SOURCE_RELATIVE`
- `status`: `SUPPORTED_UNCERTAINTY`, `UNSUPPORTED_UNCERTAINTY` or `INDETERMINATE`
- method and candidate standing.

Supported or indeterminate uncertainty produces `UNRESOLVED`; unsupported uncertainty produces `UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_UNCERTAINTY`.

## Policy

`policyAssessment` is separate from findings:

- `PRESERVE_SOURCE`: material missing, changed or unsupported addition.
- `REQUEST_CLARIFICATION`: unresolved or not assessed with no material finding.
- `USE_TRANSFORMATION`: at least one preserved candidate and no material, unresolved or not-assessed finding.

The policy is test-only. It has `action_authority: false`, requires human acceptance for any transmission and performs no repair. Findings are not verdicts.
