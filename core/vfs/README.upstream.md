# opencode-vfs

**Git-backed provenance for AI-assisted development.**

opencode-vfs records how AI-assisted work happened. It links human intent and
Work to interactions, runtime artifact references, tool effects, Git state,
evidence, verification, proof, and acceptance—without deciding whether those
artifacts are correct.

opencode-vfs connects an OpenCode interaction to the Git repository being changed. It records the observable prompt/response/tool history alongside source Git state so you can answer:

- What changed?
- Why did it change?
- What did the user ask?
- Which model and tools participated?
- What repository state did the interaction act on?
- What diff or source commit resulted?

The design is descended from Writer vFS, but the OpenCode plugin focuses on **provenance rather than owning the workspace**.

## Core idea

```text
human intent
   ↓
OpenCode interaction
   ↓
model + tools
   ↓
source repository changes
   ↓
Git commit / working tree

          ↘
           provenance Git
           prompt + response + tools + source state
```

Git remains the byte-level source of truth. opencode-vfs adds the semantic/audit trail.

## Install and host compatibility

This repository supplies an **OpenCode 2 plugin** using `@opencode/plugin`
and the **ProvenanceLedger library**. The compatibility target checked on
2026-10-02 is OpenCode **2.0.22**, with SDK **2.0.22** in the lockfile.
Requires Git, Node >=22.18 and Bun (validated with Bun 1.4.2).
TypeScript source is the package entrypoint; the root `index.ts` also supports
loading a local plugin directory.

```powershell
git clone https://github.com/ernanhughes/opencode-vfs.git C:\Projects\opencode-vfs
Set-Location C:\Projects\opencode-vfs
bun install --frozen-lockfile
bun run typecheck
```

Add the local checkout to `opencode.json` in the source workspace:

```json
{
  "plugins": [{
    "package": "file:///C:/Projects/opencode-vfs",
    "options": {
      "storage": {"target": "external", "repo": "C:/Projects/provenance/demo", "autoCommit": false, "push": false}
    }
  }]
}
```

On Linux/WSL clone into `/home/<user>/projects/opencode-vfs`, use that absolute
file URL and a writable provenance path. The target source workspace must be a
Git repository. The storage/privacy/capture options below are plugin options;
the library constructor instead receives an explicit ledger root and project ID.

The adapter uses `Plugin.define`, native prompt/tool hooks, V2 observable events
and lifecycle cleanup. Its status was `active` in an isolated OpenCode 2.0.22
host startup check, alongside eleven sibling plugins, without a model request.
This verifies loading; deterministic adapter tests cover recording behaviour.
It does not establish live model/tool interaction or upgrade capability maturity.
The library remains usable independently. For the host API boundary, see the
[official migration guide](https://opencode.ai/v2/docs/build/plugins/migrate-v1).

## Readiness check and smallest library interaction

There is no `vfs_health` tool. After installing dependencies, from the checkout:

```powershell
bun -e 'import {GitRepo} from "./src/git.ts"; if (!new GitRepo(process.cwd()).isRepo()) throw new Error("Git repository required"); console.log("Git source and module import ready")'
```

This deterministic readiness check proves module import and a Git source, not
host hook loading, writable provenance storage or domain-artifact validity.
For a complete ledger interaction, save the following as `ledger-first-use.ts`
in this checkout and run `bun run ledger-first-use.ts`:

```typescript
import {mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {ProvenanceLedger} from "./src/index.ts";
const root = mkdtempSync(join(tmpdir(), "vfs-docs-"));
const ledger = new ProvenanceLedger(root, "docs-project");
const work = {kind: "work" as const, work_id: "docs-work", version: 1};
const operation = {kind: "operation" as const, work_id: work.work_id, op_id: "docs-operation"};
const recorded = ledger.recordEdge({
  project_id: "docs-project", work, from: operation,
  relation: "BELONGS_TO_WORK", to: work,
  producer: {component: "documentation-caller", version: "1"}
});
console.log(JSON.stringify({root, recorded, history: ledger.getWorkHistory(work)}, null, 2));
```

The example declares both references itself and writes one caller-declared edge
into a new temporary directory (printed for inspection; no Git commit/push).
Expected: an `opencode-vfs.edge-record.v1` recording and one history entry, with
generated `edge_id` and `record_id`. This demonstrates recording/querying a
relationship; it does not establish causality, a real Work artifact or truth.

## Troubleshooting

- `opencode-vfs requires a Git source repository`: initialise/select the intended source Git repository; the external provenance repository is a separate path.
- Plugin absent under OpenCode 2: use `plugins` with the object-form `package`/`options` configuration above, install the checked-in dependencies, and retain the root `index.ts` when loading a local directory. Confirm host loading has finished before reading plugin status.
- `ARTIFACT_ID_COLLISION`: the same ID was registered with divergent identity; do not overwrite history to hide it.
- `QUERY_BOUNDS`: query limit must be 1..1000 and offset non-negative. Check writable storage and privacy/capture options for missing recordings; readiness does not test host capture.

## Configure: storage modes

### External provenance repo (default)

The source code repository stays clean.

```jsonc
{
  "plugins": [
    {
      "package": "file:///C:/Projects/opencode-vfs",
      "options": {
        "storage": {
          "target": "external",
          "repo": "C:\\Projects\\provenance\\language",
          "autoCommit": true,
          "push": false
        }
      }
    }
  ]
}
```

If `repo` is omitted, the default is:

```text
~/.opencode/provenance/<project-id>
```

The plugin initializes that directory as a Git repository if necessary.

### Current source repo

Use this only when provenance belongs with the code:

```jsonc
{
  "plugins": [
    {
      "package": "file:///C:/Projects/opencode-vfs",
      "options": {
        "storage": {
          "target": "current",
          "path": ".opencode-vfs",
          "autoCommit": true
        }
      }
    }
  ]
}
```

Only the provenance path is staged by the plugin; unrelated working-tree changes are not added to its provenance commit.

## What is captured

By default:

- admitted prompts and observable instructions/synthetic input
- assistant text/reasoning streams and compaction events
- tool calls before and after execution
- observable tool and shell events
- step completion/failure snapshot and changed-file metadata
- session lifecycle events, including model selection when supplied
- source HEAD, branch, origin, status, and diff hash

The V2 adapter uses `ctx.session.hook("prompt")`, tool execution hooks and
`ctx.event.subscribe()`. Events use the V2 `data` envelope and are filtered to
the source location when a location is supplied. Pending observations flush
on execution success/failure/interruption, idle status, deletion or cleanup.
The `diffs` control records step snapshot/file metadata; it does not recreate
the removed V1 `session.diff` payload. Source Git diff hashes remain part of
every recorded event. Events without an observable session ID are omitted.

## Privacy

Default: `redacted`.

```jsonc
{
  "privacy": {
    "mode": "redacted",
    "maxStringBytes": 128000,
    "redactKeys": ["my_custom_secret"]
  }
}
```

Modes:

- `redacted` — removes common secret/token fields and patterns
- `full` — stores observable payloads verbatim
- `hash-only` — stores only digest + byte count

**Keep provenance repositories private by default.** Prompts can contain unpublished code, local paths, research notes, or sensitive data.

## Capture controls

```jsonc
{
  "capture": {
    "prompts": true,
    "responses": true,
    "tools": true,
    "diffs": true,
    "events": true
  }
}
```

## Provenance layout

```text
.opencode-vfs/
  projects/
    <project-id>/
      sessions/
        <session-id>/
          <timestamp>-<content-hash>.json

      artifacts/
        <artifact-id-hash>/identity.json
      causal/records/
        <record-id>.json
      indexes/
        artifact/<artifact-id-hash>.jsonl
        work/<work-id-hash>.jsonl
```

Artifact records contain references only: stable ID, domain schema, and
producer identity. Domain payloads remain in their owning repositories.
Canonical edge recordings are immutable individual files. The JSONL indexes
are small derived navigation structures and are streamed with paged results;
ordinary writes never scan historical provenance.

## Causal API

The package exports `ProvenanceLedger` plus validators and types for `WorkRef`,
`ArtifactRef`, `EventRef`, `OperationRef`, `ProvenanceRef`, and `CausalEdge`.

Supported directed relations are:

- `operation --BELONGS_TO_WORK--> work`
- `consumer --USED--> artifact`
- `operation/work --PRODUCED--> artifact`
- `event/effect --OBSERVED_BY--> EvidenceRecord`
- `EvidenceRecord --VERIFIED_BY--> VerificationReceipt`
- `VerificationReceipt --SUPPORTED_BY--> ProofArtifact`
- `ProofArtifact --ACCEPTED_BY--> AcceptanceRecord`
- `artifact --DEPENDS_ON--> artifact`

The caller declares these relationships. VFS validates and records them; it
does not infer causality or re-run a domain capability. Repeating the same
semantic edge preserves one stable `edge_id` while creating distinct immutable
recording events with their own `record_id` and `recorded_at`.

Artifact IDs, schema names, Work IDs, relation names, and Git source identity
are structural provenance metadata and remain inspectable in every privacy
mode. Domain payloads are never embedded in artifact refs or edges. Event
payloads continue to follow `full`, `redacted`, or `hash-only`; paths/remotes in
`SourceState` should therefore be treated as sensitive provenance metadata and
provenance repositories remain private by default.

## Semantic boundaries

```text
provenance != truth
history != memory
event != evidence
proof != acceptance
recorded causal claim != inferred causality
Git state != semantic judgement
```

Every session segment is append-only and content identified.

## Development

```bash
bun install
bun test
bun run typecheck
```

## Design boundary

opencode-vfs records and links evidence. It does **not** decide whether a change is correct.

That preserves the original Writer vFS principle: tracking infrastructure should remain separate from agents and reviewers that reason about quality.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Capability provider

- **Capability:** append-only Git-backed interaction and provenance ledgering.
- **Interfaces:** OpenCode 2 `Plugin.define` via `@opencode/plugin`: prompt and tool execution hooks, V2 event subscription and cleanup; ProvenanceLedger library and validators for eight directed relations.
- **Current maturity:** IMPLEMENTED+TESTED; local OPERATIONAL use is repository-claimed, not independently reverified here.
- **Evidence:** Six test files, including V2 adapter coverage, Git safety and large-history coverage; [contract audit](docs/AUDIT-v0.2.md) and [architecture](docs/ARCHITECTURE.md). Typecheck and deterministic tests passed during the OpenCode 2.0.22 compatibility upgrade; host startup loading was checked separately.
- **Known limitations:** Caller-declared causal edges do not establish causality or correctness; events are not EvidenceRecords. Source must be a Git repository; provenance can contain private prompts. No opencode-language integration.
- **Used by:** opencode-runtime’s Worker/Work bridge (library consumer); OpenCode interactions (hook capture). Domain payloads stay with their owners.
- **Registry:** Language `planning/capability-providers/` (Language-side availability index; this repository is the source of truth for itself).
- **Evidence snapshot:** Audited 2026-10-02 against commit 468d8129.
  See repository history and current status for later changes.
