# LC-02-BATCH20-R2 — Independent Evaluation Preflight

**Status:** offline preflight complete. No Language experiment provider call was made. No live evaluation was run. No manuscript, commit or push.

**Decision:** **NO-GO for the 80-call live run at this time.** The mechanics are qualified, but independent human review and explicit V2 approval are still missing. See §9.

---

## 1. What was reviewed

- `LC-02-BATCH20-R1-REVIEW.md`
- `experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json`
- The frozen batch-20 evidence under `experiments/lc-02-batch20/.runs/COMBINED-001/`
- The existing batch engine, compiler adapter and Studio contracts

The R1 repairs were not re-opened. R2 is a qualification milestone, not a redesign.

### Frozen design hashes

| Design | Hash | Status |
|---|---|---|
| V1 original | `2c88429b777baca7207aad13ea3041746bc0a99d0d96fcc217aed81856c78de4` | Verified, preserved, unrun |
| V2 corrected | `c1ca37936300384536b3c94d5cf5b38076b3a813bf6c934c0a053b9bd6bc09d9` | Frozen, unrun, pending human review |

V2 changes only **R1E-04, R1E-08 and R1E-16**. The other thirteen cases are byte-identical to V1. The change log and the superseded V1 hash are inside V2.

---

## 2. Blind review package

### V1 full package

- `experiments/lc-02-batch20-r2/blind/reviewer-package.md`
- Package SHA-256: `dc39fb0cc4dec902e78e5a5c7dfea296cd1534319e0e8c0e1ac460c7c0924c5a`
- 16 cases. Contains source, question, declared context, question scope, answer choices, and blank fields for decision, explanation, citations, confidence and suspected ambiguity.
- Contains no expected label, arm identity, hypothesis, previous model output or previous review.
- `manifest.json` records `contains_expected_labels: false`, `contains_arm_identities: false`, `contains_previous_outputs: false`.

### V2 full package

- `experiments/lc-02-batch20-r2/blind-v2/reviewer-package.md`
- Package SHA-256: `cf67550f97fd3f6e5c97a2ac9dd0eba02dba20863c8875e798185c645459d534`
- 16 cases with the corrected V2 wording. This is the package a human reviewer should receive.

### V2 delta package

- `experiments/lc-02-batch20-r2/blind-v2-delta/reviewer-package.md`
- Package SHA-256: `f903309be34db74a4906758111bd97876b46f1fff081f8b74f432ed827810e2f`
- Only R1E-04, R1E-08 and R1E-16.
- Used to re-review the three changed cases without re-running the thirteen unchanged ones.

### How human judgments are collected

`HUMAN-REVIEW-HANDOFF.md` gives the exact procedure:

1. Give the V2 package and response template to two human reviewers.
2. Do not show them `reviews/`, the expected labels, the arm outputs or each other's work.
3. Save their completed files as `reviews/human-a.json` and `reviews/human-b.json`.
4. Only then run `compare-human-reviews.mjs`, which writes `reviews/HUMAN-COMPARISON.md` and `.json`.

The comparison script validates 16 cases, labels, explanations, citations and confidence before comparing. It reports agreement, disagreements, reference matches, ambiguity notes and low-confidence cases.

---

## 3. Blind review results

**Important limitation:** the reviews below were produced by **model-based reviewers in separate sessions**, not by independent humans. They are provisional. They do not satisfy the independence requirement for the live run. These review sessions were not Language experiment arms and did not use the frozen experimental provider path; they remain model-based preflight judgments, not human adjudication.

| Stage | Reviewers | Cases | Label agreement | Expected matches | Standing |
|---|---|---:|---:|---:|---|
| V1 full | Reviewer A / Reviewer B | 16 | 16 / 16 | 16 / 16 each | Model-based provisional |
| V2 delta | Reviewer A2 / Reviewer B2 | 3 | 3 / 3 | 3 / 3 each | Model-based provisional |

Reviewer hashes:

| Reviewer | Response hash |
|---|---|
| A | `e3a8e704e5ef908d36a42da830a7b8531e9a88aa1a59b18f4ca6c426882ad037` |
| B | `3b4b01e73610749946a25e22f2010d227d6eff6c5c61ac845c2609f413427464` |
| A2 | `93f054b300d7559004ed3968772b98d3a79c1b0ae8a2f9e16181313a07e937f2` |
| B2 | `d760921a30492060b674cfd06c3ecca4b18c174996f80d2a614e4e0e166e7545` |

The model reviewers agreed with each other and with the frozen reference on all reviewed cases. That is useful evidence of readability, but it is **not** independent human adjudication, and it may reflect shared model priors. It cannot support a claim that the cases are empirically unambiguous. The reviewer prompts restricted them to the blind package and forbade repository inspection; the package itself contains no expected labels, arm identities or previous outputs.

Full reports:

- `experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-COMPARISON.md`
- `experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-V2-DELTA.md`

### Cases requiring clarification

| Case | Finding | Action |
|---|---|---|
| R1E-04 | Both V1 reviewers chose `SOURCE_CONFLICT` but both noted that the word “unambiguously” permits a reasonable `NO` answer. | V2 asks for the **status** of deletion instead of whether the excerpt “unambiguously permits” it. |
| R1E-08 | Reviewer B was unsure whether the dashboard statement described the current episode. | V2 says “currently shows 9 uninterrupted minutes.” |
| R1E-16 | Both V1 reviewers chose `SOURCE_CONFLICT` but both noted that the yes/no form “May the auditor access” permits `NO` or `UNKNOWN`. | V2 asks for the **status** of auditor access instead of a bare yes/no. |

V2 delta reviewers chose `SOURCE_CONFLICT` for both conflict cases and `YES` for R1E-08, all with high confidence. The question-form ambiguity is resolved.

### Residual ambiguity

Both delta reviewers still noted a **modal-priority argument** in the conflict cases: a discretionary “may” versus a mandatory “must not,” and whether the prohibition should dominate. Both nevertheless chose `SOURCE_CONFLICT` because the documents expressly deny a precedence rule. This is a genuine interpretive debate worth preserving, not a question-form defect. It remains a watch item for the live analysis.

The genuine-ambiguity cases R1E-05 and R1E-07 were correctly treated as `UNKNOWN` by both reviewers. The external-verification pair R1E-13/R1E-14 worked as intended: both reviewers answered `UNKNOWN` for external truth and `YES` for what the document states.

No reviewer disagreed on a label.

### Preflight reading checks

| Issue | Cases | Finding |
|---|---|---|
| Necessary versus sufficient permission conditions | R1E-01, R1E-15 | R1E-01 states a permission and expressly says no other condition applies; both reviewers answered `YES`. R1E-15 uses “only if … and …”; one necessary condition is absent and both answered `NO`. No confusion between necessary and sufficient conditions was observed. |
| Source-relative versus external reality | R1E-13, R1E-14 | Both reviewers answered `UNKNOWN` when asked about external encryption and `YES` when asked what the document states. The paired design works as intended. |
| Unambiguous `NO` versus `UNKNOWN` | R1E-02, R1E-03, R1E-05, R1E-06, R1E-07 | Express prohibition or authority denial was answered `NO`; missing facts and genuine referential/date ambiguity were answered `UNKNOWN`. No reviewer collapsed them. |
| Recorded event versus operative timestamp | R1E-05, R1E-12 | R1E-12 makes the request timestamp explicit and both answered `NO`; R1E-05 makes the submission-versus-synchronization ambiguity explicit and both answered `UNKNOWN`. The LC20-19 ambiguity is deliberately not repeated as an accidental trap. |
| Genuine source conflict | R1E-04, R1E-16 | Both reviewers called both conflicts genuine and chose `SOURCE_CONFLICT`. The V1 question-form alternative (`NO` because “not unambiguous”) was removed in V2. A residual modal-priority debate remains and is recorded above. |
| Reasonable alternative answer | R1E-04, R1E-16 | Both reviewers could articulate a “prohibition should dominate” alternative, but both rejected it because the documents expressly deny precedence. This is the main residual interpretive risk. |

---

## 4. Scripted dry run

### V2 complete run

Path: `experiments/lc-02-batch20-r2/.runs/DRY-RUN-V2-001/`

| Item | Result |
|---|---|
| Cases | 16 |
| Arms | 48 |
| Scripted requests | 80 (5 per case) |
| Hosted requests | 0 |
| Mechanical checks | 13 / 13 pass |
| Static HTML | `viewer.html`, 16 case articles, 483,973 bytes |
| Captured outputs | Per-case `record.json`, `events.jsonl`, packet, proposal, inventory, answer |

The thirteen checks:

1. `case-count` — 16.
2. `three-arms` — A, B, C.
3. `all-arms-complete` — 48 valid, 0 failed.
4. `identical-source-across-arms` — same source text and hash in every packet.
5. `identical-question-across-arms` — same question text in every recipient request.
6. `compiler-hints-only-to-c` — A has no interpreter; B has no inventory; C has the inventory.
7. `fresh-sessions` — 80 scripted requests, 80 unique session IDs.
8. `frozen-references-excluded` — no reference, expected label, required-reasoning or case-class fields in any request.
9. `source-relative-contract` — all packets carry the contract, correct `answer_scope`, `source_truth_scope` and `action_authority: false`.
10. `host-resolved-citation-control` — a scripted citation with an empty hash was resolved from the exact span; canonical hash restored.
11. `mechanical-failure-accounting` — no failures in the main run.
12. `no-implicit-authority` — every packet has `action_authority: false`.
13. `scripted-request-count` — 80 scripted, 0 hosted.

A V1 dry run (`DRY-RUN-002`) also passes 13/13. It is retained as a control; V2 is the design under review. An earlier V1 run (`DRY-RUN-001`) exposed two harness-check defects — the recipient question was read from the wrong object path, and the resolved citation hash was not propagated into the scripted answer. Both were fixed; the failed run is retained rather than deleted.

### Failure controls

Path: `experiments/lc-02-batch20-r2/.runs/FAILURE-CONTROL-V2-001/failure-control.json`

| Control | Result |
|---|---|
| Injected provider failure (R1E-01 A) | `FAILED`, `INJECTED_PROVIDER_FAILURE`, no recipient response captured |
| Injected bad span (R1E-02 A) | `FAILED`, `SOURCE_SPAN`, recipient response captured and preserved |

The bad-span control confirms that host resolution does not repair a wrong span. The provider-failure control confirms that a missing answer is not counted as a tie or a semantic disagreement. In the dry run, B/C proposals were accepted only by the scripted `TEST_OPERATOR` for test delivery; every packet carries `action_authority: false`, and no external action was available.

### What the dry run does not show

The scripted recipient returns `UNKNOWN` for every arm except the citation control. The dry run proves **mechanics**, not comprehension, mediation quality or C-vs-B differences. No scripted decision is a model result.

---

## 5. Compiler qualification

`experiments/lc-02-batch20-r2/COMPILER-QUALIFICATION.json` records:

| Item | Value |
|---|---|
| Python | 3.13.15 |
| spaCy | 3.8.16 |
| Installed models | `[]` |
| Engine | `spacy/blank-en+sentencizer` |
| Trained syntax available | `false` |
| Fallback reason | `SPACY_MODEL_NOT_INSTALLED` |
| Technical-policy profile | 0.2 |
| General profile | 0.1 |

### Positive control — R1E-01

- 3 sentences; 3 meaning units; 0 relations.
- The conditional permission is identified, with the prerequisite `the primary region has been unavailable for ten continuous minutes`.
- No cross-sentence relation candidates are produced.

### Negative control — R1E-02

- 2 sentences; 2 meaning units; 0 relations.
- The express prohibition is identified.
- No relation candidates are produced.

The baseline now exposes semicolon-separated clauses, prerequisites and speaker labels, but it still has no cross-sentence relation implementation. No model was downloaded. The C arm, if run now, would be a **blank-English fallback** run, not a test of trained syntax.

---

## 6. Frozen live protocol

`experiments/lc-02-batch20-r2/FROZEN-LIVE-PROTOCOL.json` hashes to:

`26009e396fa890c85b573fdeec9f0c3be04e4433fbe84b55e8cbb986918959e3`

It records:

- V2 design hash: `c1ca37936300384536b3c94d5cf5b38076b3a813bf6c934c0a053b9bd6bc09d9`
- Model assignments: interpreter `deepseek-v4.1-flash`, recipient `qwen3.8-flash`, mediator `deepseek-v4.1-flash`, challenger `gpt-6-luna`, advisory evaluator `claude-haiku-5-5`.
- Prompt hashes for interpreter, mediator, challenger, recipient, `HINT_INSTRUCTION` and the source-relative contract module.
- Profile hashes for `technical-policy` 0.2 and `general` 0.1.
- Per-case source and question hashes, expected labels, acceptable alternatives, scope and class.
- Request limits: 5 calls per case, 80 planned, 100 absolute ceiling, no retries, no fallback, no resume.
- Treatment differences: A source only; B interpreter proposal without inventory; C inventory to the same interpreter; same source, question, recipient model and contract in all arms; B and C packets not token matched.
- Grading: primary C vs B; B vs A and C vs A separately; label, explanation fidelity, uncertainty, mechanical validity and adjudication issues kept separate.
- `live_execution_authorized: false`.
- Blockers: `HUMAN_INDEPENDENT_REVIEW_OF_V2`, `V2_PRE_RUN_APPROVAL`, `TRAINED_SPACY_DECISION`.

The protocol hash must be recomputed and re-approved if any prompt, profile, model assignment, case reference or limit changes.

---

## 7. Frozen hashes and artifacts

| Artifact | Hash / path |
|---|---|
| V1 design | `2c88429b777baca7207aad13ea3041746bc0a99d0d96fcc217aed81856c78de4` |
| V2 design | `c1ca37936300384536b3c94d5cf5b38076b3a813bf6c934c0a053b9bd6bc09d9` |
| V1 blind package | `dc39fb0cc4dec902e78e5a5c7dfea296cd1534319e0e8c0e1ac460c7c0924c5a` |
| V2 blind package | `cf67550f97fd3f6e5c97a2ac9dd0eba02dba20863c8875e798185c645459d534` |
| V2 delta package | `f903309be34db74a4906758111bd97876b46f1fff081f8b74f432ed827810e2f` |
| Frozen live protocol | `26009e396fa890c85b573fdeec9f0c3be04e4433fbe84b55e8cbb986918959e3` |
| Preflight status | `a84cacb38870374fc0eb97d07a4b52f35c19256a0915ae0179d1df04e330baff` |
| V2 dry run | `experiments/lc-02-batch20-r2/.runs/DRY-RUN-V2-001/` |
| Failure control | `experiments/lc-02-batch20-r2/.runs/FAILURE-CONTROL-V2-001/` |
| Compiler qualification | `experiments/lc-02-batch20-r2/COMPILER-QUALIFICATION.json` |

`PREFLIGHT-STATUS.json` is the machine-readable summary. It records `go_no_go: NO_GO_PENDING_HUMAN_INDEPENDENT_REVIEW`.

---

## 8. Experimental limitations

1. **Reviewer independence is not satisfied.** The two reviewers were model-based and provisional. A human independent review of V2 is still required.
2. **The design is small and synthetic.** 16 cases can expose gross failures but cannot support population-wide claims.
3. **C is a blank-English fallback.** No trained spaCy model is installed. The run can test the current baseline, not trained syntax or a full Understanding Compiler.
4. **The compiler still produces zero cross-sentence relations.** Any relation candidates in the live run come from the interpreter proposal, not the local compiler.
5. **The model-based reviews agreed 16/16 and 16/16 with the reference.** That is suspiciously clean; it may indicate shared priors or case readability. It is not evidence that human readers will agree.
6. **Residual modal-priority debate remains** in the two conflict cases. Both reviewers chose `SOURCE_CONFLICT`, but a reader could argue a mandatory prohibition should dominate. This is a genuine interpretive issue to watch.
7. **The scripted dry run cannot detect semantic over-abstention.** Only a live model run can test whether the repaired contract changes recipient behaviour.
8. **No independent semantic adjudication exists yet.** The frozen references are author-constructed. A label match is not comprehension.

---

## 9. Explicit go/no-go

### Mechanical qualification: GO

- 16 cases, 48 arms, 80 scripted requests, 0 hosted requests.
- 13/13 mechanical checks pass.
- Same source and question across arms; C-only inventory; fresh sessions; no reference leakage; correct contract; host-resolved citation control; failure controls; static HTML.
- V2 schema is supported explicitly by `run-fresh.mjs`; it is not coerced into the old 20-case schema.

### Live execution: NO-GO at this time

Blockers:

1. **Human independent review of V2.** Two model-based reviewers are not sufficient. Use `HUMAN-REVIEW-HANDOFF.md` and the V2 package.
2. **Explicit V2 pre-run approval.** V2's freeze-time `pre_run_approval_status` is `PENDING_RE_REVIEW_OF_CHANGED_CASES`; the model-based delta re-review is complete, but the preflight status is still `NO_GO_PENDING_HUMAN_INDEPENDENT_REVIEW`.
3. **Trained spaCy decision.** Either install a trained pipeline manually and record its version, or explicitly approve a `BLANK_ENGLISH_FALLBACK` run. Do not describe a fallback run as a test of trained syntax.

The live run may proceed only after those three blockers are cleared and the frozen protocol hash `26009e396fa890c85b573fdeec9f0c3be04e4433fbe84b55e8cbb986918959e3` is approved. Any change to the design, prompts, profile, model assignments or limits requires a new version and a new hash.

---

## 10. What the next live result should be judged on

The primary comparison is **C versus B**. B versus A and C versus A are separate.

The live analysis should answer:

1. Did repaired mediation stop turning clear permissions into `UNKNOWN` (LC20-10-style failures)?
2. Did it still identify genuine missing conditions that the ordinary path overlooks?
3. Did the Understanding inventory contribute a question-relevant, source-anchored condition, exception, scope limit or relation that B lacked?
4. Did C add only more text, more unknowns or more unsupported qualifications?
5. Did the external-verification pair separate source-relative reasoning from external truth?
6. Did explanation fidelity and uncertainty calibration improve independently of label agreement?
7. Did any arm invent permission, erase a condition, reverse a modality or resolve a conflict silently?

If C and B again produce essentially the same decisions and explanations, the next question is architectural: whether feeding a second representation of the same source to the same model is the right mechanism. An independent semantic check **before** transmission may be more valuable than adding more information to the interpreter prompt. That remains a hypothesis, not a validated capability.

---

## 11. Standing and exclusions

- No manuscript file was edited.
- No git commit, push or PR was made.
- No Language experiment provider request was made. The two model-based review sessions are preflight reviewers, not experiment arms; they are not human independent adjudication.
- No spaCy model was downloaded.
- No frozen V1 file was modified. V2 is an additive correction.
- The live evaluation was not run.
- No Language superiority or semantic-improvement claim is made.




