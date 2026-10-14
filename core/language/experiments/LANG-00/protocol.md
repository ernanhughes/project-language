# LANG-00 protocol (frozen for this session)

## Chain under test

```text
verified state → deterministic renderer → plugin hook output
→ final host context → independent observer capture
```

Reconciliation PASSES only when:

```text
expected_rendered_bytes == hook_emitted_content_bytes == observer_extracted_content_bytes
```

compared as UTF-8 bytes of the extracted content field. Any host
normalization (prefix, suffix, role conversion, newline conversion,
duplication, truncation, replacement) is reported, never canonicalized away.

## Layers

| Layer | Name | Admission |
|---|---|---|
| L0 | Core runtime floor | full deterministic suite passes on Node `22.18.x` |
| L1 | API shape | installed host + supported plugin/hook API identified directly |
| L2 | Disabled load | plugin loads disabled with zero context/store effect |
| L3 | Enabled static read | explicit thread verifies + renders, no store mutation |
| L4 | Hook transport harness | real adapter injects one exact block; conflicts deterministic |
| L5 | Installed-host transport | host invokes hook; independent observer captures exact final bytes |
| L6 | Fail-closed matrix | missing/malformed/torn/pending/conflicting cases inject nothing |
| L7 | One-call readiness | gated single-call script + isolated profile pass dry-run only |

## Fixture

Synthetic project `C:/lang00/demo project` (never created; space included),
thread `lang00-static-01`, canary `CANARY-LANG00-7F3A`. Generator
`scripts/make-fixture.mjs` is byte-deterministic; golden files are frozen in
`fixtures/` and `expected/`. Re-generation must reproduce every hash.

## No-inference load check (`scripts/load-check.ps1`)

Isolated process environment only: temp `OPENCODE_CONFIG_CONTENT`
(registering only this plugin by `file://` path), temp project, temp
`OPENCODE_LANGUAGE_HOME`, temp spool dirs, `--standalone`, invalid model.
Asserts: plugin entry resolves, disabled setup registers zero hooks
(harness), enabled setup registers exactly `["context"]`, invalid model is
rejected with no captures and no inference. Never touches user config,
never kills foreign processes, cleans up only owned temp dirs.

## Live smoke (`scripts/live-smoke.ps1`, NOT executed here)

Gated by `LANG00_AUTHORIZE_MODEL_CALL=YES`, explicit `LANG00_MODEL`, and
`LANG00_MAX_OUTPUT_TOKENS<=32`. One session, one message (frozen canary
request), no retry/fallback, bounded timeout, observer pinned. Dry-run mode
validates everything without submitting. Only dry-run runs in LANG-00.

## Out of scope

Post-turn triggers, re-entrant generation, listeners, sidecars, watchers,
Remembering/VFS integration, semantic scoring, LANG-01.
