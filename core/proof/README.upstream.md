# opencode-proof

**One job:** package an argument — claims, obligations, evidence, and
verification — so another system can inspect and replay it.

```text
Evidence:  "What was observed?"
Verify:    "Did the supplied evidence satisfy this criterion?"
Proof:     "What exact argument supports this claim,           ← this repo
            and can that argument be inspected/replayed?"
```

Proof assembles proof-carrying work. It generates no conclusions: every
claim, criterion, record, and receipt arrives from the caller. The core
pipeline is validate → bind → derive → persist, with zero model inference
and zero network.

## Proof classes

```text
EMPIRICAL   evidence + deterministic verification      (v0.1: implemented)
FORMAL      formal artifact + checker/toolchain result (v0.1: reserved)
COMPOSITE   multiple obligations / proof classes       (v0.1: reserved)
```

Building a non-EMPIRICAL proof fails loudly (`PROOF_CLASS_UNSUPPORTED`).
Ordinary verification receipts are never labeled formal proof:

```text
empirically verified != formally proved
formally proved under assumptions != preserved human intent
```

## Obligations and status

A claim declares one or more `ProofObligation`s, each binding an exact
claim + criterion + evidence set + verification receipt. Statuses derive
deterministically from receipt verdicts — read, never re-evaluated:

```text
PASS         → SATISFIED
FAIL         → VIOLATED
INCONCLUSIVE → UNRESOLVED
```

Over required obligations: any `VIOLATED` → `FAILED`; else any
`UNRESOLVED` → `INCOMPLETE`; else `COMPLETE`. Optional obligations
(`required: false`) are reported without affecting status.

## What COMPLETE means — and does not

COMPLETE means exactly this:

> All required proof obligations explicitly declared in this artifact are
> backed by integrity-valid verification receipts whose exact evidence and
> criteria produced PASS under the recorded verifier semantics.

It does **not** mean:

```text
COMPLETE != universal truth
COMPLETE != complete specification
COMPLETE != human intent satisfied
COMPLETE != task complete
COMPLETE != authority to act
COMPLETE artifact replayable != world still matches
```

The sharpest of these is the **specification gap**: proof completeness is
relative to declared obligations. Tests pass + typecheck passes can be
structurally COMPLETE while an undeclared requirement (say, backward
compatibility) stands unexamined. Proof cannot discover missing intent:

```text
representation != intent != permission
```

## References, not copies

The artifact stores immutable refs — `{evidence_id, content_hash}` and
`{verification_id, content_hash}` — never duplicate upstream bytes. Before
assembly, every record validates against `opencode.evidence.v1` and every
receipt against `opencode.verification.v1`, both integrity-recomputed; then
cross-bindings are enforced (receipt claim ≡ artifact claim, obligation
criterion ≡ receipt criterion, evidence sets equal, per-record hashes equal
the receipt-bound hashes). Mismatches are `PROOF_BINDING_MISMATCH` errors,
never statuses.

## Replay (not re-verification)

`proof_replay` re-establishes structural validity against the exact
referenced bytes: artifact/evidence/receipt integrity, ref hashes,
bindings, re-derived statuses vs the stored declaration → `REPLAY_MATCH` or
a named failure (`PROOF_INTEGRITY_FAILURE`, `EVIDENCE_INTEGRITY_FAILURE`,
`VERIFICATION_INTEGRITY_FAILURE`, `PROOF_BINDING_MISMATCH`,
`STATUS_MISMATCH`, `MISSING_DEPENDENCY`). It never executes tools, tests,
criteria, or models — receipt hashes already bind verdicts to evidence, so
re-running the evaluator would be world re-verification (Verify's job).
`REPLAY_MATCH` means the historical argument is intact, never that it is
fresh: yesterday's passing tests replay fine after today's breaking change.

## Configure

No required backend/model settings. Proofs use a project-namespaced user-data
store outside the repo by default. OPTIONAL `.opencode/proof.json` accepts
`store_dir`, `evidence_store_dir`, `verification_store_dir` (absolute paths or
paths relative to the project). `OPENCODE_PROOF_DIR` overrides the proof store;
`OPENCODE_EVIDENCE_DIR` and `OPENCODE_VERIFY_DIR` supply upstream ref resolution.
For upstream reads, per-call directory wins, then environment, library override,
project file. Full inline records/receipts need no upstream store. Config errors
fail as `PROOF_CONFIG_INVALID`. Evidence, receipts and proof layouts remain separate.

## First use: fixture argument to EMPIRICAL artifact and replay

Run from this source checkout after `bun install`. The PowerShell here-string
below executes the existing tool directly with Bun; on Linux/WSL save its
TypeScript body as `first-use.ts` in this checkout and run `bun run first-use.ts`.
No OpenCode session, model or network is involved. Output stores are newly
created temporary directories, printed for inspection. To keep that isolation,
run without an `OPENCODE_*_DIR` store override (environment overrides take precedence).
```powershell
@'
import {readFileSync, mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {ProofEngine} from "./src/engine";
import {ProofBuildTool, ProofReplayTool} from "./src/tools";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const evidence = read("tests/fixtures/evidence-example.json");
const receipt = read("tests/fixtures/receipt-example.json");
const root = mkdtempSync(join(tmpdir(), "proof-docs-"));
const engine = new ProofEngine(process.cwd(), {store_dir: root});
const input = {
  claim: receipt.claim, proof_class: "EMPIRICAL",
  obligations: [{description: "recorded command exited zero", claim_id: receipt.claim.claim_id,
    criterion: receipt.criterion, evidence_ids: [evidence.evidence_id],
    verification_id: receipt.verification_id, required: true}],
  evidence: [evidence], verifications: [receipt],
};
console.log(JSON.stringify({input, store: engine.storeDir}, null, 2));
const built = JSON.parse((await ProofBuildTool(engine).execute(input, undefined as never)).content);
if (!built.ok) throw new Error(built.error);
console.log(JSON.stringify(built, null, 2));
const replayed = await ProofReplayTool(engine).execute({
  proof_id: built.artifact.proof_id, evidence: [evidence], verifications: [receipt]
}, undefined as never);
console.log(replayed.content);
'@ | bun run -
```

The complete input loads this checkout's full, hash-valid EvidenceRecord and
matching VerificationReceipt. The receipt supplies the exact claim and criterion;
the explicitly declared obligation binds their real IDs. No upstream package,
unexplained abbreviated ID or live execution is needed.

Expected: `ok: true`, `artifact` with generated `proof_id`, `proof_class: "EMPIRICAL"`,
`status: "COMPLETE"`, one required SATISFIED outcome and evidence/verification
hash refs; then replay `REPLAY_MATCH`. The printed input is also a full
`proof_build` host-tool request. For `proof_replay`, use the returned proof ID
and the same full dependencies. This assembles a historical argument under
declared obligations, **not mathematical proof or work acceptance**.
Replay rechecks bytes, bindings and derived status; it executes no command,
test or criterion and proves no freshness. FORMAL/COMPOSITE remain reserved.

## Health check and troubleshooting

Call `proof_health` with `{}` or run `bun run health`: versions, classes,
upstream schemas and store writability without inference/network.
`bun run load-check` is offline registration, not live host loading.

- Tool absent: build `dist/index.js`, check V2 `plugins` and restart.
- `PROOF_CLASS_UNSUPPORTED`: only EMPIRICAL is buildable.
- `PROOF_BINDING_MISMATCH`: claim, criterion, evidence IDs/hashes and receipt bindings must match exactly. Use original dependencies, never repaired hashes over edited historical bytes.
- `MISSING_DEPENDENCY`: provide full referenced records/receipts or their owning stores. REPLAY_MATCH on old bytes does not establish the current world.

## Upstream integration (no runtime dependencies)

Both upstreams are local-only packages, so Proof vendors pinned read-only
contracts (`src/evidence-contract.ts` @ `opencode-evidence@88cc2e6`,
`src/verify-contract.ts` @ `opencode-verify@a341298`): validation,
integrity, and normalization only — never evaluation, never authorship.
Drift is detected by byte-identical real fixtures plus live cross-checks:
the smoke chain builds records with upstream Evidence code and receipts
with upstream Verify code, and Proof's vendored validators accept every
live byte. One deliberate adaptation: schema gates distinguish
`UNSUPPORTED_*_SCHEMA` from malformed input (upstream authors its own
schema, so it never needed the distinction; identical behavior on genuine
v1 artifacts).

## Install

```sh
bun install
bun run check   # typecheck + tests
bun run build
```

```json
{ "plugins": ["file:///absolute/path/to/opencode-proof"] }
```

For Windows, the built checkout URL is `file:///C:/Projects/opencode-proof`.
For Linux/WSL use its absolute checkout URL, such as
`file:///home/<user>/projects/opencode-proof`. These are **OpenCode 2** `plugins`
entries; build `dist/index.js` before host loading. The following first-use
example uses source modules and does not prove host loading.

## Tools (five)

| Tool | Purpose |
|---|---|
| `proof_build` | Assemble + persist a `ProofArtifact` from claim, obligations, evidence, receipts. Binding/integrity failures return `ok:false` + `error_code`. |
| `proof_get` | Retrieve by id. Read-only. |
| `proof_explain` | Deterministic rendering incl. the specification-gap disclaimer. |
| `proof_replay` | Structural replay → `REPLAY_MATCH` or named failure. |
| `proof_health` | Versions, classes, upstream schemas, store, `model_inference: none`, `network: none`. |

## Checks

```sh
bun run typecheck
bun test            # 56 tests, 240 assertions, 9 files
bun run build
bun src/dev-cli.ts load    # module loads, 5 tools register, health clean
bun src/dev-cli.ts smoke   # real 3-project chain (or pinned fixtures if upstreams absent)
```

Live OpenCode-runtime integration is **UNVERIFIED**; offline load proves
everything provable without inference.

## Identity

`proof_id = pf_ + sha256({schema, class, claim, obligations, refs, status,
summary, producer})` (full 64-hex). `assembled_at` is annotation
(first-write-wins; re-builds idempotent), excluded from identity and hash —
same family convention as Evidence `observed_at` and Verify `evaluated_at`.

## Capability provider

- **Capability:** packaging empirical argument into durable, structurally replayable ProofArtifacts.
- **Interfaces:** OpenCode plugin: proof_build, proof_get, proof_explain, proof_replay and proof_health; no hooks.
- **Current maturity:** TESTED; live OpenCode runtime UNVERIFIED.
- **Evidence:** Nine test files; README records 56 tests / 240 assertions, specification-gap and tamper/binding checks, and offline smokes. These were not rerun in this documentation pass.
- **Known limitations:** ProofArtifact != formal mathematical proof: only EMPIRICAL is buildable. Replay structurally revalidates referenced bytes without re-executing the original world; replayability != freshness; COMPLETE != intent or authority.
- **Used by:** opencode-work (local runtime adapter); upstream Evidence/Verify validation uses pinned vendored contracts.
- **Registry:** Language `planning/capability-providers/` (Language-side availability index; this repository is the source of truth for itself).
- **Evidence snapshot:** Audited 2026-10-02 against commit 78320637.
  See repository history and current status for later changes.
