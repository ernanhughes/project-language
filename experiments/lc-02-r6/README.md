# LC-02-R6 — Typed meaning constraints and epistemic separation

Offline experiment. No hosted model calls. No Studio communication integration.

## Files

- `fixtures/development-cases.json` / `development-references.json` — 12 development pairs.
- `fixtures/evaluation-cases.json` / `evaluation-references.json` — 24 held-out pairs.
- `fixtures/FREEZE.json` — final corpus hashes.
- `SUCCESS-CRITERIA.json` — prospective hard gates and decision rule.
- `CRITERIA-FREEZE.json` — criteria hash and pre-execution freeze.
- `build-corpus.mjs` — generates the 36 pairs and `FREEZE.json`.
- `run-compare.mjs` — runs R5 and R6 on identical cases.
- `probe-development.mjs` — 18 development probes, not held-out evidence.
- `reproduce-r5-failures.mjs` — historical R5 failure reproduction, not held-out evidence.
- `analyze-results.mjs` — read-only gate analysis of the frozen held-out results.
- `EVIDENCE-INTEGRITY.json` — integrity and check results.
- `../LC-02-R6-REVIEW.md` — full review and decision.

## Reproduce

```powershell
node --experimental-transform-types experiments/lc-02-r6/build-corpus.mjs
node --experimental-transform-types experiments/lc-02-r6/run-compare.mjs --split development --out experiments/lc-02-r6/.runs/DEV-009
node --experimental-transform-types experiments/lc-02-r6/probe-development.mjs
node --experimental-transform-types experiments/lc-02-r6/run-compare.mjs --split evaluation --out experiments/lc-02-r6/.runs/EVAL-001
node --experimental-transform-types experiments/lc-02-r6/analyze-results.mjs
node --experimental-transform-types experiments/lc-02-r6/reproduce-r5-failures.mjs
```

The held-out split has already been executed once. Re-running it is a reproduction, not a new evaluation. Do not change the checker, corpus, references or criteria in response to its results.

## Frozen protocol note

Before the held-out run, `R6-E12` was replaced with an invented-uncertainty case because that required category was missing from the first held-out freeze. The corpus and references were regenerated and re-frozen before any held-out execution. The superseded hashes are recorded in `LC-02-R6-REVIEW.md`.

## Standing

- References are author-constructed provisional, not independent human adjudication.
- `USE_TRANSFORMATION` means no material or unresolved finding among the assessed obligations. It does not prove semantic equivalence.
- The checker has no action authority, does not accept transformations, and does not repair them.
- A negative result is valid.
