# LC-01R-OPENCODE — manager handoff

Date: 2026-10-23, Europe/London. **Offline integration complete; live qualification and execution not performed.** No commit, push, deployment, paid inference, credential-store access or manuscript change was made for this task.

## Status

| Area | Status | Evidence / limit |
|---|---|---|
| OPENCODE_PROVIDER | PASS | Existing Pi 1.0.4 ModelRuntime and native provider adapters, with scoped model registration; no new provider framework |
| MODEL_DISCOVERY | PASS | Four exact Go IDs resolve offline, including Haiku; no catalogue network refresh |
| MODEL_SELECTION_UI | PASS | Independent role selectors, persisted assignments, metadata, limits, qualification, usage/reservations, last provider error and real/scripted labels |
| TRANSPORT_QUALIFICATION | PARTIAL | Four installed serializers pass injected-stream checks across three API families; live authentication, routing and availability NOT_TESTED |
| SEMANTIC_STATE_INTEGRATION | PASS | Offline actual-adapter workflow preserves strict schemas and existing semantic-state/acceptance checks; no real-model comprehension claim |
| FRESH_RECIPIENT_ISOLATION | PASS | Captured recipient receives only packet and question; separate sessions; sender/challenger/mediator receive no hidden question/reference |
| REMOTE_EXECUTION_READINESS | BLOCKED | This implementation has no live authorization. Manager review and a later explicit launcher/UI gate plus process credential and workload confirmation are required |

## What existed and what changed

Before: every role defaulted to scripted fixtures. Ollama was the only non-fixture transport. Advisory execution was deferred. No Studio OpenCode path existed.

Now: OpenCode Go is the default model configuration; remote dispatch is disabled by default. The provider abstraction and fixture workflow remain intact. Ollama code is isolated as `models/ollama-legacy.mjs`; its old source and the original `evidence/local-001/` truncation results remain available. The active server performs no Ollama discovery/request. The historical local-check utility explicitly imports the legacy adapter and is outside the active execution plan.

`config/studio.json` holds editable default role assignments and finite limits. `config/models.json` contains application-scoped Pi model definitions. Saved session assignments/settings override defaults on replay, preserving historical model identities. Configuration changes revoke remote approval; replay preserves request reservations/counts but never restores approval. Use a fresh data directory for the new communication.

| Role | Exact model | Pi API |
|---|---|---|
| Interpreter | `opencode-go/deepseek-v4.1-flash` | `openai-completions` |
| Challenger | `opencode-go/gpt-6-luna` | `openai-responses` |
| Mediator | `opencode-go/deepseek-v4.1-flash` | `openai-completions` |
| Fresh recipient | `opencode-go/qwen3.8-flash` | `anthropic-messages` |
| Optional advisory evaluator | `opencode-go/claude-haiku-5-5` | `anthropic-messages`; transport checked offline, advisory operation still deferred |

Roles are independently configurable. Same-model roles use separate sessions and do not establish independent model-family evidence. Haiku absence is explicitly `ADVISORY_EVALUATOR_UNAVAILABLE`, not a core-workflow blocker or a reason to substitute a model.

## Pi version and endpoint findings

The user correctly observed Haiku in desktop Pi. Its managed installation is **1.4.0**, and its built-in Go catalogue includes Haiku 5.5. The repository imports pinned **1.0.4**, whose built-in Go catalogue lacks Haiku. An existing transfer-project scoped config also resolves Haiku. This task changed neither package versions, global settings nor transfer-project config/evidence.

Studio uses the supported Pi scoped-registration mechanism. Haiku metadata was taken from the installed 1.4.0 catalogue: Messages API, 1,000,000 context window, 128,000 model output maximum, published tiered cost metadata. Application output limits are much lower. The other three definitions retain the repository's installed metadata, with documented endpoint overlays and conservative DeepSeek peak pricing.

The official [Go documentation](https://dev.opencode.ai/v2/docs/console/go), checked 2026-10-23, specifies current model-family routes. Studio explicitly overlays older `/zen/go` defaults:

- Completions: `https://opencode.ai/inference/go/openai/v1/chat/completions`
- Responses: `https://opencode.ai/inference/go/openai/v1/responses`
- Messages: `https://opencode.ai/inference/go/anthropic/v1/messages`

The installed Messages SDK appends `?beta=true`; qualification permits only that known query parameter while checking origin/path/model. No shared endpoint assumption, automatic endpoint fallback or Console route exists. The fetch boundary refuses non-Go routes, second SDK attempts, output-cap drift, oversized inputs and oversized response streams.

`config/offline-qualification.json` binds the offline receipt to the tested source/config hashes. UI status is `OFFLINE_ADAPTER_VERIFIED_LIVE_NOT_PROBED` only while those hashes match; changed bytes return to `OFFLINE_TEST_REQUIRED`. This receipt is engineering provenance, not a scientific freeze or live qualification.

## Authentication, traces and failure behavior

Pi receives in-memory credential/model stores and no network catalogue refresh. Live dispatch uses only explicit process `OPENCODE_API_KEY`; `.env`, saved Pi/OpenCode credentials and alternate-provider auth are not loaded. The implementation did not use the real key for any call.

Exact model-visible system/user/schema prompts and the actual serialized Pi request body are captured. Authentication headers are never stored/exported. Redaction covers nested secret fields, bearer strings, key patterns and echoed credential values. Unsafe provider error details are hashed rather than exported; public errors retain HTTP/timeout/truncation/schema status. Raw model content is retained after credential redaction, never repaired into valid JSON. Usage, latency, reservations, actual HTTP attempts and distinct request/session IDs remain visible for failures as well as successes.

Strict JSON parsing rejects Markdown-fenced/malformed output; strict protocol validation still applies to source/hash/span, unknowns and acceptance. A valid-looking response cannot grant human acceptance. The challenger cannot mutate accepted state. Unknown information remains unknown. No real external action is implemented.

SDK and automatic retries are zero. A user may explicitly repeat a failed development action; each attempt is recorded separately and charged against the same finite request/reservation caps. No failed attempt is overwritten. There is no fallback model.

## Actual verification

| Check | Observed result |
|---|---|
| Studio tests | **32 pass, 0 fail, 0 skip**; 13 retained tests plus 19 OpenCode tests |
| Parent `npm run verify` | Typecheck PASS; **1,114 pass, 3 skip, 0 fail**, out of 1,117 |
| Four-route serializer qualification | **4/4 PASS** using synthetic credential and injected SSE; real provider requests **0** |
| Chromium, fixtures | PASS; nine actions, reload, download, mobile overflow check; no page errors/external requests |
| Chromium, OpenCode configuration | PASS; 12 actions, selector persistence, blocked preapproval attempt, explicit approval, three API families, correction, TEST_OPERATOR acceptance, two recipient deliveries and download; five injected adapter requests; real provider requests **0** |
| Historical evidence preservation | Original evidence files are compared against the pre-task baseline; source changes are prospective and do not rewrite old receipts |

Tests cover missing optional Haiku, API families/routes/headers, redaction, launcher/plan/key/budget gates, new model selection retaining historical identities, isolated sessions, withheld questions, human acceptance, failed output retention, truncation, incomplete streams, HTTP 429/500, timeout, malformed JSON, schema failure, manual retry caps, wire byte limits, refusal of Console routes and replay without reauthorization. Existing legacy-adapter tests remain injected regressions only; they do not requalify Ollama.

Evidence: `evidence/opencode-001/` contains baseline, test logs, serializer receipts, fixture browser receipts and OpenCode-injected browser receipts. The authoritative OpenCode browser receipt is `browser-go-verified/browser.json`; the fixture receipt is `browser-fixture-final/browser.json`. Their exports explicitly label injected results/usage as fixtures, not live provider evidence. The original LC-01 artifact manifest is preserved as a historical manifest; a separate prospective LC-01R artifact inventory records current bytes.

## Exact first-run instructions — for later approved execution

Normal offline preparation/startup remains:

```powershell
cd C:\Projects\project-language
node --experimental-transform-types apps/language-demo/server/app.mjs
```

After this revision is reviewed and a real communication is separately authorized, use an unused data directory and the existing process environment credential:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs --enable-remote --data apps/language-demo/.data/opencode-first
```

Open the printed loopback URL. Inspect the five role assignments above and save. Inspect Request limits and remote execution gate before approving anything:

- Maximum **6 total attempts**; basic interpretation/challenge/recipient uses 3, mediation adds 1, a comparison delivery adds 1. Failed/manual repeat attempts count too.
- Interpreter and mediator: **8,192 output tokens**; challenger, recipient and optional advisory: **4,096**.
- **90-second timeout**, **60,000 serialized input-byte bound**, **262,144 response-stream-byte bound**, **zero automatic retries**.
- **US$1 estimated reservation ceiling**. The conservative six-request catalogue bound is approximately **US$0.34788**, including worst selected tier rates. This is not an invoice or a guarantee of unlimited subscription capacity.

Confirm both remote execution and that this software communication workload is appropriate for your Go account, then approve the displayed plan. The official Go guidance describes typical coding-agent traffic; suitability for this communication-research workflow is not established merely by adapter success. Studio identifies honestly as `language-studio/0.1r` and sends stable per-call session headers.

Create the scenario, run interpreter and challenger, inspect the actual proposal/challenge, optionally clarify through the mediator, and explicitly accept the exact current version yourself. Then preview and deliver to a fresh recipient. Export the complete trace. Model agreement is never a substitute for that human step. Do not run an invented canary, change models automatically, increase caps or begin LC-02 as part of this handoff.

The implementation task authorized **no live requests**, and none were made. Live authentication/availability, real structured-output reliability and semantic performance remain untested.
