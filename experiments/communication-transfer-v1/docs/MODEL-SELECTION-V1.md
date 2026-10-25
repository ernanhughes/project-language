# TRANSFER-01D model selection — primary blocked, no fallback

Date checked: 2026-10-22. Requested primary: DeepSeek V4.1 Flash sender, Qwen3.8 Flash recipient, Claude Haiku 5.5 advisory evaluator. GLM-5.3 remains the historical comparator. No global/project model configuration or installed package was changed.

| Model | Installed API | Published Go input/output per million | Role/status |
|---|---|---|---|
| opencode-go/claude-haiku-5-5 | MISSING from installed Pi catalogue | $0.10 / $0.50 | Requested primary C; BLOCKED, zero canary attempts |
| opencode-go/gpt-6-luna | openai-responses | $0.10 / $0.50 | First challenger; offline serialization/stream tested only |
| opencode-go/glm-5.3-flash | openai-completions | $0.15 / $0.50 | Additional candidate; offline serialization/stream tested only |
| opencode-go/deepseek-v4.1-flash | openai-completions | $0.15–0.30 / $0.60–1.20 | Sender; historical V3 first-attempt completion |
| opencode-go/qwen3.8-flash | anthropic-messages | $0.15 / $0.47 | Recipient; historical V3 first-attempt completion |
| opencode-go/glm-5.3 | openai-completions | $1.40 / $4.40 | Historical C: one valid response after three failed attempts |

Published rates/Go listing: [official Go catalogue](https://dev.opencode.ai/v2/docs/console/go), retrieved 2026-10-22. This is not the pay-as-you-go Console catalogue or a quality ranking. Cache/context/output limits, installed price metadata and exact catalogue file hash are in the machine matrix. Published Haiku cache rates are metadata only; no Haiku installed definition or account availability is inferred.

The installed catalogue has no exact Haiku ID. We did not add an unreviewed model entry, install/update Pi, select another Haiku variant, substitute a Console route or change to GPT. GPT Responses and GLM Flash tests use their exact installed provider definitions with synthetic credentials and injected SSE; no actual model quality, source-groundedness or availability was measured. API families and a schema-valid supplied response do not establish evaluator reliability.

For any later actual candidate comparison, record first-attempt transport/schema/judgment availability, appropriate UNKNOWN decisions, citation-origin accuracy, unsupported endorsements, latency and all failed attempts separately. Independent support requires source-bound human judgment; no invented percentages or lowest-cost-per-valid-judgment ranking is justified yet. Immutable underlying model-weight revisions are UNKNOWN.

Traffic-use check: [Go usage guidance](https://dev.opencode.ai/v2/docs/console/go) describes coding agents and similar requests, client identity and session routing; the [terms](https://opencode.ai/legal/terms-of-service) also apply. This is honestly described as a software-handoff communication experiment. Permission for this particular research workload is not expressly established by the retrieved text. No spoofed agent identity, account probe or provider contact was used. Confirm appropriateness before any live stage. The missing primary model already independently blocks it.

Decision: retain requested Haiku primary in a prospective blocked profile. Qualify a reviewed catalogue addition/version, or obtain an explicitly recorded decision to use a separately qualified challenger. No automatic fallback or paid alternative run is permitted.
