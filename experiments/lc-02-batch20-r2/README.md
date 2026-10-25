# LC-02-BATCH20-R2 — Independent evaluation preflight

This directory contains the offline preflight for the fresh 16-case evaluation.
No hosted Language model was called.

## Commands

From `C:\Projects\project-language`:

```powershell
# V1 blind package and review comparison (already collected)
node --experimental-transform-types experiments/lc-02-batch20-r2/make-blind-package.mjs
node --experimental-transform-types experiments/lc-02-batch20-r2/compare-reviews.mjs

# V2 correction and V2 blind delta package
node --experimental-transform-types experiments/lc-02-batch20-r2/make-v2.mjs
node --experimental-transform-types experiments/lc-02-batch20-r2/make-blind-package.mjs --design experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json --out experiments/lc-02-batch20-r2/blind-v2
node --experimental-transform-types experiments/lc-02-batch20-r2/make-blind-package.mjs --design experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json --out experiments/lc-02-batch20-r2/blind-v2-delta --ids R1E-04,R1E-08,R1E-16
node --experimental-transform-types experiments/lc-02-batch20-r2/compare-delta.mjs

# Human review (after two independent readers complete the V2 package)
node --experimental-transform-types experiments/lc-02-batch20-r2/compare-human-reviews.mjs --a experiments/lc-02-batch20-r2/reviews/human-a.json --b experiments/lc-02-batch20-r2/reviews/human-b.json

# Scripted dry run of all 16 V2 cases (no hosted calls)
node --experimental-transform-types experiments/lc-02-batch20-r2/run-fresh.mjs --design experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json --out experiments/lc-02-batch20-r2/.runs/DRY-RUN-V2-001 --seed lc02-r2-dry-v2

# Failure accounting controls
node --experimental-transform-types experiments/lc-02-batch20-r2/failure-control.mjs

# Compiler qualification
node --experimental-transform-types experiments/lc-02-batch20-r2/qualify-compiler.mjs

# Frozen live protocol and status
node --experimental-transform-types experiments/lc-02-batch20-r2/freeze-protocol.mjs
node --experimental-transform-types experiments/lc-02-batch20-r2/make-preflight-status.mjs

# Tests
node --experimental-transform-types --test experiments/lc-02-batch20-r2/fresh-v2.test.mjs
```

## Standing

- V1 remains frozen and unrun: `2c88429b777baca7207aad13ea3041746bc0a99d0d96fcc217aed81856c78de4`.
- V2 is frozen and unrun: `c1ca37936300384536b3c94d5cf5b38076b3a813bf6c934c0a053b9bd6bc09d9`.
- The blind reviewers are model-based provisional reviewers, not independent human adjudication.
- The dry run is scripted engineering evidence, not model evidence.
- Live execution is not authorized.
