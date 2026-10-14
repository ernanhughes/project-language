import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { LanguageError } from "./errors.ts";

const execFileAsync = promisify(execFile);

export const LANGUAGE_GIT_AUTHOR = "opencode-language";
export const LANGUAGE_GIT_EMAIL = "opencode-language@local.invalid";

function gitEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_AUTHOR_NAME: LANGUAGE_GIT_AUTHOR,
    GIT_AUTHOR_EMAIL: LANGUAGE_GIT_EMAIL,
    GIT_COMMITTER_NAME: LANGUAGE_GIT_AUTHOR,
    GIT_COMMITTER_EMAIL: LANGUAGE_GIT_EMAIL,
    ...extra,
  };
}

/** Run Git with an argument array only — never through a shell string. */
export async function git(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd, env: gitEnv(env) });
    return stdout.trim();
  } catch (err) {
    const details = err as { stderr?: string; stdout?: string; message?: string };
    throw new LanguageError("GIT_FAILURE", `git ${args.join(" ")} failed`, {
      stderr: String(details.stderr ?? details.message ?? err).slice(0, 2000),
    });
  }
}

export async function initThreadRepo(threadDir: string): Promise<void> {
  await git(threadDir, ["init"]);
  // Canonical bytes are LF-exact; never let checkout conversion rewrite them.
  // Repository-local only; the user's global configuration is untouched.
  await git(threadDir, ["config", "--local", "core.autocrlf", "false"]);
  await git(threadDir, ["config", "--local", "core.eol", "lf"]);
}

/** A Language thread repository must never have a remote. */
export async function assertNoRemote(threadDir: string): Promise<void> {
  const remotes = await git(threadDir, ["remote"]);
  if (remotes !== "") {
    throw new LanguageError("GIT_FAILURE", "refusing: thread repository has a remote configured");
  }
}

export async function headCommit(threadDir: string): Promise<string | null> {
  try {
    return await git(threadDir, ["rev-parse", "HEAD"]);
  } catch {
    return null;
  }
}

export async function porcelainStatus(threadDir: string): Promise<string> {
  try {
    return await git(threadDir, ["status", "--porcelain", "--untracked-files=no"]);
  } catch {
    return "";
  }
}

export async function commitsTouching(threadDir: string, relPath: string): Promise<string[]> {
  try {
    const out = await git(threadDir, ["log", "--format=%H", "--", relPath]);
    return out === "" ? [] : out.split("\n");
  } catch {
    return [];
  }
}

export async function listCommits(threadDir: string, limit: number): Promise<string[]> {
  try {
    const out = await git(threadDir, ["log", `--max-count=${limit}`, "--format=%H"]);
    return out === "" ? [] : out.split("\n");
  } catch {
    return [];
  }
}

export async function showBlob(threadDir: string, commit: string, relPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["show", `${commit}:${relPath}`], {
      cwd: threadDir,
      env: gitEnv(),
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout as string;
  } catch {
    return null;
  }
}

export interface StagedCommit {
  hash: string;
}

/**
 * Commit exactly the owned relative paths using an isolated temporary index,
 * so unrelated pre-staged bytes can never enter a Language revision commit.
 * The temporary index is always cleaned up. Works when paths contain spaces
 * because everything is passed as argv, never a shell string.
 */
export async function commitOwnedPaths(
  threadDir: string,
  relPaths: string[],
  message: string,
): Promise<StagedCommit> {
  const tmpIndex = join(mkdtempSync(join(tmpdir(), "opencode-language-git-")), "index");
  try {
    const head = await headCommit(threadDir);
    if (head !== null) {
      await git(threadDir, ["read-tree", head], { GIT_INDEX_FILE: tmpIndex });
    }
    await git(threadDir, ["add", "--", ...relPaths], { GIT_INDEX_FILE: tmpIndex });
    // Fault-injection point for tests (see store.checkFault).
    const tree = await git(threadDir, ["write-tree"], { GIT_INDEX_FILE: tmpIndex });
    const commitArgs =
      head !== null
        ? ["commit-tree", tree, "-p", head, "-m", message]
        : ["commit-tree", tree, "-m", message];
    const hash = await git(threadDir, commitArgs, { GIT_INDEX_FILE: tmpIndex });
    await git(threadDir, ["update-ref", "HEAD", hash]);
    return { hash };
  } finally {
    rmSync(tmpIndex, { force: true });
    try {
      rmSync(join(tmpIndex, ".."), { recursive: true, force: true });
    } catch {
      // Best-effort cleanup of the temp dir.
    }
  }
}
