# Settings v2 — delivery report

Implemented the requested direct-call defaults and a dedicated Settings page. Normal startup now enables OpenCode Go on an explicit Start/Run button press without a separate remote-plan approval. Opening the page or saving Settings does not call models. Acceptance of proposed meaning remains a separate human decision.

Four unchanged suggested models fill five roles: DeepSeek V4.1 Flash (interpreter and mediator), GPT-6 Luna (challenger), Qwen3.8 Flash (fresh recipient), Haiku 5.5 (optional advisory configuration only; advisory execution is not implemented).

New versioned defaults in `config/studio-v2.json`: every role 16,384 completion tokens; 32 MiB streamed-response cap; 180-second timeout; 12 requests; US$10 session ceiling; zero automatic retries. Settings allows 16K–64K caps within declared model capacity, and a finite stream cap up to 64 MiB. Stream bytes are separate from completion tokens. Original `config/studio.json`, frozen plans, prior evidence and failed outputs were not rewritten.

Settings persist outside evidence at ignored `.settings/studio-v2.json`. Only the public role, limit and comparison-mode schema is accepted; keys cannot be saved there. Credentials use OPENCODE_API_KEY in the process environment. No `.env`, saved authentication, global configuration or provider endpoint was read or changed.

Normal startup uses a separate `.data/studio-v2` journal rather than automatically resuming S-17. Explicit --data remains supported. The original 44-event S-17 prefix still matches its earlier hash; its journal now contains later appended application events (95 total at verification). This implementation did not write to that historical journal. Normal startup now avoids appending there. The comparison UI states its current stage and next action. Models and limits are on /settings; legacy approval controls are hidden in normal direct-execution mode. Deliberate legacy --require-approval, --offline and --fixtures modes remain available.

Verification actually run:
- 57 Studio unit/integration tests passed (`evidence/settings-v2-001/unit-delivery.txt`).
- Parent TypeScript and test verification passed: 1,114 passed, 3 skipped, 0 failed (`parent-verify.txt`).
- Actual Chromium Settings workflow: four models/five roles, default 16K caps, save/reload persistence, no model call from Settings, direct Start without execution approval, exact human review before recipients, stage guidance and mobile layout passed (`browser-final/browser.json`).
- Actual Chromium legacy provider and comparison regressions passed (`legacy-provider/`, `legacy-comparison/`).
- Injected stream larger than the old 1 MiB limit passes the finite 32 MiB cap; old bounded transport checks remain covered.
- git diff --check passed. No Hugo build: the book repository was not modified.

All provider responses during verification were injected offline fixtures. No real hosted calls, commits, pushes or manuscript changes occurred. Existing comparison failures remain failures, not repaired results. This configuration change does not establish a language advantage.

To use: restart the existing Node server, run `node --experimental-transform-types apps/language-demo/server/app.mjs` from C:\Projects\project-language, open its URL, click Settings if changes are wanted, then Start Comparison. OPENCODE_API_KEY must be in that process environment. No --enable-remote option or separate execution approval is needed. The interpretation still needs semantic review before recipient transfer.
