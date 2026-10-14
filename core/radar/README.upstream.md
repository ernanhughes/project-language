# OpenCode Radar

OpenCode Radar is a small OpenCode plugin for deciding **what deserves attention now, at what resolution, and why**.

> **Relevant does not mean new. New does not mean urgent. Urgent does not mean true.**

It refuses to collapse source importance, task relevance, novelty, accessibility, evidential validity, urgency, timing, and resolution into one vague relevance score.

## One job

```text
candidates + task + policy/state
        ↓
       RADAR
        ↓
RadarDecision[]
```

Dispositions: `SHOW`, `QUEUE`, `SIDECAR`, `SKIP`.

Requested resolutions: `GLANCE`, `BRIEF`, `DETAIL`, `SOURCE`.

Radar decides attention, not transformation. An orchestrator may ask Lens separately for the requested representation.

## Install

Requires Git, Node.js **22.18 or newer** and npm. Use a source checkout; this
recipe does not assume the package is published to npm:

```powershell
git clone https://github.com/ernanhughes/opencode-radar.git C:\Projects\opencode-radar
Set-Location C:\Projects\opencode-radar
npm ci
npm run load-check
```

For an **OpenCode 2** host, merge this into the target project's `opencode.json`:

```json
{ "plugins": ["file:///C:/Projects/opencode-radar"] }
```

On Linux/WSL, clone into `/home/<user>/projects/opencode-radar`, run the same npm
commands, and use `file:///home/<user>/projects/opencode-radar`. The package entrypoint
is `src/index.ts`; root `index.ts` also exports the plugin for directory discovery.
This is a V2 `@opencode/plugin` definition. The V2 field is **`plugins`**;
see [OpenCode's plugin configuration](https://opencode.ai/v2/docs/plugins).
Restart the host after configuration changes. Host loading is a later integration
check; the offline load check only constructs the tool surface.

## Configure

No runtime configuration required. Every decision receives caller-supplied
metadata; there is no hidden user profile, backend or model. Required fields are
`id`, `task_relevance`, `novelty`, `evidential_validity`, `urgency`, `cost` with
the enums in the first-use input. `radar_batch` accepts 1..20 items and evaluates
each independently; it does not rank items against one another.

## First use

After `npm ci`, run `node examples/first-use.mjs`. It calls `radar_decide` offline
with this complete input (also suitable for the installed host tool):

```json
{
  "id": "build-note", "task_relevance": "high", "novelty": "NEW",
  "evidential_validity": "confirmed", "urgency": "routine", "cost": "low"
}
```

Expected: `{decision, decision_id}` with `decision.disposition: "SHOW"`,
`resolution: "BRIEF"`, reasons, uncertainty, policy version and producer.
Disposition controls attention; resolution is a separate requested minimum.
Other inputs can route to QUEUE/SIDECAR/SKIP. The caller is responsible for the
truth of `confirmed`; Radar does not verify it or produce a BRIEF representation.
This demonstrates deterministic routing, not measured usefulness, permission,
or host loading. No model or network is used.

## Health check

Call `radar_health` with `{}`: expect `ok: true`, version, `radar-policy-v0.1`,
four dispositions and four resolutions. Offline: `npm run load-check`.
This reports the tool/policy surface; it does not measure attention utility.

## Troubleshooting

- Tool absent: check V2 `plugins`, file URL/dependencies and host restart; run the offline load check.
- `INVALID_CANDIDATE`: supply every required enum exactly, including case-sensitive novelty values.
- Unexpected QUEUE/SIDECAR: inspect reasons and uncertainty, then correct the caller's metadata if appropriate; do not treat urgency as truth or routing as authority.

## OpenCode tools

- `radar_decide` — one candidate.
- `radar_batch` — bounded candidate set.
- `radar_explain` — explain a prior trace without re-deciding it.
- `radar_health` — readiness/configuration only.

## Dimensions

Keep conceptually separate:

- source importance;
- task relevance;
- novelty;
- current accessibility evidence;
- relationship to active work;
- evidential validity;
- urgency;
- cost/resolution;
- timing.

Not every dimension must exist in v0.1.

## Core result

```ts
type RadarDecision = {
  candidate: SourceRef
  disposition: "SHOW" | "QUEUE" | "SIDECAR" | "SKIP"
  resolution: "GLANCE" | "BRIEF" | "DETAIL" | "SOURCE"
  reasons: RadarReason[]
  uncertainty: string[]
  policy_version?: string
  producer: { plugin: "opencode-radar"; version: string; model?: string }
}
```

## Safe default

If evidence is insufficient to personalise or suppress safely, use a generic bounded policy rather than inventing a user profile.

"KNOWN" or equivalent means evidence that knowledge is currently accessible under specified conditions, not a stable cognitive trait.

## Composition

Radar may consume caller-supplied relationship observations or representation metadata, but it never calls Relate or Lens itself. It never grants authority.

## Status

**v0.1 implemented.** Deterministic policy engine (SHOW/QUEUE/SIDECAR/SKIP × GLANCE/BRIEF/DETAIL/SOURCE) over caller-supplied metadata, OpenCode tools (`radar_decide`, `radar_batch`, `radar_explain`, `radar_health`), 14-case conformance battery, unit tests, no-inference load check. No summarisation, no user modelling, no inference of any kind. Battery conformance (14/14) tests policy-implementation correctness only; attention utility unmeasured (PEX-D1 agent-task runs).

## Capability provider

- **Capability:** attention routing with disposition, resolution and recorded reasons.
- **Interfaces:** OpenCode plugin: radar_decide, radar_batch (up to 20 independently evaluated items), radar_explain and radar_health; deterministic policy library; no hooks.
- **Current maturity:** IMPLEMENTED+TESTED; attention utility remains unmeasured.
- **Evidence:** Nine test declarations; README records 14/14 conformance cases for policy implementation only. Checks were not rerun in this documentation pass.
- **Known limitations:** Attention routing != utility proof != authority. Batch does not rank candidates against one another; no summarisation, user modelling or agent-task validation is established.
- **Used by:** No confirmed direct runtime consumer; possible orchestrated composition receives caller-supplied Relate/Lens metadata without calling those providers.
- **Registry:** Language `planning/capability-providers/` (Language-side availability index; this repository is the source of truth for itself).
- **Evidence snapshot:** Audited 2026-10-02 against commit 826ebbea.
  See repository history and current status for later changes.
