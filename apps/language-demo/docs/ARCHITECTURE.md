# Language Studio — LC-00

An application in `apps/language-demo`, with host-independent protocol validation, an event-driven engine, role-independent model adapters, append-only local storage, an HTTP API and a separate browser UI. The book repository is read-only.

Reuse audit: reuse `core/evidence/src/canonical.ts` for canonical serialization and hashing. `core/record` separates source from interpretation but does not model version-bound human acceptance; `core/preservation` checks lexical survival, not semantic equivalence. These contracts inform the design but do not prove preservation here. `core/authority` gates tools; this app exposes no action tools and records no executable grants. The provider registry in the book was consulted: its plugin memory/context stores are unnecessary for a synthetic local exchange log; no private memory is accessed. Historical Workbench, Capstone and TRANSFER evidence remain isolated. The new state is an application contract, not a replacement for their contracts.

Canonical application state: strict Language Protocol v0.1 proposals plus immutable source and version lineage. Acceptance is a separate event binding a state digest and communication scope. Editing creates a new proposed version. Model responses cannot supply acceptance, permissions to act or human identity. Mechanical evidence validation is distinct from semantic review and source truth.

Native Node HTTP and JSONL avoid a framework/database dependency. Each model call is a fresh stateless request without tools; Pi remains the repository host; LC-01R reuses its native OpenCode provider adapters without introducing an orchestration framework or agent tools. Remote dispatch remains disabled until separately approved.

Order: define contracts; implement fixture workflow; validate rejection/staleness/replay; exercise actual browser; attempt a genuinely local backend. LC-02 comparisons remain exploratory, not a frozen evaluation.

## LC-01R provider revision

OpenCode Go replaces Ollama as the active transport without changing the Language protocol. Use `models/runtime.mjs`, the installed Pi ModelRuntime, scoped `config/models.json`, and the explicit remote execution gate. The original fixture and Ollama observations remain historical. See MODEL-RUNTIME.md and LC-01R-OPENCODE-REPORT.md for current controls and qualification limits.
