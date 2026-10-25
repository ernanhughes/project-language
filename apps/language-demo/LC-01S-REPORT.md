# LC-01S — first real communication: preparation handoff

Date: 2026-10-23, Europe/London. **PREPARATION_PASS / LIVE_EXECUTION_BLOCKED_PENDING_APPROVAL_AND_SERVICE_USE_CONFIRMATION**.

The management decision accepted LC-01R offline and authorized LC-01S preparation only. This session completed offline qualification and a prospective S-17 plan. It did not execute an interpreter, challenger, mediator, recipient or evaluator against a live provider, and did not perform human acceptance. LC-01S's real-communication completion condition is therefore **not yet achieved**.

## Separate outcomes

| Area | Status | Meaning |
|---|---|---|
| REMOTE_TRANSPORT | NOT_TESTED_LIVE | Four actual Pi serializers pass injected qualification; remote authentication/availability not probed |
| INTERPRETER | NOT_EXECUTED | DeepSeek V4.1 Flash selected; no real response |
| CHALLENGER | NOT_EXECUTED | GPT-6 Luna selected; no real response |
| HUMAN_ACCEPTANCE | PENDING_PRODUCT_OWNER | No genuine acceptance has occurred; automated acceptance is labelled TEST_OPERATOR |
| SEMANTIC_STATE_INTEGRITY | PASS_OFFLINE | Exact version digest, source binding, current acceptance and task replay gates tested; no proof of source truth |
| FRESH_RECIPIENT | NOT_EXECUTED_LIVE | Qwen3.8 Flash selected; packet/session isolation verified offline |
| EVIDENCE_AND_REPLAY | PASS_OFFLINE | Preparation trace, HTML viewers, browser receipts and integrity-bound prospective plan saved; replay makes no provider calls |
| COMMUNICATION_RECONSTRUCTION | NOT_ASSESSED | No genuine model reconstruction exists in LC-01S yet |
| COMPARATIVE_ADVANTAGE | NOT_TESTED_NOT_CLAIMED | LC-02 has not begun |

## Response-stream diagnosis and narrow repair

Historical `experiments/communication-transfer-v1/artifacts/live-smoke-v3-20261022-213515/A-attempt-1.json` records **268,138 streamed bytes**, 1,479 chunks, 1,160 provider events and only **1,449 final completion bytes**. Its SHA-256 is `021be099f98f2165be9ff917726523167aae65a06b237f59c183bcc3b492e294`.

V3 `local-three-model-v3.mjs` and Studio `models/opencode.mjs` both sum `Response.body` reader chunk `Uint8Array.byteLength` before SSE parsing. These are Fetch-visible response-body bytes, not final text bytes or raw TCP/TLS traffic. The measurements are comparable. The old Studio **262,144-byte** ceiling would reject that observed stream by **5,994 bytes**.

Only the configured response-stream cap was raised to **1,048,576 bytes (1 MiB)**. The previous configuration is preserved at `config/history/lc-01r-studio.json`; the original LC-01R source-bound qualification receipt and all earlier evidence are unchanged. The current configuration has a new settings identity and prospective source-bound qualification.

Regression checks generate valid padded SSE at the recorded historical byte count; they do **not** claim to replay an unavailable original raw SSE stream. They demonstrate old-cap rejection, new-cap acceptance, acceptance at exactly 1 MiB and rejection at 1 MiB + 1, with one attempt and no retry. Responses larger than the new cap can still fail; that failure must remain visible. Actual stream bytes/chunks, final completion bytes and the cap are now recorded on transport receipts.

Unchanged: **six total requests**, **US$1 reservation ceiling**, **90 seconds**, interpreter/mediator **8,192** output tokens, challenger/recipient **4,096**, **zero SDK/automatic retries**, no model/provider fallback or Console substitution. Haiku remains deferred. Estimated reservation remains approximately **US$0.34788** for six maximum-bound requests; actual billing is unknown.

## Fresh task and prospective identities

Task: `tasks/lc-01s-s17-v1.json`, **archive-recovery-s17-v1**. It is fresh synthetic development material, not P-8, N-4 or a held-out scientific evaluation.

The sender's intent is a software archive-recovery handoff. A passing validation report is evidence of readiness, not public-release approval. A private urgent restore has four conditions and does not authorize public release or audit deletion. Rehearsal scope is synthetic records only; vendor retention/transfer remains unresolved. The source, intent and audience are locked to this prospective task. Clarifications create new proposed semantic versions rather than editing accepted content.

The host keeps the new application question and unadjudicated reference in the task file. They are not exposed through the initial browser state, interpreter, challenger or mediator inputs. The recipient packet itself contains neither the question nor answer key; the question is added separately only to the fresh recipient request. Rejected versions, challenges, conversation history and unauthorized context are excluded. The exact future live packet cannot exist before a model proposal is accepted; offline checks validate the builder, while the owner must inspect the actual packet and its digest before delivery.

The application now accepts `--task` for a scoped prospective case instead of silently reusing the original M-12 question. Replaying a session with a different task/question identity fails. The task identity and source-bound qualification receipt identity are included in the displayed remote plan. `--expected-plan-hash` refuses startup drift before listening or inference.

Current prospective plan: [config/lc-01s-run-plan.json](config/lc-01s-run-plan.json).

**Plan ID:** `b9e3fdc5595f7397c4507047cb717a789b7eb63aa89e1da9335ae1eaac8c01d6`.

**Settings identity:** `39465c1889694d6c4398ba51928c5b82fcf4f41239c394493fc728d3fe667e35`.

The plan records exact task/source, role models, API families, prompts/source hashes, token/time/byte limits, reservation policy, and no live authorization. A basic exchange needs three calls. Human-requested mediation adds one; failures/manual repeats consume the same six-request ceiling. No comparison or advisory call is scheduled for this first exchange.

## Acceptance and execution boundaries

Remote inference is disabled by default. During offline preparation the active runtime uses an empty credential environment; it does not inspect process `OPENCODE_API_KEY`, `.env` or saved authentication. Enabling remote execution later selects only the explicitly authorized process environment mechanism.

Role/settings changes revoke approval. Replay restores recorded attempts/reservations but not approval. The semantic acceptance is separately bound to the current version digest and communication scope. Before transfer, accepted content is rehashed; direct edits are refused as VERSION_CONTENT_DRIFT. TEST_OPERATOR acceptance cannot authorize an actual hosted recipient call. Injected browser approvals explicitly record TEST_OPERATOR / INJECTED_NOT_REAL_REMOTE_AUTHORIZATION.

This remains a single-operator local development application, not cryptographic proof of physical human presence. A LOCAL_OPERATOR event is an operator assertion. The product owner must personally perform the acceptance/rejection/correction action in the UI; Codex must stop at that boundary and must not automate it or present a test event as a genuine decision.

## Service-use check

Checked on 2026-10-23: [OpenCode Go guidance](https://dev.opencode.ai/v2/docs/console/go) and [Terms of Use](https://opencode.ai/legal/terms-of-service) (effective Aug 15, 2026). Go guidance describes typical coding-agent traffic, honest client identification and session headers. The general terms describe internal use and incorporation of additional conditions. These sources do **not** affirmatively establish that this communication-research workload is covered. Suitability remains **UNRESOLVED** pending applicable service/account confirmation; adapter success and a subscription are not permission findings. No provider was contacted and no traffic was disguised as another client.

## Verification actually performed

- **39/39 Studio tests pass**, including seven LC-01S regression tests and the prior 32 tests; no skips.
- Parent `npm run verify`: typecheck PASS; **1,114 passed, three skipped, zero failed**, out of 1,117.
- Four scoped Go IDs resolve; four installed Pi serializers pass injected tests. No real model request.
- Real Chromium preparation check: correct S-17 source/scenario visible, application question hidden, launcher blocks interpreter before dispatch; no browser errors or external browser traffic.
- Chromium existing Go-configured injected workflow regression: 12 UI actions, five injected requests, no real requests; acceptance/approval events are test-labelled.
- Exact CLI task/expected-plan entry point starts with **remote DISABLED**; mismatch test fails before listening and preserves a gate-failure event.
- Config regression verifies the stream cap is the only changed limit versus the preserved LC-01R settings.

Evidence is under `evidence/lc-01s-preparation-001/`: test logs, baseline, four-route qualification, browser receipts, `entrypoint.json`, `preparation-trace.json`, `preparation-viewer.html` and `plan-viewer.html`. The preparation trace records an offline-created exchange and a blocked launcher attempt, with no semantic version or acceptance. It is **not** a real communication trace. Original Ollama, LC-01R and transfer evidence are preserved; the source changes are prospective.

## Exact commands for owner review

Preparation only, with no remote execution enabled:

```powershell
cd C:\Projects\project-language
node --experimental-transform-types apps/language-demo/server/app.mjs --task apps/language-demo/tasks/lc-01s-s17-v1.json --data apps/language-demo/.data/lc-01s-s17-01 --expected-plan-hash b9e3fdc5595f7397c4507047cb717a789b7eb63aa89e1da9335ae1eaac8c01d6
```

**Only after the exact plan and applicable Go use are approved**, use the same command with `--enable-remote`. Supply OPENCODE_API_KEY through the process environment; do not place its value in the command, trace or report. Inspect the displayed model/settings/task identities and approve the plan in Studio. Launch/approval alone sends no inference request.

Then run DeepSeek interpreter and GPT challenger and **stop for the product owner's personal semantic decision**. If correction is needed, the owner supplies it and mediation consumes another approved request. After the owner accepts the exact current version, preview and deliver the approved packet to a fresh Qwen session. Export the actual responses and decision events. Preserve any failed request; do not repair output, silently rerun, substitute models, raise caps or begin LC-02.

No live inference, genuine human acceptance, commits, pushes, deployment, manuscript edits or LC-02 execution occurred. The next decision is review/approval of this prospective plan and resolution of service-use applicability.
