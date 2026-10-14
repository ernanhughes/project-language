# LANG-00 API qualification (installed-host evidence, 2026-10-02)

Question: which plugin API does the installed host accept, and what is the
exact context-hook contract? Sources are separated below; nothing here is
inferred from memory.

## Direct installed-host evidence (SUPPORTED)

- Host: `opencode v2.0.21`, executable
  `C:\Users\ernan\AppData\Roaming\npm\opencode.ps1` (npm shim for the global
  `@opencode/cli@2.0.21` package).
- Plugin package installed for this repo: `@opencode/plugin@2.0.21`
  (dependency line `^2.0.16`, the same line the live-tested
  `project-context-opencode` reference uses; resolved 2.0.21, inside the
  host's major-2 family).
- Plugin shape (`node_modules/@opencode/plugin/dist/promise/plugin.d.ts`):
  `Plugin.define({ id, setup(ctx) })`, `setup` returns cleanup or void.
- Hook registration
  (`dist/promise/registration.d.ts`):
  `hook(name, callback: (input) => Promise<void> | void, options?) =>
  Promise<Registration>`. Callbacks return **void**: hooks **mutate the
  input object**; they do not return a replacement context.
- Context hook payload (`dist/promise/session.d.ts`): `SessionContext`
  carries `sessionID`, `agent`, `model: Model.Ref { id, providerID }`,
  `system: Array<SystemPart>`, `messages`, `options`, `tools`.
- `SystemPart` (`@opencode/ai` schema): `{ type: "text", text }` (+ optional
  cache/metadata). The injected block is appended as one `{ type: "text" }`
  element: the **system-level channel**.
- Hook names present in `SessionHooks`: `prompt`, `context`, `compaction`,
  `generate`, `title`, `model.request`, `http.request`, `http.response`,
  experimental websocket hooks, `retry`.
- Host project path: `ctx.location.directory`, with
  `ctx.location.project.{ id, directory, canonical }` when available.
- Host version gate: `ctx.app.version`; major `2` required, anything else
  refuses loudly (implemented in `src/plugin.ts`).

## Local source evidence (SUPPORTED, same V2 family)

- `project-context-opencode` (pinned HEAD `2d12407`, clean, local-only):
  `Plugin.define` + `ctx.session.hook("context" | "compaction" |
  "generate")`; runtime builds the next system array fully, assigns exactly
  once; observer copies post-injection bytes. See
  `instrument-manifest.json` for the pin.
- `opencode-remembering` (HEAD `6d96d4f8`, on its remote):
  `Plugin.define` + `ctx.session.hook("context")` (`src/plugin.ts:69`).
  Same `@opencode/plugin` V2 family (`^2.0.12`).
- `opencode-vfs` (local HEAD `468d812`, local-only): entry shape
  `import type { Plugin } from "@opencode-ai/plugin"` with an event map
  (`chat.message`, `tool.execute.before/after`, `event`, `dispose`).
  **Different API family.** Compatibility between the two families is NOT
  claimed (UNSUPPORTED until demonstrated against the installed host).

## Prior test claims (not re-run here)

- `project-context-opencode` reports live testing of `session.hook("context")`
  mutation and post-injection observer capture against OpenCode 2.0.16, and
  of compaction/generate observation hooks. Adopted as local-source
  evidence only; LANG-00 re-qualifies what it relies on.

## Classification matrix

| Surface | Status | Basis |
|---|---|---|
| Host accepts `@opencode/plugin` V2 `Plugin.define` | SUPPORTED | installed dep types + reference |
| `session.hook("context")` exists, mutation by assignment | SUPPORTED | installed dep types |
| System array placement (`{type:"text"}` element) | SUPPORTED | installed schema types |
| `session.hook("compaction")` / `("generate")` exist | SUPPORTED | installed dep types |
| Host project path via `ctx.location` | SUPPORTED | installed dep types |
| Plugin order among multiple hooks | OBSERVED-ONLY (p-c-o) / UNQUALIFIED here | single hook registered; order untested with ours |
| Duplicate hook registration behavior | UNQUALIFIED | we register once; not probed |
| Context hook firing without any generation | UNQUALIFIED | startup alone is not known to invoke it |
| Independent post-injection observation boundary | SUPPORTED (instrument) / L5 pending (ours) | p-c-o observer design + pin; our reconciliation awaits smoke |
| `@opencode-ai/plugin` ↔ `@opencode/plugin` interop | UNSUPPORTED (claimed bifurcated) | distinct entry shapes; no cross-host proof |
| Safe post-turn trigger / re-entrant generation | UNQUALIFIED, explicitly out of scope | not attempted in LANG-00 |

## Installed-host loading findings (2026-10-02, read-only probes)

Verified empirically against opencode v2.0.21, all process-scoped:

- A `file://` directory spec resolves its entrypoint to the package root
  `index.ts` (observed: `entrypoint=file:///C:/Projects/opencode-language/index.ts`).
- The entry must export exactly one `default` (two default exports fail the
  load with `Multiple exports with the same name "default"` — observed and
  fixed).
- The entry may import compiled `./dist/src/*.js` with exact paths (observed
  loading; a wrong relative path fails with `Cannot find module`).
- `OPENCODE_CONFIG_CONTENT` **merges** with file config; it does not isolate.
  `OPENCODE_CONFIG_DIR` pointing at a temp dir **fully replaces** the global
  config directory (observed: zero foreign `loading plugin` lines).
- Plugin `console.log` markers do not surface in `--print-logs` output, and
  model resolution precedes any context-hook invocation, so host-side setup
  execution before generation is UNQUALIFIED without inference. L4 (harness)
  carries registration proof; L5 needs the authorised smoke.

## Inference (labelled as such)

- `file://` directory specs in the global `plugins` array load a local
  package (observed in the user's live config:
  `file:///C:/Projects/opencode-remembering`,
  `file:///C:/Projects/project-context-opencode`); a root `index.ts`
  re-export lets a plain clone load (p-c-o README). Our root `index.ts`
  re-exports compiled `dist/plugin.js`. Host resolution of that entry is
  verified empirically by the no-inference load check, not assumed here.
