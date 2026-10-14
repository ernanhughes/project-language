# opencode-work

**One job:** own the process by which acceptance is established — declare
work, version changes to what success means, execute boring operation
plans over Evidence/Verify/Proof, and record acceptance separately from
proof.

```text
Human Intent
     │
     ▼
   Work  (objective, success, obligations, authority, questions)
     │
     ▼
 deterministic orchestrator (operations first, model second)
     │
     ├── RUN_COMMAND / CAPTURE_EVIDENCE → EvidenceRecord
     ├── VERIFY → VerificationReceipt
     ├── BUILD_PROOF → ProofArtifact
     ├── SEARCH_EXPERTISE → ExpertiseBrief  (capability; unavailable blocks)
     ├── CHECK_ACCEPTANCE → AcceptanceRecord   (separate stage)
     └── CALL_MODEL / REQUEST_AUTHORITY / ASK_HUMAN (explicit boundaries)
```

Knowledge may inform proposals (`engine.propose()` → `PROPOSED`, never
auto-applied); only explicit `work_amend` changes meaning:

```text
ExpertiseBrief → proposal (basis refs) → human/tool approval → amendment → new version
```

The orchestrator does **not** own acceptance truth. It owns the process by
which acceptance is established. And it never confuses the two questions:

```text
Proof:      did the declared obligations pass?
Acceptance: did we arrive at the requested state?
```

## Why this exists

Experiment 1 (`spec-gap-experiment`) produced `Proof COMPLETE ∧ Acceptance
WRONG` under a thin specification, then `FAILED / WRONG`, then `COMPLETE /
ACCEPTED` as the *representation of the request* improved — while the
verification machinery never changed. That result needed a durable home:
the thing that holds the objective, versions the obligations, runs the
chain, and keeps proof and acceptance visibly distinct. That thing is Work.
Orchestration is merely one mechanism operating over it.

## The amendment rule (load-bearing)

The model — or anyone — may **never silently mutate success criteria
during execution**. Realizing mid-run that "backward compatibility is also
necessary" becomes an explicit, reasoned, versioned amendment:

```text
Work v1:  O1 tests, O2 typecheck
Work v2:  + O3 compatibility   (Amendment A1, reason recorded)
```

This separates, auditably, *changing the implementation* from *changing
what success means*. Prior versions stay byte-immutable; only the latest
amends; new obligations must declare how the plan pursues them
(plan-coverage check), or the amendment fails.

## Capability spine (Stage 1)

The engine resolves Evidence/Verify/Proof through a `CapabilityRegistry`
— same upstream code, same semantics, plus capability provenance (`via`)
on outputs. Registered capabilities are introspectable via `work_health`
(`capabilities: [{id, version, operations, available, reason?}]`); no
extra tool was added. `SEARCH_EXPERTISE` retrieves attributable knowledge
briefs through the same seam from the real `opencode-expertise` Python
runtime (subprocess, argv-only, JSON, timeout) when configured — findings
carry full source references, evidence status, and brief provenance.
Without configuration the capability stays explicitly unavailable, so
declaring the need blocks loudly rather than degrading silently. Model
providers resolve constructor → per-run → registered, all funneling to
the same BLOCKED+question behavior when absent. See ARCHITECTURE.md and
INTEGRATION.md (admission ledger) for the full picture and the rule that
admits nothing without an observed failure.

## Operation vocabulary (v0.1 + spine)

`RUN_COMMAND, CAPTURE_EVIDENCE, VERIFY, BUILD_PROOF, SEARCH_EXPERTISE,
CALL_MODEL, REQUEST_AUTHORITY, ASK_HUMAN`. References point backwards
only; op outputs are kind-tagged and enforced: **model output and
retrieved knowledge are structurally rejected as evidence**
(`MODEL_OUTPUT_NOT_EVIDENCE`, `KNOWLEDGE_NOT_EVIDENCE`), nonzero exits
are observations (not failures), and model/authority/human/unavailable
operations block with explicit unresolved questions instead of guessing.

Acceptance is deliberately **not** a plan op: `work_run` ends at
`AWAITING_ACCEPTANCE`; `work_accept` re-observes the world with fresh
command executions and records `ACCEPTED | REJECTED`. Acceptance inherits
the specification gap — it checks what was declared, nothing more.

## Upstream integration (adapters, not vendoring)

The engine drives real Evidence/Verify/Proof code through narrow adapter
interfaces (`src/adapters.ts`). Their construction semantics are never
copied here — that would rebuild sibling behavior against their own rules.
Local adapters import sibling checkouts (`../opencode-*` by default,
`OPENCODE_*_PKG` overrides) until registry publication; absence fails
loudly as `UPSTREAM_NOT_AVAILABLE`. The expertise subprocess adapter
resolves `OPENCODE_EXPERTISE_REPO` (else adjacent checkout),
`OPENCODE_EXPERTISE_CONFIG` (else `.opencode/expertise.json`), and
`OPENCODE_EXPERTISE_PYTHON` (else `python`, probed at use). Health reports
per-capability availability.

## Records (all immutable, all local)

- `works/<id>/v<n>.json` — declarations (`opencode.work.v1`)
- `works/<id>/runs/<run_id>.json` — executions (`opencode.work.run.v1`)
- `works/<id>/acceptance-<id>.json` — acceptances (`opencode.acceptance.v1`,
  a record type, not a plugin)
- Upstream artifacts live in per-run upstream dirs (or configured stores),
  never mixed with work records.

There is no mutable "current state" file: `work_get` composes declaration +
runs + acceptances into a derived status (`DECLARED | READY |
AWAITING_ACCEPTANCE | BLOCKED | ACCEPTED | REJECTED`).

## Install

```sh
bun install
bun run check   # typecheck + tests
bun run build
```

```json
{ "plugins": ["file:///absolute/path/to/opencode-work"] }
```

For Windows, the built checkout URL is `file:///C:/Projects/opencode-work`.
For Linux/WSL use its absolute checkout URL, such as
`file:///home/<user>/projects/opencode-work`. These are **OpenCode 2** `plugins`
entries; build `dist/index.js` before host loading. The following first-use
example uses source modules and does not prove host loading.

## Configure

The default plugin needs no model for deterministic command work. Its model
capability is **unavailable**; CALL_MODEL blocks unless a library caller injects
a real provider. REQUEST_AUTHORITY blocks with a question; no authority granter
is implemented. The declaration's `authority.scope` is not a grant.

REQUIRED for the example below: adjacent Evidence/Verify/Proof source checkouts,
each with `bun install` completed, plus Node on PATH. OPTIONAL non-adjacent roots:
`OPENCODE_EVIDENCE_PKG`, `OPENCODE_VERIFY_PKG`, `OPENCODE_PROOF_PKG` (absolute
checkout directories). These local imports are adapters, **not live-loaded
sibling plugins**. OPTIONAL Expertise requests are unnecessary for this example;
SEARCH_EXPERTISE remains unavailable without the Python repository/config described above.

OPTIONAL `.opencode/work.json` accepts `store_dir`, `evidence_store_dir`,
`verification_store_dir`, `proof_store_dir`, `project_dir`. Work storage defaults
to user-data space outside the repo; `OPENCODE_WORK_DIR` overrides it. Upstream
stores otherwise use work-owned subdirectories without mixing domain layouts.
Use absolute paths when configuring stores; malformed JSON reports
`WORK_CONFIG_INVALID`. Expertise variables are optional for other plans, not this one.

Default Evidence/Verify/Proof checkout paths are resolved adjacent to the Work
package, independently of the caller's current directory. Explicit package
environment variables take precedence; the older cwd-relative layout remains
a compatibility lookup. Starting Worker from another project does not require
Writer to initialize these adapters first.

## First use: declare → run → inspect → accept

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
import {WorkEngine} from "./src/engine";
import {buildRegistry} from "./src/plugin";
import {WorkDeclareTool, WorkRunTool, WorkGetTool, WorkAcceptTool, WorkHealthTool} from "./src/tools";
const root = mkdtempSync(join(tmpdir(), "work-docs-"));
const engine = new WorkEngine(root, {store_dir: join(root, "work")}, buildRegistry(root));
const call = async (tool: any, input: unknown) => {
  const result = JSON.parse((await tool.execute(input, undefined)).content);
  console.log(JSON.stringify(result, null, 2));
  if (result.ok === false) throw new Error(result.error);
  return result;
};
await call(WorkHealthTool(engine), {});
const fixture = JSON.parse(readFileSync("work.example.json", "utf8"));
const {objective, scope, claim, success, plan, authority} = fixture;
const declared = await call(WorkDeclareTool(engine), {objective, scope, claim, success, plan, authority});
const work_id = declared.declaration.work_id;
const executed = await call(WorkRunTool(engine), {work_id});
await call(WorkGetTool(engine), {work_id});
if (executed.run.state !== "AWAITING_ACCEPTANCE") throw new Error("Blocked: inspect questions; do not accept");
await call(WorkAcceptTool(engine), {work_id, run_id: executed.run.run_id});
await call(WorkGetTool(engine), {work_id});
console.log(JSON.stringify({store: engine.storeDir, root}, null, 2));
'@ | bun run -
```

The fully specified `work.example.json` supplies the objective, claim, success
obligation, acceptance check and operation plan. The example selects only valid
declare-input fields; it generates its own Work ID instead of reusing the
fixture's historical ID. Plan: `node -e process.exit(0)` → real command observation
→ Evidence → Verify exit-code criterion → EMPIRICAL Proof. **Node is actually
executed**, without a shell, at run time and again for fresh acceptance.

Expected sequence: declaration with generated ID; run `AWAITING_ACCEPTANCE`;
inspected view with proof COMPLETE and acceptance pending; separate acceptance
record `ACCEPTED`; final derived status ACCEPTED. If adapters/operations block,
inspect the recorded unresolved questions and do not accept. In a configured
host, submit the selected fixture fields to `work_declare`, then thread its
returned ID through `work_run`, `work_get`, `work_accept`, `work_get`.

This demonstrates the declared local exit-zero gate and distinct acceptance
process. Work acceptance != proof result != truth; neither checks undeclared
intent. No model capability or live plugin integration is established. A fresh
store avoids shared historical bytes; it does **not fix** the recorded
cross-run `EVIDENCE_ID_COLLISION` limitation below.

## Health check and troubleshooting

Call `work_health` with `{}` or run `bun run health`: inspect capability IDs,
versions, availability/reasons and store writability. Model and unconfigured
Expertise unavailable is honest default state; health does not call a model or
execute a plan. `bun run load-check` tests offline registration only.

- Tool absent: build, check the V2 `plugins` URL and restart.
- `UPSTREAM_NOT_AVAILABLE` / blocked capability: install the named checkout dependencies and check absolute `OPENCODE_*_PKG` paths. Presence alone does not prove every operation succeeds.
- CALL_MODEL / REQUEST_AUTHORITY blocked: inspect questions; do not treat a scope string or available tool as a grant/provider.
- `EVIDENCE_ID_COLLISION`: preserve the recorded failure. Fresh isolated first use does not resolve cross-run identity semantics.
- Proof COMPLETE while acceptance REJECTED: inspect fresh checks and declared intent. Amend explicitly with a reason when success changes; do not silently redefine it.

## Tools (six)

| Tool | Purpose |
|---|---|
| `work_declare` | Validate + persist a work declaration (plan must cover success). |
| `work_amend` | Reasoned version bump: add obligations/checks, optionally replace plan. |
| `work_run` | Execute the plan; ends `AWAITING_ACCEPTANCE` or `BLOCKED`. |
| `work_accept` | Fresh acceptance observations → `ACCEPTED | REJECTED` record. |
| `work_get` | Read-only composed view (declaration, runs, acceptances, status). |
| `work_health` | Versions, adapter availability, store, `network: none`. |

## Checks

```sh
bun run typecheck
bun test            # 66 tests, 442 assertions, 11 files
bun run build
bun src/dev-cli.ts load    # module loads, 6 tools register
bun src/dev-cli.ts smoke   # miniature real-adapter chain (skips honestly if upstreams absent)
bun src/dev-cli.ts smoke-integration  # expertise boundary: retrieved, proposed, unchanged, amended v2
bun src/dev-cli.ts smoke-expertise    # real expertise subprocess: brief, proposal, v1 intact, amend to v2
```

Live OpenCode-runtime integration is **UNVERIFIED**; offline load proves
everything provable without inference.

## Known runtime issue (recorded, not fixed)

Cross-run reproduction surfaced two timestamp identities: same semantic
observation → same Evidence ID, but different `observed_at` → different
stored bytes (`EVIDENCE_ID_COLLISION` on re-capture) and different
downstream hashes. Semantic/content identity vs observation/event identity
are real distinct needs; the Work runtime will clarify the consequences
through repeated operations. No redesign from one experiment - see
DESIGN.md.

## Capability provider

- **Capability:** versioned work declaration, operation-plan execution and acceptance separate from proof.
- **Interfaces:** OpenCode plugin: work_declare, work_amend, work_run, work_accept, work_get and work_health; WorkEngine/CapabilityRegistry library; local Evidence/Verify/Proof adapters and Expertise JSON subprocess; no hooks.
- **Current maturity:** TESTED+INTEGRATED for recorded offline adapter composition; live OpenCode runtime UNVERIFIED.
- **Evidence:** Eleven test files; README records 66 tests / 442 assertions; [INTEGRATION.md](INTEGRATION.md) records capability admission. Checks were not rerun in this documentation pass.
- **Known limitations:** Acceptance != proof or truth. Default plugin model capability is unavailable; CALL_MODEL blocks without an injected provider and REQUEST_AUTHORITY blocks without a granter. Remembering/Relate/Radar/Lens remain FUTURE; recorded EVIDENCE_ID_COLLISION fault remains unresolved.
- **Used by:** worker via opencode-runtime’s Worker/Work bridge (runtime composition); adjacent capabilities are admitted only through explicit engine paths.
- **Registry:** Language `planning/capability-providers/` (Language-side availability index; this repository is the source of truth for itself).
- **Evidence snapshot:** Audited 2026-10-02 against commit 735cd15a.
  See repository history and current status for later changes.
