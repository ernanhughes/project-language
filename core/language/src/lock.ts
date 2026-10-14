import { mkdirSync, openSync, closeSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJsonBytes } from "./canonical.ts";
import { LanguageError } from "./errors.ts";
import { LOCK_SCHEMA_V1 } from "./types.ts";

export interface LockOptions {
  timeoutMs?: number | undefined;
  pollMs?: number | undefined;
  purpose?: string | undefined;
}

export interface LockHandle {
  lock_path: string;
  release: () => void;
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_POLL_MS = 50;

function lockPathFor(locksDir: string): string {
  return join(locksDir, "thread.lock");
}

/**
 * Per-thread inter-process lock via atomic exclusive file creation (`wx`),
 * which is suitable for Windows. The lock record carries pid/timestamps for
 * diagnosis only — never state contents. Locks live under `.locks/` and are
 * never staged into Git. A stale-looking lock is never broken automatically;
 * breaking one is an explicit, documented, risky recovery action.
 */
export async function acquireThreadLock(
  locksDir: string,
  options: LockOptions = {},
): Promise<LockHandle> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  mkdirSync(locksDir, { recursive: true });
  const lockPath = lockPathFor(locksDir);
  const record = canonicalJsonBytes({
    schema: LOCK_SCHEMA_V1,
    pid: process.pid,
    started_at: new Date().toISOString(),
    purpose: options.purpose ?? "mutation",
  });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const fd = openSync(lockPath, "wx");
      writeFileSync(fd, record, "utf8");
      closeSync(fd);
      let released = false;
      return {
        lock_path: lockPath,
        release: () => {
          if (released) return;
          released = true;
          try {
            rmSync(lockPath, { force: true });
          } catch {
            // Best-effort release; a missing file means already released.
          }
        },
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      if (Date.now() >= deadline) {
        throw new LanguageError("THREAD_LOCKED", `thread lock busy: ${lockPath}`, {
          lock: describeThreadLock(locksDir),
        });
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
}

/** Read-only diagnosis of the current lock holder, if any. */
export function describeThreadLock(locksDir: string): Record<string, unknown> | null {
  try {
    const raw = readFileSync(lockPathFor(locksDir), "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Explicit stale-lock removal. Requires the literal confirmation token and
 * documents its own risk: only use when the holder is provably dead.
 */
export function forceReleaseThreadLock(locksDir: string, confirmation: string): void {
  if (confirmation !== "BREAK-LOCK") {
    throw new LanguageError("INVALID_INPUT", "lock break requires the literal confirmation token BREAK-LOCK");
  }
  rmSync(lockPathFor(locksDir), { force: true });
}
