# opencode-language — deterministic projection core (v0)

> Maintain a bounded, source-linked, human-correctable communication projection
> for one explicitly declared conversation thread.

The projection is derived state. It is not the source conversation, not proof
of an external fact, and not a new instruction authority. Use the term
**projection**, not "memory truth", "perfect memory", or "authoritative transcript".

Frozen design (read-only input): `C:\Projects\language\planning\architecture\opencode-language-v0-design.md`
(see `docs/design-input.md` for the SHA-256 and handoff record).

## The single job

- One bounded projection per declared thread.
- `thread_id` is mandatory. Never inferred; ambiguity fails closed.
- Every item carries actor, standing, scope, and stable source references.
- Human edits govern the projection and are recorded as new revisions.
- The projection is rendered for later context injection with an explicit
  derived-data warning and no new authority.

## Storage layout

Default root: `path.join(os.homedir(), ".opencode", "language")`,
overridable with `OPENCODE_LANGUAGE_HOME`. Never inside the source repository.

```text
<store-root>/
  <project-id>/               # safe-basename + 16 hex chars of canonical path hash
    threads/
      <thread-id>/            # its own Git repository
        .git/
        state.md              # canonical human-readable current projection
        state.meta.json       # canonical JSON metadata
        revisions/
          <revision-id>.json  # immutable receipt
          idem-<hash>.json    # idempotency pointer (owned, committed)
        .locks/               # inter-process lock (never committed)
        .tmp/                 # transient files (never committed)
```

`project_id` is deterministic; moving the project produces a new id in v0.
Both the user-supplied and canonical project paths are recorded in metadata.

## State schema

`state.md` is constrained Markdown: a fixed header plus the sections
Current objective, Decisions, Constraints, Definitions, Open ambiguities,
and Supersession index. Items carry id, kind, text, actor, standing
(`explicit`/`tentative`/`disputed`/`superseded`), scope, and source
references (`session_id`, `message_id`, optional `part_id`, full lowercase
content SHA-256). Canonical form is UTF-8, LF, exactly one final newline;
`parse(serialize(state))` round-trips and CRLF input is normalized.

v0 engineering bounds (`bounds/v1`, not empirically validated optima):
64 KiB state, 200 items, 4 KiB per item text, 12 sources per item,
100 supersession entries.

## CAS, idempotency, locking, Git

- Every automated mutation names an expected parent revision; a wrong parent
  is `CAS_CONFLICT` with no commit.
- Same idempotency key + same canonical request replays the original result
  with no new commit; same key + different input is `IDEMPOTENCY_CONFLICT`.
- A per-thread inter-process lock (atomic exclusive file creation) guards
  validation → CAS → materialization → verification → commit.
- Each thread is its own Git repository, configured `core.autocrlf=false`
  so canonical bytes survive checkout. Commits use an isolated temporary
  index and stage only owned files. No remotes are ever configured; there is
  no push path. Commit identity comes from per-command environment, never
  from the user's global Git configuration.
- Multi-file writes are **not** claimed atomic. Readers accept state only
  when `state.md`, metadata, and receipt agree and the receipt is in Git
  history; otherwise they return `TORN_STATE`/`CORRUPT_HISTORY` (or
  `human-edit-pending` for an unaccepted human candidate) and identify the
  last valid committed revision. `recover` restores it with an explicit
  discard flag and never touches the source repository.

## Trust boundary

The renderer emits a wrapper marked derived/incomplete/human-correctable/
potentially mistaken, retaining actor and standing, directing source checks,
and granting no instruction or tool authority. Reserved delimiters in state
content are rejected, never executed.

## CLI

```powershell
node dist/src/cli.js init --project <path> --thread <id> --key <k>
node dist/src/cli.js show --project <path> --thread <id>
node dist/src/cli.js verify --project <path> --thread <id>
node dist/src/cli.js apply --project <path> --thread <id> --key <k> --parent <rev> --ops <file>
node dist/src/cli.js accept-human-edit --project <path> --thread <id> --key <k> --parent <rev> --session <s> --message <m> --sha <sha256>
node dist/src/cli.js history --project <path> --thread <id>
node dist/src/cli.js recover --project <path> --thread <id> --discard-unaccepted
node dist/src/cli.js render --project <path> --thread <id>
```

Add `--json` for machine-readable output and `--store-root` to override the
store location. Mutations are read from a JSON file, never shell-quoted.

## Static plugin adapter (LANG-00)

`src/plugin.ts` is the smallest production-shaped OpenCode adapter
(`@opencode/plugin` V2, `session.hook("context")`). Disabled by default;
explicit configuration only:

```text
OPENCODE_LANGUAGE_ENABLED=1
OPENCODE_LANGUAGE_THREAD_ID=<mandatory-thread-id>
OPENCODE_LANGUAGE_HOME=<optional-store-root>
```

Enabled behavior is strictly read-only: verify the existing thread, render
it through the pure renderer, and append that exact block once to the
system array. Missing, torn, corrupt, over-limit, unsupported-version, and
human-edit-pending states refuse with stable `LANG_*` diagnostics and leave
the context untouched. The hook never initializes, mutates, recovers, or
accepts state, never calls a model, and registers no watchers or post-turn
actions. A root `index.ts` re-exports the compiled adapter so a local clone
loads as a plain `file://` plugin directory (run `npm run build` first).

Transport qualification lives in `experiments/LANG-00/` (protocol, frozen
synthetic fixture, load check, gated one-call smoke dry-run only).

## Current non-goals

- No OpenCode hook. No model call. No automatic post-turn maintenance.
- No Remembering or VFS integration. No remote synchronization.
- LANG-00 remains the gate for host compatibility and transport.
- Current state is a fallible derived projection. Git history provides
  provenance, not factual truth. Human correction governs the projection,
  not the external world.
