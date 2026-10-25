# LC-02-R7 — Hybrid semantic checking qualification

Offline local-model experiment. No hosted model calls. No Studio communication integration.

## Decision

`PREFER_DETERMINISTIC`

The pilot hybrid was safe on the checked cases and detected more corruptions, but 12 of 24 pilot held-out cases overlap R5/R6 cases and 2 are exact duplicates. On the 12 non-overlapping cases, the hybrid does not improve detection over R6, adds a false rejection and lowers policy accuracy. The clean evidence favors the deterministic checker.

## Files

- `fixtures/development-cases.json` / `development-references.json` — 12 development pairs.
- `fixtures/evaluation-cases.json` / `evaluation-references.json` — 24 held-out pairs.
- `fixtures/FREEZE.json` — corpus hashes frozen before model execution.
- `SUCCESS-CRITERIA.json` — prospective gates and decision rule.
- `CRITERIA-FREEZE.json` — criteria hash and model/prompt freeze.
- `CONTAMINATION-DISCLOSURE.json` — post-execution overlap audit and clean-subset analysis.
- `build-corpus.mjs` — generates the 36 pairs.
- `run-hybrid.mjs` — runs A (R6), B (reviewer), C (hybrid) on identical cases.
- `qualify-local-reviewer.mjs` — local model qualification.
- `historical-controls.mjs` — disclosed historical development controls.
- `analyze-results.mjs` — read-only gate analysis of the frozen held-out results.
- `EVIDENCE-INTEGRITY.json` — integrity and check results.
- `SUMMARY.json` — machine-readable summary.
- `../LC-02-R7-HYBRID-REVIEW.md` — full review.

## Implementation

- `apps/language-demo/evaluation/semantic-reviewer-v7-contract.mjs`
- `apps/language-demo/evaluation/semantic-reviewer-v7.mjs`
- `apps/language-demo/evaluation/hybrid-checker-v7.mjs`
- `apps/language-demo/tests/semantic-reviewer-v7.test.mjs`

## Reproduce

```powershell
node --experimental-transform-types experiments/lc-02-r7/build-corpus.mjs
node --experimental-transform-types experiments/lc-02-r7/qualify-local-reviewer.mjs
node --experimental-transform-types experiments/lc-02-r7/run-hybrid.mjs --split development --reviewer local --out experiments/lc-02-r7/.runs/DEV-005
node --experimental-transform-types experiments/lc-02-r7/historical-controls.mjs
node --experimental-transform-types experiments/lc-02-r7/run-hybrid.mjs --split evaluation --reviewer local --out experiments/lc-02-r7/.runs/EVAL-001
node --experimental-transform-types experiments/lc-02-r7/analyze-results.mjs
node --experimental-transform-types experiments/lc-02-r7/analyze-clean-subset.mjs
```

The held-out split has already been executed once. Re-running it is a reproduction, not a new evaluation. Do not change the checker, reviewer prompt, corpus, references, reconciliation rules or criteria in response to its results.

## Model

- Local Ollama `qwen3.5:latest`
- Digest `6488c96fa5faab64bb65cbd30d4289e20e6130ef535a93ef9a49f42eda893ea7`
- 9.7B parameters, Q4_K_M
- `think:false`, `temperature:0`, `num_predict:1400`, timeout 120 s
- 80-request budget, 24 held-out calls used
- No retries, no fallbacks, no hosted calls

The model was already installed. No download or system configuration change was made.

## Standing

- **The pilot corpus is contaminated.** 12/24 pilot held-out cases overlap R5/R6 cases; 2 are exact duplicates. `EVAL-001` is a contaminated pilot, not clean held-out evidence. See `CONTAMINATION-DISCLOSURE.json`.
- References are author-constructed provisional, not independent human adjudication.
- The local model is an observational instrument, not an independent semantic authority.
- `USE_TRANSFORMATION` means no material or unresolved finding remains under the current reconciliation policy. It does not prove semantic equivalence.
- No action authority, no Studio integration, no manuscript changes, no commit or push.
- A negative result is valid.
