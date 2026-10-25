# Semantic checker contract

**Version:** `lc02-r4-semantic-check/0.1`

**Code:** `apps/language-demo/evaluation/semantic-checker-contract.mjs`

**Standing:** heuristic candidates, not verified semantic equivalence.

## Inputs

The checker accepts exactly:

- `source`: identified original communication (`id`, exact `text`, SHA-256 `hash`, optional provenance).
- `transformation`: proposed communication (`id`, exact `text`, SHA-256 `hash`, optional provenance).
- `context`: purpose, audience and declared context.
- `obligations`: declared preservation obligations, each with an exact source quote.
- `profile`: `technical-policy` or `general`.
- `method`: `HEURISTIC_SOURCE_ALIGNMENT` or `LEXICAL_BASELINE`.

The input schema is strict. It rejects `reference`, `expected_decision`, `recipient_answer`, `self_assessment` and any other field that would give the checker the answer or the downstream response as evidence.

## Outputs

- `PRESERVED_CANDIDATE`: an obligated source meaning has a candidate counterpart.
- `MISSING_CANDIDATE`: an obligated source meaning or prerequisite has no adequate counterpart.
- `CHANGED_CANDIDATE`: aligned meanings differ in negation, modality, exception, temporal order, attribution, scope or reference.
- `UNSUPPORTED_ADDITION_CANDIDATE`: a transformation unit or relation has no adequate source counterpart.
- `UNRESOLVED`: the source leaves an important ambiguity and the checker cannot decide preservation.
- `NOT_ASSESSED`: the method could not assess the unit.

Each finding records:

- exact `source_spans` and `transformation_spans`;
- `method` (`LEXICAL_RULE_HEURISTIC`, `LEXICAL_BASELINE` or `COMPILER_INVENTORY_ASSIST`);
- `standing: CANDIDATE_REQUIRES_REVIEW`;
- `severity`, `confidence` and a reason.

The output always records:

- `action_authority: false`;
- `human_acceptance: REQUIRED_FOR_ANY_TRANSMISSION`;
- `repair: NOT_PERFORMED`.

A finding is not a verified equivalence, correction, acceptance or authority grant.

## Method

1. Compile source and transformation with the local Understanding Compiler profile.
2. Align obligated source units to transformation units using normalized content-token overlap.
3. Compare modality, negation, conditions, prerequisites, exceptions, temporal direction, speaker/quotation, scope/quantity and unresolved references.
4. Flag transformation units with no adequate source counterpart as unsupported additions.
5. Validate every emitted span against the exact source or transformation text before returning.

The method is lexical and rule-based. It does not use a hosted model, embeddings, a reference answer or the recipient's response.

## Policy simulation

`policyDecision` implements three test-only outcomes:

- `PRESERVE_SOURCE`: any material `CHANGED_CANDIDATE`, `UNSUPPORTED_ADDITION_CANDIDATE` or `MISSING_CANDIDATE`.
- `REQUEST_CLARIFICATION`: `UNRESOLVED` or `NOT_ASSESSED` with no material finding.
- `USE_TRANSFORMATION`: at least one `PRESERVED_CANDIDATE` and no material finding.

The policy is not a production router. It grants no action authority and does not alter any accepted semantic record.
