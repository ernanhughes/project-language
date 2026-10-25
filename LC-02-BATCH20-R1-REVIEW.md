# LC-02-BATCH20-R1 — Diagnose semantic regressions

**Status:** offline diagnosis and bounded repair complete. No hosted model call, no commit, no push, no manuscript change.

**Frozen evidence:** `experiments/lc-02-batch20/.runs/COMBINED-001/`. All 146 files listed in its `artifact-hashes.json` re-hash exactly. The frozen `results.json` SHA-256 is `35fcf7326392d6154a90c0aaeb6350c57911a85d9b5d9985831c7b99b8c6d047`; it has not been rewritten. The run captured 99 hosted model calls across the three arms.

**Standing:** the adjudication below is implementation-team provisional judgment, not independent human adjudication. The frozen oracle and all retrospective scores remain unchanged. Nothing here demonstrates Language superiority or semantic improvement.

---

## 1. What the experiment actually shows

The frozen scores are unchanged:

| Arm | All 20 | Development (6) | Held-out evaluation (14) |
|---|---:|---:|---:|
| A — ordinary source | 18 / 20 | 6 / 6 | 12 / 14 |
| B — AI-mediated | 14 / 20 | 4 / 6 | 10 / 14 |
| C — Understanding-enhanced | 14 / 20 | 4 / 6 | 10 / 14 |

The paired tables are also unchanged:

| Comparison | Improved | Worsened | Tied | Unassessable |
|---|---:|---:|---:|---:|
| B vs A | 1 | 6 | 12 | 1 |
| C vs B | 1 | 0 | 18 | 1 |
| C vs A | 1 | 5 | 12 | 2 |

These are exact-label matches against an unadjudicated reference. They are not semantic-understanding scores.

The 14 evaluation cases were held out at the time of the frozen run. They are now disclosed diagnostic material; they are no longer a clean held-out set for any repaired prompt or compiler. No held-out confirmation is claimed for the repairs in this review.

### Provisional source-relative re-read

After reading the original source, the actual interpretation packet, and the recipient explanation for every case, the implementation team's provisional re-read is:

| Arm | Correct | Acceptable alternative | Overcautious | Overconfident | Mechanical |
|---|---:|---:|---:|---:|---:|
| A | 17 | 1 | 0 | 1 | 1 |
| B | 15 | 3 | 2 | 0 | 0 |
| C | 15 | 2 | 2 | 0 | 1 |

This re-read is not a rescore. It separates four things the frozen table does not:

1. **Clear mediation-induced over-abstention:** LC20-07 and LC20-10.
2. **Defensible mediated uncertainty:** LC20-02 and LC20-19. The source really does leave the condition or timestamp open.
3. **Adjudication/label-convention issues:** LC20-03, LC20-09, LC20-16. NO and UNKNOWN describe different things; the reference does not always fix which one the question asks for.
4. **Mechanical failures:** LC20-11 C (provider stream) and LC20-15 A (truncated source hash). Neither is a semantic disagreement.

The headline "ordinary beat mediation" is therefore partly true and partly an artefact. The strongest claim supported by the evidence is narrower:

> The mediated arms sometimes added question-relevant doubt that the source did not contain, most clearly in LC20-07 and LC20-10. The experiment did not demonstrate any incremental semantic benefit from the Understanding inventory.

### Mechanical failures are not ties

- **LC20-11 C:** the interpreter request ended with provider `stop_reason: error`, `FAILED_OR_INCOMPLETE_STREAM`, 6,208 reasoning tokens and no completion. No recipient answer exists. This is a provider failure, not a semantic result.
- **LC20-15 A:** the recipient produced a correct `YES` with four exact citations, but the model reproduced a **58-character** `source_hash` instead of the canonical **64-character** hash. The frozen scorer rejected the arm on `SOURCE_BINDING`. The answer is preserved in the event log and was not altered.

A prospective host-resolution path now accepts that exact citation by resolving the canonical hash from the host's source identity, while still requiring the exact source id, span and text. This does not change the frozen result. If the frozen scorer had used host resolution, A would have had a nineteenth semantic match; we do **not** claim that as a retrospective win.

---

## 2. Why the mediated arms disagreed with ordinary

### LC20-10 — replication lag (the clearest regression)

The source explicitly says:

> “The incident desk may page the on-call database engineer when replication lag stays above twenty seconds for at least five continuous minutes. The dashboard shows lag above twenty seconds for the last seven uninterrupted minutes. The alert was measured on the production replica specified by the policy. Paging is permitted; restarting the replica still requires a separate incident command.”

Ordinary answered `YES`. Both mediated arms answered `UNKNOWN`.

The interpreter added a requirement the source does not state: that the dashboard observation must be explicitly linked to the policy's “replication lag” metric on the same replica. The source already supplies the threshold, the seven-minute duration, the production replica, and the sentence “Paging is permitted.” The added doubt is an interpretation, not a source gap.

The C recipient then added a second, independent error:

> “Additionally, `source_truth` is marked as UNVERIFIED. Therefore, it cannot be definitively stated from the text alone whether the permission is currently active for paging.”

That is a category mistake. `source_truth: UNVERIFIED` means the document has not been checked against the external world. It does not mean the document's own permission cannot be applied to the document's own facts. The C arm used a provenance warning as a reason to abstain. The field was present in B's packet too; B's recipient did not use it as a reason. The failure is recipient amplification, not a C-only field.

This is the strongest evidence in the batch for the book's warning: an extra interpretation layer can manufacture uncertainty, and safety metadata can interfere with reasoning if its scope is not explicit.

### LC20-07 — staging approval (a genuine over-abstention)

The source says:

> “A release candidate can be sent to the staging cluster once security review and release-management review have both been accepted. Neither review may substitute for the other. The security review of candidate K8 is accepted. Release management recorded acceptance of K8 yesterday.”

Ordinary answered `YES`. Both mediated arms answered `UNKNOWN`, questioning whether “recorded acceptance” is the same as the release-management review being accepted. That is a possible stylistic distinction, but in ordinary policy reading “release management recorded acceptance of K8” means release management accepted K8. The source does not require a separate ceremony of “review acceptance” beyond the recorded acceptance.

This is a real over-abstention, though less stark than LC20-10 because the wording could be tightened. The C proposal lists the doubt in several forms and the recipient explicitly defers to the packet's unknowns.

### LC20-02 — known-good image (ordinary is overconfident, not mediation)

The source's condition is a **“signed known-good image.”** The fact supplied is **“the image signature was verified.”** Signature verification establishes that the image is signed; it does not by itself establish that the image is known-good. The mediated `UNKNOWN` is defensible. Ordinary's `YES` treats a necessary condition as fully established when the source supplies only part of it.

The frozen oracle marks `YES` as correct. That reference is questionable. This case should not be reported as a mediation regression; it is evidence that the ordinary arm can be overconfident and that the oracle needs adjudication.

### LC20-19 — deadline interpretation (mediated caution is defensible)

The source distinguishes “requests timestamped after the closing time” from “the system recorded the proposed request at 18:00 UTC.” The mediated arms asked whether the system recording time is the operative request timestamp. That is a genuine distinction in the source. The `UNKNOWN` is defensible, even if the natural policy reading is `NO`. This is the counterexample that prevents “every mediated abstention is an error.”

### LC20-03, LC20-09, LC20-16 — label conventions, not comprehension

These cases decide whether `NO` or `UNKNOWN` is the better label for an unresolved or absent status:

- **LC20-03:** the record contains “neither an approval nor a denial,” and the matter “has not been decided.” `UNKNOWN` describes the status; `NO` describes the absence of a recorded approval. Both are defensible depending on the question's scope.
- **LC20-09:** the retention schedule is unspecified. `UNKNOWN` says the source does not settle deletion; `NO` says no deletion requirement is established. The explanations express nearly the same uncertainty.
- **LC20-16:** the question asks whether the door “definitely broke.” `NO` and `UNKNOWN` both express the absence of confirmation. The frozen table's only B-over-A “improvement” is this label choice, not a comprehension gain.

These are adjudication issues, not semantic wins or losses. The correct repair is to rewrite the questions so the label meaning is fixed, not to change the references after seeing the arms.

### LC20-15 and LC20-11 — mechanical, not semantic

- **LC20-15 A:** correct `YES`, rejected because the model echoed a truncated hash.
- **LC20-11 C:** provider stream failure, no answer.

Neither should be counted as a tie, a wrong answer, or a semantic result.

### Attribution summary

| Attribution | Arm-cases | Cases |
|---|---:|---|
| `INTERPRETER_INTRODUCED` | 4 | LC20-07 B/C, LC20-10 B/C |
| `RECIPIENT_AMPLIFIED` | 2 | LC20-07 C, LC20-10 C |
| `SOURCE_TRUTH_CONFUSION` | 1 | LC20-10 C |
| `DEFENSIBLE_AMBIGUITY` | 4 | LC20-02 B/C, LC20-19 B/C |
| `LABEL_CONVENTION` | 4 | LC20-03 B/C, LC20-09 B, LC20-16 A |
| `POSSIBLE_AMPLIFICATION` | 1 | LC20-19 C |
| `NONE` (mediated answer matched an explicit source reading) | 2 | LC20-09 C, LC20-16 B |

The important pattern: the additional uncertainty is mostly **interpreter-generated**, not compiler-generated. It appears in B even when C's inventory is weak. That changes the repair target.

---

## 3. What the Understanding Compiler actually contributed

The frozen report's 86 sentences / 86 meaning units / 0 relationships is accurate for the compiler. The engine was:

```text
spacy/blank-en+sentencizer
trained_syntax_available: false
```

The environment check confirms why:

```text
Python 3.13.15
spaCy 3.8.16
spacy.util.get_installed_models() -> []
```

No `en_core_web_sm` pipeline is installed. The compiler therefore used the blank-English sentencizer fallback for all twenty cases. No automatic download was attempted. This is a qualified sentence-segmentation baseline feeding a model, not the full Understanding Compiler described in the new chapter.

### C vs B: longer is not better

Across the 19 cases where both B and C produced a proposal:

| Measure | C greater than B | C equal to B | C less than B |
|---|---:|---:|---:|
| Commitments | 9 | 8 | 2 |
| Unknowns | 9 | 4 | 6 |
| Relations | 9 | 6 | 4 |

But the added structure did not produce a demonstrated semantic gain:

- The only C-over-B label improvement is **LC20-09**, and it is a NO/UNKNOWN convention difference, not a new source fact. The missing-schedule unknown is present in both B and C proposals; the recipients chose different labels.
- The only other C/B difference is **LC20-11**, a provider failure.
- On every clear case where C and B agree, they agree on the same answer. C's extra commitments/unknowns/relations do not change the decision.
- In LC20-10, the harmful metric-link doubt is already present in B. It is not caused by the C inventory. C adds more unknowns and the recipient adds the `source_truth` error. The inventory is at most an amplifier, not the origin.

### Inventory errors that were demonstrated

- **LC20-07:** the main rule “can be sent … once both reviews have been accepted” was classified as a `statement`, not a `conditional_permission`; “Neither review may substitute” was classified as a `permission`, not a `prohibition`.
- **LC20-11:** “A failed checksum may indicate that the replica is stale” was classified as a `permission`, because the lexical rule saw “may.” It is an epistemic possibility, not permission.
- **LC20-10:** the final sentence “Paging is permitted; restarting the replica still requires a separate incident command” was one `requirement` unit. The explicit permission and the separate restart requirement were collapsed.

These are concrete demonstration failures. They were repaired in the offline baseline, but no live model has been run against the repaired version.

### Why the C-vs-B null result is unsurprising

The experiment added a second representation of the source without adding a demonstrably better understanding of it. The compiler did not decompose multi-clause sentences, identify cross-sentence relations, resolve speaker attribution, or evaluate whether the interpreter's added claims were justified. It produced one extractive unit per sentence and zero relations. The interpreter then did most of the semantic work — and introduced the harmful doubts — in both mediated arms.

The correct conclusion is not “Understanding is ineffective.” It is: **the proposed mechanism has not yet been adequately implemented or qualified to support a claim either way.**

---

## 4. Provisional semantic-adjudication worksheet

Full source-first blocks, exact spans and the complete arm ledger are in:

```text
experiments/lc-02-batch20-r1/ADJUDICATION-WORKSHEET.md
experiments/lc-02-batch20-r1/DIAGNOSIS.json
```

The worksheet shows the source and question before the arm table. The ledger below is the compact version. “SR expectation” is the implementation team's provisional source-relative answer; “Oracle” is the frozen unadjudicated reference. Status is A/B/C execution status.

| Case | SR expectation | Oracle | A | B | C | Status | Oracle assessment |
|---|---|---|---|---|---|---|---|
| LC20-01 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-02 | UNKNOWN (DISPUTED) | YES | OVERCONFIDENT | CORRECT | CORRECT | VALID/VALID/VALID | QUESTIONABLE |
| LC20-03 | UNKNOWN (DISPUTED) | UNKNOWN | CORRECT | ACCEPTABLE_ALTERNATIVE | ACCEPTABLE_ALTERNATIVE | VALID/VALID/VALID | LABEL_CONVENTION_ISSUE |
| LC20-04 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-05 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-06 | UNKNOWN (CLEAR) | UNKNOWN | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-07 | YES (CLEAR_WITH_MINOR_WORDING) | YES | CORRECT | OVERCAUTIOUS | OVERCAUTIOUS | VALID/VALID/VALID | CONSISTENT |
| LC20-08 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-09 | UNKNOWN (DISPUTED) | UNKNOWN | CORRECT | ACCEPTABLE_ALTERNATIVE | CORRECT | VALID/VALID/VALID | LABEL_CONVENTION_ISSUE |
| LC20-10 | YES (CLEAR) | YES | CORRECT | OVERCAUTIOUS | OVERCAUTIOUS | VALID/VALID/VALID | CONSISTENT |
| LC20-11 | NO (CLEAR) | NO | CORRECT | CORRECT | MECHANICAL_FAILURE | VALID/VALID/FAILED | CONSISTENT |
| LC20-12 | UNKNOWN (CLEAR) | UNKNOWN | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-13 | YES (CLEAR) | YES | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-14 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-15 | YES (CLEAR) | YES | CORRECT_BUT_MECHANICALLY_REJECTED | CORRECT | CORRECT | FAILED/VALID/VALID | MECHANICAL_UNDERCOUNT |
| LC20-16 | UNKNOWN (DISPUTED) | UNKNOWN | ACCEPTABLE_ALTERNATIVE | CORRECT | CORRECT | VALID/VALID/VALID | LABEL_CONVENTION_ISSUE |
| LC20-17 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-18 | YES (CLEAR) | YES | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-19 | NO (DEFENSIBLE_AMBIGUITY) | NO | CORRECT | ACCEPTABLE_ALTERNATIVE | ACCEPTABLE_ALTERNATIVE | VALID/VALID/VALID | CONSISTENT |
| LC20-20 | SOURCE_CONFLICT (CLEAR) | SOURCE_CONFLICT | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |

### Adjudication issues to carry forward

| Case | Issue | Does not mean |
|---|---|---|
| LC20-02 | “Signature verified” does not entail “known-good image used”; the oracle's YES is questionable. | That all mediated abstentions are cautious in the right way. |
| LC20-03 | Documented approval (NO) versus actual approval status (UNKNOWN). | That the vendor was denied. |
| LC20-07 | “Recorded acceptance” could be tightened, but the natural reading supports YES. | That the source leaves the review status open. |
| LC20-09 | No deletion requirement (NO) versus unknown retention schedule (UNKNOWN). | That the archive is permitted to remain forever. |
| LC20-10 | The source explicitly satisfies the paging conditions and says paging is permitted. | That the recipient may ignore provenance; it may not. |
| LC20-16 | “Not definitely broken” can be NO or UNKNOWN. | That the door is known intact. |
| LC20-19 | System recording time versus operative request timestamp is genuinely distinct. | That the exception definitely applies. |

---

## 5. Exact repairs made

All changes are offline. No request was sent to a hosted model. The frozen batch-20 files were not edited.

### 5.1 Source-relative contract (new)

**File:** `apps/language-demo/protocol/source-contract.mjs`

The packet now carries an explicit, additive contract:

```json
{
  "contract_version": "lc02-r1/source-relative/1",
  "answer_scope": "SOURCE_RELATIVE",
  "source_truth": "UNVERIFIED",
  "source_truth_scope": "EXTERNAL_FACTUAL_VERIFICATION_ONLY",
  "interpretation_standing": "FALLIBLE_AID_NOT_SOURCE",
  "action_authority": false
}
```

`source_truth: UNVERIFIED` and `action_authority: false` are preserved. The new field only explains their scope. It does not grant permission to act, and it does not assert that the source is true.

Wired into:

- `apps/language-demo/engine/studio.mjs` — every Studio packet, including `SOURCE` and `LANGUAGE`.
- `apps/language-demo/evaluation/comparison.mjs` — both ordinary and language packets.
- `experiments/lc-02-batch20/engine.mjs` — A's manual packet and every B/C packet.

### 5.2 Recipient prompt

**File:** `apps/language-demo/models/prompts.mjs`

Replaced “Apply only the delivered packet to the newly supplied question” with a source-first contract. The recipient is now told:

- Answer from the source embedded in the packet; the interpretation is a fallible aid, not the source.
- `source_truth: UNVERIFIED` means the document has not been checked against the external world; it does **not** prevent a source-relative answer.
- A doubt added by an interpreter is not a gap in the source unless the exact source text leaves the condition unresolved.
- Do not add a condition the source does not contain or treat a non-repeated condition as unresolved.
- `YES`, `NO`, `UNKNOWN` and `SOURCE_CONFLICT` have explicit meanings; `NO` can mean express prohibition, source-stated negation, or failure to establish permission, and the explanation must say which.
- `UNKNOWN` is not a synonym for lack of external verification.
- If the model cannot reproduce a long source hash, it may use an empty `source_hash` and still supply the exact id, span and text; the host resolves the canonical hash.

The existing anchor instructions, “Unknown is not permission,” and the exact-span requirements are preserved.

### 5.3 Interpreter prompt

**File:** `apps/language-demo/models/prompts.mjs`

The interpreter now receives the same three-scope contract and the rule that a later sentence which explicitly resolves a condition is resolved even if an earlier sentence does not repeat it. It must distinguish genuine source uncertainty from doubts it proposes. The existing proposal-field rules and anchor rules are preserved.

**File:** `apps/language-demo/understanding/analysis.mjs`

`HINT_INSTRUCTION` now says that sentence splits, prerequisite hints and speaker labels are candidates; they do not add conditions or verify attribution.

### 5.4 Host-side citation resolution

**File:** `apps/language-demo/protocol/state.mjs`

Added:

- `resolveAnchor(anchor, source, {allowHashRepair})`
- `resolveCitations(anchors, source, options)`

Rules:

1. Exact `source_id` is still required.
2. Exact `start`/`end` and exact `text` are still required.
3. If the hash matches, resolution is `EXACT`.
4. If the hash does not match but the exact span and text match, resolution is `HOST_RESOLVED_HASH` and the canonical hash is restored from the host's source identity.
5. A wrong span still throws `SOURCE_SPAN`; a wrong source id still throws `SOURCE_BINDING`.
6. `validateAnchors` remains strict. The host resolution is a separate, opt-in path used by new delivery/regression flows.

Used in `Studio.deliver`, `Comparison.deliver`, and the batch protocol `validAnswer`. The frozen LC20-15 A response was not rewritten; its captured event remains the evidence for the regression fixture.

### 5.5 Decision rubric

**File:** `apps/language-demo/evaluation/decision-rubric.mjs`

New explicit rubric with:

- Four labels and their source-relative meanings.
- Three question scopes: `SOURCE_RELATIVE`, `EXTERNAL_FACTUAL_VERIFICATION`, `ACTION_AUTHORITY`.
- `assessDecision` statuses: `REFERENCE_MATCH`, `ACCEPTABLE_ALTERNATIVE`, `ADJUDICATION_ISSUE`, `REFERENCE_DISAGREEMENT`, `MECHANICAL_FAILURE`.
- `adjudicationIssue` records multiple reasonable readings without silently changing the reference.
- `explanationStanding` keeps explanation structure separate from label agreement.
- `explanationFlags` detects the two exact batch-20 patterns for review: `PROVENANCE_SCOPE_CONFUSION` (using `source_truth` as a reason to abstain) and `DEFERS_TO_INTERPRETER_DOUBT` (treating an interpreter's unknown as a source gap). These are review flags, not verdicts.

This is a rubric, not a semantic judge. It does not decide whether an explanation is true.

### 5.6 Compiler baseline (versioned)

**Profile:** `core/understanding/python/profiles/technical-policy.json` is now version **0.2** with:

- `segment_by: ["sentence", "clause", "semicolon"]`
- `extract_prerequisites: true`
- `attribute_speakers: true`

The `general` profile remains version 0.1 and exploratory; it does not inherit the technical-policy split rules.

**Pipeline:** `core/understanding/python/src/understanding/pipeline.py`

- Semicolon clause split with exact spans.
- Prerequisite extraction for explicit `if`/`when`/`once`/`only if`/`provided that`/`unless` clauses, split only when both sides look clause-like.
- Speaker label extraction for `Speaker:` dialogue forms.
- Classifier corrections:
  - “may indicate/suggest/reflect/…” is an epistemic statement, not permission.
  - “neither … may …” is a prohibition.
  - “does not allow / does not grant … permission” is an authority limit.
  - “can be … once …” is a conditional permission.
  - “has not yet decided / has not yet been decided” is unknown.
- Engine metadata now reports `trained_model_requested`, `trained_syntax_available`, `fallback_reason` and engine version `0.2.0`.
- No relations are fabricated. Cross-sentence reference and exception cases are flagged as candidates, not resolved.

**Adapter:** `core/understanding/adapter.mjs`

- Optional `require_trained_syntax` flag. When true, a blank-English fallback throws `UNDERSTANDING_TRAINED_SYNTAX_REQUIRED` instead of silently proceeding.
- Optional new inventory fields are backward-compatible (`speaker`, `prerequisites`, engine metadata).

**Schema:** `core/understanding/schemas/inventory-v0.1.json` adds the optional fields; the published contract remains `inventory-v0.1`.

**Tests:** `core/understanding/python/tests/test_decomposition.py` — ten targeted fixtures covering multiple units from one sentence, prerequisites, negation/scope, conditional permission, later exception, cross-sentence reference, speaker attribution, appropriate uncertainty, the general-profile control, and fallback qualification.

### 5.7 Batch runner

**Files:** `experiments/lc-02-batch20/engine.mjs`, `experiments/lc-02-batch20/protocol.mjs`

- A's packet now carries the same source-relative contract as B/C.
- B/C packets are overridden with the case's question scope if one is supplied.
- `validAnswer` uses host citation resolution and records `citation_resolution` plus `host_repaired_hashes`.
- No historical output is modified.

---

## 6. Updated compiler-baseline qualification

`experiments/lc-02-batch20-r1/COMPILER-BASELINE.json` records:

| Item | Value |
|---|---|
| Python | 3.13.15 |
| spaCy | 3.8.16 |
| Installed spaCy models | `[]` |
| Engine | `spacy/blank-en+sentencizer` |
| Trained syntax available | `false` |
| Fallback reason | `SPACY_MODEL_NOT_INSTALLED` |
| Technical-policy profile | 0.2 |
| General profile | 0.1 |

On the qualification sample, the technical-policy baseline produced 2 sentences, 3 units, 1 prerequisite and 1 semicolon-split permission unit; the general profile produced 2 sentences and 2 units. This is the intended difference: the policy profile now exposes separable clauses, while the exploratory general profile remains conservative.

**What this does and does not establish**

- It establishes that the blank-English fallback is explicit and that the new decomposition rules behave as specified on targeted fixtures.
- It does **not** establish that the full Understanding Compiler works. The trained pipeline is still absent. A future live run must either install `en_core_web_sm` manually and record it, or label itself `BLANK_ENGLISH_FALLBACK` and refrain from claiming a trained-compiler test.
- No automatic download was attempted.
- The old `FREEZE-001.json` condition hash must not be reused: the profile, prompts, compiler and packet contract have changed. A new freeze is required before any fresh live run.

---

## 7. Offline regression evidence

`experiments/lc-02-batch20-r1/OFFLINE-REGRESSION.md` records eleven checks. All pass. These are contract/mechanical tests with frozen, scripted and injected inputs, not model evidence.

| Check | Result | Concrete failure addressed |
|---|---|---|
| All frozen artifacts unchanged | PASS | 146 / 146 recorded files re-hash exactly; diagnosis writes only new files. |
| Frozen results unchanged | PASS | `results.json` re-hashes to the recorded digest. |
| Citation hash host resolution | PASS | LC20-15 A's 58-character hash is host-resolved from the exact span; strict validation still rejects it. |
| Host resolution does not repair spans | PASS | Wrong span → `SOURCE_SPAN`; wrong source id → `SOURCE_BINDING`. |
| Source-relative contract | PASS | `source_truth` scope, answer scope, interpretation standing and action authority are explicit. |
| Provenance-confusion detector | PASS | The exact LC20-10 C `source_truth`/`UNVERIFIED`/`therefore` pattern is flagged; LC20-10 A is not. |
| One sentence, multiple units | PASS | LC20-10 goes from 4 units (final unit `requirement`) to 5 units with an explicit `permission` unit. |
| Classifier corrections | PASS | LC20-07: `statement` → `conditional_permission`, `permission` → `prohibition`; LC20-11: `permission` → `statement`. |
| Prerequisites separate | PASS | LC20-02 now exposes two prerequisites from the `only if … and …` clause. |
| Label rubric | PASS | 60 arm-cases re-read as 47 reference matches, 7 acceptable alternatives, 4 reference disagreements, 2 mechanical failures. |
| C vs B | PASS | The only C/B differences are LC20-09 (label convention) and LC20-11 (provider failure). No semantic improvement. |

### Test commands and results

```text
node --experimental-transform-types --test apps/language-demo/tests/*.test.mjs
  86 tests, 86 pass, 0 fail

.\.venv\Scripts\python.exe -m unittest discover -s core\understanding\python\tests -v
  25 tests, 25 pass, 0 fail

node --experimental-transform-types --test experiments/lc-02-batch20/protocol.test.mjs experiments/lc-02-batch20-r1/fresh-design.test.mjs
  10 tests, 10 pass, 0 fail

npm run typecheck
  pass

npm test
  1114 pass, 3 skipped, 0 fail
```

### What the regression does not show

- It does not show that the repaired prompt reduces over-abstention in a real model.
- It does not show that the compiler changes improve decisions.
- It does not show that C adds value.
- It does not validate any reference label.

The before/after evidence is about **mechanism and contract**, not model behaviour.

---

## 8. Proposed fresh evaluation (designed, not run)

**File:** `experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json`

**Frozen design hash:** `2c88429b777baca7207aad13ea3041746bc0a99d0d96fcc217aed81856c78de4`

**Status:** `DESIGN_ONLY_FROZEN_NOT_RUN`. No model call has been made with this design. The run plan is 16 cases × 5 calls = 80 planned calls, with an absolute ceiling of 100.

### Design

16 cases:

| Label | Count |
|---|---:|
| YES | 4 |
| NO | 6 |
| UNKNOWN | 4 |
| SOURCE_CONFLICT | 2 |

Case classes include fully specified permission, fully specified prohibition, fully specified missing fact, fully specified conflict, genuine ambiguity, authority denial, complete-but-distracted, qualified later exception, speaker scope, temporal boundary, external verification, source-relative scope pair, and multi-condition failure.

The cases are written so the question type and label meaning fix one answer. The genuine-ambiguity cases explicitly say what the source leaves unresolved; they are not lexical traps. The external-verification pair (R1E-13/R1E-14) uses the same source with different question scopes:

- “Is the production backup actually encrypted at rest?” → `UNKNOWN`, because the document asserts it but no external evidence is supplied.
- “Does the supplied document state that the production backup is encrypted at rest?” → `YES`, because the question is about the document.

The design uses a new schema (`language-fresh-evaluation-design/1.0`) and is not directly executable by the batch-20 runner. A new runner must validate the schema, recompute the freeze hash, and refuse to start if either differs. It must not silently coerce this design into the old 20-case suite.

This pair is the cleanest test of whether a recipient confuses source-relative reasoning with external verification.

### Analysis plan

Primary outcomes, kept separate:

1. Decision label agreement with the frozen source-relative reference.
2. Acceptable-alternative rate where the design declares one.
3. Explanation fidelity to required reasoning.
4. Uncertainty calibration: correct `UNKNOWN` vs unnecessary abstention vs overconfident `YES`/`NO`.
5. Mechanical validity: schema, exact spans, host-resolved citation identifiers, provider completion.

Paired comparisons: B vs A, C vs B, C vs A, stratified by case class and question scope. Mechanical failures are excluded from semantic denominators and never counted as ties.

### Improving communication quality vs improving error detection

The design pre-registers the distinction:

- **Communication quality:** the recipient reaches the source-relative answer with faithful reasoning and calibrated uncertainty.
- **Error detection:** mediation identifies a genuine missing condition, scope limit or conflict that a reasonable ordinary reader might miss.
- **Rule:** do not count a correct decision as improved communication quality if the explanation is unfaithful; do not count an added warning as error detection unless the warned condition is actually in the source.

This prevents the batch-20 mistake of treating a label-convention difference as a semantic gain.

### Is C substantively different from B?

Pre-registered criteria:

1. Count question-relevant, source-anchored conditions, exceptions, scope limits and relations in each packet.
2. Require at least one C-only item that changes the recipient's decision or explanation toward the source-relative reference.
3. Reject as non-substantive: extra unknowns restating the same doubt, longer paraphrases, relations with no source anchor, added doubts not present in the source.
4. Report C-only unsupported additions and overcaution separately from C-only fidelity improvements.

Possible outcomes: `C_NOT_SUBSTANTIVELY_DIFFERENT`, `C_SUBSTANTIVE_BENEFIT`, `C_SUBSTANTIVE_HARM`, `C_MIXED`, `NOT_ASSESSABLE`.

Based on batch-20, the current expectation is `NOT_YET_TESTED`, not a benefit.

### Preflight before any live run

- Two readers who do not know the hypothesis answer each case from source and question only. Disagreements become adjudication issues; they are not resolved after seeing model outputs.
- A scripted three-arm dry run verifies packet isolation, exact spans, citation resolution and failure accounting.
- A decision is recorded on trained spaCy: install manually and record the version, or label the run `BLANK_ENGLISH_FALLBACK`.
- The design hash is checked before the first call. No case is added, removed or relabelled after outputs are seen.

---

## 9. Remaining unresolved questions

1. **Does the repaired recipient contract actually reduce over-abstention?** The offline tests prove the contract is present and the old failure is represented; they do not prove a model follows it.
2. **Does the repaired interpreter prompt stop manufacturing conditions?** LC20-07 and LC20-10 are the direct tests. A fresh live run is required.
3. **Does host-resolved citation identity change any semantic result?** It removes a mechanical failure mode, but it should not be reported as a semantic improvement.
4. **Can C ever add value?** The batch-20 C arm was a sentence-level heuristic baseline with zero relations. A trained pipeline, relation candidates and an independent C-vs-B structure audit are still untested.
5. **Which oracle labels should be rewritten?** LC20-02, 03, 09, 16 and 19 need question-scope clarification. They must be rewritten in a new version, not edited in the frozen oracle.
6. **Is `source_truth` the right field name?** We kept it for compatibility and added `source_truth_scope`. A future contract could rename it to something like `external_verification`, but that is a breaking change and should be versioned.
7. **Should the compiler infer cross-sentence relations?** The current baseline deliberately emits zero. The fresh design can test whether C's *proposed* relations are source-grounded; the compiler itself still does not create them.
8. **How independent can the adjudication be?** The current ledger is implementation-team judgment. A credible claim needs a reader who did not build the system and does not know the arm identities.
9. **Is the Preserve/Enhance/Clarify routing decision real?** It remains a proposed future capability, not a validated one. The fresh design can supply evidence for when mediation is unnecessary, but it does not test a router.
10. **Does the external-verification pair create a new label ambiguity?** It is the most likely case for reasonable-reader disagreement. The preflight human review should decide whether to keep it, rewrite it or retire it before the live run.

---

## 10. Management conclusion

Close LC-02-BATCH20 as a successful live experiment with:

- **no demonstrated semantic advantage** for either mediated arm;
- **a credible warning** that mediation can manufacture uncertainty;
- **a narrower, better-supported diagnosis** than “Language loses”: the interpreter, not the compiler, introduced the harmful doubts; two cases are clear over-abstentions, two are defensible caution, four are label/adjudication issues, and two are mechanical failures.

The next milestone is not another large live batch. It is:

1. Freeze the fresh 16-case design and have it independently read.
2. Run the scripted dry run and confirm the mechanical accounting.
3. Decide the trained-spaCy question explicitly.
4. Only then run the fresh evaluation once, with a blinded C-vs-B structure audit.

No claim of Language superiority or semantic improvement is made. The frozen batch-20 evidence has been preserved byte-for-byte; the repairs are offline and provisional until a fresh, independently adjudicated run says otherwise.

---

## Appendix A — Provenance and reproducibility

| Item | Path / value |
|---|---|
| Frozen run | `experiments/lc-02-batch20/.runs/COMBINED-001/` |
| Frozen `results.json` SHA-256 | `35fcf7326392d6154a90c0aaeb6350c57911a85d9b5d9985831c7b99b8c6d047` |
| Artifact hashes checked | 146 / 146 exact |
| Diagnosis | `experiments/lc-02-batch20-r1/DIAGNOSIS.json` |
| Worksheet | `experiments/lc-02-batch20-r1/ADJUDICATION-WORKSHEET.md` |
| Offline regression | `experiments/lc-02-batch20-r1/OFFLINE-REGRESSION.json` / `.md` |
| Compiler baseline | `experiments/lc-02-batch20-r1/COMPILER-BASELINE.json` |
| Fresh design | `experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json` |
| Fresh design hash | `2c88429b777baca7207aad13ea3041746bc0a99d0d96fcc217aed81856c78de4` |
| Adjudication ledger | `experiments/lc-02-batch20-r1/fixtures/adjudication.json` |

### Reproduce

```powershell
node --experimental-transform-types experiments/lc-02-batch20-r1/diagnose.mjs
node --experimental-transform-types experiments/lc-02-batch20-r1/regression.mjs
node --experimental-transform-types experiments/lc-02-batch20-r1/qualify-baseline.mjs
node --experimental-transform-types experiments/lc-02-batch20-r1/freeze-design.mjs
node --experimental-transform-types --test experiments/lc-02-batch20-r1/fresh-design.test.mjs
```

### Explicit exclusions

- No manuscript file was edited.
- No git commit, push or PR was made.
- No hosted model call was made during this review.
- No spaCy model was downloaded.
- No frozen request, response, event, failure, hash or configuration was modified.
- No reference label was changed to make mediation look better.

## Appendix B — Limitations

- The provisional re-read is not independent human adjudication.
- The offline regression tests exercise contracts and deterministic mechanisms, not model behaviour.
- The fresh design has not been run and has not been independently read.
- The compiler still lacks a trained syntax pipeline, cross-sentence relation implementation and semantic completeness evaluation.
- The decision labels remain vulnerable to scope ambiguity; the rubric reduces but does not eliminate that risk.
- The 16-case fresh design is still small and author-constructed; it is not a population sample.

