# Language Studio · LC-02U understanding-enhanced comparison

**Understanding is now part of the comparison.** Start Comparison automatically runs the local Python compiler, shows source-linked candidate meanings, and supplies that provisional inventory to the interpreter. **Approve & Finish** still requires your review. After delivery, See Results separates what the packet carried from what the answer demonstrated. No semantic completeness or understanding percentage is claimed.

The repository's `.venv` already contains spaCy and NLTK. Studio selects that Python automatically when available. Use **Settings → Understanding Compiler** to select the Python executable and the `technical-policy` or `general` profile. A missing dependency stops explicitly; there is no automatic model download or AI replacement. See [LC-02U report](LC-02U-REPORT.md), [integration contract and usage](docs/LC-02U.md), and [offline migration demo](evidence/lc-02u-001/demo-final/viewer.html).

**OpenCode Go is now the default.** Start Comparison calls the selected interpreter directly. Review its proposed meaning, then accept it to run the two fresh recipients and See Results. There is no separate remote-execution approval. Nothing runs merely from opening the website or saving settings.

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs
```

Open the printed URL. Click **Settings** in the header to configure models and request limits once. The key must already be available as `OPENCODE_API_KEY` in the server environment; no key is stored by Settings. This launcher does not load `.env` or saved provider authentication.

The four default models cover five roles:

| Role | Default |
|---|---|
| Interpreter | `opencode-go/deepseek-v4.1-flash` |
| Challenger | `opencode-go/gpt-6-luna` |
| Mediator | `opencode-go/deepseek-v4.1-flash` |
| Fresh recipient | `opencode-go/qwen3.8-flash` |
| Optional advisory reviewer | `opencode-go/claude-haiku-5-5` (configured only; execution not implemented) |

All roles default to 16,384 completion tokens. The new profile uses a 32 MiB raw-stream limit, a 180-second timeout, 12 requests per run and a US$10 session ceiling. No automatic retries or fallback. Settings permits 16K–64K completion caps, subject to model capacity, and at most 64 MiB of raw streaming data. Operational limits do not count as semantic outcomes.

Settings persist in ignored `.settings/studio-v2.json`. `config/studio-v2.json` holds the versioned defaults. The original `config/studio.json`, locked plans, failed runs and S-17 evidence remain historical and unchanged. The default journal is now `.data/studio-v2/events.jsonl`; it does not resume or write into the historical S-17 journal. Use `--data PATH` for a separate run or an existing development directory. Settings remain shared across runs and never reset used-request accounting.

For offline examples, choose Offline scripted examples in Settings, or launch with `--fixtures`. `--offline` disables hosted execution. The legacy `--enable-remote` argument remains harmless but is no longer necessary. `--require-approval` selects the legacy plan-approval policy for deliberate legacy work; it is not the normal UI.

See [Settings and execution defaults](docs/SETTINGS-V2.md), [LC-02 report](LC-02-REPORT.md) and [comparison design](docs/LC-02-DESIGN.md). The LC-02 report describes the earlier offline implementation, not a completed hosted comparison. No advantage over ordinary communication has been established. All notes below describe historical preparation and launch policies, which this explicit user-requested settings revision supersedes for ordinary development use.

**LC-01S preparation:** see [LC-01S-REPORT.md](LC-01S-REPORT.md) and `config/lc-01s-run-plan.json`. The prospective S-17 archive-recovery scenario is ready for review. The SSE response cap is now **1 MiB**; tokens, request count, timeout, retry policy and spending ceiling are unchanged. No live LC-01S inference is authorized yet. Use the report's `--task` and `--expected-plan-hash` command; do not silently reuse the M-12 question.

**LC-01R update:** OpenCode Go is now the active provider. See [LC-01R-OPENCODE-REPORT.md](LC-01R-OPENCODE-REPORT.md). Ollama evidence remains historical; the legacy adapter is isolated and never discovered or called by the current launcher. The historical LC-01 instructions below describe the original fixture workflow; use the updated launch/configuration instructions here.

The normal startup command is unchanged, but defaults now select OpenCode Go routes with remote dispatch disabled:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs
```

For a completely offline scripted walkthrough, launch with `--fixtures` and a new data directory:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs --fixtures --data apps/language-demo/.data/offline-new
```

After manager review and separate live authorization, the first controlled OpenCode launch is:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs --enable-remote --data apps/language-demo/.data/opencode-first
```

Supply `OPENCODE_API_KEY` through the process environment before launching; Studio never loads `.env` or saved credentials. In Model Configuration, inspect/save the interpreter DeepSeek V4.1 Flash, challenger GPT-6 Luna, mediator DeepSeek V4.1 Flash and recipient Qwen3.8 Flash. Haiku 5.5 is registered for optional advisory use, but advisory execution remains unqualified/deferred and never blocks the primary workflow. Inspect the finite plan (six requests, US$1 estimated ceiling, 90-second timeout; interpreter/mediator 8,192 and other roles 4,096 output tokens; zero automatic retries). Confirm remote execution and workload appropriateness, then approve the plan. No request is sent by launch, discovery, saving settings or approval alone. Each explicit role action sends at most one request. Repeating a failed action consumes another request and preserves both attempts. Configuration changes revoke approval. Replay never restores remote approval.

The conservative default reservation is approximately **US$0.34788 for six requests**, including worst selected tier rates and a UTF-8 byte bound for input tokens. This is catalogue accounting, not an invoice or a promise of subscription capacity. OpenCode's [Go usage guidance](https://dev.opencode.ai/v2/docs/console/go) describes coding-agent traffic; the operator must confirm this communication-research workload is appropriate. No live inference was authorized or performed for LC-01R.

Offline verification:

```powershell
node --experimental-transform-types --test apps/language-demo/tests/*.test.mjs
node --experimental-transform-types apps/language-demo/tests/browser.mjs apps/language-demo/evidence/browser-fixture-new
node --experimental-transform-types apps/language-demo/tests/browser-opencode.mjs apps/language-demo/evidence/browser-go-new
```

The Go browser check injects responses into the real Pi API adapters, uses a synthetic credential and cannot contact providers. Those outputs are labelled injected fixtures, not real-model evidence.

## Original LC-01 walkthrough and historical context

A local communication laboratory: source → proposed meaning → challenge → explicit human acceptance → controlled representation → fresh recipient. This first slice is engineering development, not evidence of Language superiority.

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs
```

Open the printed loopback URL. The OS chooses a free port. Use `--fixtures` for this scripted walkthrough without credentials or inference. The single-operator development app is not a multi-user authority service and must not be exposed publicly.

1. Keep the synthetic museum scenario and create the exchange.
2. Run interpreter. Inspect the proposed interpretation and original source.
3. Request challenger. It flags the fixture's omitted same-day notification.
4. Enter a clarification retaining handlers, tracking, same-day notification and internal-only scope. Propose a corrected version.
5. Accept this exact version for communication. This is a separate operator action, not a model judgment.
6. Choose NEGOTIATED_LANGUAGE and preview the exact packet.
7. Deliver to a fresh recipient; the previously withheld external-loan question appears. Inspect response and citations.
8. Switch to MATCHED_PLAIN and deliver for comparison. The fixtures return the same NO; this demonstrates the workflow, not model comprehension or an advantage.
9. Download JSON trace and self-contained HTML report. Reload to replay saved state without model calls.

The server stores one exchange under `.data/events.jsonl`. For another exchange, choose a new directory; do not delete or overwrite a previous trace:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs --data apps/language-demo/.data/another-exchange
```

## Historical local model development (inactive)

Ollama is no longer active. The original adapter and `evidence/local-001/` truncation observation are preserved for provenance. The current UI uses Pi OpenCode routes and does not probe or call Ollama. Prompt/source editing after question exposure remains refused for this exchange.

Fixtures are authored for the M-12 scenario, not a general interpreter of arbitrary sources. Local model interpretation of edited sources is still unvalidated. Mechanical source anchors do not establish semantic support. All action execution is absent.

```powershell
node --experimental-transform-types --test apps/language-demo/tests/*.test.mjs
node --experimental-transform-types apps/language-demo/tests/browser.mjs apps/language-demo/evidence/browser-new
```

The browser check uses existing Playwright/Chromium; it installs nothing and blocks external browser traffic. The preserved `models/local-check.mjs` is a historical Ollama utility, not part of the active LC-01R plan.

See `docs/ARCHITECTURE.md`, `docs/LANGUAGE-PROTOCOL-V0.1.md`, `docs/MODEL-RUNTIME.md`, `docs/DEMO-SCENARIOS.md`, `docs/EXPERIMENTAL-CONTROLS.md` and `docs/IMPLEMENTATION-ROADMAP.md`. Scope/observations and limits are recorded in `IMPLEMENTATION-REPORT.md`.
