# Reviews

- `reviewer-a.json`, `reviewer-b.json` — full V1 blind reviews by two model-based reviewers. Provisional, not human independent adjudication.
- `reviewer-a2.json`, `reviewer-b2.json` — V2 delta reviews of the three changed cases by two model-based reviewers. Provisional.
- `BLIND-REVIEW-COMPARISON.md/.json` — V1 comparison.
- `BLIND-REVIEW-V2-DELTA.md/.json` — V2 delta comparison.
- `human-a.json`, `human-b.json` — **not yet present.** The human independent review files.
- `HUMAN-COMPARISON.md/.json` — produced by `compare-human-reviews.mjs` after both human reviews are complete.

Do not show the model-based reviews to a human reviewer before that reviewer has completed the V2 package. The human review is the independence gate.
