# CODEX — LC-02-BATCH20: Automated Language Comparison (20 Cases)

## Your role and decision

You are Codex, implementing and executing a **bounded, exploratory, automated evaluation** of the Language system in `C:\Projects\project-language`. The user explicitly wants **Codex to run the tests end-to-end without operating Language Studio's GUI**. Implement a command-line batch runner reusing Studio's existing providers, source/meaning inventories, interpretation, recipient delivery, second-pass analysis and event logging. Do **not** create a second Language engine or redefine existing trust/authority boundaries.

**Run the complete 20-case batch through the existing configured OpenCode Go models after the offline preflight and development-stage checks pass.** Treat this prompt as authorisation to run this bounded batch, not to conduct unlimited subsequent tuning or repeat hosted calls. Do not ask the user to click Start Comparison twenty times. Do not turn provider economics into a research variable; existing operational safety limits still apply.

The goal is to find *advantages, disadvantages and ties*, including occasions when Language **makes communication worse**. A null result is a valid result. Do not modify scenarios or scoring to produce wins.

## Inputs (copy these unchanged into the repository)

- `lc02-20-tests.json` — exactly 20 synthetic communications, associated held-back questions, profile selections, domain/stressor tags and split membership. This is the **main JSON input**.
- `lc02-20-oracle.json` — separate, author-constructed **provisional** reference decisions, source quotations and required reasoning. This file is **not independently adjudicated**. Its content must be inaccessible to interpreter and recipient prompt builders.

Place copies in `experiments/lc-02-batch20/fixtures/`. Calculate and record both file SHA-256 digests *before making any model call*. Never rewrite the originals during execution. A case's `source` and `question` are authoritative test inputs; its `reference` is a provisional evaluation aid, never model context.

The suite deliberately has 6 `development` cases and 14 `evaluation` cases. Preserve that split and the 20 IDs. There are 6 expected YES, 8 NO, 5 UNKNOWN and 1 SOURCE_CONFLICT, but these labels must never be placed into an AI request. The profiles `technical-policy` and `general` are requested profiles; check they actually exist locally, use versioned actual equivalents only with an explicit documented mapping, and report any unsupported cases rather than silently changing profiles.

## Phase 0 — Inspect the real local tree; don't trust remote main

1. Check git branch, HEAD, working tree and existing test results. Preserve all unrelated edits. Inspect `AGENTS.md`/local guidance if present.
2. Inspect `core/understanding`, its Python adapter, schemas and JSON-stdin API, `core/record`, the unrelated `core/compiler`, and `apps/language-demo` engine, runtime, versioning, acceptance, event log, session isolation and the current Simple Mode comparison path. Reuse **actual** local APIs; the hosted GitHub version may be stale.
3. Read the latest LC-02U and live anchor-check reports. Preserve their original artifacts; the S-17/migration case is development evidence, not a held-out benchmark.
4. Set up a clean, uniquely named output directory. No script may overwrite a previous run. Add an untracked-safe output convention such as `experiments/lc-02-batch20/.runs/<run-id>/` and appropriate `.gitignore` if needed.
5. Validate the entire suite and oracle locally: unique IDs; known 4-way decisions; correct split counts; exact source-evidence quotations; no empty source/questions; explicit profile availability; frozen hashes. Record any ambiguity in the provisional reference before running, never resolve it in favour of a particular experimental arm.

## Experiment definition — **three controlled arms per case**

Use exactly the same source text and exact same hidden question for each arm. Use the same configured **recipient model**, system-instruction obligations, permitted source evidence and answer schema. Give each recipient a fresh independent session; never let outputs, prior runs, other arms, oracle/reference decisions or analysis reports leak into later prompts. Randomise/counterbalance arm order with a recorded seed. Only delivery mechanism differs.

- **A / `A_SOURCE_ONLY`:** Original source delivered directly to the recipient; no AI interpretation or compiler-derived meaning inventory is supplied.
- **B / `B_AI_MEDIATED`:** Original source → configured interpreter **without** Understanding hints → candidate/accepted-for-test semantic packet + same original source → recipient.
- **C / `C_UNDERSTANDING_ENHANCED`:** Original source → local Understanding Compiler → candidate meaning table supplied as **fallible structured context** to the **same configured interpreter model** → candidate/accepted-for-test packet + same original source → recipient.

B and C must otherwise use equivalent interpreter prompts, recipient packet contracts and source availability. Record differences in packet shape and length; do not misrepresent them as a perfectly token-matched comparison. Do not make C's interpreter or recipient aware that the study expects it to win. The Understanding inventory is advisory, not ground truth.

The ordinary arm must not be denied the original source. Both mediated arms also carry the original source; this is an **augmentation** comparison. Source-withheld transfer is a separate future study and must not be mixed into these results.

**Human acceptance:** Production acceptance/authority gates must remain intact. Implement a clearly scoped `EVALUATION_ONLY`/test-operator route if required by the actual local contracts, with explicit audit identity and no external action authority. Codex may perform bounded *test-operator review*, attributed transparently as Codex-mediated; never log it as if the human user personally accepted each proposal, and never silently auto-promote extracted meaning into truth. A reviewer finding that would invalidate safe test delivery must stop the relevant case, not falsify acceptance. Preserve version-specific binding.

## Phase 1 — Build a CLI runner, not a new GUI

Provide a documented command with this intended shape (adapt to project conventions while keeping these switches):

```powershell
node --experimental-transform-types experiments/lc-02-batch20/run.mjs `
  --suite experiments/lc-02-batch20/fixtures/lc02-20-tests.json `
  --oracle experiments/lc-02-batch20/fixtures/lc02-20-oracle.json `
  --mode offline `
  --out experiments/lc-02-batch20/.runs/PREFLIGHT-001
```

Then repeat with `--mode live` and a **new** output directory. Add `--split development|evaluation|all`, `--dry-run`, `--max-remote-requests`, and `--seed`. The command should require no browser. It should honour the current OpenCode Go model assignments/settings, Python executable/profile configuration and existing request constraints rather than hardcode or reset them. Clearly record the models' actual provider/identities and whether their calls were genuine hosted inference or fixtures.

For each case, persist separately: original source; initial Python inventory; B and C interpreter proposals; proposed corrections/challenges if used; version/acceptance-for-test record; exact delivered packets; independent recipient answer for each arm; source spans/citations; second-pass inventories for delivered content and responses; mechanical validations; provider/model IDs; event log; errors; and evaluation results. Hash/source-bind and replay these records without running inference again. Label missing stages as errors or NOT_ASSESSED rather than fabricating results.

Use an explicit **request budget**. The base plan is one recipient call for A, two model calls for B (interpreter + recipient), and two for C: **5 per case, 100 across 20 cases**. Do not add challengers, mediators, evaluator-model calls or retries invisibly. Cap the whole project at **120 hosted requests**, with a per-case limit that conforms to existing Studio limits. Record every attempted request, including failures, and stop cleanly before exceeding existing provider or configured safeguards. If actual pipeline needs additional calls, report and amend the estimate **before** execution rather than silently exceeding it. No automatic retries of semantic failures. Do not log provider secrets. Keep credentials in the existing environment mechanism.

## Phase 2 — Offline engineering preflight and six development cases

1. Validate parser/contracts with fixtures and injected mock providers: 20 cases parsed, 3 arms generated per case, oracle completely excluded from every outgoing model request, no cross-case leakage, one-to-many meaning units allowed, CRLF/Unicode spans bound to original source, reproducible order, deterministic replay, and distinct recipient sessions.
2. Execute all six **development** cases offline, then a **single genuine live smoke test** when the infrastructure is ready. Continue with the six development cases through all three arms.
3. Use the development results to fix reproducible parsing/transport issues and exposed semantic extraction/matching limitations. Preserve earlier failed run directories and label any reruns as revisions. Do not modify the original inputs or reference decisions after observing outputs. Improvements to semantic prompting/models are allowed **only on development cases**.
4. If a model produces invalid source anchors, fail/record it as such; do not invent or autocorrect citations and then count the model's original output as valid. Engineering repairs may improve prompts on the development split, but save prompt versions/hashes.
5. Set a **freeze gate** after development: freeze dataset hashes, model assignments, interpretation profiles, runner code revision, prompts, evaluation criteria, grading method, seed and schema. Log the exact frozen checkpoint.

## Phase 3 — Run fourteen evaluation cases **once**

- Run the 14 evaluation cases under frozen configuration, with 3 arms each, writing only to a new output directory.
- Never inspect the oracle when building a model request. Construct model input with an explicit whitelist (`id`, `source`, `question`, declared context and profile as appropriate), and test that neither answer labels nor rationale appear in actual outgoing payloads.
- Do not feed evaluation failures back into the prompts or meaning compiler **during the same evaluation batch**. If evaluation exposes a genuine runtime bug, preserve the failed trace, log the repair and requalification; label any rerun accordingly. If evaluation cases are used for semantic tuning, retire them as held-out evidence and require a new unseen set for later confirmation.
- Collect errors as data. Do not silently drop failed cases from denominators, call them ties, or reuse old successful answers.
- The case run may be stopped or resumed after infrastructure failure, but a resumed attempt must preserve request identity/deduplication and not silently make an additional fresh model call.

## Phase 4 — Analyse decisions and meaning in both directions

Produce independent outcomes for **decision correctness** and **semantic faithfulness**.

1. **Decision:** match YES / NO / UNKNOWN / SOURCE_CONFLICT against the provisional author-constructed reference, report raw counts and the status of reference adjudication; report exact per-arm and per-case decisions. An unsupported confident YES when the source says UNKNOWN must count as a serious regression; a correct YES must also count as success (a blanket refusal is not safe comprehension).
2. **Source → transmitted representation:** compare original source obligations against each arm's exact packet, including explicit exceptions, scope, actors, modalities, conditions, negation, attribution, temporality and open questions. Merely embedding source text or repeating a term is not demonstrated recipient understanding.
3. **Transmitted representation → observable recipient response:** evaluate question-relevant requirements, contradictions, unsupported assertions and appropriate uncertainty. A correct short answer is not penalised for leaving out irrelevant source passages.
4. **Semantic comparator:** keep mechanical candidate alignments, independent/source-grounded reviewer judgments, and operator review **separate**. If a proposed model judge is used, give it blinded arm names, validate it against positive/negative controls, record its own model and limits, and account for additional requests inside the fixed ceiling. Do not present heuristic equivalence as established meaning preservation.
5. **Failure taxonomy:** ordinary-only miss, both wrong, enhancement-only improvement, enhancement-induced regression, invented permission, erased condition, reversed modality, wrong referent, speaker attribution failure, source conflict forced into YES/NO, unjustified abstention, invalid citation, model/schema failure, instrument false alarm, instrument miss and NOT_ASSESSED.

Report **paired comparisons**, not just total correct:

- A versus B: B improved / B worsened / tied / unassessable.
- B versus C: C improved / C worsened / tied / unassessable. **This is the primary incremental test of the Understanding inventory.**
- A versus C: C improved / C worsened / tied / unassessable.

Use case-level denominators and stratify by expected label, profile/domain, stressor and development/evaluation. Report both **a tie when both are right** and **a tie when both are wrong**, and do not call either a win. Report invalid/missing outputs as failures, not successful disagreements. Interpret a twenty-case exploratory suite cautiously; do not claim population-wide superiority or statistical significance from a small, hand-authored set. Also report when the same model answers identically under all three arms (ceiling effect).

## Phase 5 — Iterate responsibly and report both useful and harmful cases

The user wants iterative engineering development **without repeated GUI operation**. You may keep improving the compiler and prompts on development cases and add newly authored development cases in separate versioned files. Do **not** tune on the 14 held-out items and then report their rerun as an independent win.

Any candidate improvement should receive:

- One precise observed failure and a minimal proposed repair.
- A regression test that fails before the repair and passes after it.
- Rerun of all six development cases (all arms), with before/after results.
- An explicit check that the repair does not create false positives on faithful paraphrases or convert unknown information into invented facts.
- A documented decision: keep, revert, or inconclusive.

Stop after the scheduled frozen evaluation. If results reveal structural issues, enumerate them and propose the **next** experiment rather than silently turning this into an endless paid search.

## Phase 6 — Deliverables

Create these under a uniquely named batch-run directory:

- `manifest.json` — hashes, git checkpoint, seed, runtime/config versions, profile versions, model IDs, experiment standing, source/oracle identities.
- `cases/<id>/...` — trace and all derived products for each case, with arm identity.
- `results.json` and `results.csv` — 20 rows (or clearly marked partial rows) with decisions for A, B and C, exact correctness against provisional reference, review standings, errors and changes.
- `COMPARISON.md` — plain-English overall results and paired win/regression/tie tables, including cases where Language harms communication.
- `FAILURES.md` — provenance-bound analysis of missing conditions, errors, model/evaluator defects and unsuccessful attempts.
- `viewer.html` — static, offline-readable report with a 20-case table and expandable source, three packets/answers, pre-/post-meaning inventories and source-linked discrepancies. No online GUI needed to *run* the batch.
- `LC-02-BATCH20-REPORT.md` — management summary, exact commands, evidence claims, standing of provisional oracle, interventions, limitations, reproducibility notes and recommended next experiment.

Also provide a concise response to these questions:

1. Did ordinary communication outperform, underperform or tie AI-mediated communication on these exact cases?
2. Did Understanding-enhanced mediation outperform, underperform or tie AI mediation **without** the compiler?
3. On which exact examples did it help, hurt or make no difference, and what evidence supports that classification?
4. What meaning-decomposition, attribution, scope, relation or evaluation failures appeared?
5. Were results held out at the point of testing, and what cannot yet be concluded?

Before concluding, run and report Python tests, Studio tests, parent verification and appropriate offline browser/report checks. Do not change canonical manuscript claims. No automatic git commit, push or PR.

**Acceptance condition:** The user receives a reproducible, command-line-executed twenty-case experiment with inspectable per-case evidence and a credible account of **wins, regressions, ties and remaining uncertainty**. The experiment must be allowed to conclude “we found no Language advantage in these cases.”
