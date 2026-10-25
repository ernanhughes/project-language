# LC-02V — Development qualification

Status: PARTIAL_QUALIFICATION_PENDING_SEMANTIC_REVIEW. No hosted inference, manuscript change, commit or push.

## What ran

A separately delegated AI authored four exposed development inventories before seeing baseline outputs: migration, interview attribution, temporal permission/exception and ambiguous pronouns. Exact Unicode codepoint support spans and UTF-8 source hashes validate. Migration remains development material. The author saw adjacent case question/reference fields while obtaining the migration source: strict blindness cannot be claimed. The other three sources and inventories share an author. All references are UNADJUDICATED_REFERENCE, not validated gold. See `core/understanding/qualification/AUTHORING.md`.

The unchanged Python compiler ran on all four passages. Migration produced 5 sentence-level units versus 6 reference units. Interview produced 4 versus 4, temporal policy 4 versus 4, and pronoun passage 3 versus 3. Baseline relationships were zero throughout, versus 3/2/3/2 reference relationships. Equal unit counts do not establish equal meanings. The baseline supplies neither actor/action fields nor cross-sentence relationship analysis. These are capacity limitations, not independently adjudicated extraction scores.

Artifacts: `evidence/lc-02v-001/comparison.json`; subsequent runner revision additionally copies the reference snapshot into new output directories. Original run evidence is retained unchanged.

## Model-assisted boundary

Existing interpreter instructions now explicitly request separate independent meanings within sentences, multi-sentence evidence, actor/action attribution, preserved qualifications and uncertain readings, using the existing strict Proposal contract. No transport or acceptance schema was changed. Relations use the existing relation vocabulary; arbitrary semantic relation types remain a limitation.

The offline runner can consume explicitly supplied captured inventories carrying model, call ID and HOSTED_CAPTURE/SCRIPTED attribution. It never invokes a model. No new model-assisted semantic evidence was collected. Scripted Chromium responses validate integration only. A real baseline-versus-model semantic comparison is therefore pending authorization and suitable captured output, not reported as a success.

## Checking and Studio

The checker binds exact sources and reference/candidate hashes. Span overlap supplies navigation candidates, never semantic credit. Separate review records can assess coverage, source support, classification, qualifications, relationships, unsupported additions and uncertainty. Findings require reasons and unit IDs; disagreements and unknowns remain recorded. Reviewer independence is declared provenance, not automatically verified identity. No complete-understanding score exists.

Six engineering tests cover deliberate omission, reversed permission, altered timing, faithful paraphrase, drift and conflicting reviews. These demonstrate that lexical overlap cannot certify mutated meaning; they do not demonstrate an autonomous semantic judge that detects every defect. Independent semantic review remains required.

Studio adds advisory plain-English atomicity, support, relationship and uncertainty checks to the existing review. No extra main button or interface was introduced. Existing proposal cards retain qualifications, evidence and relationships. Review diagnostics are source-version-bound through existing saved alignment records.

## Reported UI blockage

Start is intentionally disabled while a comparison awaits human review. The UI now explains this explicitly and says that the phase is waiting for the user. Reject and stop is visible without expanding alternatives. Approve & Finish stays disabled until the review checkbox is checked. UNKNOWN_IS_NOT_PERMISSION now explains the incompatible unknown/status combination and correction/rejection options. The protocol check remains unchanged. The exact failing live response was not inspected or repaired; the UI report alone does not establish which model stage generated it. No live rerun was performed.

## Verification

- Python: 15 passed.
- Studio: 72 passed (including two new decomposition tests).
- Qualification checker: 6 passed.
- Parent TypeScript and tests: 1114 passed, 3 skipped, 0 failed.
- Actual Chromium: source inventory, exact evidence, three-button flow, human acceptance, both second passes, reload, Settings persistence and mobile layout passed. Three injected responses, zero hosted requests. Evidence: `evidence/lc-02v-browser-001/`.
- Hugo not run: implementation repository has no manuscript changes; the separate book repository was untouched.

## Remaining qualification work

Obtain a reviewer distinct from the reference author and extraction author to adjudicate the candidate inventories against sources, including classification/qualifications/relationships and mutation sensitivity. Real model extraction has not been evaluated. Do not promote this partial engineering qualification to a semantic-quality or language-advantage claim.
