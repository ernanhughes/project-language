# LC-02 — Implementation and offline comparison report

Status: OFFLINE_IMPLEMENTED_AND_TESTED; EXPLORATORY_DEVELOPMENT; INDEPENDENT_EVALUATION_PENDING.

## LC-01 semantic finding

The real S-17 Qwen recipient correctly refused public archive release without owner approval. The explanation cited the separate approval requirement and the exception's explicit public-release prohibition. Accepted Version 2 begins `6dad8fde`. The original 44-event journal, human revision and failed attempts remain unchanged. See `LC-01-SEMANTIC-CLOSURE.md` and the hashed read-only extraction at `evidence/lc-02-development-001/lc01-closure.json`.

No conventional comparator was run. Enhancement remains untested; the finding is not general comprehension, independent human validation or a Language advantage. Billing did not determine closure.

## What now works

Simple Mode defaults to **Start Comparison → See Results**. The ordinary path receives the full original prose; the Language path receives that identical source plus accepted source-linked meaning. Intent, purpose, audience, exact human clarifications, recipient model/settings and question are shared. Recipient sessions are fresh and separate. The application question is withheld from interpretation and revealed only after packets are sealed. Exact delivered content and responses are recorded.

The real-provider path uses the existing runtime and approvals, stops for review of the exact proposed version, and supports rejection or an explicitly requested correction. Both arms receive any resulting human clarification. No automatic semantic acceptance, retry or provider fallback was added. The offline path uses explicitly scripted TEST_OPERATOR acceptance. It cannot establish real human acceptance or a model effect.

Mechanical schema/source binding, candidate-reference agreement and human-entered semantic assessments remain separate. Eight criteria cover interpretation, retention, loss, unsupported inference, ambiguity, unknowns, decision quality and correction. Results initially say NOT_ADJUDICATED; a candidate match is labelled UNADJUDICATED_REFERENCE. Assessments append records without changing answers. Supported loss/inference means an adverse phenomenon was evidenced, not a higher score.

Provider configuration, credentials-availability checks, finite request/spending caps, timeouts and usage remain under Advanced / Infrastructure and in operational logs. Semantic results and scores contain no cost/token/billing measures. Saving unchanged settings/roles preserves the existing in-process approval; material changes, scope changes and restart require fresh authorization. A legacy request cannot borrow comparison scope authorization.

The existing S-17 exchange stays intact alongside separately journaled comparison state. The implementation reuses Studio version/acceptance/packet methods, source anchors, strict schemas, Runtime and chained Log rather than building independent applications for each participant type. Human-recipient and richer multi-agent loops remain future adapters.

## First offline comparisons

| Authored development illustration | Ordinary | Language | Interpretation |
|---|---|---|---|
| Readiness and authority | YES | NO | Constructed potential help: preserving approval limits |
| Straightforward boundary | NO | NO | Constructed tie: ordinary prose is sufficient |
| Unresolved review | UNKNOWN | YES | Constructed harm: invented permission |

**These answers are scripted fixtures, not observed model results.** They exercise the machinery and demonstrate why a mechanically valid mediation may be semantically harmful. They do not show that Language helps or harms actual model communication. All three cases are exposed implementation-authored development material. Independent unseen evaluation cases are explicitly absent and pending external authorship/review. No confirmatory analysis or superiority verdict is made.

Exact sources, delivered packets, fixture responses and rubric are in `evidence/lc-02-development-001/offline/comparison.json`; `viewer.html` is a self-contained offline viewer, and `events.jsonl` preserves the chained trace. `infrastructure.json` is a separate operational artifact. The offline export manifest hashes those files.

## Verification actually run

- Studio unit/integration suite: **50 passed**, including a paired comparison through actual Pi adapters with injected HTTP responses; no hosted requests. Covers source parity, withholding, isolated sessions, exact review, shared correction, stale-version rejection, partial failure retention, scope/approval gates, replay, manual assessments and unchanged-settings approval retention.
- Parent `npm run verify`: TypeScript passed; **1,114 passed, 3 skipped, 0 failed** (1,117 tests). It does not substitute for the separately run Studio tests.
- Actual Chromium LC-02: two-button fixture flow, six recipient cards, reload, mobile layout, Advanced closed by default, no operational economics in visible research results, invalid remote role selection blocked.
- Actual Chromium injected-provider comparison: exact review required, no recipient sent before review, three adapter requests, separate human semantic assessment, failed provider request preserved with an understandable error and no retry. **Zero real provider calls.**
- Actual Chromium legacy regressions: five Simple flow/resume/failure scenarios; provider configuration/approval flow across API families; fixture legacy workflow, reload and export. The resume test reads a prefix of a copied S-17 journal before its successful transfer; it never edits the completed original.
- Initial checks exposed a legacy mobile text overflow and failure text being overwritten by state refresh. Both were repaired and rerun successfully. Failed test artifacts are retained; no model response was repaired.
- Historical evidence/data/config/task files and prior reports match the pre-task baseline. New evidence is in a distinct directory. Credentials and `.env` are excluded. No manuscript files, prior run locks or provider definitions were changed. No commit or push.
- `git diff --check` passed. Hugo was not run: this task changes the application repository, not the read-only book/Hugo repository.

Evidence paths under `evidence/lc-02-development-001/`: `unit-complete.txt`, `parent-verify.txt`, `browser-final/browser.json`, `browser-review-02/browser.json`, `browser-legacy-simple-05/browser.json`, `browser-provider/browser.json`, `browser-legacy/browser.json`, `preservation.json`. The directory manifest records file hashes; the source manifest records this implementation version. Historical qualification receipts remain historical, not a new live lock.

## Open it

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs
```

Open the printed URL. Start Comparison runs fixtures, without hosted inference. See Results shows the paired answers. Advanced contains operational configuration and exports. Use a new output directory for each command-line fixture export:

```powershell
node --experimental-transform-types apps/language-demo/evaluation/run-offline.mjs apps/language-demo/evidence/my-offline-comparison
```

## Remaining research decisions

Arrange independently authored unseen cases with prospectively reviewed references and uncertain cases. Authorize a separately bounded hosted comparison only when ready. Decide how blinded semantic review will work, what counts as meaningful improvement, and how to give an interactive conventional baseline equivalent clarification opportunities. Extra mediation and human review are part of this treatment; this design cannot attribute an effect to structured representation alone. Equal results and worsening remain acceptable findings. No new remote inference was performed in this task.
