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
| `core/language` + `host-pi/language.ts` + `examples/ch07-record` | **Adapter built and tested in a real Pi session** (Chapter 7). `before_agent_start` hands the model the rendered projection of a verified record, once per turn, read-only. Unverified state (torn, corrupt, unaccepted human edit, missing thread) is never injected; the turn proceeds without it and the outcome is recorded as a session entry. Run `npm run example:ch07`. |
| `core/sidecar` + `host-pi/sidecar.ts` + `examples/ch08-sidecar` | **New module, tested in a real Pi session** (Chapter 8). No lifted provider covers it: `lens` derives with lineage and `evidence` records observations, but neither encodes what may appear beside a source or how it must be labelled. Four layers are kept apart; an item's layer is fixed by the door it came through (the model can only reach `sidecar_propose`, which always yields a model-answer candidate); items are re-validated when read back; nothing notifies or enters the model's context; the ledger has two columns and no total. Run `npm run example:ch08`. **Known weakness:** the rule requires an answer to state its limits, not to state them honestly; `"None."` is accepted. |
| `core/relations` + `host-pi/relations.ts` + `examples/ch09-relations` | **New module on top of `core/relate`, tested in a real Pi session** (Chapter 9). Similarity finds candidates and carries no label; a relation step labels them; whether to show a label depends on the reader's task. Every record says how it arose (asserted by a source / classified / adjudicated) and how far to trust it; a classifier's output is only ever a proposal, only a person adjudicates (the model has no tool that can), and a contradiction without a declared, shared scope is flagged and not shown as one. Run `npm run example:ch09`. **Known limits:** the classifier is `core/relate`'s cue-based v0.1 and misses 3 of the 7 hand-picked probe pairs (it calls a scope condition a contradiction, misses an explicit update and a contradiction with no negation word); the vocabulary has no "adds nothing" relation, so a near-duplicate is labelled as support; the scope guard needs scopes to be declared by someone. |
| Other `core/*` modules (compiler, lens, relate, radar, evidence, verify, proof, work, vfs, language, transport, remembering) | **Lifted, not yet qualified.** Copied from the earlier plugin repos minus their OpenCode-SDK files; see `PROVENANCE.md`. Typecheck is clean and their own tests pass (see `PROVENANCE.md` for the 3 skips and the retired packaging tests). None has been exercised against Pi yet; passing their own tests says nothing about behaviour inside a Pi session. |
| `opencode-expertise`, `opencode-observability` | **Not lifted.** They have no TypeScript `src/` of the same shape (CLI/library and Python harness). Decide separately. |

Today the only rendering `core/language` produces is the record itself, wrapped in a notice and delimiters. It shows the source / record / rendering distinction, but not yet one record rendered several ways; that needs `core/lens`.

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
