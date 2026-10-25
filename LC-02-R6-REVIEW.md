# LC-02-R6 — Typed Meaning Constraints and Epistemic Separation

**Status:** Offline experimental qualification. Not production integration.
**Date:** 2026-10-24
**Repository:** `C:\Projects\project-language`
**Checker version:** `lc02-r6-semantic-check/0.1`
**Decision:** **REVISE_ARCHITECTURE**

---

## 0. Decision

R6 passes every pre-registered hard gate on the frozen held-out sample. It detects 10 of 12 corruptions, accepts all 8 faithful transformations, routes all 4 genuine ambiguities to clarification, and produces no material false acceptance.

That is a real improvement over R5 on the same cases. It is not enough to justify `CONTINUE`.

The improvement is concentrated in one component: typed numeric and temporal constraints. The two held-out misses, the unchanged historical prior-failure results, and the remaining dependence on lexical cue patterns show that the primary semantic comparison mechanism is still not reliable enough to be the main gate.

The recommendation is therefore:

> **Keep the typed constraint layer. Revise the architecture around it.**
>
> Local rules remain useful, especially for quantities, operators, units and policy routing. They are not sufficient as the main mechanism for alignment, exception scope, status labels and distinction precedence.

A separately evaluated hybrid constraint/model-assisted checker is the appropriate next experiment. It was not implemented during R6.

### Held-out result at a glance

| Metric | R5 | R6 |
|---|---:|---:|
| Corruption detection | 6/12 (50.0%) | **10/12 (83.3%)** |
| Material false acceptances | 3 (`E01`, `E02`, `E03`) | **0** |
| Faithful accepted | 7/8 | **8/8** |
| False rejections | 1 (`E20`) | **0** |
| Ambiguity clarified | 4/4 | **4/4** |
| Policy correct | 19/24 (79.2%) | **23/24 (95.8%)** |
| Justified uncertainty clean | 4/4 | **4/4** |
| Invented uncertainty clean | 1/1 | **1/1** |
| Dual primary uncertainty verdicts | 0 | **0** |
| Source-grounded expected findings | 17/24 | **22/24** |
| `NOT_ASSESSED` cases | 0 | **0** |

The paired comparison is meaningful because both checkers ran on exactly the same frozen 24 held-out cases. The references remain author-constructed and provisional. They are not independent human adjudication.

---

## 1. What R6 tested

The research question was bounded:

> Can an explicit, source-linked constraint representation plus separated source-standing and transformation-assessment judgments improve distortion detection without creating unacceptable false rejections?

R6 was deliberately not asked to prove semantic equivalence, truth, or production safety. The checker remains a test-only instrument:

- no hosted model calls;
- no Studio communication integration;
- no manuscript changes;
- no commit or push;
- no action authority;
- human acceptance required for any transmission.

The answer is qualified:

- **Yes** for typed quantities, boundaries, durations and retention limits.
- **Yes** for clean separation on the new adversarial uncertainty controls.
- **No** for exception scope, status-label interpretation, distinction precedence, and the historical prior-failure cases.

---

## 2. Reproduction of the known R5 failures

All cases in this section are historical development material. They are **not** held-out evidence.

The R6 checker and the R5 checker were run on the same inputs. The comparison isolates what the new implementation changed.

| Case | R5 result | R6 result | What changed |
|---|---|---|---|
| `R5-E11` forty→fifty | `USE_TRANSFORMATION` | `PRESERVE_SOURCE`, `CHANGED_CANDIDATE/SCOPE_OR_QUANTITY_CHANGE` | **Fixed.** Written numbers are normalised into typed constraints. |
| `R5-E16` pronoun-initial source | `PRESERVE_SOURCE`, false `WRONG_CROSS_SENTENCE_REFERENCE` | `USE_TRANSFORMATION`, two `PRESERVED_CANDIDATE` findings | **Fixed.** A sentence-initial pronoun alone no longer creates referential ambiguity. |
| `R5-E10` causal grounding | `UNSUPPORTED_CAUSAL` anchored to “The checksum failed during transfer.” | `UNSUPPORTED_CAUSAL` anchored to “The investigation says the cause has not been verified.” | **Partially fixed.** The evidence link now points to the source’s causal-uncertainty statement. A redundant `NEGATION_REVERSAL` remains. |
| `R5-E18` faithful omission | false `UNSUPPORTED_CAUSAL` and `MISSING_PREREQUISITE` | two `MISSING_PREREQUISITE` findings; still `PRESERVE_SOURCE` | **Partially fixed.** The causal false positive is gone; the omission is still rejected. |
| `R5-E04` broadened exception | `UNSUPPORTED_UNCERTAINTY`, not `BROADENED_EXCEPTION` | `UNSUPPORTED_UNCERTAINTY`, not `BROADENED_EXCEPTION` | **Not fixed.** “unresolved” is still treated as epistemic uncertainty. |
| `R5-E07` unknown→established | `NEGATION_REVERSAL` | `NEGATION_REVERSAL` | **Not fixed.** “has not been decided” is still not recognised as the more specific uncertainty distinction. |

### Prior LC20 cases

The R6 changes did not alter the eight historical LC20 prior-failure outputs:

| Case | Arm | Expected candidate | R5 matched | R6 matched | R5 `UNRESOLVED` / `UNSUPPORTED_UNCERTAINTY` | R6 `UNRESOLVED` / `UNSUPPORTED_UNCERTAINTY` | Policy |
|---|---|---|---:|---:|---:|---:|---|
| LC20-07 | B | `UNSUPPORTED_UNCERTAINTY` | yes | yes | 4 / 5 | 4 / 5 | `PRESERVE_SOURCE` |
| LC20-07 | C | `UNSUPPORTED_UNCERTAINTY` | yes | yes | 2 / 5 | 2 / 5 | `PRESERVE_SOURCE` |
| LC20-10 | B | `UNSUPPORTED_UNCERTAINTY` | yes | yes | 3 / 6 | 3 / 6 | `PRESERVE_SOURCE` |
| LC20-10 | C | `UNSUPPORTED_UNCERTAINTY` | yes | yes | 3 / 9 | 3 / 9 | `PRESERVE_SOURCE` |
| LC20-02 | B | `UNRESOLVED` | yes | yes | 6 / 9 | 6 / 9 | `PRESERVE_SOURCE` |
| LC20-02 | C | `UNRESOLVED` | yes | yes | 2 / 5 | 2 / 5 | `PRESERVE_SOURCE` |
| LC20-19 | B | `UNRESOLVED` | yes | yes | 5 / 7 | 5 / 7 | `PRESERVE_SOURCE` |
| LC20-19 | C | `UNRESOLVED` | yes | yes | 10 / 6 | 10 / 6 | `PRESERVE_SOURCE` |

This is the most important negative result in R6.

The new `epistemic_judgments` field is emitted, and the new held-out controls separate cleanly. But on the long historical proposals, the **primary findings** still contain both `UNRESOLVED` and `UNSUPPORTED_UNCERTAINTY`, for both harmful and justified cases. The policy still preserves every source. The separation exists in the schema and in the new controls; it does not yet control the older pathway.

**Historical reproduction standing:** `experiments/lc-02-r6/.runs/REPRO-R5-001/`. Development material, not held-out evidence.

---

## 3. Implementation changes

### 3.1 Typed constraints

R6 adds a small, versioned, source-linked constraint representation. It is deliberately domain-bounded, not a universal ontology.

Each constraint retains:

- `kind`: `COUNT`, `DURATION`, `QUANTITY`, `TIME`, `OTHER`;
- `operator`: `<=`, `<`, `>=`, `>`, `=`, `BEFORE`, `AFTER`, `UNKNOWN`;
- numeric `value` and `unit`;
- the regulated `action` (the lexical context before the constraint);
- exact source and transformation spans;
- `standing`: `SOURCE_STATED` or `TRANSFORMATION_STATED`;
- `method`: `LEXICAL_CONSTRAINT_HEURISTIC`;
- a comparison result: `PRESERVED_CANDIDATE`, `CHANGED_CANDIDATE`, `MISSING_CANDIDATE`, `UNSUPPORTED_ADDITION_CANDIDATE`, `UNRESOLVED`, or `NOT_ASSESSED`.

Supported forms include:

| Wording | Normalised candidate |
|---|---|
| no more than forty records | `count <= 40 records` |
| fewer than forty records | `count < 40 records` |
| at least five continuous minutes | `duration >= 5 minutes` |
| more than five minutes | `duration > 5 minutes` |
| exactly five minutes | `duration = 5 minutes` |
| after five minutes / within five minutes | `duration >= 5` / `duration <= 5` |
| may keep for fourteen days | `duration <= 14 days` |
| two hundred entries | `count <= 200 entries` |
| requests after 17:00 | `TIME AFTER 17.00` |

Written numbers, hyphenated numbers, decimals, and simple compound written numbers (`two hundred`) are normalised. Values are not treated as equivalent merely because the digit string matches: operator, value, unit, kind and action context all participate in the comparison.

The constraint layer is the strongest part of R6. It is deterministic, inspectable, and exactly source-linked. It is also the reason the three R5 numeric false acceptances (`E01`, `E02`, `E03`) disappear.

### 3.2 Epistemic separation

The output separates two dimensions:

**Source standing**

- `ESTABLISHED_IN_SOURCE`
- `DENIED_IN_SOURCE`
- `UNRESOLVED_IN_SOURCE`
- `CONFLICTING_IN_SOURCE`
- `NOT_ADDRESSED`
- `NOT_ASSESSED`

**Transformation assessment**

- `PRESERVATION_CANDIDATE`
- `SUPPORTED_CHANGE_CANDIDATE`
- `UNSUPPORTED_CHANGE_CANDIDATE`
- `UNRESOLVED_COMPARISON`
- `NOT_ASSESSED`

Each `epistemic_judgment` also has one `primary_verdict`:

- `PRESERVED_CANDIDATE`
- `MISSING_CANDIDATE`
- `CHANGED_CANDIDATE`
- `UNSUPPORTED_ADDITION_CANDIDATE`
- `UNRESOLVED`
- `NOT_ASSESSED`

The design rule is explicit: the checker may preserve multiple evidence signals, but it must not emit `UNRESOLVED` and `UNSUPPORTED_UNCERTAINTY` as simultaneous primary verdicts for the same claim.

On the new held-out controls this worked:

- `E21`–`E24`: `UNRESOLVED` only, `REQUEST_CLARIFICATION`.
- `E12`: `UNSUPPORTED_UNCERTAINTY` only, `PRESERVE_SOURCE`.
- No held-out case had both primary uncertainty types.

On the historical LC20 proposals it did not. The older multi-sentence pipeline still emits both types. That is the key architectural gap: the new field exists, but it has not replaced the old pathway.

### 3.3 Alignment, pronouns, omissions and causal handling

R6 makes four targeted changes:

1. **Explicit ambiguity instead of pronoun suspicion.** A sentence-initial pronoun is not treated as ambiguous merely because the compiler marks a possible unresolved reference. The checker requires an explicit ambiguity cue (`whether`, `unclear`, `unknown`, `does not say`, competing referents) before recording referential ambiguity. This fixes `R5-E16` and `E20`.

2. **Cause evidence, not merely the effect.** When a transformation asserts a causal relation, the finding is anchored to the source statement about the cause or causal uncertainty, not automatically to the effect sentence. This fixes the grounding half of `R5-E10` and produces the expected anchor for held-out `E11`.

3. **Prerequisite refinement.** Exceptions introduced by “except when” / “unless” are no longer automatically treated as prerequisites. This avoids one class of spurious missing-prerequisite findings. It did not fix the `R5-E18` omission, where the threshold condition is genuinely not restated.

4. **Preserved findings are suppressed when a material finding covers the same source span.** A transformation cannot simultaneously receive a clean `PRESERVED_CANDIDATE` and a material change for the same source claim. This removes the misleading dual output seen in early R6 development.

### 3.4 Conservative policy

Findings remain separate from routing. The test-only policy is:

- `PRESERVE_SOURCE` when a material change or loss is detected.
- `REQUEST_CLARIFICATION` when the evidence is unresolved or not assessed.
- `USE_TRANSFORMATION` only when there is at least one positive `PRESERVED_CANDIDATE` finding and no material, unresolved or `NOT_ASSESSED` finding.

The policy never treats “no detected corruption” as proof of faithfulness. If no findings exist, the checker emits `NOT_ASSESSED`, and the policy cannot return `USE_TRANSFORMATION`.

A residual limitation must be stated plainly:

> `USE_TRANSFORMATION` means “no material or unresolved finding among the assessed obligations”. It does not mean “the transformation is equivalent to the source”.

The checker assesses the declared obligations and the transformation units it can align. It does not prove that every source meaning was assessed. The held-out gate checks positive preservation evidence, but the design is not a semantic validator.

---

## 4. Frozen protocol

### 4.1 Corpus

36 new pairs:

- 12 development cases;
- 24 held-out cases.

Held-out composition:

| Type | Count | IDs |
|---|---:|---|
| Corruption | 12 | `E01`–`E12` |
| Faithful | 8 | `E13`–`E20` |
| Ambiguity | 4 | `E21`–`E24` |

Corruption categories:

| Category | Case |
|---|---|
| Written-number change | `E01` |
| Inclusive/exclusive boundary | `E02` |
| Duration threshold | `E03` |
| Multiple constraints | `E04` |
| Broadened exception | `E05` |
| Missing prerequisite | `E06` |
| Invented authority | `E07` |
| Unknown→established fact | `E08` |
| Misattributed speaker | `E09` |
| Wrong cross-sentence reference | `E10` |
| Unsupported causal promotion | `E11` |
| Invented uncertainty | `E12` |

### 4.2 Pre-execution corpus revision

The first R6 corpus freeze did not contain an invented-uncertainty case in the held-out split. Because the assignment explicitly requires that category, `E12` was replaced **before any held-out execution**:

- original `E12`: plain negation reversal;
- final `E12`: invented uncertainty;
- negation reversal remains represented inside `E04` (`requires separate approval` → `requires no approval`).

The corpus and references were regenerated and re-frozen before the held-out run. No held-out output existed at the time of the revision.

Superseded freeze values:

- `evaluation-cases.json`: `c60a2536…` → `35fa89f8…`
- `evaluation-references.json`: `9bcd1f19…` → `ce52c8c4…`

This is disclosed as a pre-execution protocol amendment, not hidden.

### 4.3 Freeze

Final held-out freeze:

| Artifact | SHA-256 |
|---|---|
| `evaluation-cases.json` | `35fa89f812b59989b55c6ebf8bb5089f019731f24f85cb4d72d3c3505c52b540` |
| `evaluation-references.json` | `ce52c8c41a1cfade926e58e90a035d50daa2294122ea8f12c18da45c3dce9f14` |
| `SUCCESS-CRITERIA.json` | `c8692715c89aab8b265752b4dbbcc4cdbd36f5ba37e26522931c89e318210ceb` |
| `CRITERIA-FREEZE.json` | `eeb3dba5ebada7ff12e35dc876fda8d7d614c26c860a6bb7c7e4e9db035db005` |
| `semantic-checker-v6.mjs` | `ed17ecb14a66ebb42b6f1b03427c4bd4b021d4829e66aee9edc2f3a9f5801692` |
| `semantic-checker-v6-contract.mjs` | `c56c812c7b32ab8bca2a2e06a1bf2ae03da43fbb435b8772b9ea14c1d30c3064` |
| `run-compare.mjs` | `ca8305f815317019653792368fc07f5b53d18d02cc4b11c5c909e671dbddb8b4` |

The held-out comparison was executed once:

`experiments/lc-02-r6/.runs/EVAL-001/`

No checker, corpus, reference or criterion was changed after execution began. The gate analysis was written afterwards as a read-only analysis of the frozen results.

### 4.4 Gates

| Gate | Criterion | Observed | Result |
|---|---|---|---|
| HG1 | Zero material false acceptances | 0 | **PASS** |
| HG2 | ≥10/12 corruption detection with evidence | 10/12 | **PASS** |
| HG3 | R6 false rejections ≤ R5 on same cases | 0 ≤ 1 | **PASS** |
| HG4 | Clean justified/invented uncertainty separation, no dual primaries | 4/4, 1/1, 0 dual | **PASS** |
| HG5 | Every `USE_TRANSFORMATION` has positive preservation evidence and no material/unresolved/not-assessed finding | 8/8 USE cases valid | **PASS** |

HG2 is met exactly at the threshold. The gates were experimental qualification criteria, not proof of production safety.

---

## 5. Paired held-out results

### 5.1 Per-case comparison

`S` = source quote matched; `T` = transformation quote matched; `—` = no expected transformation quote or no match.

| Case | Type | Expected | R5 policy | R6 policy | R5 detected | R6 detected | R6 evidence | R6 outcome |
|---|---|---|---|---|---|---|---|---|
| `E01` | Corruption | PRESERVE | **USE** | PRESERVE | No | Yes | S/T | Constraint change |
| `E02` | Corruption | PRESERVE | **USE** | PRESERVE | No | Yes | S/T | Constraint change |
| `E03` | Corruption | PRESERVE | **USE** | PRESERVE | No | Yes | S/T | Constraint change |
| `E04` | Corruption | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | S/T | Negation reversal |
| `E05` | Corruption | PRESERVE | CLARIFY | CLARIFY | No | **No** | — | `UNRESOLVED`, not exception change |
| `E06` | Corruption | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | S/— | Missing prerequisite |
| `E07` | Corruption | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | S/T | Invented authority |
| `E08` | Corruption | PRESERVE | PRESERVE | PRESERVE | No | **No** | — | Negation reversal, not unknown→fact |
| `E09` | Corruption | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | S/T | Misattributed speaker |
| `E10` | Corruption | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | S/T | Wrong cross-sentence reference |
| `E11` | Corruption | PRESERVE | PRESERVE | PRESERVE | No | Yes | S/T | Unsupported causal |
| `E12` | Corruption | PRESERVE | PRESERVE | PRESERVE | Yes | Yes | S/T | Invented uncertainty |
| `E13` | Faithful | USE | USE | USE | No | Yes | S/T | Preserved |
| `E14` | Faithful | USE | USE | USE | Yes | Yes | S/T | Preserved |
| `E15` | Faithful | USE | USE | USE | Yes | Yes | S/T | Preserved, constraint preserved |
| `E16` | Faithful | USE | USE | USE | Yes | Yes | S/T | Preserved |
| `E17` | Faithful | USE | USE | USE | Yes | Yes | S/T | Preserved |
| `E18` | Faithful | USE | USE | USE | Yes | Yes | S/T | Preserved |
| `E19` | Faithful | USE | USE | USE | Yes | Yes | S/T | Preserved |
| `E20` | Faithful | USE | **PRESERVE** | USE | No | Yes | S/T | Preserved |
| `E21` | Ambiguity | CLARIFY | CLARIFY | CLARIFY | Yes | Yes | S/T | `UNRESOLVED` |
| `E22` | Ambiguity | CLARIFY | CLARIFY | CLARIFY | Yes | Yes | S/T | `UNRESOLVED` |
| `E23` | Ambiguity | CLARIFY | CLARIFY | CLARIFY | Yes | Yes | S/T | `UNRESOLVED` |
| `E24` | Ambiguity | CLARIFY | CLARIFY | CLARIFY | Yes | Yes | S/T | `UNRESOLVED` |

R5’s three false acceptances were all numeric constraints. R6 fixed all three. R5’s one false rejection was the pronoun-initial `E20`. R6 fixed it.

R6’s two misses are not numeric. They are the two semantic cases that require scope and status interpretation.

### 5.2 Detection, acceptance and routing

| Metric | R5 | R6 |
|---|---:|---:|
| Corruption cases | 12 | 12 |
| Detected | 6 | 10 |
| Missed | 6 | 2 |
| Material false acceptances | 3 | 0 |
| Faithful accepted | 7 | 8 |
| False rejections | 1 | 0 |
| Ambiguity clarified | 4 | 4 |
| Unnecessary clarifications | 1 (`E05`) | 1 (`E05`) |
| Policy correct | 19 | 23 |
| `NOT_ASSESSED` | 0 | 0 |
| Source-grounded cases | 17 | 22 |
| Transformation-grounded cases | 17 | 22 |
| Average latency | 1,013 ms | 1,041 ms |

The policy failure on `E05` is a **routing** error, not a false acceptance. The checker did not understand the exception change; it routed to clarification. That is conservative, but it is not detection.

The detection metric is stricter than policy safety. `E08` receives the correct safety routing (`PRESERVE_SOURCE`) but the wrong distinction (`NEGATION_REVERSAL`). It therefore counts as a detection miss. Both facts are reported.

R5's 6/12 on this corpus is **not** a regression from its original 8/12 evaluation. The corpora differ. Only the paired R5-versus-R6 comparison on the same 24 cases is controlled. The same caution applies to any comparison between R6's 10/12 and R5's earlier result.

---

## 6. Failure analysis

### 6.1 `E05` — broadened exception became clarification

**Source:** “The key may be used during an incident, except when the incident ticket is closed.”
**Transformation:** “The key may be used during an incident, except when the incident is unresolved.”
**Expected:** `CHANGED_CANDIDATE/BROADENED_EXCEPTION`, `PRESERVE_SOURCE`.
**Actual:** `UNRESOLVED/SOURCE_AMBIGUITY`, `REQUEST_CLARIFICATION`.

Exact chain:

1. The compiler supplies the exception phrase as a prerequisite-like condition: “the incident ticket is closed”.
2. `assessUncertainty` sees a transformation uncertain cue: the adjective **“unresolved”**.
3. It finds no separately established support for the condition, so it records the condition as unresolved.
4. The unit is classified as `SUPPORTED_UNCERTAINTY`, producing `UNRESOLVED/SOURCE_AMBIGUITY`.
5. The exception-scope comparison in `materialIssues` never controls the result, because the uncertainty assessment has already framed the unit as an ambiguity to preserve.

This is exactly the distinction the assignment required:

> An incident labelled “unresolved” is not the same as an epistemically unresolved proposition.

R6 still conflates them in this case. The policy is conservative, but the semantic distinction is lost. This is not a quantity failure and cannot be repaired by another numeric pattern.

### 6.2 `E08` — unknown-to-established fact became negation reversal

**Source:** “The vendor approval has not been decided.”
**Transformation:** “The vendor is approved.”
**Expected:** `CHANGED_CANDIDATE/UNKNOWN_TO_ESTABLISHED_FACT`.
**Actual:** `CHANGED_CANDIDATE/NEGATION_REVERSAL`.

Exact chain:

1. `features()` recognises negation (`not`) and sets `negated=true`.
2. `materialIssues` checks negation polarity first and emits `NEGATION_REVERSAL`.
3. The more specific uncertainty branch is gated by `s.features.uncertainty`.
4. The uncertainty regex covers `not decided` and `not yet decided`, but not the inflected form **“has not been decided”**.
5. The specific `UNKNOWN_TO_ESTABLISHED_FACT` branch never fires.

The policy is safe. The distinction is not. This is a lexical coverage gap plus a distinction-precedence problem: even if both branches fired, the checker needs a rule for which primary distinction controls.

### 6.3 Historical residuals

The same two weaknesses explain most of the historical residuals:

- `R5-E04`: “unresolved” treated as uncertainty, exception change missed.
- `R5-E07`: “has not been decided” treated as negation, not unknown-to-fact.
- `R5-E18`: the causal false positive is gone, but the omitted threshold is still treated as a missing prerequisite. The checker has no task-appropriate omission model for an implicit condition supported by the dashboard reading.
- LC20-07/10/02/19: the old multi-sentence pathway still emits both `UNRESOLVED` and `UNSUPPORTED_UNCERTAINTY`; the new primary-verdict separation does not govern it.

These are not independent failures. They are the same architectural issue seen through different surfaces: **the checker can represent the right categories, but it cannot reliably decide which category controls a claim.**

---

## 7. Complexity and architecture assessment

### 7.1 Measured complexity

| Artifact | R5 | R6 |
|---|---:|---:|
| Checker lines | 265 | 363 |
| Checker bytes | 25,455 | 37,505 |
| Contract lines | 79 | 118 |
| Contract bytes | 5,652 | 8,010 |

R6 adds:

- a constraint schema and comparison layer;
- written-number normalisation;
- comparison, suffix, relative-time and retention patterns;
- an epistemic-judgment projection;
- cause-evidence selection;
- explicit-ambiguity gating;
- prerequisite refinement;
- material-overlap suppression for preserved findings;
- a conservative policy reason record.

The rules are general, not case-ID switches. The development process nevertheless required nine development iterations and an 18-case probe suite before the held-out run. The final development result was 12/12 policy accuracy and 12/12 evidence grounding; the probe suite passed 18/18. That is tuned development performance, not held-out evidence.

The held-out misses were not repaired after the run. They are reported as found.

### 7.2 What the evidence supports

**Supported:**

- Typed constraints are the right representation for quantities, operators, units, boundaries and durations in this domain.
- Written-number normalisation closes a real and material class of false acceptance.
- Explicit ambiguity cues are better than pronoun suspicion.
- Cause evidence can be anchored to the source’s causal-uncertainty statement.
- A conservative policy can avoid accepting corruption even when detection is imperfect.
- The new uncertainty controls separate justified from invented uncertainty cleanly.

**Not supported:**

- That the current lexical alignment and feature pipeline is a reliable main semantic comparison mechanism.
- That the new epistemic fields control the older multi-sentence pathway.
- That exception scope, status labels and distinction precedence are solved.
- That a passing held-out sample is proof of production safety.

### 7.3 Why `REVISE_ARCHITECTURE`

`CONTINUE` would require a meaningful, credible improvement plus evidence that the method is becoming reliably more discriminating without accumulating case-specific lexical repairs. R6 has the first; it does not have the second.

The two held-out misses are precisely the kind of semantic decision a lexical rule set handles badly:

- is “unresolved” a status label or an epistemic hedge?
- is “has not been decided” a negation, an unknown, or both?
- does an omitted condition survive through an implicit task relation?
- which distinction controls when two findings are compatible?

Adding another regex for each would produce local wins and a growing rule surface. That is the pattern R5 already exhibited. The R6 result does not justify repeating it indefinitely.

`STOP_THIS_APPROACH` would overstate the negative result. R6 produced a real, measurable improvement, zero false acceptances, and a reusable deterministic constraint layer. The approach is not exhausted; its **architecture** is the problem.

### 7.4 Recommended next experiment

A separately evaluated hybrid checker:

**Deterministic component**

- typed constraint extraction and comparison;
- exact source spans;
- operator/value/unit/action identity;
- policy-independent findings;
- no model call in this layer.

**Model-assisted semantic reviewer**

- proposes alignment, exception scope, status-label interpretation and distinction precedence;
- must return exact source spans and explicit abstention;
- is evaluated independently from the deterministic layer;
- cannot certify equivalence by absence of findings;
- cannot accept a transformation or authorize communication.

**Combination rule**

- deterministic constraint change is authoritative and cannot be overridden by the model;
- the model may add a material finding or an unresolved judgment, but may not remove one;
- disagreement routes to clarification or human review, not to `USE_TRANSFORMATION`;
- the policy remains outside live communication.

**Evaluation**

- fresh, independently adjudicated cases;
- the same hard gates plus adversarial tests for model agreement, hallucinated spans, sycophancy and invented uncertainty;
- a pre-registered comparison against R6 on identical cases;
- no integration until the hybrid architecture passes independent review.

This experiment was **not** implemented in R6.

---

## 8. Decision record

**Decision:** `REVISE_ARCHITECTURE`

**Keep:**

- the typed constraint representation and source-linked comparison;
- written-number and unit normalisation;
- the separated source-standing / transformation-assessment fields;
- explicit ambiguity gating;
- cause-evidence anchoring;
- the conservative policy and its reason record;
- the frozen evaluation discipline.

**Revise:**

- the primary alignment mechanism;
- exception and scope comparison;
- status-label versus epistemic-uncertainty interpretation;
- distinction precedence;
- omission handling for task-supported implicit conditions;
- the older multi-sentence uncertainty pathway that still emits dual primary signals.

**Do not:**

- adopt R6 as a production gate;
- integrate it into Studio communication;
- treat the held-out pass as proof of semantic validation;
- implement the hybrid checker during R6;
- run hosted models, modify the manuscript, commit or push.

---

## 9. Verification and integrity

### Checks run

| Check | Result |
|---|---|
| `npm run typecheck` (repository root) | Passed |
| `npm run verify` (root) | 1,114 passed, 3 skipped, 0 failed |
| `npm test` (`apps/language-demo`) | 93 passed, 0 failed |
| Python `unittest` (`core/understanding/python/tests`) | 25 passed |
| Batch20 frozen artifacts | 231/231 raw-byte SHA-256 verified |
| R6 frozen corpus and checker | All hashes matched at execution and analysis |
| Historical R1–R5 artifacts | Not modified by R6 |

The repository already contained unrelated uncommitted changes before R6. R6 added only:

- `LC-02-R6-REVIEW.md`
- `apps/language-demo/evaluation/semantic-checker-v6.mjs`
- `apps/language-demo/evaluation/semantic-checker-v6-contract.mjs`
- `experiments/lc-02-r6/`

No manuscript file was edited. No commit or push was made.

### Evidence map

| Artifact | SHA-256 |
|---|---|
| `semantic-checker-v6.mjs` | `ed17ecb14a66ebb42b6f1b03427c4bd4b021d4829e66aee9edc2f3a9f5801692` |
| `semantic-checker-v6-contract.mjs` | `c56c812c7b32ab8bca2a2e06a1bf2ae03da43fbb435b8772b9ea14c1d30c3064` |
| `run-compare.mjs` | `ca8305f815317019653792368fc07f5b53d18d02cc4b11c5c909e671dbddb8b4` |
| `SUCCESS-CRITERIA.json` | `c8692715c89aab8b265752b4dbbcc4cdbd36f5ba37e26522931c89e318210ceb` |
| `CRITERIA-FREEZE.json` | `eeb3dba5ebada7ff12e35dc876fda8d7d614c26c860a6bb7c7e4e9db035db005` |
| `EVAL-001/results.json` | `b88cf278fd4968aeea2381b621e744e96b2f3f1b9cd65096d7e811c7584d2bdd` |
| `EVAL-001/results.md` | `6cc3859f832eeecec1794d94573a11e0193eb1849959dfb7eb7b730d6fc2a9c2` |
| `EVAL-001/analysis.json` | `a1aeab96e3eb07739449b85e2489a16ac75c702c926c0223440239048e651f3d` |
| `DEV-009/results.json` | `56916d4c091360637df5a04d4906277c3ed9b1b249b00abd3dec7bffce7ec8e8` |
| `PROBES-001/results.json` | `25b2a91e011216a351e4c45495f702a5bb6b3a5c30597770db79aa686e4ac249` |
| `REPRO-R5-001/reproduction.json` | `5a6855f082d801c5b0d8d7094be65043968b45f6b5ca78cfc07099ea88f312ba` |

### Evidence paths

- Development comparison: `experiments/lc-02-r6/.runs/DEV-009/`
- Development probes: `experiments/lc-02-r6/.runs/PROBES-001/`
- Held-out comparison: `experiments/lc-02-r6/.runs/EVAL-001/`
- Gate analysis: `experiments/lc-02-r6/.runs/EVAL-001/analysis.json`
- R5 failure reproduction: `experiments/lc-02-r6/.runs/REPRO-R5-001/`

---

## 10. Limitations

1. **The references are author-constructed.** They are provisional and not independent human adjudication. The implementation agent authored the cases, references and criteria. A shared blind spot between case author and checker cannot be excluded.

2. **The sample is small.** Twelve corruptions and eight faithful controls cannot establish production safety, even with zero false acceptances.

3. **The held-out corpus was revised pre-execution.** The invented-uncertainty replacement is disclosed above. It was made before any held-out output existed, but it weakens the claim that the first freeze was final.

4. **Development was tuned.** Nine development iterations and an 18-case probe suite preceded the held-out run. The final development result is not held-out evidence.

5. **The checker is lexical and heuristic.** It does not parse full syntax, resolve discourse structure, or model agent knowledge. The constraint layer is narrow and domain-bounded.

6. **The policy assesses declared obligations, not the whole source.** `USE_TRANSFORMATION` does not prove source equivalence. It records that the assessed obligations have positive preservation candidates and no material, unresolved or not-assessed finding.

7. **The historical LC20 reproduction uses proposals assembled by the earlier R5 study.** It is a useful regression check, not a new independent evaluation.

8. **No hosted model was used.** The model-assisted alternative remains an untested proposal.

---

## 11. What this means for the Language programme

R5 established that a checker can generate an interpretation and still fail to notice a material change. R6 establishes a second, narrower lesson:

> A checker can represent the right constraint categories and still fail to decide which semantic relationship controls.

The forty-to-fifty failure is fixed. A change from “closed ticket” to “unresolved incident” is not. A change from “not decided” to “approved” is detected, but described with the wrong distinction. The difference is not effort or vocabulary. It is the difference between a **constraint** and a **judgment about which description governs**.

For the book, R6 should be recorded as supporting three claims:

1. **Constraints are part of meaning.** A semantic record that stores only claims loses the permitted set of actions. `record_count <= 40` is not the same meaning as `record_count <= 50`, even if both are “about records”.

2. **Epistemic standing is part of meaning.** “The vendor approval has not been decided” and “the vendor is approved” differ in authority, not merely in polarity. A checker that collapses them into `NEGATION_REVERSAL` preserves the source by accident, not by understanding.

3. **A checker’s silence is not a certificate.** `USE_TRANSFORMATION` must require positive preservation evidence. The absence of a detected error is not evidence of equivalence.

R6 does not support a general claim that Language can validate meaning. It supports a narrower claim: typed constraints and separated epistemic fields are necessary components of a semantic record, and they are not sufficient on their own.

That is the right result to carry into the next architecture experiment. It is also the reason the decision is `REVISE_ARCHITECTURE`, not `CONTINUE`.
