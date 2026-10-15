# Development checks and resolved failures

The first focused development invocation ran `npm run typecheck` and the two new test files. It reported three TypeScript errors and 16 tests with 14 passed / 2 failed.

- Pi 1.0.4's normalized `TranscriptContext` has no top-level `tools` field (two diagnostics); tool declarations are in system messages. Capture now stores the full normalized messages.
- `Record<string, unknown>` was too broad for `fauxToolCall`'s JSON arguments. The harness option now uses the declared argument type.
- `tools: []` disables the extension tool too. The unknown-ID control received `Tool context_request not found`; the omission control consequently retained the initial context. Both tests failed, revealing that a scripted tool call alone was insufficient evidence of execution.

Correction: enable exactly `context_request`, require a real tool result with no execution error, and retain the real-loop negative tests. The next focused invocation passed typecheck and all 16 tests. The subsequent full live and pinned suites also passed (logs retained here). No faulty initial harness output is promoted as evidence of working host enforcement.

The observer was additionally checked against missing, altered, duplicated and extra managed blocks. Exclusion assertions compare JSON-encoded bodies as well as decoded source membership, because source bodies are JSON strings inside the packet. The independent provider reader extracts framing from actual received input; it is not handed the expected plan or oracle.
