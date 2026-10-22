# Prospective freeze procedure and decision rules v1

State: **HUMAN_REVIEW_PENDING / LIVE_EXECUTION_NOT_AUTHORIZED / PROPOSED_NOT_FROZEN**. This is a proposed preregistration for human review, not a scientific freeze or evidence of comparative accuracy. The machine-readable proposed lock has immutable file hashes but no authority to execute.

## Outcomes specified before any comparative live run

Primary outcome: correctness of the fresh recipient's applied reconstruction for each predeclared source-bound question, adjudicated against an independently reviewed answer set AND minimum supporting rationale. Merely repeating a field or guessing the right label is insufficient. Report case-level complete reconstruction as a separate count: all required questions correctly applied with no disqualifying false permission. Multiple questions within one source are not independent experimental units.

Secondary outcomes, each separately: critical qualifications/conditions omitted or reversed; unsupported additions per claim; uncertainty preserved or unjustifiably strengthened; false permissions; successful corrections from a demonstrably defective initial proposal; appropriate abstention; and capacity limitations caused by unavailable/insufficient delivered information. No opaque aggregate quality score.

Resources: source/message/quotation/context bytes; tokenizer-estimated and provider-reported input, output, reasoning/cache tokens separately; attempts/calls; wall latency including review/retry/correction overhead; reserved estimates; reported catalogue estimates; and independently reconciled invoice cost or UNKNOWN. Bytes are not a substitute for token or semantic equality. Manual human labor time is separately unknown unless measured.

## Missing and failed cases

Keep every scheduled task/condition in the coverage denominator. Record not dispatched, admission refusal, transport failure, cancelled, timeout, malformed output, truncation, schema-valid response and adjudicable response separately. Do not score infrastructure failure as evidence the recipient misunderstood. Report achieved correct reconstructions over ALL scheduled questions alongside conditional correctness among completed independently adjudicable responses; missing outcomes remain explicit, never silently excluded or imputed as a semantic error.

A recipient's UNKNOWN may be appropriate given a lossy packet while still failing the communication task relative to the complete source. Record recipient behavior and channel capacity on separate axes. Do not automatically blame the recipient. If a frozen question is later found defective, retain it and report the defect/unscored coverage; any changed question belongs to a new prospective version. Never drop an unfavorable case after outputs to improve results.

## Assessors and disagreements

Two human reviewers write initial source judgments independently before seeing the author key or one another. Preserve originals and any admitted loss of blinding. Resolve differences through source-bound human adjudication; unresolved items remain unresolved until fixed before freeze or declared unscored controls. The process cannot be replaced by schema validity or agreement of AI models.

Baseline evaluator C remains advisory. Against independently adjudicated claim-level positive/negative controls, report false endorsements (unsupported claim labelled supported), missed valid refusals (appropriate abstention rejected), false alarms and missed unsupported claims. Show confusion counts, abstentions and unassessable items separately; no empirical judge-error rate exists from scripted controls. In WB, C is a fresh recipient, not that evaluator. A fourth logical independent assessment role is still required outside negotiation.

No confirmatory significance testing is computed from scripted traces or this small proposed calibration pilot. A later confirmatory study needs separate design, sample size, held-out sources and analysis approval. No human-facing communication benefit follows from AI-to-AI results.

## Review-to-freeze gates

1. Reviewers submit completed copies bound to the exact pack/source/question hashes.
2. Human adjudication records final answers, qualifications, alternatives, uncertainty, disagreement resolutions and independent identities. Review status alone does not approve execution.
3. Resolve route/auth compatibility, model revision uncertainty, tokenizer/hidden accounting, input/output settings, exact case/condition/model schedule and budget. Qualify any missing DIRECT_ONESHOT path offline without changing historical comparison arms.
4. Create a NEW approved prospective lock binding final source/question/rubric hashes, role/model identities, prompts, code/schemas, request/attempt policy, privacy, reservations and fail-closed rules. Never overwrite 01A/01B locks or this pending proposal to manufacture reproduction.
5. Obtain separate explicit execution approval referencing that exact lock. Only then may a comparative live runner be activated. Hashes prove byte identity, not reviewer independence, scientific validity or human authorization.

Existing manual smoke launchers remain historical/separate engineering utilities. No manual smoke flags bypass these comparative study gates. TRANSFER-01C executes no live inference, does not read credentials and does not modify prior evidence. HaluEval stays disabled; Taint and Hallucination Energy remain NOT_COMPUTED.
