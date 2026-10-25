# LC-02-BATCH20-R1

Offline diagnosis and bounded repair for the frozen `LC-02-BATCH20` live run.

This directory contains no live model calls. It reads the frozen evidence under
`../lc-02-batch20/.runs/COMBINED-001/` and writes only new files here.

## Commands

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types experiments/lc-02-batch20-r1/diagnose.mjs
node --experimental-transform-types experiments/lc-02-batch20-r1/regression.mjs
node --experimental-transform-types experiments/lc-02-batch20-r1/qualify-baseline.mjs
node --experimental-transform-types --test experiments/lc-02-batch20-r1/fresh-design.test.mjs
```

`diagnose.mjs` writes `DIAGNOSIS.json` and `ADJUDICATION-WORKSHEET.md`.
`regression.mjs` writes `OFFLINE-REGRESSION.json` and `OFFLINE-REGRESSION.md`.
`qualify-baseline.mjs` writes `COMPILER-BASELINE.json`.
`freeze-design.mjs` validates and hashes `fixtures/fresh-evaluation-v1.json`; it
does not run the design.

## Standing

- The frozen oracle and retrospective scores are not modified.
- The adjudication ledger is implementation-team provisional judgment, not
  independent human adjudication.
- The regression is contract/mechanical testing with frozen, scripted and
  injected inputs. It is not evidence of improved model behaviour.
- The fresh design is frozen but unrun. No Language superiority or semantic
  improvement is claimed.
