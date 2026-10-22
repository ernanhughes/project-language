# OpenCode Go transport qualification — v1, offline only

Checked 2026-10-22 against installed Pi 1.0.4 catalogue, provider registry, API source and [official Go documentation](https://dev.opencode.ai/v2/docs/console/go) / [authentication guidance](https://dev.opencode.ai/v2/docs/console/api/inference/). No endpoint probes, saved authentication, actual credentials or model calls were used.

| Proposed role | Exact model | Installed adapter | Captured installed URL | Synthetic auth observed |
|---|---|---|---|---|
| A | opencode-go/deepseek-v4.1-flash | openai-completions | https://opencode.ai/zen/go/v1/chat/completions | Authorization Bearer |
| B | opencode-go/qwen3.8-flash | anthropic-messages | https://opencode.ai/zen/go/v1/messages?beta=true | x-api-key |
| C | opencode-go/glm-5.3 | openai-completions | https://opencode.ai/zen/go/v1/chat/completions | Authorization Bearer |

These are captured requests from the actual installed provider factory and adapters, not hand-built substitute request clients. Each request has a Pi user agent and x-opencode-session. Headers containing authentication are redacted in evidence; credential values are excluded from request fingerprints. The auth MODE, remaining headers, exact body, method and URL are hashed. The local constant credential is synthetic and never sent to a network.

Official current Go documentation instead lists `/inference/go/openai/v1/chat/completions` for A/C and `/inference/go/anthropic/v1/messages` for B; general current auth guidance specifies Bearer. We pin the installed paths/auth behavior for qualification rather than silently rewriting them. Whether older routes and x-api-key still work is UNKNOWN. Live route/header compatibility remains a gate. No model/API/endpoint substitution or dependency update was made.

## Actual request and stream contracts

- OpenAI-compatible: messages contain system/user content; model ID, stream=true, stream_options.include_usage=true and max_tokens=2048 are captured. Delta text, finish_reason and terminal data are normalized by Pi; usage comes from a supplied final chunk.
- Messages: system content is separate from user messages; max_tokens=2048, stream=true, thinking disabled, Anthropic version/beta headers are captured. message_start, content_block_* and message_delta/message_stop are supplied SSE fixtures. Input/output usage is normalized separately.
- Direct `SimpleStreamOptions.reasoning` does **not** accept `off`; omit it to disable thinking at this layer. An early implementation incorrectly passed `off`, producing a null Messages cap. That configuration failed qualification, was preserved in `evidence/transfer-01b-invalid-reasoning-option.json`, and was corrected without changing model, endpoint or API. A request-body guard now refuses any non-finite/nonpositive/over-limit completion cap. The regression checks both families.
- The SDK and provider retry setting is zero. HTTP 429 and 500 fixtures produce one intercepted attempt each, with no fallback, continuation or repair. Truncation, missing terminal events, malformed/ambiguous JSON, wrong question coverage, oversized or sensitive output are refused. The response is withheld, not repaired.
- Abort and deadline states distinguish CANCELLED_BEFORE_DISPATCH, CANCELLED and TIMED_OUT. Raw failed response/error text is withheld; only bounded metadata, hashes and failure codes enter evidence. Successful schema-valid output containing credential-like strings is also withheld.

## Usage, reservations and limits

The qualification fetch is closed over injected SSE/error fixtures; callers cannot supply a live fetch or credential. No live dispatch switch exists. A global-fetch-denied integration test exercises the same runner without network access.

Each complete HTTP preview is fingerprinted, and a second fixture-backed qualification must match before the injected response is served. Role/source/prompt/model/API/base/settings locks refuse mismatches. A source snapshot additionally pins corpus, schemas, scripts, provider code, dependency manifests and prospective protocol. Future live requests derived from unknown sender output cannot have their final bytes frozen in advance: the runtime would need a newly rendered preview under an approved template/settings lock.

Input admission uses exact UTF-8 JSON request bytes plus 1,024 framing allowance; output requests cap 2,048 tokens and local parsed output 8,192 bytes. One byte per token is a deliberately generous engineering allowance for byte-based text tokenization; JSON escaping already expands the text and the additional allowance reserves role/framing overhead. This is NOT a certified bound on provider-internal hidden tokens or all model tokenizers. Missing usage stays unknown, not zero; reported over-limit usage is refused. Tokenizer/hidden-accounting qualification remains a live gate.

Call/output/input-unit/cost reservations are shared and never refunded on failure. Input/output token estimates, injected normalized usage, catalogue cost estimates, actual provider cost and unknown billing are distinct. Local estimates cannot guarantee an external invoice; cache charges, provider behavior and account billing remain outside local enforcement. The US$1 / 48-call proposal is unapproved.

Decision: installed serialization and supplied stream handling are reviewable offline; **current remote availability, auth compatibility, actual tokenizer and billing are not qualified**. The machine-readable qualification receipts contain exact observed bytes and failures, not claims that any endpoint answered.
