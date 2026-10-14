# OpenCode Relate

OpenCode Relate is a small OpenCode plugin for answering a question similarity alone cannot answer:

> **How does this piece of information relate to that one?**

It emits typed, directional relationship observations with evidence and a first-class `UNKNOWN` path.

## One job

```text
item A + item B + relation vocabulary
        ↓
      RELATE
        ↓
RelationObservation
```

Relate is **not** a vector database, general retriever, truth engine, memory system, attention ranker, or authority gate.

## Install

Requires Git, Node.js **22.18 or newer** and npm. Use a source checkout; this
recipe does not assume the package is published to npm:

```powershell
git clone https://github.com/ernanhughes/opencode-relate.git C:\Projects\opencode-relate
Set-Location C:\Projects\opencode-relate
npm ci
npm run load-check
```

For an **OpenCode 2** host, merge this into the target project's `opencode.json`:

```json
{ "plugins": ["file:///C:/Projects/opencode-relate"] }
```

On Linux/WSL, clone into `/home/<user>/projects/opencode-relate`, run the same npm
commands, and use `file:///home/<user>/projects/opencode-relate`. The package entrypoint
is `src/index.ts`; root `index.ts` also exports the plugin for directory discovery.
This is a V2 `@opencode/plugin` definition. The V2 field is **`plugins`**;
see [OpenCode's plugin configuration](https://opencode.ai/v2/docs/plugins).
Restart the host after configuration changes. Host loading is a later integration
check; the offline load check only constructs the tool surface.

## Configure

No runtime configuration required. The deterministic classifier has no backend,
API key or inference setting. `relate_many` accepts 1..8 candidates;
`relate_rank` accepts 1..16 and one of the five rank relations below. These
are tool input limits, not configurable batch sizes.

## First use

After `npm ci`, run `node examples/first-use.mjs` from the checkout. It invokes
`relate` with two fully specified source references and disjoint texts:

```json
{
  "left_text": "The event writer appends immutable records.",
  "right_text": "Focus mode batches everything into the morning digest.",
  "left": {"id": "event-note", "kind": "text"},
  "right": {"id": "focus-note", "kind": "text"}
}
```

Expected: `{observation}` with generated `observation_id`, `relation: "UNKNOWN"`,
`status: "unknown"`, `direction: "not_applicable"` and `unknown_reason`.
UNKNOWN is an intentional abstention, not an invocation failure. The same file
calls `relate_rank` with a missing-column state and two named action candidates
(migration and retry), `relation: "appropriate_remediation"`. Its `{ranking}`
contains candidate scores/ranks, margin, calibration and status. Inspect the actual
returned order; this is a heuristic example, not measured utility or permission
to execute a migration. Inputs and IDs are created in the example, not external artifacts.

Both calls execute the existing tools offline with no model or host. Submit the
same inputs to the named tools after host installation. Successful offline output
does not establish host loading, truth or ranking generalisation.

## Health check

Call `relate_health` with `{}`. Expected: `ok: true`, version, six-label taxonomy
**including UNKNOWN**, and the five rank relations. `npm run load-check` is the
offline tool-surface equivalent; neither performs inference.

## Troubleshooting

- Tool absent: check V2 `plugins`, the checkout URL/dependencies and restart; compare with `npm run load-check`.
- `EMPTY_INPUT`: provide nonempty texts. UNKNOWN on nonempty texts is supported success; inspect its reason instead of forcing a label.
- Ranking unknown/ambiguous: check the supported relation, candidate kinds and margin; do not interpret scores as probabilities or utility.

## OpenCode tools

- `relate` — judge one ordered pair.
- `relate_many` — compare one focal item against a bounded candidate set.
- `relate_rank` — rank up to 16 candidates by directed compatibility with a subject state for one relation. Returns `RelationRanking` (scores, ranks, margin, calibration, `observed`/`ambiguous`/`unknown`). Measurement only, never permission to execute.
- `relate_health` — readiness/configuration without inference.

## Implemented relation vocabulary

`SUPPORTS`, `CONTRADICTS`, `UPDATES`, `IMPLEMENTS`, `RELATED`, `UNKNOWN`.

These are six labels total, including first-class UNKNOWN. The earlier 16-term
seed catalogue was a proposal; it is not the implemented classifier taxonomy.

## Core result

```ts
type RelationObservation = {
  observation_id: string
  left: SourceRef
  right: SourceRef
  relation: string
  direction: "left_to_right" | "right_to_left" | "symmetric" | "not_applicable"
  confidence?: number
  evidence: EvidenceSpan[]
  status: "observed" | "unknown"
  unknown_reason?: string
  producer: { plugin: "opencode-relate"; version: string; model?: string }
}
```

A confidence number never substitutes for evidence or `UNKNOWN`.

## Subject → candidate compatibility (v0.2-experimental)

`relate` asks "how are these two items related?" `relate_rank` asks
"which candidate fits this subject?" for a named relation:

```text
subject state + candidates + relation ("appropriate_next_action")
        ↓
RelationCompatibility (asymmetric need→action affinity + directional grounding)
        ↓
RelationRanking { ranks, margin, calibration, observed|ambiguous|unknown }
```

Rank relations: `appropriate_next_action`, `appropriate_remediation`,
`appropriate_tool`, `appropriate_model`, `appropriate_context_operation`.
Kinds (`state`→`action`, `task`→`tool`, …) are explicit labels, not agent
concepts — core stays boring and general.

Architecture preserved:

```text
RELATE
 ├── Projection (classifyPair)   X ↔ Y  "how are these related?"
 └── Compatibility (rankCandidates) X → candidates  "which candidate fits?"
```

Invariants: scores are uncalibrated ordering evidence, not probabilities;
`COMPATIBILITY != USABILITY` — a ranking carries no `permission_to_execute`
and never authorizes action; `UNKNOWN`/small-margin `ambiguous` is success.

Bake-off on `tests/action-battery.json` (12 directed cases with hard
negatives): random top-1 0.09, cosine 0.73, projection 0.64, compatibility
1.00 with confident-wrong rate 0 and abstention accuracy 1. Cosine picks the
same-vocabulary trap (retry) on the missing-column migration; projection
ties and cannot discriminate. Circularity warning: fixtures were authored
against the heuristic, so this is a regression battery, not a
win-over-cosine claim — see `eval-actions-report.json`.

## Core distinctions

```text
similarity != relationship
relationship != truth
relationship != authority
```

## Composition

Relate never calls Lens, Radar, or Authority. An orchestrator may pass Lens artifacts into Relate or RelationObservations into Radar.

## Prior work

Inspect https://github.com/ernanhughes/relate for taxonomy/test ideas. It is prior art and evidence, not an automatic runtime dependency.

Also inspect:

- https://github.com/ernanhughes/project-context-opencode
- https://github.com/ernanhughes/opencode-remembering

## Status

**v0.1 implemented.** Deterministic cue-based classifier (six labels including first-class UNKNOWN), OpenCode tools (`relate`, `relate_many`, `relate_health`), 24-case frozen battery with hard negatives, coverage-gated evaluator, unit tests, no-inference load check. No embedding model, no LLM judge, no retrieval. Heuristic limits documented in code; win-over-cosine untested (PEX-R2).

**E01 frozen (experiments/E01-freeze.md).** Directed state→action compatibility (`relate_rank`, 5 rank relations), 12-case RELATE-ACTION battery, four-way bake-off in `eval-actions-report.json`. Regression/architectural evidence only — not a generalization claim. Scorer frozen until real-trace v0.2 exists (protocol: `experiments/trace-extraction-protocol.md`, schema: `experiments/replay-schema.json`).

## Capability provider

- **Capability:** typed directional relationships and subject-to-candidate compatibility ranking.
- **Interfaces:** OpenCode plugin: relate, relate_many, relate_rank (up to 16 candidates) and relate_health; deterministic classification/ranking library; no hooks.
- **Current maturity:** IMPLEMENTED+TESTED; recorded regression/evaluation evidence does not establish generalisation or live runtime validation.
- **Evidence:** 13 test declarations; 24-case and 12-case batteries; [classification report](eval-report.json), [ranking report](eval-actions-report.json) and [E01 freeze](experiments/E01-freeze.md). Recorded scores were not rerun; fixture circularity is explicit.
- **Known limitations:** UNKNOWN is first-class; ranking signals are not truth, general decision quality or authority. The implemented classifier has six labels including UNKNOWN; the broader seed vocabulary remains historical design input.
- **Used by:** No confirmed direct runtime consumer; possible orchestrated composition accepts Lens artifacts and supplies observations to Radar, without sibling-plugin calls.
- **Registry:** Language `planning/capability-providers/` (Language-side availability index; this repository is the source of truth for itself).
- **Evidence snapshot:** Audited 2026-10-02 against commit 11f88e9c.
  See repository history and current status for later changes.
