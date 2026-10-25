# LC-02-R4 — Independent semantic checking

Offline experiment. No hosted model calls.

## Files

- `CHECKER-CONTRACT.md` — versioned input/output contract.
- `fixtures/development-cases.json` / `development-references.json` — 12 development pairs.
- `fixtures/evaluation-cases.json` / `evaluation-references.json` — 12 held-out evaluation pairs.
- `fixtures/FREEZE.json` — SHA-256 freeze of all four corpus files, written before checker execution.
- `run-checker.mjs` — runs the new checker and the exact-match lexical baseline.
- `study-prior-failures.mjs` — applies the checker to LC20-07, LC20-10, LC20-02 and LC20-19.
- `../LC-02-R4-SEMANTIC-CHECKER-REPORT.md` — full report.

## Reproduce

```powershell
node --experimental-transform-types experiments/lc-02-r4/build-corpus.mjs
node --experimental-transform-types experiments/lc-02-r4/run-checker.mjs --split development --out experiments/lc-02-r4/.runs/DEV-004
node --experimental-transform-types experiments/lc-02-r4/run-checker.mjs --split evaluation --out experiments/lc-02-r4/.runs/EVAL-001
node --experimental-transform-types experiments/lc-02-r4/study-prior-failures.mjs
```

The evaluation corpus is frozen. Do not tune on it and report a rerun as held out.

## Standing

- References are author-constructed provisional, not independent human adjudication.
- The checker is heuristic and produces candidates, not verified equivalence.
- It has no action authority, does not accept transformations and does not repair them.
- A negative result is valid.
