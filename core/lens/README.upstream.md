# OpenCode Lens

OpenCode Lens is a small OpenCode plugin for producing **purpose-specific, source-linked representations** of information without pretending that a generated representation is the source or its complete meaning.

> **The source stays primary. The representation is compiled output.**

## One job

Given a source and a purpose, produce a representation useful for that purpose while preserving lineage back to the source.

```text
source + purpose + requested resolution
        ↓
       LENS
        ↓
RepresentationArtifact
+ source lineage
+ preservation report
```

Lens is **not** a memory system, retriever, relevance ranker, personalisation engine, or authority gate.

## Install

Requires Git, Node.js **22.18 or newer** and npm. Use a source checkout; this
recipe does not assume the package is published to npm:

```powershell
git clone https://github.com/ernanhughes/opencode-lens.git C:\Projects\opencode-lens
Set-Location C:\Projects\opencode-lens
npm ci
npm run load-check
```

For an **OpenCode 2** host, merge this into the target project's `opencode.json`:

```json
{ "plugins": ["file:///C:/Projects/opencode-lens"] }
```

On Linux/WSL, clone into `/home/<user>/projects/opencode-lens`, run the same npm
commands, and use `file:///home/<user>/projects/opencode-lens`. The package entrypoint
is `src/index.ts`; root `index.ts` also exports the plugin for directory discovery.
This is a V2 `@opencode/plugin` definition. The V2 field is **`plugins`**;
see [OpenCode's plugin configuration](https://opencode.ai/v2/docs/plugins).
Restart the host after configuration changes. Host loading is a later integration
check; the offline load check only constructs the tool surface.

## Configure

No required runtime configuration. OPTIONAL environment variables:

| Variable | Default | Behaviour |
|---|---|---|
| `LENS_MAX_BRIEF_SENTENCES` | `3` | Parsed integer, range 1..20; controls extractive BRIEF length. Invalid values raise `CONFIG_INVALID`. |
| `LENS_MODEL` | unset | Producer annotation only; does not enable inference. |

Implemented modes are `SOURCE`, `BRIEF`, `STRUCTURED`. LLM-backed rendering
and the larger candidate mode catalogue below remain proposed.

## First use

After `npm ci`, from this checkout run:

```powershell
node examples/first-use.mjs
```

The complete example calls the implemented `lens_render` tool offline with
`source: {id: "build-note", kind: "text", content: "Build passes. Deployment requires approval."}`,
`purpose: "inspect build status"`, `mode: "SOURCE"`. It prints
`{artifact, trace}`: the artifact contains its generated `artifact_id`, the source
reference, `derived_from`, the verbatim `representation`, producer and preservation
report. It also calls `lens_health` with `{}`. No model, network or OpenCode session
is required. In a configured host, submit the same input to `lens_render`.

This demonstrates source lineage and the SOURCE path. A heuristic preservation
report is not semantic preservation proof, and this offline invocation does not
prove the host loaded the plugin.

## Health check

Call `lens_health` with `{}` in the host. Expected: `ok: true`, version, the three
implemented modes, resolved config and trace. Offline equivalent:
`npm run load-check`. Neither check calls a model or verifies semantic preservation.

## Troubleshooting

- Tool absent: check the V2 `plugins` field, file URL, installed checkout dependencies and host restart; run the offline load check to separate tool construction from host loading.
- `CONFIG_INVALID`: unset or correct `LENS_MAX_BRIEF_SENTENCES` to an integer 1..20.
- `SOURCE_UNAVAILABLE` / unsupported mode: supply nonempty source content and one of the three implemented modes; requesting a proposed mode does not enable it.

## OpenCode tools

- `lens_render` — produce one source-linked representation.
- `lens_compare` — compare a derived representation with its source and report survival/loss.
- `lens_health` — report plugin/model/config readiness without transforming anything.

Candidate representation modes: `SOURCE`, `GLANCE`, `BRIEF`, `DETAIL`, `TABLE`, `TIMELINE`, `CLAIMS`, `DECISIONS`. This list is seed data, not an ontology.

## Core contract

```ts
type SourceRef = {
  id: string
  kind: string
  uri?: string
  version?: string
  scope?: string
  observed_at?: string
}

type RepresentationArtifact = {
  artifact_id: string
  source: SourceRef
  purpose: string
  mode: string
  representation: string
  derived_from: string[]
  producer: { plugin: "opencode-lens"; version: string; model?: string }
  preservation: PreservationReport
}

type PreservationReport = {
  claim_survival?: "preserved" | "partial" | "lost" | "unknown"
  qualifier_survival?: "preserved" | "partial" | "lost" | "unknown"
  numerical_survival?: "preserved" | "partial" | "lost" | "unknown"
  uncertainty_survival?: "preserved" | "partial" | "lost" | "unknown"
  provenance_survival?: "preserved" | "partial" | "lost" | "unknown"
  unsupported_additions?: string[]
  notes?: string[]
}
```

## Composition

Lens does not call the other Language plugins directly. The orchestrating agent composes them:

```text
source → Lens → representation
              → Relate → relationships
              → Radar → attention plan
              → main agent → Authority → world
```

Each plugin must remain useful alone.

## Architectural references

Follow the engineering style of:

- https://github.com/ernanhughes/project-context-opencode
- https://github.com/ernanhughes/opencode-remembering

These are architectural references, not runtime dependencies.

## Status

**v0.1 implemented.** Deterministic extractive core (`SOURCE`/`BRIEF`/`STRUCTURED`), OpenCode tools (`lens_render`, `lens_compare`, `lens_health`), engine unit tests, no-inference load check. No LLM-backed rendering yet; no empirical result claimed; preservation grades are heuristic proxies, not semantic verdicts.

See [DESIGN.md](DESIGN.md) and [AGENTS.md](AGENTS.md).

## Capability provider

- **Capability:** source-linked alternative representations with heuristic preservation reports.
- **Interfaces:** OpenCode plugin: lens_render, lens_compare and lens_health; deterministic extractive library with SOURCE / BRIEF / STRUCTURED modes; no hooks.
- **Current maturity:** IMPLEMENTED+TESTED; unit evidence only, with no empirical preservation claim.
- **Evidence:** 11 engine test declarations and a no-inference load-check procedure; checks were not rerun in this documentation pass.
- **Known limitations:** Heuristic preservation reports do not prove semantic preservation. The larger mode catalogue and LLM-backed rendering remain proposals; source identity stays primary.
- **Used by:** No confirmed direct runtime consumer; possible orchestrated composition supplies representations to Relate/Radar/Authority without direct sibling calls.
- **Registry:** Language `planning/capability-providers/` (Language-side availability index; this repository is the source of truth for itself).
- **Evidence snapshot:** Audited 2026-10-02 against commit d9b6f7cb.
  See repository history and current status for later changes.
