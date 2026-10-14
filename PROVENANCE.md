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
