# LC-03-P0 feasibility run

**Offline, scripted, no model calls. Not a benefit measurement.**

Source: incident-2026-03-17, 1378 chars, record 12 claims / 3 relations / 1 qualifiers.

Record validation: PASS.

## A — original source + navigation
Query: `replication lag was under one second`; found: 848-884; source bytes equal: true.

## B — task-specific representation

- approve_fix/diagram: SHOW; 520 chars; lost none
- approve_fix/table: SHOW; 495 chars; lost none
- follow_procedure/annotated_source: SHOW; 1659 chars; lost none

## Negative control — lossy H3 table row
Lost obligations: row-condition-q1.

## C — advisory inspection

Browser gate lossy control: row-condition-q1 (FALL_BACK_TO_SOURCE).
R6 advisory findings: CHANGED_CANDIDATE/NEGATION_REVERSAL, MISSING_CANDIDATE/MISSING_PREREQUISITE, UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_CONTENT.
R6 policy: PRESERVE_SOURCE (advisory only).

## Scripted scoring illustration

| Arm | Correctness | Evidence | Conditions | Uncertainty | Unsupported | Selection |
|---|---:|---:|---:|---:|---:|---|
| A | 1 | 6/6 | 3/3 | 2/2 | 0 | 1 |
| B | 0.833 | 5/6 | 1/3 | 1/2 | 1 | 1 |
| C | 1 | 6/6 | 3/3 | 2/2 | 0 | 1 |

**The scores illustrate the scoring harness only. They are not model results and must not be reported as a benefit.**
