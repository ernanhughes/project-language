# Manual smoke transport v2 — framing limit correction

Observed user-run evidence: `artifacts/live-smoke-20261022-190311/`. One attempted DeepSeek request stopped with RESPONSE_STREAM_LIMIT after approximately 4.36 seconds. No Qwen/GLM request followed. Original receipts and v1 launcher are preserved.

Root cause known from the guard: received HTTP/SSE bytes exceeded 131,072. SSE event/metadata framing can exceed that size despite a small generated answer. Because the original guard did not retain wire/parsed-event counters or a response body, the precise provider content and token usage cannot be recovered. Do not label this a model comprehension failure or assert the token cap was exceeded.

The separate `src/local-three-model-v2.mjs` gives the entire framed stream a 2 MiB ceiling and records wire bytes/chunks, parsed provider events, HTTP status, completion bytes and available normalized usage/stop reason. It preserves the 2,048-token request cap, 8,192-byte parsed-output cap, 60-second timeout, three-request maximum, explicit estimated-dollar ceiling, no retries, no fallback, installed routes/models and proposed source. It changes a transport framing allowance, not experimental answers or a scientific protocol.

Injected tests reproduce a valid >128 KiB framed stream with small parsed output and reject a >2 MiB stream. No live request was made to implement this fix. A later manual attempt must use a fresh directory; it is not a retry or repair inside the historical run. No live execution is authorized as part of TRANSFER-01C.
