# LC-02-BATCH20

This CLI composes the existing Studio Runtime, version/acceptance/packet contracts, source-anchor catalogue, Understanding workflow and hash-linked event log. It does not replace Studio or the unrelated context compiler/document semantic record. The capability registry was consulted; no existing provider implements this exact three-arm experimental schedule, so only orchestration and reporting are new.

## Commands

From C:\Projects\project-language:

```powershell
node --experimental-transform-types --test experiments/lc-02-batch20/protocol.test.mjs
node --experimental-transform-types experiments/lc-02-batch20/run.mjs --mode offline --split development --out experiments/lc-02-batch20/.runs/OFFLINE-NEW
node --experimental-transform-types experiments/lc-02-batch20/run.mjs --mode live --split development --max-remote-requests 30 --seed lc02-batch20-v1 --out experiments/lc-02-batch20/.runs/DEV-NEW --freeze-out experiments/lc-02-batch20/.runs/FREEZE-NEW.json
node --experimental-transform-types experiments/lc-02-batch20/run.mjs --mode live --split evaluation --max-remote-requests 70 --seed lc02-batch20-v1 --freeze experiments/lc-02-batch20/.runs/FREEZE-NEW.json --out experiments/lc-02-batch20/.runs/EVAL-NEW
node --experimental-transform-types experiments/lc-02-batch20/combine.mjs experiments/lc-02-batch20/.runs/COMBINED-NEW experiments/lc-02-batch20/.runs/DEV-NEW experiments/lc-02-batch20/.runs/EVAL-NEW
```

Use unique output directories. `--suite` and `--oracle` select input paths; defaults are the unchanged fixtures. `--dry-run` validates without calls. `--concurrency 1|2` bounds concurrent cases (default 2); arm order within cases is seeded. First development case is a standalone smoke, counted within the planned 30 calls. No extra challenger, evaluator, retry or fallback. No resume mode makes hidden repeat calls. The shared hash-linked REQUEST-LEDGER.jsonl enforces the absolute 120-call ceiling across live invocations and reserves against the existing configured $10 budget. Each case also respects the lower of five calls and the configured request cap. Do not remove/reset the ledger to bypass limits.

Settings are read from Studio's existing .settings/studio-v2.json, with existing defaults if absent. Credentials come only from process OPENCODE_API_KEY. Saved provider auth and .env are not read. Existing token/timeout/byte/provider settings are retained. Evidence collection enumerates only explicit run files and source directories; credentials are not collected.

Production acceptance is unchanged. Batch mediation uses explicitly recorded EVALUATION_ONLY scripted mechanical review and existing TEST_OPERATOR acceptance. This is not a human semantic review and grants no actions. Invalid source anchors, unknown-standing or schema errors stop that arm without repairing its result. Other arms continue. Source-only A requires no invented acceptance. A local analysis sentinel is used only to reuse post-delivery analysis and is never a communicated or accepted proposal.

All recipients receive identical original source, exact question, system obligations and source-anchor catalogue. B and C share prompts/contracts; only C's interpreter gets the fallible inventory. Compiler analysis performed for A/B evidence is never supplied to their models. Question and oracle are absent from interpreter input. No reference is in any outgoing payload. Actual requests, not just constructed test inputs, are captured. Every Runtime request has a fresh UUID session.

Freeze contains actual source/config/profile/model/fixture hashes, seed, limits and grading policy, not merely Git HEAD (the tree is dirty). Evaluation requires the freeze to match before calls; settings/source drift is checked before each case. Fixtures are never rewritten. The oracle is author-constructed; validation of exact quotations is not adjudication. All decision scores are UNADJUDICATED_REFERENCE. Semantic dimensions remain NOT_ASSESSED unless an attributed source-grounded review is separately recorded. Never equate a word/quotation match with entailment or comprehension. Models are not told an arm is expected to win.

The static viewer exposes sources, questions, reference requirements, exact packets, answers, inventories and event logs. Reports distinguish correct ties, wrong ties, improvements, regressions and unassessable outputs. Results contain 20 rows; split-specific runs retain NOT_RUN rows for the other split, then combine preserves both split results. No independent human agreement, significance or population-wide advantage is claimed.
