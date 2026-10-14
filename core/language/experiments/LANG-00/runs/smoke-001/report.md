# LANG-00 smoke 001 — admitted run report

Verdict: **L5 PASS → LANG-00 COMPLETE**.

## What was proven

During one real OpenCode generation on the installed host (v2.0.21,
standalone, fully isolated config), the static `opencode-language` adapter
injected exactly the frozen rendered block into the actual host system
context once, with no mutation and no normalization.

```text
frozen canonical block (1253 bytes, e2788c2d…)
  ==
hook-emitted block (e2788c2d…, derived via isolation + determinism)
  ==
observer-captured final host block (1253 bytes, e2788c2d…)
```

- 1 generation, 1 session (`ses_f06068f3…`), 1 context capture, model
  observed `opencode/muse-spark-1.3-contributor-free` = requested model.
- Block/canary/wrapper counts all exactly 1; system placement observed.
- Response (diagnostic only) contained the canary; output far under the
  32-token cap (75-byte response file).
- Run store verifies `ok` at the fixture revision; exactly 2 commits
  (init + apply); frozen LANG-00 goldens byte-unchanged.

## What was not proven

Model use of the block, semantic benefit, compaction survival,
maintenance, or any privilege/security boundary. The wrapper remains a
logical data boundary only.

## Artifacts

`manifest.json`, `reconciliation.json`, `response.txt`,
`expected-block.bytes` (canonical LF), `observer-captures.jsonl`,
`isolated-config.jsonc`. Raw temp work preserved at the path in
`manifest.json`’s run log (temp dir, same contents).
