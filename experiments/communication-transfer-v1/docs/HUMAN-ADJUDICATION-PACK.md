# TRANSFER-01C — independent human source review pack

Status: **HUMAN_REVIEW_PENDING**. No completed human reviews or adjudication exist in this package. The interface is a structured document plus two separate JSON review templates; no service, AI reviewer or account is needed.

## Distribute in two phases

Initial materials are in `human-review-v1/SOURCE-PACK.md`, `public-pack.json` and the reviewer's own `R1-initial-review.json` OR `R2-initial-review.json`. Send each reviewer only the source pack and their own template. Do not distribute the other review, model traces, arm/model labels or the author key at this stage.

The initial source pack contains five proposed tasks and nine questions: two baseline source families and three negotiated-source scenarios. For negotiated tasks, the complete source bundle explicitly distinguishes original expression from recorded SIMULATED_HUMAN clarification. Its bundle hash is separate from the original-expression hash. All tasks remain PROPOSED_UNADJUDICATED; none is claimed absent from training or independently true.

Each reviewer writes a supported decision, source-based rationale, exact anchor IDs, critical qualifications/exceptions, acceptable alternatives, unsupported assertions, critical omissions, abstention conditions, ambiguity/uncertainty and disagreement notes. Record QUESTION_DEFECT instead of forcing a yes/no decision when wording is not assessable. Templates contain no prefilled decision. Save completed copies outside the pinned templates; never overwrite source material.

The separate `AUTHOR-KEY-DO-NOT-DISTRIBUTE-INITIALLY.json` contains the source-supported **proposed** answers, alternatives, critical distinctions and negative controls for comparison only after the initial judgments have been submitted. It is process-sealed, not encrypted or technically access-controlled. File separation does not prove psychological blinding. Attest honestly if the key or other review was already seen; retain that review as unblinded rather than fabricating independence.

## Resolve disagreements explicitly

After both first submissions, retain their originals, identities, timestamps and hashes. Reveal the proposed key. Review every difference against the exact source, including UNKNOWN versus a qualified NO, source absence versus evidence of falsity, and unresolved licensing versus separate publication permission. Neither the AI draft nor a majority automatically wins.

An author and an independent human adjudicator record the final supported answer set, minimum source-grounded rationale, required conditions, accepted alternatives, and reason for each resolution. A third human resolves remaining disagreement if necessary; otherwise label UNRESOLVED and block the task or keep it an explicitly unscored control before freeze. Preserve prior judgments. Do not edit tasks after seeing pilot responses to improve performance.

Final adjudication must identify source/question/rubric hashes and declare approval separately from execution authorization. Revisions require new source IDs and a new prospective manifest. Schema-valid JSON, matching reviewer labels or a filled identity field is not independent adjudication. The validator cannot authenticate a real human.

## Offline validation

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types experiments/communication-transfer-v1/src/adjudication-v1/pack.mjs validate PATH_TO_COMPLETED_REVIEW.json
```

The validator reports pending/recorded/unblinded status but never activates a runner or declares adjudication complete. The pair comparator flags decision/ambiguity disagreements; a human must also compare rationale, omissions and alternatives. No confirmatory agreement metric is calculated from templates or synthetic validation records.

Host-only answer/rubric material is never imported by participant runners. A, B, model reviewer and fresh recipient retain their existing visibility boundaries. Do not paste the whole host review pack into a participant prompt. C's advisory opinion never replaces these human judgments.
