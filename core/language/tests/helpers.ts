import { mkdtempSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LanguageItem, SourceRef } from "../src/index.ts";

export const NOW = "2026-10-02T00:00:00.000Z";
export const NOW2 = "2026-10-02T00:00:01.000Z";

export function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** A fake user source project. State must never be written inside it. */
export function makeProject(): string {
  const dir = tempDir("lang-proj-");
  mkdirSync(join(dir, "src"), { recursive: true });
  return dir;
}

export function listAll(dir: string): string[] {
  return readdirSync(dir, { recursive: true }) as string[];
}

export function ref(session = "s1", message = "m1", part?: string): SourceRef {
  const r: SourceRef = { session_id: session, message_id: message, sha256: "a".repeat(64) };
  if (part !== undefined) r.part_id = part;
  return r;
}

export function item(id: string, overrides: Partial<LanguageItem> = {}): LanguageItem {
  return {
    id,
    kind: "decision",
    text: `text of ${id}`,
    actor: "user",
    standing: "explicit",
    scope: "episode",
    sources: [ref(`s-${id}`, `m-${id}`)],
    ...overrides,
  };
}
