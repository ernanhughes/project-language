#!/usr/bin/env node
/**
 * Local diagnostic CLI. Local-only: performs no model call, no hook
 * registration, and no network synchronization.
 */
import { readFileSync } from "node:fs";
import {
  acceptHumanEdit,
  applyMutation,
  defaultStoreRoot,
  deriveProjectIdentity,
  initThread,
  listHistory,
  recoverThread,
  renderProjection,
  resolveStorePaths,
  serializeState,
  stateSha256,
  validateThreadId,
  verifyThread,
  LanguageError,
  type MutationOp,
  type MutationRequest,
} from "./index.ts";

const HELP = `opencode-language — deterministic projection core (local-only)

Commands (project path and thread id are always explicit):
  init --project <path> --thread <id> --key <idempotency> [--now <ts>] [--session <sid>] [--producer-id <id>]
  show --project <path> --thread <id>
  verify --project <path> --thread <id>
  apply --project <path> --thread <id> --key <idempotency> --parent <rev> --ops <file> [--now <ts>] [--producer model|human|migration]
  accept-human-edit --project <path> --thread <id> --key <idempotency> --parent <rev> --session <sid> --message <mid> --sha <sha256> [--reason <text>] [--now <ts>]
  history --project <path> --thread <id> [--limit <n>]
  recover --project <path> --thread <id> --discard-unaccepted
  render --project <path> --thread <id>

Global flags: --store-root <dir> (default OPENCODE_LANGUAGE_HOME or ~/.opencode/language), --json
Missing thread ids never fall back to a global state. No model call is made.`;

function parseArgs(argv: string[]): { command: string; flags: Record<string, string | boolean> } {
  const flags: Record<string, string | boolean> = {};
  let i = 0;
  // Global flags may precede the command.
  while (i < argv.length && (argv[i] as string).startsWith("--")) {
    const key = (argv[i] as string).slice(2);
    if (key === "json" || key === "discard-unaccepted" || key === "help") {
      flags[key] = true;
      i += 1;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new LanguageError("INVALID_INPUT", `flag --${key} requires a value`);
    }
    flags[key] = value;
    i += 2;
  }
  const command = argv[i];
  if (!command) throw new LanguageError("INVALID_INPUT", "a command is required");
  const rest = argv.slice(i + 1);
  for (let j = 0; j < rest.length; j += 1) {
    const token = rest[j] as string;
    if (!token.startsWith("--")) throw new LanguageError("INVALID_INPUT", `unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === "json" || key === "discard-unaccepted" || key === "help") {
      flags[key] = true;
      continue;
    }
    const value = rest[j + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new LanguageError("INVALID_INPUT", `flag --${key} requires a value`);
    }
    flags[key] = value;
    j += 1;
  }
  return { command, flags };
}

function str(flags: Record<string, string | boolean>, key: string, required = true): string {
  const v = flags[key];
  if (typeof v !== "string" || v === "") {
    if (!required) return "";
    throw new LanguageError("INVALID_INPUT", `missing required --${key}`);
  }
  return v;
}

function outputJson(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (command === "help" || command === "--help" || flags["help"] === true) {
    process.stdout.write(`${HELP}\n`);
    return;
  }
  const asJson = flags["json"] === true;
  const storeRoot = typeof flags["store-root"] === "string" && flags["store-root"] !== ""
    ? (flags["store-root"] as string)
    : defaultStoreRoot();
  const emit = (obj: unknown, text: string): void => {
    if (asJson) outputJson(obj);
    else process.stdout.write(`${text}\n`);
  };

  if (command === "init") {
    const projectPath = str(flags, "project");
    const threadId = validateThreadId(str(flags, "thread"));
    const result = await initThread({
      storeRoot,
      projectPath,
      threadId,
      idempotencyKey: str(flags, "key"),
      producer: { type: "model", id: typeof flags["producer-id"] === "string" ? (flags["producer-id"] as string) : "cli" },
      now: typeof flags["now"] === "string" ? (flags["now"] as string) : new Date().toISOString(),
      sessionId: typeof flags["session"] === "string" ? (flags["session"] as string) : undefined,
    });
    emit(result, `initialized ${result.project_id}/${result.thread_id} at ${result.revision} (${result.git_commit})`);
    return;
  }
  if (command === "show") {
    const projectPath = str(flags, "project");
    const threadId = validateThreadId(str(flags, "thread"));
    const paths = resolveStorePaths(storeRoot, projectPath, threadId);
    const identity = deriveProjectIdentity(projectPath);
    void identity;
    const text = readFileSync(paths.state_path, "utf8");
    if (asJson) outputJson({ project_id: paths.project_id, thread_id: threadId, state: text });
    else process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
    return;
  }
  if (command === "verify") {
    // verify never prints the full state by default.
    const result = await verifyThread(storeRoot, str(flags, "project"), validateThreadId(str(flags, "thread")));
    emit(result, `status=${result.status} revision=${result.revision ?? result.last_valid_revision ?? "none"} issues=${result.issues.length}`);
    if (result.status === "torn" || result.status === "corrupt") process.exitCode = 1;
    return;
  }
  if (command === "apply") {
    const ops = JSON.parse(readFileSync(str(flags, "ops"), "utf8")) as MutationOp[];
    const producerType = typeof flags["producer"] === "string" ? (flags["producer"] as string) : "model";
    if (producerType !== "model" && producerType !== "human" && producerType !== "migration") {
      throw new LanguageError("INVALID_INPUT", "producer must be model, human, or migration");
    }
    const request: MutationRequest = {
      project_path: str(flags, "project"),
      thread_id: validateThreadId(str(flags, "thread")),
      expected_parent: str(flags, "parent"),
      idempotency_key: str(flags, "key"),
      producer: { type: producerType },
      source_event: { refs: [{ session_id: "cli", message_id: "cli-apply", sha256: "0".repeat(64) }] },
      operations: ops,
      now: typeof flags["now"] === "string" ? (flags["now"] as string) : new Date().toISOString(),
    };
    const result = await applyMutation({ storeRoot }, request);
    emit(result, `applied ${result.revision} (${result.git_commit}) replay=${result.idempotent_replay}`);
    return;
  }
  if (command === "accept-human-edit") {
    const result = await acceptHumanEdit({ storeRoot }, {
      projectPath: str(flags, "project"),
      threadId: validateThreadId(str(flags, "thread")),
      expectedParent: str(flags, "parent"),
      idempotencyKey: str(flags, "key"),
      sourceEvent: {
        refs: [{ session_id: str(flags, "session"), message_id: str(flags, "message"), sha256: str(flags, "sha") }],
      },
      reason: typeof flags["reason"] === "string" ? (flags["reason"] as string) : undefined,
      now: typeof flags["now"] === "string" ? (flags["now"] as string) : new Date().toISOString(),
    });
    emit(result, `accepted human edit ${result.revision} (${result.git_commit})`);
    return;
  }
  if (command === "history") {
    const limit = typeof flags["limit"] === "string" ? Number.parseInt(flags["limit"] as string, 10) : 100;
    const entries = await listHistory(storeRoot, str(flags, "project"), validateThreadId(str(flags, "thread")), limit);
    emit(entries, entries.map((e) => `${e.git_commit.slice(0, 12)} ${e.revision} [${e.origin}] ${e.created_at}`).join("\n"));
    return;
  }
  if (command === "recover") {
    if (flags["discard-unaccepted"] !== true) {
      throw new LanguageError("INVALID_INPUT", "recover requires --discard-unaccepted");
    }
    const result = await recoverThread(storeRoot, str(flags, "project"), validateThreadId(str(flags, "thread")), true);
    emit(result, `recovered ${result.revision} (${result.commit})`);
    return;
  }
  if (command === "render") {
    const projectPath = str(flags, "project");
    const threadId = validateThreadId(str(flags, "thread"));
    const paths = resolveStorePaths(storeRoot, projectPath, threadId);
    const verification = await verifyThread(storeRoot, projectPath, threadId);
    if (verification.status !== "ok" || verification.revision === undefined) {
      throw new LanguageError("TORN_STATE", `refusing to render unverified state (status=${verification.status})`);
    }
    const { parseState: parse } = await import("./index.ts");
    const canonical = serializeState(parse(readFileSync(paths.state_path, "utf8")));
    const block = renderProjection({
      projectId: paths.project_id,
      threadId,
      revision: verification.revision,
      stateSha256: stateSha256(canonical),
      stateText: canonical,
    });
    if (asJson) outputJson({ project_id: paths.project_id, thread_id: threadId, revision: verification.revision, block });
    else process.stdout.write(block);
    return;
  }
  throw new LanguageError("INVALID_INPUT", `unknown command: ${command}`);
}

main().catch((err: unknown) => {
  if (err instanceof LanguageError) {
    process.stderr.write(`${err.code}: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }
  process.stderr.write(`unexpected: ${(err as Error).message ?? err}\n`);
  process.exitCode = 1;
});
