# LC-03-P0 — Communication utility design and feasibility

Offline design and feasibility. No hosted model calls. No Studio communication integration. No manuscript changes.

## Status

- LC-02 semantic-checker programme closed with `PREFER_DETERMINISTIC`.
- R6 typed-constraint checker retained as advisory.
- R7 hybrid retained as experimental evidence only.
- LC-03 is designed, not executed.
- P0 feasibility uses the existing exposed incident fixture and scripted answers. It is not a benefit measurement.

## Files

- `fixtures/incident-source.txt` — exposed incident fixture source.
- `fixtures/development-cases.json` — four development tasks.
- `fixtures/evaluation-plan.json` — 12-case evaluation design only; no evaluation sources authored.
- `fixtures/DEV-FREEZE.json` — development fixture hashes.
- `overlap-audit.mjs` / `overlap-report.json` — source-token Jaccard audit against 195 prior sources.
- `build-fixtures.mjs` — builds the development fixtures.
- `feasibility.mjs` — A/B/C offline feasibility path.
- `feasibility.json` / `feasibility.md` — feasibility output.
- `SUMMARY.json` — machine-readable closure and design summary.
- `EVIDENCE-INTEGRITY.json` — artifact and check hashes.
- `../LC-03-P0-COMMUNICATION-UTILITY.md` — full research closure and design.

## Reproduce

```powershell
node --experimental-transform-types experiments/lc-03-p0/build-fixtures.mjs
node --experimental-transform-types experiments/lc-03-p0/overlap-audit.mjs
node --experimental-transform-types experiments/lc-03-p0/feasibility.mjs
```

## Standing

- The incident fixture is exposed development material, not held-out evidence.
- The scripted scoring table illustrates the harness, not a recipient model.
- The representations are deterministic `core/browser` views, not AI-mediated representations.
- No benefit, superiority or production claim follows from P0.
- Evaluation sources must be independently authored, audited against every prior corpus, and frozen before execution.
