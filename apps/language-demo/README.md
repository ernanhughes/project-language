# Language Studio · LC-00 / LC-01

A local communication laboratory: source → proposed meaning → challenge → explicit human acceptance → controlled representation → fresh recipient. This first slice is engineering development, not evidence of Language superiority.

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs
```

Open the printed loopback URL. The OS chooses a free port. No key, paid service or model installation is required. Default backend is **SCRIPTED_FIXTURE**. The single-operator development app is not a multi-user authority service and must not be exposed publicly.

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

## Local model development

Discover local models, assign an installed Ollama model to a role and save. The five roles are configurable independently. Advisory evaluator is reserved/deferred; its outputs cannot certify truth. The UI lists installed non-cloud weights; discovery is not qualification. Interpreter/mediator expect the full JSON schema, and a small model may fail. Such failures are recorded with actual raw output. No retry, fallback, model pull or paid route exists. Prompt/source editing after question exposure is refused for this exchange.

Fixtures are authored for the M-12 scenario, not a general interpreter of arbitrary sources. Local model interpretation of edited sources is still unvalidated. Mechanical source anchors do not establish semantic support. All action execution is absent.

```powershell
node --experimental-transform-types --test apps/language-demo/tests/*.test.mjs
node --experimental-transform-types apps/language-demo/tests/browser.mjs apps/language-demo/evidence/browser-new
node --experimental-transform-types apps/language-demo/models/local-check.mjs apps/language-demo/evidence/local-new qwen2.5:1.5b
```

The browser check uses existing Playwright/Chromium; it installs nothing and blocks external browser traffic. The local check uses Ollama only, preserving results in a new directory. It is separate from scripted tests.

See `docs/ARCHITECTURE.md`, `docs/LANGUAGE-PROTOCOL-V0.1.md`, `docs/MODEL-RUNTIME.md`, `docs/DEMO-SCENARIOS.md`, `docs/EXPERIMENTAL-CONTROLS.md` and `docs/IMPLEMENTATION-ROADMAP.md`. Scope/observations and limits are recorded in `IMPLEMENTATION-REPORT.md`.
