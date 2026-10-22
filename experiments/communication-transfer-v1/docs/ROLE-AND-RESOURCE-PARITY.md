# Role and resource parity — prospective comparison v1

Status: PROPOSED_FOR_HUMAN_REVIEW. The original SOURCE / PLAIN / LINKED / CONTEXT definitions and schedules are unchanged. NEGOTIATED is a separate condition, not inserted into the four-arm lock.

## Logical roles and model families

| Study | Producer | Reviewer/recipient | Final recipient/assessment |
|---|---|---|---|
| Four-arm | A sender | B recipient | C advisory judge; human source-bound adjudication primary |
| Negotiation | Interpreter | Negotiation reviewer | Fresh recipient; independent human assessor outside exchange |

There are four logical functions in negotiation even if only three model families are used. Keep interpreter DeepSeek V4.1 Flash, fresh recipient Qwen3.8 Flash and reviewer GLM-5.3 in the initial proposed mapping, then reverse interpreter/recipient in matched trials. Keep receiving model and task the same within each comparison. These are prospective assignments, not what the faux provider ran. If GLM also supplies advisory assessment, it needs a new isolated session and remains correlated model advice, not an independent assessor. Extra advisory requests must be declared and charged in all compared conditions.

## Two distinct negotiation comparisons

| Condition | Model pipeline | Permitted correction | Interpretation |
|---|---|---|---|
| DIRECT_ONESHOT (prospective, not implemented) | ordinary sender → fresh recipient (2 calls) | receives the SAME final source/clarification facts in the input; no iterative repair | End-to-end practical cost baseline |
| ORDINARY_REVISED (existing DIRECT_REVISED) | initial sender → reviewer → revised ordinary sender → fresh recipient (4 calls) | same challenge opportunity and explicit clarification as NEGOTIATED | Resource-matched ordinary representation |
| NEGOTIATED | initial interpreter → reviewer → revised interpretation → fresh recipient (4 calls) | identical opportunity, clarification content and acceptance decision | Source-linked accepted-state representation |

For practical comparison, report DIRECT_ONESHOT versus NEGOTIATED including all actual overhead, while holding final permitted information equal. This estimates the complete workflow's utility/cost under that controlled information supply; it is not proof that negotiation discovered better information. A naturalistic variant where negotiation obtains otherwise unavailable clarification would need a separately declared information-asymmetry study.

For resource matching, give ORDINARY_REVISED and NEGOTIATED equal maximum calls and per-stage input/output/thinking token allowances, with the same total per-task reservations and matched models. Enforce a common transfer allowance counting quotations, metadata, current and historical context. Equal caps do not imply equal consumed tokens, meaning or effective effort: report actual measured differences. No extra hidden summary, retrieval, source fetch or repair channel is permitted. A hash-only unavailable source link is not delivered evidence.

Existing offline WB pairs compare only ORDINARY_REVISED and NEGOTIATED, both after the same simulated clarification. They compare representations after equal review opportunities, not negotiation versus no review. They use byte ceilings and unknown faux tokens; do not call their resource use tokenizer-matched.

## Counting and proposed scope

A logical call is one planned role-stage request. A transport attempt is one dispatched HTTP request, whether it succeeds or fails. Original comparative policy is one attempt per call, zero retries/fallback. A revision is a new complete proposed interpretation explicitly linked to a challenge; a challenge is a named reviewer question, not automatic acceptance. A completed task requires a schema-valid fresh-recipient answer to every predeclared question; semantic success requires independent judgment, not formatting alone.

Per-stage proposed completion ceiling remains 2,048 tokens and future deadline 60 seconds; tokenizer/input limits must be qualified. Aggregate run reservations include every model stage and any advisory assessor. An unused revision allowance cannot silently become another case or retry. The new manual smoke v3 (16K tokens and up to 3 retries) is a separate user-selected engineering tool and MUST NOT be used as this comparison runner.

The original main pilot proposal remains 48 calls: 2 tasks × 4 arms × 2 rotations × 3 roles. A separate proposed negotiation schedule could use two reviewed cases (licensing-resolved and staging-scope) × two rotations × (2+4+4 stages) = 40 calls, plus any separately approved advisory assessment. The unresolved-licensing case stays a review/control case unless prospectively selected. Neither schedule, nor their combined 88 calls, is authorized. No spending ceiling is invented for the negotiation study. DIRECT_ONESHOT implementation, exact settings and a new run lock remain explicit gates.
