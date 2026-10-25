# LC-02-R5 — Uncertainty grounding and meaning alignment

Offline experiment. No hosted model calls.

## Files

- `CHECKER-CONTRACT.md` — versioned R5 contract.
- `fixtures/development-cases.json` / `development-references.json` — 12 development pairs.
- `fixtures/evaluation-cases.json` / `evaluation-references.json` — 24 held-out evaluation pairs.
- `fixtures/FREEZE.json` — corpus hashes frozen before execution.
- `SUCCESS-CRITERIA.json` — prospective criteria, frozen before the held-out run.
- `run-checker.mjs` — runs the R5 checker and lexical baseline.
- `study-prior-failures.mjs` — applies R5 to LC20-07/10/02/19.
- `SUMMARY.json` — metrics, criteria results and decision.
- `../LC-02-R5-REVIEW.md` — full review.

## Reproduce

```powershell
node --experimental-transform-types experiments/lc-02-r5/build-corpus.mjs
node --experimental-transform-types experiments/lc-02-r5/run-checker.mjs --split development --out experiments/lc-02-r5/.runs/DEV-004
node --experimental-transform-types experiments/lc-02-r5/run-checker.mjs --split evaluation --out experiments/lc-02-r5/.runs/EVAL-001
node --experimental-transform-types experiments/lc-02-r5/study-prior-failures.mjs
node --experimental-transform-types experiments/lc-02-r5/make-summary.mjs
```

Do not tune on the evaluation split after seeing results.

## Standing

- References are author-constructed provisional, not independent human adjudication.
- The checker is heuristic and returns candidates, not verified equivalence.
- It has no action authority, does not accept transformations and does not repair them.
- A negative result is valid.
