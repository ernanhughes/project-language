# First observation — unit II-02

Run: [`2026-10-15T09-55-43-168Z-892aabc5`](results/2026-10-15T09-55-43-168Z-892aabc5/report.json). Protocol: [PROTOCOL.md](PROTOCOL.md). This is a synthetic typed lookup through a real Pi 1.0.4 session with a faux provider; no real-model comparison was run.

| Condition | Delivered source IDs | Reader result | Bytes | Estimated tokens | Permission / currentness violations |
|---|---|---|---:|---:|---|
| Indiscriminate | current, private, stale, lexical, stuffed, instruction | Abstain: conflict | 3114 | 224 | private / stale |
| Similarity-only | instruction, lexical, private | Wrong answer: 7 | 1012 | 32 | private / none |
| Constrained | current | Correct answer: 3 | 443 | 20 | none / none |
| Forged authority | current | Correct answer: 3 | 443 | 20 | none / none |
| Needed source omitted | none | Abstain: no fact | 68 | 10 | none / none |
| Zero byte budget | none | Abstain: no fact | 0 | 0 | none / none |

The ordinary caps were 1200 bytes and 200 estimated tokens. The zero-byte control records `ASSEMBLED_BUDGET_EXCEEDED` and no confirmed delivery. Absence of a violation in an empty projection is not task success. The word-based compiler estimate (`round(words × 1.3)`, Python-compatible rounding) undercounts compact JSON; the independent exact UTF-8 byte gate supplies the hard size limit. Neither cap bounds total Pi input or actual tokenizer cost.

The example validates source hashes and admission reasons, records each pipeline transition, and compares against an evaluator-only oracle. Mutation/order/rename/time tests probe reliance on fixture-specific answers or IDs. High query overlap does not grant permission, currentness, standing or configuration scope. The baselines intentionally bypass policy over invented data and report that fact. These deliberately constructed contrasts discriminate mechanisms; they do not estimate prevalence, model quality or general retrieval effectiveness.

Verification: live baseline 949 pass / 3 skip / 0 fail; live after 965 pass / 3 skip / 0 fail; clean pinned export plus the additions 868 pass / 3 skip / 0 fail. Typecheck passed in each verification. Sixteen tests are new. The three skips are existing optional database tests. Hugo exit 0, 41 pages. Exact commands, preserved logs, runtime versions, hashes, concurrent-head context and the workspace preservation audit are in the run's `verification.json` and `verification/` directory.

Development failures are recorded in `verification/development-notes.md`. They are resolved and are not represented as successful observations. No existing Part I source interface was changed; the package adds one runnable command. The shared compiler, similarity function and session harness are unchanged from `3239630`. Concurrent Part I repairs were committed separately during this work and are not claimed as effects of the admission implementation.

For the full evidence scope and limits, read the protocol. This increment supports **retrieval versus admission (II-02)**. It does not establish semantic preservation, authenticated authority, arbitrary prompt-injection protection, memory quality, model use or helpfulness, or a complete context runtime. No manuscript claim is promoted automatically.
