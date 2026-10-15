# Provenance

Everything under `core/` other than `core/authority/tests`' new host tests was lifted on 2026-10-14 from the repositories below, at the commits shown. `host-pi/` and `harness/bun-test.ts` are new. `harness/session.ts` is copied from `pi-agents/examples/harness` at `5bc4e63`.

| Module | Source repository | Commit | Uncommitted changes at copy |
|---|---|---|---|
| authority | opencode-authority | `19658e5` | 0 |
| compiler | project-context-compiler | `8d8bd31` | 0 |
| vfs | opencode-vfs | `b42fedc` | 0 |
| relate | opencode-relate | `5adc5c4` | 0 |
| remembering | opencode-remembering | `ad576ff` | 0 |
| work | opencode-work | `89e0570` | 3 |
| transport | project-context-opencode | `b708aa6` | 0 |
| radar | opencode-radar | `83d8dc9` | 0 |
| language | opencode-language | `1179eaf` | 0 |
| lens | opencode-lens | `74b47cd` | 0 |
| evidence | opencode-evidence | `3cdbfb5` | 0 |
| proof | opencode-proof | `59bddf1` | 0 |
| verify | opencode-verify | `c7cebf3` | 0 |

`work` was copied from a working tree with 3 uncommitted changes; the lifted `work` code is therefore not any single commit.

## Left behind (imports the OpenCode plugin SDK)

These files were not lifted. Their logic (tool wrappers, registries, hook wiring) is host-shaped and gets re-expressed in `host-pi/` when needed. `dev-cli.ts` files were removed too: they imported `plugin.ts`.

- `compiler`: `src/opencode/plugin.ts`
- `compiler`: `src/opencode/tools.ts`
- `vfs`: `src/index.ts`
- `relate`: `src/plugin.ts`
- `relate`: `src/tools.ts`
- `remembering`: `src/plugin.ts`
- `remembering`: `src/tools.ts`
- `work`: `src/plugin.ts`
- `work`: `src/tools.ts`
- `transport`: `src/index.ts`
- `transport`: `src/observer/capture.ts`
- `radar`: `src/plugin.ts`
- `radar`: `src/tools.ts`
- `language`: `src/plugin.ts`
- `lens`: `src/plugin.ts`
- `lens`: `src/tools.ts`
- `evidence`: `src/plugin.ts`
- `evidence`: `src/tools.ts`
- `proof`: `src/plugin.ts`
- `proof`: `src/tools.ts`
- `verify`: `src/plugin.ts`
- `verify`: `src/tools.ts`

Also removed because they test the plugin shell, not the capability: `plugin-load` tests (evidence, verify, proof, work); compiler `tests/opencode` and `entry.test.ts`; transport observer hooks and their tests; language `plugin.test.ts`; remembering `tools.test.ts`; work `expertise_runtime` and `adapter-paths` tests.

## Mechanical changes to lifted files

- Relative imports given explicit `.ts` extensions (Bun resolves extensionless imports; Node does not): 163 files.
- `bun:test` imports pointed at `harness/bun-test.ts` (61 files), a shim over `node:test`; `import.meta.dir` became `import.meta.dirname`.
- `transport` imports of `project-context-compiler/core` now point at `core/compiler`.
- Tests run with `--experimental-transform-types` because the lifted code uses TypeScript parameter properties.
- `core/authority` was restructured to `src/` and `tests/`, and its OpenCode tool-wrapper tests were dropped.
- No logic was edited. If a lifted test passes, it passes against the original logic.

## Test repairs (2026-10-14, after the first commit)

The first lift left 39 failing tests, all from environment and layout. Fixed by class; no capability logic was changed:

- **language:** CLI, lock and LANG-00 tests spawned `src/*.js` that the original repository built. They now run the `.ts` sources with `--experimental-transform-types`. The frozen `experiments/LANG-00/` directory (protocol, fixtures, expected hashes) was copied from `opencode-language` so the fixture-reproducibility test runs; its generator script imports `src/index.ts` instead of `dist/src/index.js` (one line changed).
- **work:** adapters imported sibling checkouts by absolute path, which Node on Windows rejects. They now use `file://` URLs, and also resolve siblings under the unified `core/` layout (`core/evidence`, not `opencode-evidence`). One test assertion that named the old layout was updated.
- **remembering:** `sql/` was copied so the SQL-to-client contract tests run.
- **transport:** the architecture test no longer asserts a declared package dependency on the compiler; the compiler is now `core/compiler`. The "no vendored compiler sources" check is kept.
- **Retired** (they tested the original plugin packaging, which this project does not have): compiler `dist-freshness`; remembering `packaging` and `no-python-runtime`; transport `entry`.

Result: 687 tests, 684 pass, 3 skipped, 0 fail; typecheck clean.

## New (not lifted)

- `core/sidecar`, `host-pi/sidecar.ts`, `host-pi/language.ts`, `host-pi/authority.ts`, `harness/bun-test.ts` were written for this project. `core/sidecar` exists because no provider in the registry covers the Chapter 8 rules; it reuses `core/lens` (`render`, `splitSentences`) for derivation.
- `core/relations` and `host-pi/relations.ts`: new. `core/relate` classifies a pair but has no notion of route, standing, scope or adjudication; those rules of Chapter 9 are enforced here. Built on `core/relate` (`classifyPair`, `cosineScore`).
- `core/preservation` and `host-pi/preservation.ts`: new. It composes `core/evidence` (`recordStructured`) and `core/verify` (`evaluate`) and adds declaration-before-output, the four outcomes, content versus function, the profile and instrument probing. It also probes `core/lens`'s `preservationReport`.
- `core/ladder` and `host-pi/ladder.ts`: new. No provider covers declared interpretive decisions, settled-only checking, or the name-versus-definition probe. `core/ladder/fixtures/queue.ts` is the chapter's job-queue worked example.
- `core/browser` and `host-pi/browser.ts`: new. Composes `core/preservation`, `core/sidecar` and `core/relations`. `core/browser/fixtures/incident.ts` is a constructed incident report; every name, number and service in it is invented. `core/preservation` gained an optional `extra` argument to `validateInstrument` (domain-specific mutations) and a line-aware `dropSentenceMatching`, both needed by the browser's gate.
- `core/record` and `host-pi/record.ts`: new. Chapter 7's document record. `core/browser` now imports its record types and `validateRecord` from here and re-exports them. `core/record/fixtures/retry-policy.ts` and `breakers.ts` are constructed for illustration; the "direct" renderings in `retry-policy.ts` are hand-written to show drift and are not model output.
- Correction: `core/language` and its example were first labelled Chapter 7. That was wrong; see the README. The example is now `examples/conversation-state`.
