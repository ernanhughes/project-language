# Implementation roadmap

LC-00: strict v0.1 state, model seam, source anchors, acceptance/version boundaries and local event storage.

LC-01: fixture-backed browser workflow, configurable local role routes, controlled recipient delivery, inspectable errors and offline export/replay; one separate local-model observation where possible. Product acceptance belongs to the manager/human, not the implementation agent.

LC-02: fresh cases, independently reviewed semantic rubric, prospective frozen inputs, information/computation controls and reproducible side-by-side measurements. Do not repurpose M-12 as held-out data.

LC-03–05: richer negotiation, controlled context admission, adaptive rendering, rotation and bounded simulated delegation. Remote inference, multi-user authentication, arbitrary uploads, semantic proof and production deployment are out of scope for LC-01.

## LC-01R provider revision

OpenCode Go replaces Ollama as the active transport without changing the Language protocol. Use `models/runtime.mjs`, the installed Pi ModelRuntime, scoped `config/models.json`, and the explicit remote execution gate. The original fixture and Ollama observations remain historical. See MODEL-RUNTIME.md and LC-01R-OPENCODE-REPORT.md for current controls and qualification limits.
