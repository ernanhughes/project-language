# Studio Settings v2 — direct OpenCode Go execution

This prospective application revision implements the user's request to make real OpenCode Go the default, remove repeated execution-approval steps, centralize model configuration on a Settings page, and use at least 16K completion-token defaults. It does not reproduce a frozen historical run.

## User flow

Start the server, open the printed URL, and press Start Comparison. The interpreter is called immediately using the configured role. A human must still review and accept the exact meaning before two fresh recipient requests proceed. Model proposals cannot accept themselves or authorize actions. The status line identifies the current experiment stage, and the progress banner identifies the current model and elapsed time. Failure stops the run without automatic retry.

Settings is a separate page at `/settings`, linked in the header. It shows four suggested OpenCode Go models in five roles, all completion caps, request/session ceilings, timeout and stream/input limits. Saving makes no hosted request and stores no credential. Existing provider route, schema, source binding, evidence and action-authority checks remain. Settings persists separately from run evidence. Invalid settings leave the saved profile intact.

Defaults: interpreter/mediator DeepSeek V4.1 Flash; challenger GPT-6 Luna; recipient Qwen3.8 Flash; optional advisory reviewer Claude Haiku 5.5. Advisory execution remains unimplemented. A comparison uses the interpreter and recipient; it does not invoke every configured role. Every role gets 16,384 completion tokens. Settings can select 16K–64K, capped by the selected model's declared capacity.

The response stream cap increases prospectively from 1 MiB to 32 MiB, configurable up to 64 MiB. SSE envelopes and reasoning events consume bytes even when final answer text is small. This addresses the reported cap failure without disabling bounds or repairing prior outputs. Timeout is 180 seconds, request ceiling 12, session ceiling US$10, retries zero. Failed calls still count. Raising token caps is not a guarantee of a valid response.

## Persistence and evidence

`config/studio-v2.json` records these new defaults. Do not overwrite `config/studio.json`, old qualification receipts or historical plans to claim continuity. Local operator settings go to ignored `.settings/studio-v2.json`. Only strict public role/limit/mode fields are accepted; credentials and unknown fields are rejected. `OPENCODE_API_KEY` is read from the server process environment at execution; no `.env` or saved authentication is loaded.

Normal startup uses `.data/studio-v2` and does not append to S-17. An explicit `--data` remains supported. Saved settings apply prospectively after captured state replay and do not change recorded requests or accepted meaning. The global settings profile is shared across run directories; counters belong to each journal and are not reset by Save. A new data directory is a separate run, not a retry hidden in the old evidence.

Normal server startup selects DIRECT_USER_REQUEST policy, with no execution-approval dialog. Runtime's explicit-plan mode remains available for legacy tests and deliberate `--require-approval` launches. `--offline` disables hosted requests; `--fixtures` explicitly selects scripted examples. Opening the page, discovering the locally configured catalogue and saving settings never invokes a hosted model.

The ordinary click is now the execution instruction. Source/task scope is still recorded on each workflow switch, and human semantic acceptance remains version-bound. Stream caps, input caps, request caps, timeout, exact Go routes, credential availability and no-retry checks remain active. Experimental results must identify the new settings/policy; historical locked runs are unchanged.

## Verification

See `evidence/settings-v2-001/`. Unit/integration coverage includes direct-call execution, exact human review, missing credentials, offline mode, finite caps, persistent settings, restart, no credential persistence and frozen profile preservation. Actual Chromium covers Settings defaults/save/reload, five role selectors backed by four models, direct Start without approval, semantic acceptance, stage feedback and narrow screens. Injected provider responses are not real model results. No new hosted inference is authorized or performed merely by implementing this change.
