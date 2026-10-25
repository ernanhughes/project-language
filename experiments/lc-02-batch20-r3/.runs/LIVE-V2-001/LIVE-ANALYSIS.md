# Exploratory live analysis

**Standing:** EXPLORATORY_LIVE_UNADJUDICATED_PROVISIONAL_CANDIDATES. These are provisional candidates, not independent semantic adjudication.

- Source result standing: EXPLORATORY_LIVE_UNADJUDICATED
- Ties both correct: 15
- Ties both wrong: 0
- C-only better: 0
- C-only worse: 0
- Mechanical failures: 1

## Paired counts

```json
{
  "B_vs_A": {
    "IMPROVED": 0,
    "WORSENED": 0,
    "TIE_BOTH_CORRECT": 15,
    "TIE_BOTH_WRONG": 0,
    "UNASSESSABLE": 1
  },
  "C_vs_B": {
    "IMPROVED": 0,
    "WORSENED": 0,
    "TIE_BOTH_CORRECT": 15,
    "TIE_BOTH_WRONG": 0,
    "UNASSESSABLE": 1
  },
  "C_vs_A": {
    "IMPROVED": 0,
    "WORSENED": 0,
    "TIE_BOTH_CORRECT": 15,
    "TIE_BOTH_WRONG": 0,
    "UNASSESSABLE": 1
  }
}
```

## Explanation flags

```json
{}
```

## Unnecessary-abstention candidates

None detected by the current flags.

## Missing-condition candidates

None detected by the current decision contrast.

## C-only contributions and distortions

- C better than B: none
- C worse than B: none

## Ties

- Both correct: R1E-01, R1E-02, R1E-03, R1E-04, R1E-05, R1E-06, R1E-08, R1E-09, R1E-10, R1E-11, R1E-12, R1E-13, R1E-14, R1E-15, R1E-16
- Both wrong: none

## Mechanical failures

- **R1E-07** — statuses {"A":"VALID","B":"FAILED","C":"FAILED"}. Mechanical failure or missing arm; not a semantic tie.

## Case detail

| Case | Expected | A | B | C | A flags | B flags | C flags |
|---|---|---|---|---|---|---|---|
| R1E-01 | YES | YES | YES | YES | — | — | — |
| R1E-02 | NO | NO | NO | NO | — | — | — |
| R1E-03 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | — | — | — |
| R1E-04 | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | — | — | — |
| R1E-05 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | — | — | — |
| R1E-06 | NO | NO | NO | NO | — | — | — |
| R1E-07 | UNKNOWN | UNKNOWN | FAILED | FAILED | — | — | — |
| R1E-08 | YES | YES | YES | YES | — | — | — |
| R1E-09 | NO | NO | NO | NO | — | — | — |
| R1E-10 | NO | NO | NO | NO | — | — | — |
| R1E-11 | YES | YES | YES | YES | — | — | — |
| R1E-12 | NO | NO | NO | NO | — | — | — |
| R1E-13 | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | — | — | — |
| R1E-14 | YES | YES | YES | YES | — | — | — |
| R1E-15 | NO | NO | NO | NO | — | — | — |
| R1E-16 | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | — | — | — |
