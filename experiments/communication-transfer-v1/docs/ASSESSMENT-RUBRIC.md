# Separate authored assessment rubric — prospective v0.1

Standing: AUTHORED_SYNTHETIC_NOT_INDEPENDENT_GOLD. Written by the implementer before any real model output. Separate from advisory C; not independently human-adjudicated. No claim of independent authoring is made.

For synthetic-policy-001 the task asks permission for four TOTAL NON-IDEMPOTENT attempts WITHOUT consulting D-17. Reference answer: NO. Both the total-attempt restriction and consultation requirement must remain. Idempotent recovery is separate and unspecified; third-party timeout handling is unresolved. No retry exception or authority grant may be invented.

For each future source-based question, freeze these fields before examining real responses:

| Criterion | Human assessment values |
|---|---|
| Correct action decision | YES / NO / UNKNOWN / SOURCE_CONFLICT, with source rationale |
| Critical scope and conditions | retained / lost / reversed / unassessable, obligation by obligation |
| Unsupported additions | list each new assertion and why source fails to support it |
| Uncertainty | preserved / strengthened / invented / unassessable |
| Provenance | exact accessible quote/offset / incorrect / missing; assess interpretation separately |
| Authority | preserved / false permission / unresolved; silence never grants permission |

Judge-error validation: independently adjudicated items plus adversarial faithful paraphrases, omitted exceptions, scope reversal, fabricated citations and unresolved cases. Compare C's claim-level supported/unsupported assessments against those labels; report false positives, false negatives, disagreements and abstentions separately. Do not treat C as gold or reuse C's outputs to author the evaluation labels. Hide representation/model identity where possible. At least one adversarial control must have every model agree on an incorrect answer; reference judgment must still reject it.

Human judgement files are host-only and are never sent to A or B. If no independent adjudication exists, label outputs UNADJUDICATED_REFERENCE and calibration-only. No confirmatory claims or human agreement metrics can be computed here.
