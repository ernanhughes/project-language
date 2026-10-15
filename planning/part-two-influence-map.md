# Model-side control for Part II: influence under constraint

Status: working research map, 2026-10-15. Authorised by the current “Language Part II — Influence Under Constraint” request. No manuscript changes or renumbering are authorised by this map.

Grounding: `language@3de3aea`, `project-language@3239630af2755bead748c1a674fde515041e592a`, Pi 1.0.4, the existing *Pi Agents* book (42 numbered chapters, six parts, plus appendices), and `pi-agents`. The Pi book and examples are references, not rebuild targets. No new literature search.

## Question and boundaries

What information may influence an AI computation, under whose authority and constraints, and what evidence shows that the influence helped rather than merely changed the result?

Available ≠ retrieved ≠ eligible ≠ selected ≠ assembled ≠ delivered ≠ used ≠ helpful. Stored ≠ projected; memory ≠ context; relevance ≠ permission; similarity ≠ currentness; model preference ≠ authority.

## Working units (model-side questions, not chapters)

| Unit | Question | First capability candidates | State |
|---|---|---|---|
| II-01 | What information is available? | Compiler candidate builder; explicit source inventory | Inventory represented in first admission fixture |
| II-02 | Which retrieved material may enter? | Compiler eligibility plus host admission records | Implemented and observed: context-admission-v1; see execution record |
| II-03 | What durable memory may be projected now? | Remembering; conversation projection | Proposed; not run |
| II-04 | What is current, superseded or contradictory? | Declared temporal records; remembering/relations | Temporal admission only in first fixture; broader mechanism proposed |
| II-05 | What deserves attention? | Radar | Proposed; lifted tests alone do not qualify it |
| II-06 | What admissible context fits the budget? | Compiler | Narrow composition exercised by first increment |
| II-07 | What should each recipient receive? | Compiler projection; authority | Proposed |
| II-08 | What was actually delivered? | Provider-boundary observation; transport reference | First increment observes a scripted Pi provider callback |
| II-09 | Speak, act, defer or abstain? | Authority; typed outcomes | Deterministic answer/abstention separated in first increment; broader actions proposed |
| II-10 | Can these compose into a controlled context runtime? | Host plus the preceding libraries | Proposed; not established by one admission example |

**Decision (fixed by the author):** Chapters 13–20 remain the attention-centred Part II, "Too Much Information", with the human-facing Radar as its composition. These units are not chapters and do not become Chapters 13–22. They are model-side control questions that Part II's implementation reuses: admission governs what may influence a model computation; a separate human-facing gate governs what a person is shown, at what resolution and when. Model delivery is not human presentation, and neither is noticing, use or benefit. Chapters 21–22 belong to Part III and are not affected. The manuscript is not edited by this map.

## First increment

See `context-admission-v1.md` in this directory. Primary mapping: **II-02, retrieval versus admission**; II-01/04/06/08/09 supply supporting checks, not five additional demonstrations.

Code belongs in `project-language`: `core/admission/`, `host-pi/admission.ts`, `examples/part-two-admission/` and `experiments/context-admission-v1/`. No existing Part I interface changes. Existing concurrent Part I fixes are preserved and not incorporated as new evidence for this design. The lifted compiler and shared Pi harness used here are unchanged from the pinned commit.

The preservation heuristic is not an admission or utility instrument. Keyword stuffing is a negative control. Source traceability is not semantic correctness. Provider delivery is not model use, and changed output is not demonstrated benefit.

First increment completed locally: the real Pi/faux loop discriminates the three conditions and records forged-authority, omitted-source and zero-budget controls. Sixteen new tests pass; both pinned-base and live regression suites remain green. See the execution table, provenance and limits in `experiments/context-admission-v1.md`. This changes the status of II-02 only; broader currentness, memory, attention, recipient projection and runtime claims remain proposed.
