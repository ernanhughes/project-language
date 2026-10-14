# LANG-00: compatibility and transport qualification

Engineering qualification only. No scientific claim, no semantic experiment.

Question: can one verified static Language projection be rendered, injected
exactly once through the supported OpenCode context boundary, and observed
independently with its bytes and identity preserved?

- `protocol.md` — frozen procedure and layer gates L0–L7.
- `api-qualification.md` — installed-host evidence and support matrix.
- `instrument-manifest.json` — pinned independent instrument
  (`project-context-opencode`, local-only HEAD).
- `fixtures/` — frozen synthetic fixture (`state.md`, `state.meta.json`,
  `receipt.json`).
- `expected/` — frozen `rendered-block.txt` + `hashes.json`.
- `schemas/` — diagnostic and reconciliation record schemas.
- `scripts/` — `make-fixture.mjs`, `load-check.ps1`, `live-smoke.ps1`.
- `runs/` — ignored until a run is explicitly admitted (see `runs/README.md`).

Layer rule: a PASS at one layer never implies a PASS at another. Unit mocks
may support L4 but cannot admit L5.

## Final status: LANG-00 COMPLETE (2026-10-02)

All layers admitted:

```text
L0 PASS / L1 PASS / L2 PASS / L3 PASS
L4 PASS / L5 PASS / L6 PASS / L7 PASS
```

L5 was admitted by the single authorised live smoke `runs/smoke-001/`
(`lang00-smoke-001`, opencode v2.0.21,
`opencode/muse-spark-1.3-contributor-free`, 1 call, cap 32):
frozen canonical block (1253 bytes, `e2788c2d…0541`) byte-equals the
final host-observed block; counts 1/1/1/1; no normalization, no
duplication, no store mutation. A prior cap-1028 attempt was refused by
the authorization gate (exit 2, nothing submitted) and is retained as
fail-closed evidence, not a model call.

Earned claim (narrow): a statically configured, verified Language
projection was injected exactly once into the system-level context of one
real OpenCode v2.0.21 generation, and the final observed host bytes
exactly matched the canonical rendered bytes. This establishes static
transport only — not semantic usefulness, maintenance, re-entrancy,
integration, recovery, or any privilege/security boundary. Do not modify
fixtures, goldens, admitted evidence, or protocol to prepare later work;
LANG-01 must create its own artifacts.
