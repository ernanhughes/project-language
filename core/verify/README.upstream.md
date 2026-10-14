# opencode-verify

**One job:** decide whether supplied evidence satisfies an explicit criterion.

```text
Claim + VerificationCriterion + EvidenceRecord[]
        │
        ▼
  opencode-verify
        │
        ▼
VerificationReceipt: PASS | FAIL | INCONCLUSIVE
```

It answers **"Does the supplied evidence satisfy this criterion?"** Nothing more.

## The three questions stay separate

```text
Evidence:  "What was observed?"
Verify:    "Does the supplied evidence satisfy this criterion?"  ← this repo
Proof:     "Can evidence + verification be packaged into a replayable artifact?"
```

A PASS means exactly this:

> The supplied valid evidence satisfied the supplied criterion,
> as evaluated by this verifier version at this time.

It does **not** mean the claim is universally true, the task is complete,
the action is permitted, or a proof exists:

```text
PASS != universal truth
PASS != task completion
PASS != authority
PASS != proof
```

## Why three outcomes, not boolean

Absence of sufficient evidence is not evidence of failure.

```text
expected exit_code = 0, observed exit_code = 0  → PASS
expected exit_code = 0, observed exit_code = 1  → FAIL
expected exit_code = 0, no applicable evidence   → INCONCLUSIVE
```

```text
missing evidence != failure
```

The evaluator works in three-valued logic (`TRUE / FALSE / UNKNOWN`) and
maps at the boundary: `TRUE → PASS`, `FALSE → FAIL`, `UNKNOWN →
INCONCLUSIVE`. `UNKNOWN` is never collapsed into `FALSE` — the `ALL` / `ANY`
/ `NOT` tables are Kleene-strong and pinned by tests.

## No LLM judge

The core path requires **zero model inference, zero network, zero semantic
guessing**. Criteria are explicit machine-checkable predicates over record
fields — nine operators (`EQUALS NOT_EQUALS CONTAINS MATCHES GT GTE LT LTE
EXISTS`) plus `all / any / not` composition with deterministic selectors
(evidence kind, id, subject, source kind) and an optional `min_observed_at`
freshness gate. A test scans `src/` to prove no model/network code exists.

## Install

Prerequisites: [Bun](https://bun.sh) ≥ 1.0 (Node ≥ 22 also works for built output).

```sh
bun install
bun run check   # typecheck + tests
bun run build
```

```json
{ "plugins": ["file:///absolute/path/to/opencode-verify"] }
```

For Windows, the built checkout URL is `file:///C:/Projects/opencode-verify`.
For Linux/WSL use its absolute checkout URL, such as
`file:///home/<user>/projects/opencode-verify`. These are **OpenCode 2** `plugins`
entries; build `dist/index.js` before host loading. The following first-use
example uses source modules and does not prove host loading.

## Tools (four)

| Tool | Purpose |
|---|---|
| `verify_check` | Evaluate claim + criterion + evidence → persisted `VerificationReceipt`. Errors (bad claim/criterion, tampered or unresolvable evidence) return `ok:false` with a machine-readable `error_code` — never a verdict. |
| `verify_get` | Retrieve a receipt by id. Read-only. |
| `verify_explain` | Render the deterministic evaluation trace plus what the verdict does **not** establish. Data rendering, not a new judgment. |
| `verify_health` | Readiness: versions, supported evidence schemas, store writability, `model_inference: none`, `network: none`. |

No `verify_validate` tool: validation failures already surface as explicit
`verify_check` error codes (`INVALID_CLAIM`, `INVALID_CRITERION`,
`UNSUPPORTED_OPERATOR`, …).

## Configure

No required model/backend configuration. Receipts default to project-namespaced
user-data storage outside the repo (`APPDATA` on Windows, `XDG_DATA_HOME` or
`~/.local/share` otherwise). OPTIONAL `.opencode/verify.json`:

```json
{"store_dir": "C:/Data/verify", "evidence_store_dir": "C:/Data/evidence"}
```

`OPENCODE_VERIFY_DIR` overrides receipt storage; `OPENCODE_EVIDENCE_DIR` supplies
read-only evidence-ref resolution. Per-call `evidence_store_dir` has priority for
refs, then environment, library overrides, project file. Inline full records
need no upstream store. Relative paths resolve from the project. Malformed
config fails as `VERIFY_CONFIG_INVALID`; stores never mix evidence and receipts.

## First use: valid fixture to three outcomes

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
import {VerificationEngine} from "./src/engine";
import {VerifyCheckTool} from "./src/tools";
const evidence = JSON.parse(readFileSync("tests/fixtures/evidence-example.json", "utf8"));
const root = mkdtempSync(join(tmpdir(), "verify-docs-"));
const engine = new VerificationEngine(process.cwd(), {store_dir: root});
const claim = {statement: "test command exited successfully", subject: "test-suite"};
const criterion = {kind: "evidence_field", evidence_kind: "command_result",
  path: "observation.exit_code", operator: "EQUALS", expected: 0};
console.log(JSON.stringify({fixture: evidence, criterion, store: engine.storeDir}, null, 2));
for (const input of [
  {claim, criterion, evidence: [evidence]},
  {claim, criterion: {...criterion, expected: 1}, evidence: [evidence]},
  {claim, criterion, evidence: []},
]) {
  const result = JSON.parse((await VerifyCheckTool(engine).execute(input, undefined as never)).content);
  if (!result.ok) throw new Error(result.error);
  console.log(JSON.stringify(result, null, 2));
}
'@ | bun run -
```

The checked-in fixture is a **full valid upstream EvidenceRecord**, with actual
hash/ID and observed `exit_code: 0`; the code prints it before using it. No tests
are executed now, and its historical stdout is not a current test result.
Expected output order: `ok: true` with persisted `receipt.verdict` PASS, FAIL,
INCONCLUSIVE. Receipts include generated `verification_id`, normalized claim,
criterion, evidence IDs/hashes, result/reason/evaluation trace and verifier.
No unexplained ID lookup or external Evidence checkout is needed.

Kleene logic preserves UNKNOWN: absent/inapplicable values map to INCONCLUSIVE,
not FAIL; ALL(FALSE, UNKNOWN) is FALSE, ANY(TRUE, UNKNOWN) is TRUE, and
NOT(UNKNOWN) stays UNKNOWN. This proves criterion evaluation over supplied bytes,
not universal truth, task completion or permission. To use the host tool, submit
the same claim/criterion and the printed full record to `verify_check`.

## Health check and troubleshooting

Call `verify_health` with `{}` or run `bun run health`: versions, supported
schemas and receipt-store writability, no inference/network. `bun run load-check`
tests offline registration; it does not prove live host loading.

- Tool absent: build, check the V2 `plugins` URL and restart.
- `INVALID_CRITERION` / `UNSUPPORTED_OPERATOR`: match the exact criterion fields/operator; unknown fields fail closed.
- INCONCLUSIVE: inspect selectors, missing values and freshness gates. It is an outcome, not a broken invocation.
- `EVIDENCE_INTEGRITY_FAILURE`: pass the original full bytes/hash; do not edit a fixture observation while retaining its ID. Unresolvable refs need the owning store or inline record, not a guessed ID.

## Evidence integration (no runtime dependency)

Verify consumes `opencode.evidence.v1` through a **pinned, attributed,
read-only vendored contract** (`src/evidence-contract.ts` + canonicalization),
frozen against `opencode-evidence@88cc2e6` — that package is local-only with
no registry presence, and Verify must run against bare record JSON on any
machine. Drift is detected, not prevented:

- `tests/fixtures/evidence-example.json` is a byte-identical real upstream
  record; the suite reproduces its hash/id exactly;
- smoke cross-checks a Verify-built record against upstream's own
  `validateRecord` when a checkout is adjacent.

Every supplied record is structurally validated and integrity-recomputed
before evaluation. Invalid requests fail explicitly; insufficient evidence
yields `INCONCLUSIVE`.

Evidence may arrive inline (full records), by id with `evidence_store_dir`
(read-only resolution over an evidence-store layout), or via a custom
`EvidenceResolver`. Verify never writes, mutates, discovers, or executes.

## Receipt identity

`verification_id = vr_ + sha256(canonical({schema, claim, criterion,
evidence_ids, evidence_hashes, verdict, result, reason_code,
verifier{plugin,version}}))[0:32]`. The verifier version participates —
evaluator semantics can change. `evaluated_at` is provenance annotation
(first-write-wins; re-checks are idempotent, `duplicate: true`), covered by
neither identity nor `content_hash`, exactly like Evidence's `observed_at`.
Receipts persist under `<store>/receipts/<id>.json`, physically separate
from evidence, with atomic writes and collision-loud semantics.

## Checks

```sh
bun run typecheck
bun test            # 64 tests, 290 assertions, 10 files
bun run build
bun src/dev-cli.ts load    # module loads, 4 tools register, health clean
bun src/dev-cli.ts smoke   # PASS / FAIL / INCONCLUSIVE + retrieval + integrity
```

Live OpenCode-runtime integration is **UNVERIFIED** here; offline load proves
everything provable without inference.

## Boundaries (see DESIGN.md, AGENTS.md)

Verification authorizes nothing, completes no tasks, generates no proofs,
discovers no evidence, executes nothing, and judges no prose. Boring
deterministic verification is the point.

## Capability provider

- **Capability:** testing explicit criteria against supplied EvidenceRecords.
- **Interfaces:** OpenCode plugin: verify_check, verify_get, verify_explain and verify_health; nine criterion operators plus all/any/not, selectors and freshness gate; no hooks.
- **Current maturity:** TESTED; live OpenCode runtime UNVERIFIED.
- **Evidence:** Ten test files; README records 64 tests / 290 assertions and offline load/smoke checks. These were not rerun in this documentation pass.
- **Known limitations:** PASS != truth != completion != authority != proof. Missing/inapplicable evidence remains INCONCLUSIVE; the pinned Evidence contract supplies validation, not a runtime dependency.
- **Used by:** opencode-proof (pinned vendored contract); opencode-work (local runtime adapter).
- **Registry:** Language `planning/capability-providers/` (Language-side availability index; this repository is the source of truth for itself).
- **Evidence snapshot:** Audited 2026-10-02 against commit 58349050.
  See repository history and current status for later changes.
