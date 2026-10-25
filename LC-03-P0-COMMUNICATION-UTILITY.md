# LC-03-P0 — Close Semantic Checking and Return to Communication Utility

**Status:** Offline research closure, design and feasibility. No hosted model calls. No manuscript changes.
**Date:** 2026-10-24
**Repository:** `C:\Projects\project-language`

**Decision:** Close the LC-02 semantic-checker programme with `PREFER_DETERMINISTIC`. Keep the R6 typed-constraint checker as an advisory capability. Retain the R7 hybrid as experimental evidence, not as a default. Do not build the full LC-03 application yet.

---

## 1. Executive summary

LC-02 asked whether a checker could decide when a transformed communication preserved meaning. It produced a useful deterministic constraint checker, but not a general semantic gate.

The sequence is now clear:

- R4 and R5 showed that lexical semantic checking detects some corruptions but rejects faithful paraphrases and cannot separate justified from invented uncertainty.
- R6 showed that typed quantities, operators, units and durations can be checked reliably, while exception scope, status labels and distinction precedence remain difficult.
- R7 showed that adding a model-assisted reviewer and reconciliation machinery produced no clean advantage. The pilot’s apparent gain came partly from cases that overlapped earlier experiments. On the non-overlapping subset, the hybrid matched R6 on detection, rejected an additional faithful transformation, and had lower policy accuracy.

The R7 contamination audit is a result in its own right. It prevents us from attributing an apparent improvement to architecture when it may reflect familiarity with earlier cases.

LC-03 should ask a different question:

> Can an intelligent communication medium make a substantial source more useful to a recipient without damaging fidelity?

That question is about reconstruction and application, not about whether another checker scores better.

**P0 conclusion:** the existing Studio and `core/browser` capabilities can support a bounded single-source incident feasibility study with moderate orchestration. They cannot support the full multi-source LC-03 experiment without substantial new development: a three-arm comparison harness, a structured task-answer schema and scorer, representation generation for arbitrary sources, multi-page navigation, and independently authored evaluation material.

P0 therefore delivers the closure synthesis, the LC-03 design, four exposed development fixtures, an overlap audit, and a runnable offline feasibility path. It does not execute a communication-utility experiment.

---

## 2. What LC-02 implemented

### R4 — first independent semantic checker

- Lexical/rule-based checker with exact source and transformation spans.
- Obligations supplied by the caller.
- Findings for preservation, missing meaning, changed meaning, unsupported addition, unresolved and not assessed.
- 24 pairs: 6 corruptions and 6 faithful controls in each split.
- Held-out result: 5/6 corruptions detected, 2/6 faithful falsely rejected, policy 10/12.
- Decision: `REVISE`.

### R5 — uncertainty grounding and alignment

- Added `uncertainty_assessments` with source-relative status.
- Clause-level alignment, modality-aware matching, condition/exception attachment, controlled synonyms, causal cues.
- 36 pairs: 12 development, 24 held-out.
- Held-out result: 8/12 corruption detection, 6/8 faithful accepted, 4/4 ambiguity clarified, 21/24 policy; one material false acceptance (`R5-E11`, forty→fifty).
- Decision: `REVISE`.

### R6 — typed constraints and epistemic separation

- Small source-linked constraint representation: kind, operator, value, unit, action, spans, standing.
- Written-number normalisation; inclusive/exclusive boundaries; duration and retention thresholds.
- Separate source-standing and transformation-assessment fields.
- Conservative policy: no positive preservation evidence means no `USE_TRANSFORMATION`.
- 36 new pairs: 12 development, 24 held-out.
- Held-out result: 10/12 corruption detection, 0 material false acceptances, 8/8 faithful accepted, 4/4 ambiguity, 23/24 policy.
- Decision: `REVISE_ARCHITECTURE`.

### R7 — hybrid qualification

- Local model-assisted reviewer plus deterministic reconciliation.
- 24 pilot “held-out” cases, 24 local calls, no hosted calls.
- Pilot result: 11/12 corruption detection, 0 false acceptances, 6/8 faithful accepted, 21/24 policy.
- Post-run audit: 12/24 cases overlapped R5/R6, including 2 exact duplicates. The apparent advantage was concentrated in near-duplicate cases.
- Non-overlapping diagnostic subset: A 5/5 detection, B 3/5, C 5/5; A 4/5 faithful, B 4/5, C 3/5; A 10/12 policy, B 10/12, C 9/12.
- Decision: `PREFER_DETERMINISTIC`.

The R7 clean subset is a **retrospective diagnostic**, not a prospectively frozen confirmatory evaluation. It must not be cited as one.

---

## 3. What worked, what failed, what remains unverified

### Worked

- Exact source hashing and span binding.
- Typed quantity, operator, unit and duration comparison.
- Written-number normalisation.
- Conservative separation of findings from policy.
- Explicit ambiguity routing on the held-out R6 controls.
- Exact-quote validation for local model output.
- Evidence ledgers, request accounting and failure recording.
- `core/browser` source-linked record, task choice, deterministic renderings, obligations and gate.
- `core/preservation` three-valued obligations and probes.

### Failed or remained fragile

- Contextual alignment across paraphrases and reordered sentences.
- Exception scope and the difference between a status label and epistemic uncertainty.
- Distinction precedence (unknown→fact versus negation reversal).
- Task-appropriate omission.
- Model-assisted review on long multi-section proposals: exact-quote failures on 7/8 LC20 arm outputs.
- Hybrid reconciliation: model-only material findings were too authoritative; non-constraint deterministic false positives were too hard to dispute; correct evidence and correct distinction were not merged.
- Corpus construction: R7 reused near-duplicate cases as pilot “held-out” evidence.

### Not verified

- Production communication safety.
- Generalization beyond small author-constructed samples.
- Independent human adjudication.
- Whether any representation improves a recipient’s practical reconstruction.
- Whether advisory constraint inspection improves usefulness without inducing misplaced trust.

---

## 4. Why the hybrid was not adopted

The R7 pilot did not establish a clean advantage.

- The pilot’s 11/12 detection was concentrated in cases that closely paraphrased R6 cases.
- On the 12 non-overlapping cases, the hybrid matched R6’s 5/5 detection, but accepted fewer faithful transformations (3/5 versus 4/5) and had lower policy accuracy (9/12 versus 10/12).
- The reviewer alone detected only 3/5 clean corruptions.
- The local reviewer failed exact evidence on long proposals.
- The reconciliation design had two opposite defects: it let model-only material findings force preservation (`E17`), and it let non-constraint deterministic false positives survive a valid reviewer preservation finding (`E13`).

A more complex checking architecture performed worse than a simpler one on the clean evidence. That is a bounded finding, not a universal law.

---

## 5. Reusable capabilities

| Component | Decision | Notes |
|---|---|---|
| R6 typed quantities, operators and thresholds | **KEEP** | Advisory; mechanically checkable obligations only. |
| Exact source spans and provenance | **KEEP** | Required for any future representation or check. |
| Conditional and prerequisite checks | **KEEP, with limitations** | False-positive and omission risks remain. |
| R6 conservative policy | **KEEP AS TEST-ONLY** | Do not connect to live routing. |
| R7 local reviewer adapter | **EXPERIMENTAL ONLY** | Exact-quote validation and ledger are reusable. |
| R7 reconciliation machinery | **ARCHIVE / REUSE SELECTIVELY** | The failure analysis is useful; do not default to it. |
| Automatic Preserve / Enhance / Clarify routing | **DO NOT DEPLOY** | No production authority. |
| Original-source communication | **KEEP AS BASELINE** | The source remains a first-class output. |
| `core/browser` record/representation/gate | **KEEP FOR LC-03** | Best existing fit for substantial-source representation. |
| `core/preservation` obligations and probes | **KEEP FOR LC-03** | Checks are visible and can refuse a view. |
| Studio runtime gates, evidence ledger, source anchors | **KEEP** | Reusable for arm isolation, cost and audit. |

Retaining code is not permission to use it as an automatic approval gate.

---

## 6. LC-03 research question

### Primary question

> Does AI-mediated task-specific representation improve a recipient’s ability to reconstruct and apply meaning from a substantial source, compared with competent access to the original source?

### Secondary questions

- Does optional advisory constraint inspection improve fidelity without reducing usefulness?
- Which source and task types benefit, and which are better served by the original?
- Does a representation preserve conditions, exceptions and uncertainty when the recipient applies it to a new question?
- Does added structure reduce or increase unsupported inference?
- What is the cost in time, tokens, navigation effort and reader attention?

### What LC-03 is not

- It is not another semantic-checker benchmark.
- It is not a claim that AI mediation always helps.
- It is not a claim that a structured representation is more truthful than the source.
- It is not a production routing system.

---

## 7. Experimental design

### Conditions

| Arm | What the recipient receives |
|---|---|
| **A** | Original source plus competent navigation/retrieval. |
| **B** | AI-mediated task-specific representation built from the source, with the same source and navigation available. |
| **C** | B plus optional advisory constraint inspection. Advisory only; it does not block, route or accept. |

### Controls

- Same original source bytes in every arm.
- Same navigation/retrieval capability in every arm.
- Same recipient model, settings and context limits.
- Same questions, revealed only after the representation is generated.
- Isolated sessions; no expected answers, references or other arms.
- Counterbalanced or randomised arm order; record order effects.
- Representation generation must not see the evaluation questions or references.
- Report ties and cases where the source is preferable.

### Source material

Candidate source types:

1. Multi-page technical incident report with conflicting hypotheses and distributed evidence.
2. Chapter excerpt explaining several related concepts and dependencies.
3. Complicated workflow with conditional steps and exceptions.
4. Research article with conclusions, limitations and competing interpretations.
5. Fictional scene with characters, motives, indirect communication and uncertainty.
6. Multi-document case with a prior postmortem or competing account.

The source must require recovery of information distributed across sections, not a single obvious permission question.

### Recipient tasks

Tasks should require reconstruction and application:

- Prepare a handoff note that distinguishes supported, contradicted and uncertain hypotheses.
- Explain a concept and apply it to a new example.
- Execute a conditional procedure and identify the exception.
- Justify a decision using evidence distributed across the source.
- Distinguish what a character says from what is implied.
- Reconcile two documents with different scopes or conclusions.
- Quote an exact condition where paraphrase would be unsafe.

Do not rely solely on YES/NO/UNKNOWN.

### Measures

| Measure | What is recorded |
|---|---|
| Task correctness | Required atoms, relations and applications present and correct. |
| Faithful evidence use | Exact quotations or traceable source spans for asserted atoms. |
| Conditions and qualifications | Conditions, exceptions and qualifiers preserved where required. |
| Unsupported additions | Claims, permissions or causal links not supported by the source. |
| Uncertainty handling | Genuine ambiguity preserved; invented doubt penalised. |
| Information selection | Relevant material included; irrelevant material does not crowd out the answer. |
| Cost | Time, tokens, representation size, navigation steps. |
| Source-preferable cases | Cases where A is at least as good as B/C, reported explicitly. |

### Scoring

- A source-grounded reference answer with required atoms, acceptable alternatives and evidence anchors.
- Correctness is not a single aggregate “Language score”.
- Report correctness, evidence, conditions, unsupported additions and uncertainty separately.
- Preserve ties and disagreement.
- Use a blinded independent reviewer before any confirmatory claim.
- An AI-only review is not independent human adjudication.

### Pre-registration and contamination control

Before execution:

1. Author or select sources independently of the implementation agent where possible.
2. Freeze source text, tasks, references, arm definitions, model identities, order and criteria.
3. Audit every source against R4, R5, R6, R7, LC-02 batch20 and Studio development cases.
4. Reject exact duplicates and any source with Jaccard ≥ 0.45 against a prior source.
5. Keep the evaluation sources separate from development fixtures.
6. Do not relabel development cases as held-out.

---

## 8. Development fixtures prepared in P0

P0 uses the existing exposed incident fixture in `core/browser/fixtures/incident.ts`:

- 1,378 characters.
- 12 claims, 3 relations, 1 qualifier.
- Supports conflicting hypotheses, distributed evidence, a disputed conclusion, an unknown condition, a recovery procedure and service impact.

Files:

- `experiments/lc-03-p0/fixtures/incident-source.txt`
- `experiments/lc-03-p0/fixtures/development-cases.json`
- `experiments/lc-03-p0/fixtures/evaluation-plan.json`
- `experiments/lc-03-p0/fixtures/DEV-FREEZE.json`

Four development cases:

| Case | Task | What it tests |
|---|---|---|
| `LC03-D01` | handoff / approve fix | Distributed evidence, disputed conclusion, unknown condition, procedure exception, service impact. |
| `LC03-D02` | exact lookup | Source-preferable quotation of the H3 condition and gap. |
| `LC03-D03` | follow procedure | Ordered recovery steps and the “migration still running” exception. |
| `LC03-D04` | decide to open | Whether the ledger owner is affected; false-skip risk. |

The development fixture is exposed. It is not held-out evidence.

### Evaluation design

`evaluation-plan.json` specifies 12 planned evaluation cases across incident, workflow, chapter, research article, fiction and multi-document sources. It is a design only. No evaluation sources are authored or frozen in P0.

---

## 9. Source overlap audit

The development incident source was checked against 195 sources from nine LC-02/Studio corpora:

- R4 development and evaluation;
- R5 development and evaluation;
- R6 development and evaluation;
- R7 development and evaluation;
- LC-02 batch20 case records;
- Studio development cases.

Method: source-token Jaccard plus exact match, threshold `0.45`.

Result:

- exact duplicates: none;
- nearest match: Jaccard `0.0888`;
- status: **CLEAN**.

Report: `experiments/lc-03-p0/overlap-report.json`.

**Important:** only the development source was audited. Every LC-03 evaluation source must receive the same audit before freezing. The R7 contamination lesson is now a gate, not a retrospective note.

---

## 10. Offline feasibility run

Run:

```powershell
node --experimental-transform-types experiments/lc-03-p0/feasibility.mjs
```

Outputs:

- `experiments/lc-03-p0/feasibility.json`
- `experiments/lc-03-p0/feasibility.md`

### What ran

**A — source navigation.** The original source plus a retrieval query for “replication lag was under one second”. The source remained byte-equal; the passage was located at offsets 848–884.

**B — task-specific representation.** `core/browser` produced:

- `approve_fix/diagram` — 520 characters, gate `SHOW`;
- `approve_fix/table` — 495 characters, gate `SHOW`;
- `follow_procedure/annotated_source` — 1,659 characters, gate `SHOW`.

The representation total is 2,674 characters against a 1,378-character source. Structure costs space. That is a measurable property, not a benefit.

**Negative control.** A deliberately lossy H3 table row lost its condition. The existing browser gate detected `row-condition-q1` and returned `FALL_BACK_TO_SOURCE`.

**C — advisory inspection.** The R6 checker inspected the lossy H3 row against the source condition. It produced:

- `CHANGED_CANDIDATE/NEGATION_REVERSAL`;
- `MISSING_CANDIDATE/MISSING_PREREQUISITE`;
- `UNSUPPORTED_ADDITION_CANDIDATE/UNSUPPORTED_CONTENT`;
- advisory policy `PRESERVE_SOURCE`.

The R6 output is advisory only. It does not route or accept.

**Scripted scoring illustration.** A constructed answer fixture scored:

| Arm | Correctness | Evidence | Conditions | Uncertainty | Unsupported |
|---|---:|---:|---:|---:|---:|
| A | 1.000 | 6/6 | 3/3 | 2/2 | 0 |
| B | 0.833 | 5/6 | 1/3 | 1/2 | 1 |
| C | 1.000 | 6/6 | 3/3 | 2/2 | 0 |

**These are scripted answers, not model observations.** They show that the scoring harness can represent the intended distinctions. They are not evidence of a benefit.

### What the feasibility run establishes

- The existing `core/browser` record, task choice, deterministic renderings, obligations and gate can produce source-linked representations for a substantial incident report.
- The browser gate can catch a deliberate condition loss.
- The R6 checker can add a visible advisory finding on a specific typed/conditional obligation.
- A structured scoring harness can separate correctness, evidence, conditions, uncertainty and unsupported additions.
- Representation size and source size can be recorded.

### What it does not establish

- Whether an AI-mediated representation helps a recipient.
- Whether B or C is better than A.
- Whether the incident-specific renderers generalize to chapters, workflows, research articles or fiction.
- Whether the reviewer or representation generator can produce these views from an arbitrary source without a hand-authored record.

---

## 11. Can existing Studio infrastructure support LC-03?

### Reusable now

- `core/browser`: document record, task→representation choice, deterministic renderings, obligations, per-view gate, margin.
- `core/record`: source-linked claims, relations, qualifiers, traceability.
- `core/preservation`: obligations, three-valued assessment, probes.
- `core/sidecar` and `core/relations`: annotated margin and candidate relations.
- Studio `Log`, source anchors, runtime gates, request accounting, comparison journal and semantic rubric.
- R6 typed-constraint checker as an advisory component.

### Missing

1. **Three-arm comparison.** Studio’s current comparison is two-arm (ordinary vs Language) and its recipient answer schema is YES/NO/UNKNOWN/SOURCE_CONFLICT.
2. **Structured task answers and scorer.** LC-03 needs multi-part answers with claims, evidence, conditions and uncertainty, plus a source-grounded scorer.
3. **Representation generation for arbitrary substantial sources.** `core/browser` renderers are incident-shaped and the record is hand-authored. There is no general extraction pipeline.
4. **Per-source-type renderers.** Chapter, workflow, research-article and fictional-scene representations need different views.
5. **Multi-page navigation/retrieval.** `renderHighlight` finds a passage; there is no multi-page navigation or section-level retrieval harness.
6. **Independent source and reference authoring.** The current cases are implementation-agent authored.
7. **Model execution controls for LC-03.** P0 makes no hosted calls; a future model-assisted study needs separate authorization, model identity, budget and capture.

### Recommendation

Existing infrastructure can support a **bounded single-source incident feasibility study** with moderate orchestration. It cannot support the full multi-source LC-03 experiment without substantial new development.

Recommended sequence:

1. **LC-03-P1 — Harness only.** Extend the P0 feasibility into a three-arm harness with a structured task-answer schema and scorer. Use the incident fixture and deterministic representations. No benefit claim.
2. **LC-03-P2 — Representation generation pilot.** Add one source type and one local-model representation generator, with exact-span validation and the advisory checker. Execute only if local model use is separately authorized. Keep A/B/C identical in source access and questions.
3. **LC-03-P3 — Independent evaluation.** Author new sources and references independently, audit overlap, freeze, and run a blinded evaluation. Only then consider a communication-utility claim.

Do not skip to P3. The missing harness and scoring layer are not cosmetic.

---

## 12. What this means for the book

LC-02 supports five bounded findings:

1. **Structure does not guarantee understanding.** A more structured or more heavily interpreted message can still lose or distort meaning.
2. **AI mediation can introduce uncertainty that the source did not require.** Invented doubt is a real failure mode.
3. **Some meaning constraints are deterministically checkable.** Quantities, operators, units, thresholds and durations are tractable; contextual relationships remain difficult.
4. **A more complicated checking architecture can perform worse than a simpler one.** R7’s hybrid added machinery without a clean advantage.
5. **Evaluation contamination can create misleading evidence of progress.** The R7 overlap audit is a methodological lesson, not a footnote.

These fit the research narrative for *The Understanding Compiler*, *What Survived the Transformation?* and the Semantic Browser capstone.

The larger question remains open:

> Can an intelligent communication medium demonstrably improve a recipient’s ability to reconstruct and use meaning?

LC-03 is the first experiment aimed at that question rather than at another checker score.

---

## 13. Recommendation

**Close LC-02 semantic-checker development with `PREFER_DETERMINISTIC`.**

- Keep the R6 typed-constraint checker as an advisory instrument for specific, mechanically checkable obligations.
- Keep exact provenance, spans and abstention.
- Archive the R7 hybrid and its evidence; do not make it the default.
- Do not deploy automatic Preserve/Enhance/Clarify routing.
- Do not claim the retrospective R7 clean subset is a confirmatory evaluation.
- Proceed to LC-03 only as a bounded design and feasibility programme.
- Build the three-arm harness and task scorer before adding more model capability.
- Author evaluation sources independently and audit overlap before freezing.
- No hosted model calls, manuscript changes, commits or pushes in P0.

The next milestone should be **LC-03-P1 — Harness and scoring**, not a larger checker and not a complete application.

---

## 14. Verification and limitations

### Checks

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| Root `npm run verify` | 1,114 passed, 3 skipped, 0 failed |
| Studio `npm test` | 100 passed, 0 failed |
| Python `unittest` | 25 passed |
| LC-03 feasibility script | Passed; record valid, gate loss detected, R6 advisory produced |
| LC-03 overlap audit | Clean against 195 prior sources; nearest 0.0888 |
| Hosted model calls | 0 |

### Limitations

1. **Dev fixture is exposed.** `core/browser/fixtures/incident.ts` is existing development material, not held-out evidence.
2. **Feasibility answers are scripted.** The score table illustrates the harness, not a recipient model.
3. **Representations are deterministic.** B is not yet AI-mediated.
4. **One source.** The incident report does not establish generalization to chapters, workflows, research or fiction.
5. **Evaluation sources are not authored.** The 12-case plan is a design, not a frozen corpus.
6. **No independent adjudication.** References and tasks remain implementation-authored.
7. **No communication-utility result.** P0 establishes feasibility, not benefit.
8. **Local model behavior is not evidence here.** No model was called in P0.

---

## 15. Artifacts

- `experiments/lc-03-p0/fixtures/incident-source.txt`
- `experiments/lc-03-p0/fixtures/development-cases.json`
- `experiments/lc-03-p0/fixtures/evaluation-plan.json`
- `experiments/lc-03-p0/fixtures/DEV-FREEZE.json`
- `experiments/lc-03-p0/overlap-report.json`
- `experiments/lc-03-p0/overlap-audit.mjs`
- `experiments/lc-03-p0/feasibility.json`
- `experiments/lc-03-p0/feasibility.md`
- `experiments/lc-03-p0/feasibility.mjs`
- `experiments/lc-03-p0/build-fixtures.mjs`
- `experiments/lc-03-p0/SUMMARY.json`
- `experiments/lc-03-p0/EVIDENCE-INTEGRITY.json`
- `LC-02-R6-REVIEW.md`
- `LC-02-R7-HYBRID-REVIEW.md`
- `experiments/lc-02-r6/`
- `experiments/lc-02-r7/`

No hosted model calls. No Studio communication integration. No manuscript changes. No commit or push. The original-source baseline remains the default.
