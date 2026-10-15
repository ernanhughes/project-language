# Reconciling the preserved observation

The first observation (`results/2026-10-15T09-55-43-168Z-892aabc5/`) is preserved unchanged. Three things were added around it after review. None of them alters a recorded value.

1. **The verification logs are committed.** `checksums.json` names four `.log` files; `.gitignore` excluded `*.log`, so a commit made without them did not contain the evidence it named. A negation rule now keeps them under version control.
2. **The results directory is byte-exact on every platform.** `.gitattributes` marks `results/**` as `-text`, so no checkout converts line endings. The recorded checksums are of the original bytes (the logs contain CRLF), and this keeps them true. Check with `node experiments/context-admission-v1/verify-checksums.mjs <run-directory>`.
3. **The source fingerprints are reconciled.** `provenance.json` records 120 file fingerprints taken on a CRLF working copy. Run `node experiments/context-admission-v1/reconcile-fingerprints.mjs <run-directory>` to write `fingerprint-reconciliation.json`, which says for each file whether the LF form, the CRLF form, or the file as stored matches. Result at the time of writing: 43 match as LF, 75 match as CRLF, 1 matches as stored (a binary file the original run decoded as text), and 1 changed.

The one changed file is `examples/part-two-admission/run.ts`. It was edited after the observation so that **future** runs hash with line endings normalised to LF (`fingerprintHashing` in `provenance.json`), making them platform-independent. The change touches provenance hashing only; it does not alter any condition, gate or result. The observation itself was not re-run.

Runs made from now on record `fingerprintHashing: "sha256 of UTF-8 text with CRLF normalised to LF"`. Fingerprints from different hashing schemes are not comparable without this reconciliation.
