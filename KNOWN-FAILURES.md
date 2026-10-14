# Known failures in lifted code

Snapshot: 2026-10-14. `npm test` (all lifted modules): 695 tests, 653 pass, 39 fail, 3 skipped. Typecheck is clean.
`npm run verify` runs only the qualified skeleton (`core/authority` and `host-pi`), which is 17/17.

These failures are **not yet triaged one by one**. The error messages point at four classes of cause, none of them evidence that a capability's logic is wrong:

1. **Spawned child processes and built entry points.** Tests launch `src/cli.js` or `dist/` output that this repository does not build (language CLI and lock tests, LANG-00 reproduction, compiler dist-freshness and packaging).
2. **Windows path handling.** `work` tests dynamically import an absolute path, which Node on Windows rejects unless it is a `file://` URL.
3. **Files not carried over.** Only `.ts` and `.json` were lifted from `src/`. Tests that read `.sql` or other assets (remembering SQL/RPC parity, transport architecture check) fail with ENOENT.
4. **Packaging and optional-dependency checks** written for the original repositories (`pg` absence, export map, "no legacy runtime").

Fix by class, not by test. A test that checks the original plugin's packaging is retired, not repaired.

## Failing tests

- ASK_HUMAN blocks with the question recorded
- CALL_MODEL forwards generic constraints and materializes a bounded response artifact
- CALL_MODEL without a provider blocks with an explicit question
- COMPLETE proof with REJECTED acceptance: the specification gap, miniature
- HTTP RPC ↔ SQL parity
- LANG-00 fixture reproducibility
- REQUEST_AUTHORITY records the request and blocks (stub, no granter)
- SQL argument names exactly match client JSON body keys
- a second process cannot enter the critical section
- acceptance (separate from proof)
- acceptance before/without a completed run is premature
- all checks exit 0 -> ACCEPTED with reason and proof link
- capability seam preserves W0 behavior
- core\transport\tests\entry.test.ts
- covers init/show/verify/apply/history/render with structured output and exit codes
- declare -> run -> accept end-to-end with zero model involvement
- dist freshness
- dist root entry re-exports the builder surface
- dist/builder output exists (builder is part of the root entry)
- every client RPC exists in SQL and vice versa
- evidence/verify/proof outputs carry capability provenance
- expertise boundary: knowledge is not decision
- expertise output cannot be captured as evidence (wrong source kind)
- export map still serves the built entry points
- failing check -> REJECTED with named failures
- fixture expertise produces an attributable knowledge artifact
- full chain threads artifacts to AWAITING_ACCEPTANCE
- help states the local-only non-goals
- inter-process locking
- knowledge and model output can never enter verification or proof as evidence
- legacy adapters-bundle constructor still works (W0 harness compat)
- local CLI
- malformed and oversized briefs fail loudly, never enter the run
- model output is structurally rejected as evidence
- native runtime has no legacy runtime dependency
- no vendored compiler sources
- nonzero exit is an observation, not an op failure
- pg is optional, never mandatory
- pg-absent packaging
- plan execution
- proposal never auto-applies: status stays PROPOSED across amend + run
- real-adapter integration
- recover requires the discard flag and missing threads never fall back
- regeneration reproduces every frozen golden byte
- registry-backed model provider is used when no injected provider exists
- run records persist and latest-run resolution works
- src/ and index.ts contain no subprocess/legacy references
- unconfigured expertise blocks loudly; Work stays v1 with zero amendments
- unknown capability id is a configuration error, not a block
- unspawnable command blocks the run with COMMAND_SPAWN_FAILED
- write_counts totals actions, not action types
