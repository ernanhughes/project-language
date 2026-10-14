import { homedir } from "node:os";
import { realpathSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { sha256HexUtf8 } from "./canonical.ts";
import { LanguageError } from "./errors.ts";
import type { ProjectIdentity, ThreadPaths } from "./types.ts";

export const STORE_HOME_ENV = "OPENCODE_LANGUAGE_HOME";

/** Default store root: path.join(os.homedir(), ".opencode", "language"). */
export function defaultStoreRoot(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[STORE_HOME_ENV];
  if (override !== undefined && override !== "") return override;
  return join(homedir(), ".opencode", "language");
}

/**
 * Canonical normalized absolute project path for identity hashing.
 * Separators are normalized to `/`; on Windows the path is lowercased
 * deliberately so case-only variants map to one project_id.
 */
export function canonicalizeProjectPath(inputPath: string): string {
  let abs: string;
  try {
    abs = realpathSync(inputPath);
  } catch {
    abs = resolve(inputPath);
  }
  const forward = abs.replace(/\\/g, "/");
  return process.platform === "win32" ? forward.toLowerCase() : forward;
}

export function sanitizeBasename(name: string): string {
  const safe = name
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^[._]+/, "")
    .slice(0, 48);
  return safe === "" || safe === "." || safe === ".." ? "project" : safe;
}

/** Deterministic project identity: safe basename + 16 hex chars of path hash. */
export function deriveProjectIdentity(projectPath: string): ProjectIdentity {
  if (typeof projectPath !== "string" || projectPath.trim() === "") {
    throw new LanguageError("INVALID_INPUT", "project_path must be a non-empty string");
  }
  const canonical = canonicalizeProjectPath(projectPath);
  const path_hash16 = sha256HexUtf8(canonical).slice(0, 16);
  const basename_safe = sanitizeBasename(basename(canonical.replace(/\//g, "/")));
  const project_id = `${basename_safe}-${path_hash16}`;
  return { project_id, basename_safe, path_original: projectPath, path_canonical: canonical, path_hash16 };
}

const THREAD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** A thread_id is mandatory; never inferred. Fail closed on any ambiguity. */
export function validateThreadId(threadId: unknown): string {
  if (typeof threadId !== "string" || threadId === "") {
    throw new LanguageError("THREAD_REQUIRED", "thread_id is mandatory and must be non-empty");
  }
  if (
    threadId === "." ||
    threadId === ".." ||
    threadId.includes("/") ||
    threadId.includes("\\") ||
    threadId.includes("\0") ||
    !THREAD_ID_PATTERN.test(threadId)
  ) {
    throw new LanguageError("INVALID_INPUT", `malformed thread_id: ${JSON.stringify(threadId)}`);
  }
  return threadId;
}

export function resolveThreadPaths(
  storeRoot: string,
  projectId: string,
  threadId: string,
): ThreadPaths {
  const project_dir = join(storeRoot, projectId);
  const thread_dir = join(project_dir, "threads", threadId);
  return {
    store_root: storeRoot,
    project_id: projectId,
    thread_id: threadId,
    project_dir,
    thread_dir,
    git_dir: join(thread_dir, ".git"),
    state_path: join(thread_dir, "state.md"),
    meta_path: join(thread_dir, "state.meta.json"),
    revisions_dir: join(thread_dir, "revisions"),
    locks_dir: join(thread_dir, ".locks"),
    tmp_dir: join(thread_dir, ".tmp"),
  };
}
