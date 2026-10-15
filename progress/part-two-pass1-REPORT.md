# Part II, pass 1: final report (after repair 2)

This reports capability and evidence delivered; it does not say "Part II implemented". Local commits only; nothing pushed. Exact test counts are in the review pack (`verify/`) and the commit messages are the history. The first-pass numbers that used to be here were superseded by repair pass 2 and have been removed rather than left stale.

## Starting state
- project-language HEAD `6c286e08fba0ce6ec44aef94f6894a4ec6e1cadf`; language HEAD observed `7798abdb8b8358329a43fcf8cdd0c131860b6a98`.
- (First pass only) the admission work was uncommitted then; it is now Commit A of the stack.
- No conflict with the task found.

## Reuse decisions
| Existing | Decision |
|---|---|
| `core/compiler` | Reused unchanged. `selectUnits` presents units as `ContextCandidate`s; `dependsOn` gives dependency closure; the compiler trace gives refusal reasons. A test shows a claim whose qualifier is ineligible is refused for its dependency (`REJECTED_DEPENDENCY`). |
| `core/admission` | Reused unchanged: `observeDelivery` output becomes `ModelDeliveryReceipt`; its harness is used in the example. Its `decide` is not reused (it parses configuration facts only). |
| `core/preservation` | Reused for the wording obligation: anchored `mustKeep` + every content word of the qualifier, check validated by mutation probes before it is believed. |
| `core/relations`/`core/relate` | `cosineScore` for retrieval order only. A relation needs an explicit bridge. |
| `core/remembering` | Audited, not reused. Durable personal state is out of scope; the manuscript places persistence at Chapter 21. |
| `core/radar` `decide` | Kept unchanged; its limits (QUEUE always GLANCE, no DIGEST) are pinned by a test. New axes sit beside it. |
| `core/browser` `viewState`, `core/lens` | Not reused (terminal submissions are not a pending-delivery lifecycle; sentence heuristics are not a unit graph). |

## Files
Added: `PART-TWO-CONTRACT.md`; `core/radar/src/attention/{types,units,qualify,resolution,delivery,receipts,coverage,decision,scope,index}.ts`; `core/radar/fixtures/afternoon.ts`; `core/radar/tests/attention.test.ts`; `host-pi/radar.ts`; `host-pi/radar.test.ts`; `examples/part-two-radar/{run.ts,README.md}`; `progress/*`.
Changed: `README.md` (one row), `package.json` (one script).

## Verification
Run from clean worktrees at each commit: `npm ci`, `npm run verify`, `npm run example:admission -- --output <dir outside the repo>`, `npm run example:radar`, `git diff --check`. Results and logs are in the review pack, not repeated here so they cannot go stale.

## Defects found while building (fixed, each with a test)
1. An unresolved-relation item (non-interruptive) was promoted to NOW when the meeting ended, because the flag was derived once and not carried. Now carried in every revision.
2. Exclusion causes listed passing reasons as causes. Now `Eligibility.failed` and `AttentionResult.causes` carry only failures, several per item.
3. The first scope design cut Case B at eligibility instead of at the relation. Item `domain` (monitored area, compared with the task) and item `scope` (the claim's own scope, which a bridge connects) are now separate.

## Which chapter claims this supports (rung C only, scripted model)
- Ch 13: stages stay separate; no total; withheld items are recorded with causes and can be reopened only if still eligible; coverage is bounded.
- Ch 16/17: a subscription is matched as written (the "peer-reviewed" versus preprint contradiction in the manuscript is exposed, not repaired); a match is a candidate with standing; relation needs a bridge; knowledge omission needs known AND not depended on (fixture-level only).
- Ch 18: levels are checked on four separate obligations; the qualifier ("safe under crash faults") cannot be dropped by naming its unit; stop rule fails closed to the source; task-specific minimum resolution.
- Ch 19: selection, resolution and timing are independent; QUEUE+BRIEF and DIGEST reachable; urgency does not raise confidence (uncertainty travels); context is declared or observed only; every decision carries why-now reasons.
- Ch 20: ten-stage record with no score; versioned re-evaluation; coverage with a named boundary.

## What it does not establish
Real-model language quality; that any person noticed, understood, used or benefited; that a message was rendered (the receipt records an interface call); cross-domain discovery (the bridge is supplied); open-world coverage or recall; general semantic fidelity (the wording check is conservative, rejects paraphrase, and is defeated by copying the right words around a different meaning); prevalence; that the urgency/cost table is the right policy for a person. The urgency/cost table is a declared policy, which the chapter itself calls "starting points, not rules".

## Manuscript/code mismatches still needing the author
1. The task named Chapters 13 "The Fifteen Things in This Video" and 18 "What Did Compression Destroy?", and lists "Compression Has Levels" as 17. The manuscript on disk has 14 "A Video Is Not an Hour", 17 "From Channels to Semantic Channels", 18 "Compression Has Levels". The implementation follows the content, not those titles.
2. Chapter 17's subscription says "peer-reviewed"; Chapters 18 and 20 fire it on an unreviewed preprint. The code refuses the match and does not edit the subscription.
3. Chapter 18's example BRIEF says "safety without any delay bound" without the crash-fault scope. The code rejects that wording class.
4. Chapter 18's example concludes a different mechanism's result means "your safety result need not depend on bounded delay". The code leaves that relation unresolved without a scope-preserving bridge.
5. Chapter 20 says the Radar "forgets her between decisions" while Chapter 16 records dated evidence about her. Persistence was not built.

## Recommended next bounded pass
Chapters 17–18: a progressive-resolution audit with a stronger wording instrument (the present one is conservative and phrase-based), over several qualifiers per claim, plus frozen evaluation criteria and held-out renderings written before the check is tuned. Then Chapters 13–16 unit/task/knowledge machinery, starting with a unit decomposer, since units are caller-supplied here.
