# Three-model feasibility design — NOT executable or approved

Checked 2026-10-22 against [official Go documentation](https://dev.opencode.ai/v2/docs/console/go), [official authentication documentation](https://dev.opencode.ai/v2/docs/console/api/inference/) and installed Pi 1.0.4 static catalogue/provider source. No model/account probes or credentials were used.

| Role | Proposed exact route | Current documented endpoint |
|---|---|---|
| A sender | `opencode-go/deepseek-v4.1-flash` | `https://opencode.ai/inference/go/openai/v1/chat/completions` |
| B receiver | `opencode-go/qwen3.8-flash` | `https://opencode.ai/inference/go/anthropic/v1/messages` |
| C advisory | `opencode-go/glm-5.3` | `https://opencode.ai/inference/go/openai/v1/chat/completions` |

Second rotation swaps A/B and keeps C advisory. C is not independent gold. Route existence in documentation is not account availability. Authentication is the explicitly supplied OPENCODE_API_KEY via Authorization Bearer, with client identity and stable conversation routing header. No saved auth or .env loading is part of this milestone.

**Route mismatch:** installed Pi catalogue has DeepSeek/GLM `openai-completions` base `https://opencode.ai/zen/go/v1`; Qwen `anthropic-messages` base `https://opencode.ai/zen/go`. Installed provider uses OPENCODE_API_KEY and wraps adapters with `x-opencode-session`. The newer official endpoint paths above differ. The installed API family choices match, but endpoint and exact auth-header behavior for the Qwen Messages path must be explicitly qualified offline before a prospective live lock. Do not silently update dependencies, rewrite endpoints or assume old aliases work. BLOCKED_ROUTE_QUALIFICATION.

Proposed first feasibility budget ONLY: 2 synthetic tasks × 4 arms × 2 sender/receiver rotations × 3 roles = 48 maximum calls. A second independently authored synthetic fixture is not yet prepared. Propose input cap 8,000 tokens and output/thinking cap 2,048 tokens per request, 60-second timeout, retry zero, fallback none, no continuation/corrections. Aggregate ceilings: 384,000 input and 98,304 output tokens. Charge SOURCE source and context/quote metadata in full; separately constrain non-SOURCE channel to equal tokenizer-measured budgets. Freeze exact prompts, rubrics, source bytes, tokenizers, sampling settings, truncation-as-failure and per-call reservations before approval.

Illustrative un-cached list-price allowance using current documented peak DeepSeek $0.30/$1.20, Qwen $0.15/$0.47 and GLM $1.40/$4.40 per million input/output tokens: A/B rotations give each model 16 calls. At the proposed ceilings total allowance is approximately $0.44, before any cache-write charge, billing discrepancy or subscription-account rules. Propose US$1 ceiling with explicit per-call reservation and stop-before-overrun; this is not spending authorization or a verified invoice. No prices or live routes are configured by this document. Recheck pricing at lock time.

Remaining gates: dataset provenance/contamination decision; two authored tasks and independent criterion review; judge-error assessment on adjudicated controls; route/header qualification; token-accounting implementation; full source/prompt lock; explicit approval of model IDs, privacy/retention, exact settings, maximum calls and dollar ceiling. Real execution remains absent from the CLI. No held-out comparative inference is authorized.
