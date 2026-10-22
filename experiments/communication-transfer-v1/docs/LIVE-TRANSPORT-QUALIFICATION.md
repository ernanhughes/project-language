# Live transport readiness record — TRANSFER-01C

Checked 2026-10-22. This review uses installed Pi 1.0.4 static catalogue/adapter source, existing injected fixtures, and current [official Go documentation](https://dev.opencode.ai/v2/docs/console/go) / [auth guidance](https://dev.opencode.ai/v2/docs/console/api/inference/). No endpoint probe, model call, account access, saved auth or environment credential was used.

| Model route | Installed family / URL | Installed auth | Catalogue context / output ceiling |
|---|---|---|---|
| opencode-go/deepseek-v4.1-flash | openai-completions; /zen/go/v1/chat/completions | Bearer | See machine catalogue snapshot; run cap separately proposed 2,048 |
| opencode-go/qwen3.8-flash | anthropic-messages; /zen/go/v1/messages?beta=true | x-api-key | See machine catalogue snapshot; run cap separately proposed 2,048 |
| opencode-go/glm-5.3 | openai-completions; /zen/go/v1/chat/completions | Bearer | See machine catalogue snapshot; run cap separately proposed 2,048 |

Base domain is https://opencode.ai. Current official paths use /inference/go/openai/v1/chat/completions for DeepSeek/GLM and /inference/go/anthropic/v1/messages for Qwen; current general auth guidance specifies Bearer. The older installed route/header contracts are preserved rather than silently rewritten. Current remote compatibility remains unresolved. Stable provider model IDs are known; immutable underlying model weight/version identities are not attested by the catalogue, so a vendor revision must remain UNKNOWN rather than inferred from a marketing name.

The machine-readable `live-transport-qualification-v1.json` records exact installed IDs, API/base paths, context/output limits, catalogue prices and source file hashes. Pricing is metadata checked on 2026-10-22, not a verified invoice or account allowance. Current documented DeepSeek peak pricing differs from its off-peak catalogue value; reserve conservatively and recheck at approval. Authentication/session/user-agent and streaming behavior are documented in PROVIDER-QUALIFICATION.md and captured with synthetic credentials.

Injected tests cover both SSE families, finite cap serialization, usage normalization, missing terminal events, malformed/ambiguous JSON, wrong question coverage, output/stream limits, 429/500, timeout, explicit cancellation and privacy-safe errors. Comparative retry/fallback policy remains zero; a terminal failure closes the planned call. No header/model/API/endpoint substitution follows failure. Secrets and unsafe failed raw output are not disclosed in evidence.

Input admission currently uses UTF-8 JSON bytes plus framing allowance, not certified provider tokenization. Output cap/usage checks do not control unknown hidden provider accounting. Missing token usage remains UNKNOWN; cache/reasoning components and provider-invoice cost remain separate. Call/token-unit/estimated-dollar reservations are not an external billing guarantee. The 48-call main-pilot estimate ceiling remains unapproved; no new negotiation spending approval is inferred.

One user-supplied manual smoke receipt records a DeepSeek request that stopped at the old 128 KiB stream-byte limit. It is preserved as a transport/instrument failure, not semantic evidence. V2 separates framed-stream and output limits; the user's subsequent manual V3 settings are 16K completion tokens and up to three retries per model, outside the comparative lock. No calls were made here to validate V2/V3 against a provider; these source versions and their injected tests do not qualify a comparative pilot or establish current model availability.

Readiness: OFFLINE_CONTRACTS_REVIEWABLE; HUMAN_REVIEW_PENDING; REMOTE_COMPATIBILITY_UNRESOLVED; TOKEN_ACCOUNTING_UNQUALIFIED; LIVE_EXECUTION_NOT_AUTHORIZED. Resolve these explicitly and create a new approved lock before a comparative runner is enabled.
