# Model runtime

Fixture is default and visibly SCRIPTED_FIXTURE. Ollama is opt-in and loopback-only at `http://127.0.0.1:11434`; no credentials, redirects, tools, remote routes or cloud-tagged models. Registry discovery lists installed non-cloud weights; role assignment is independent for interpreter, challenger, mediator, recipient and advisory evaluator. Model availability is DISCOVERED_NOT_QUALIFIED until exercised; price/token capabilities unknown rather than guessed. Metadata records modalities, API, context/output bounds, structured-output mechanism, reasoning policy, timeout, retries and usage standing.

Every call records exact system/user input, raw output (including invalid output), model ID, prompt digest, duration, tokens where returned and failure. Retry policy is zero. Timeout and truncation stop that request; no fallback. A fresh recipient sees only its packet and then the previously withheld question. Interpreter/challenger/mediator never receive application questions or host reference answers. Request schemas, not model prose, define each role's output.

Ollama discovery and calls use injected fetch in tests. Real local development is separate from fixtures, and failures remain evidence. No remote paid inference is authorized or implemented. No automatic model download or runtime installation.
