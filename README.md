# project-language

Runnable capabilities for the book *Language: When Intelligence Enters the Channel* (manuscript and planning live in [`ernanhughes/language`](https://github.com/ernanhughes/language)).

The idea is that the book's claims should be something you can run. This repository collects the capabilities explored in the earlier `opencode-*` plugin projects into one project, built so the host is replaceable.

## Shape

```text
core/       host-independent libraries; import nothing from any agent host
host-pi/    thin Pi adapter; the only place that imports Pi
harness/    a real Pi session driven by a faux model, for tests
```

The rule that keeps the host incidental: `core/` never imports Pi (or OpenCode). `host-pi/` is the only file set that does. Swapping the host means rewriting `host-pi/`, not the capabilities.

The host supplies model access and the request path. These modules work on what flows through, at the host's documented extension points, and never alter the host.

## Status

| Piece | State |
|---|---|
| `core/authority` + `host-pi/authority.ts` | **Walking skeleton.** A Pi `tool_call` is turned into a proposal, evaluated against a policy, and blocked, approved or allowed. Run through a real Pi session with a faux model. |
| Other `core/*` modules (compiler, lens, relate, radar, evidence, verify, proof, work, vfs, language, transport, remembering) | **Lifted, not yet qualified.** Copied from the earlier plugin repos minus their OpenCode-SDK files; see `PROVENANCE.md`. Typecheck is clean and their own tests pass (see `PROVENANCE.md` for the 3 skips and the retired packaging tests). None has been exercised against Pi yet; passing their own tests says nothing about behaviour inside a Pi session. |
| `opencode-expertise`, `opencode-observability` | **Not lifted.** They have no TypeScript `src/` of the same shape (CLI/library and Python harness). Decide separately. |

A faux-model test shows that the gate fires and blocks. It says nothing about real-model behaviour.

## Run

Pinned to Pi 1.0.4 (the release *Pi Agents* is written against). The lockfile is taken from `pi-agents/examples` so transitive packages match; a fresh unpinned install pulls a newer `pi-codemode` that does not load.

```bash
npm ci
npm run verify   # typecheck, then tests
```

Node 22.19 or later (TypeScript runs by type stripping).

## Provenance

Every lifted file comes from a named commit of a named repository. See `PROVENANCE.md`. Upstream READMEs are kept as `core/<name>/README.upstream.md`; they describe the OpenCode plugins, not this project.
