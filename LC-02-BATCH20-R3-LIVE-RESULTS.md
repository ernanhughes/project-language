# LC-02-BATCH20-R3 — Exploratory live result

**Standing:** EXPLORATORY_LIVE_UNADJUDICATED. This is a single exploratory run. It is not confirmatory and does not establish semantic superiority or a full Understanding Compiler.

- Design: `c1ca37936300384536b3c94d5cf5b38076b3a813bf6c934c0a053b9bd6bc09d9`
- Approval: `4b10f87b7d84fd08d52a845c7b25cb952b3aab573e17234bdb16c1a3ff123df8`
- Exploratory protocol: `756814ad9598c3d82b6f0a7ba8f7197d385295515bd51cede9e838fd6de6ad50`
- Hosted requests: 76 / planned 80 / ceiling 100
- Reservations: 78; aborted before transport: 2 (R1E-07 B/C, instrument guard false positive)
- Compiler condition: technical-policy 0.2 · see manifest
- Models: interpreter `opencode-go/deepseek-v4.1-flash`, recipient `opencode-go/qwen3.8-flash`

## Mechanical checks

| Check | Status |
|---|---|
| case-count | PASS |
| three-arms | PASS |
| all-arms-complete | PASS |
| identical-source-across-arms | PASS |
| identical-question-across-arms | PASS |
| compiler-hints-only-to-c | PASS |
| fresh-sessions | PASS |
| frozen-references-excluded | PASS |
| source-relative-contract | PASS |
| citation-validation | PASS |
| mechanical-failure-accounting | PASS |
| no-implicit-authority | PASS |
| request-count | PASS |

## Decisions

| Case | Class | Scope | Reference | A | B | C | B vs A | C vs B | C vs A |
|---|---|---|---|---|---|---|---|---|---|
| R1E-01 | FULLY_SPECIFIED_PERMISSION | SOURCE_RELATIVE | YES | YES | YES | YES | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-02 | FULLY_SPECIFIED_PROHIBITION | SOURCE_RELATIVE | NO | NO | NO | NO | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-03 | FULLY_SPECIFIED_UNKNOWN | SOURCE_RELATIVE | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-04 | FULLY_SPECIFIED_CONFLICT | SOURCE_RELATIVE | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-05 | GENUINE_AMBIGUITY | SOURCE_RELATIVE | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-06 | AUTHORITY_DENIAL | SOURCE_RELATIVE | NO | NO | NO | NO | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-07 | GENUINE_AMBIGUITY | SOURCE_RELATIVE | UNKNOWN | UNKNOWN | FAILED | FAILED | UNASSESSABLE | UNASSESSABLE | UNASSESSABLE |
| R1E-08 | COMPLETE_BUT_DISTRACTED | SOURCE_RELATIVE | YES | YES | YES | YES | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-09 | QUALIFIED_EXCEPTION | SOURCE_RELATIVE | NO | NO | NO | NO | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-10 | SPEAKER_SCOPE | SOURCE_RELATIVE | NO | NO | NO | NO | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-11 | SPEAKER_SCOPE | SOURCE_RELATIVE | YES | YES | YES | YES | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-12 | TEMPORAL_BOUNDARY | SOURCE_RELATIVE | NO | NO | NO | NO | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-13 | EXTERNAL_VERIFICATION | EXTERNAL_FACTUAL_VERIFICATION | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-14 | SOURCE_RELATIVE_SCOPE_PAIR | SOURCE_RELATIVE | YES | YES | YES | YES | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-15 | MULTI_CONDITION | SOURCE_RELATIVE | NO | NO | NO | NO | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |
| R1E-16 | FULLY_SPECIFIED_CONFLICT | SOURCE_RELATIVE | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT | TIE_BOTH_CORRECT |

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

## Findings

### Decision accuracy

All 15 assessable cases produced the same reference label in A, B and C. The primary C-vs-B comparison is therefore **15 ties both correct, 0 improved, 0 worsened, 1 unassessable**. B-vs-A and C-vs-A are the same.

This is a **ceiling result**, not evidence that mediation is beneficial or harmful. The cases were clear enough that ordinary communication already reached the reference label. There was no room for an accuracy gain, and no arm introduced a wrong decision.

### Unnecessary uncertainty

No unnecessary-abstention candidates were detected among the 15 assessable cases. Every arm answered `YES`, `NO`, `UNKNOWN` or `SOURCE_CONFLICT` consistently with the reference. The R1 repairs did not produce the LC20-10-style over-abstention in this set.

This does not prove the repairs caused the absence of over-abstention. The cases may simply be easy, and there is no counterfactual run with the old prompts. It does show that the repaired contract did not visibly harm these decisions.

### Missing-condition detection

No missing-condition candidates were detected. Ordinary communication was already correct on every assessable case, so B and C had no opportunity to demonstrate a source-grounded condition that A missed.

### C-only contributions and distortions

- **Decision contributions:** none. C never changed a B decision.
- **Candidate explanation contribution:** R1E-08. C's packet and explanation explicitly link the dashboard's “9 uninterrupted minutes above 20 seconds” to the replication-lag threshold. B's packet keeps the permission and the dashboard observation as separate claims and does not state the metric link as explicitly. This is a plausible C-only explanation-fidelity gain, but it did not change the decision and is not independently adjudicated.
- **Potential overqualification:** C carried more unknowns than B in 8 of 15 assessable cases, more commitments in 5, and more relations in 3. None changed a decision. This is a watch item, not a demonstrated distortion.
- **C-only distortions:** none detected by the current flags. No live explanation triggered `PROVENANCE_SCOPE_CONFUSION` or `DEFERS_TO_INTERPRETER_DOUBT`.

### R1E-07 instrument failure

R1E-07 is the one unassessable case. Its source literally contains the question (“Did the chair approve the rollout plan?”), and the old interpreter guard searched the entire interpreter input for the question string. It therefore raised `INTERPRETER_QUESTION_LEAK` before any interpreter model call. A answered `UNKNOWN` correctly; B and C have no answer.

This is a **harness false positive**, not a model failure, not a semantic disagreement and not a tie. The live result was not rerun or repaired. The guard has been corrected for future runs to reject question fields and question metadata, not question text that is part of the source. The R3 result remains as recorded: R1E-07 B/C are unassessable.

The charge hook was also moved after the guard for future runs. In the recorded run it ran before the guard, so the ledger contains 78 reservations but only 76 actual hosted requests. The two R1E-07 reservations never reached the provider. The manifest records both numbers; the result is not rewritten.

### Explanation fidelity

All assessable explanations were source-consistent on inspection. Mediation did not repeat the LC20-10 `source_truth` confusion, and no explanation deferred to an interpreter-added unknown. C's explanations were often longer, but length alone is not a benefit. The current flags are heuristic and did not detect a semantic distortion; they do not certify fidelity.

### Compiler condition

The compiler ran as `BLANK_ENGLISH_FALLBACK` with zero cross-sentence relations. It did produce the prerequisite and separate clauses used in cases such as R1E-08, but the experiment cannot attribute the C-only explanation difference to the inventory rather than to the interpreter. This is not a test of the full Understanding Compiler.

### Bottom line

The run is a **null result for decision accuracy and for a C-over-B advantage**. It provides weak positive evidence that the repaired source-relative contract did not reintroduce over-abstention on 15 clear cases. It provides one candidate C-only explanation benefit (R1E-08) and no C-only decision benefit. The R1E-07 instrument failure removes the only case that might have tested a mediated answer under genuine referential ambiguity.

## Recommendation

1. **Do not start a larger compiler build on this result.** The evidence does not support a C-over-B decision advantage, and the ceiling leaves no room to show one.
2. **Prioritise the compiler-as-independent-checker investigation.** The batch-20 failure mode was unsupported interpretation, not missing extraction. A checker that compares a proposed communication against the source and can accept, repair or preserve it is a more targeted next step than adding more context to the interpreter.
3. **Preserve the original when it is sufficient.** Ordinary communication matched all 15 assessable references. A future router should be allowed to choose `PRESERVE` and should not mediate merely because mediation is available.
4. **Fix the instrument and design for headroom.** The R1E-07 guard false positive must not recur. The next case set should use longer, realistic passages, cross-section references and task-relevant information spread across sections, while remaining fair and not deliberately confusing.
5. **Do not rerun V2.** The exploratory approval permitted one execution. The result is preserved, including the R1E-07 failure.

## Mechanical failures

- **R1E-07** — {"A":"VALID","B":"FAILED","C":"FAILED"}

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

## Explanation flags

```json
{}
```

## Interpretation limits

- A label match is not semantic comprehension.
- Unnecessary-abstention and missing-condition lists are heuristic candidates, not adjudicated verdicts.
- The compiler is a blank-English fallback with zero cross-sentence relations; this is not a test of the full Understanding Compiler.
- The 16 cases may have a decision-accuracy ceiling; ties do not show that mediation is harmful or beneficial.
- Any positive result requires fresh unseen confirmation.
