// What has been decided, so nothing is shown twice and nothing silently vanishes. A withheld video is re-screened if
// the person's interest changes (its hash is stored), because "withheld" is not "deleted".
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Cause, Verdict } from "./screen.ts";
import type { Interest } from "./interest.ts";

export interface LedgerRecord { videoId: string; channelId: string; title: string; verdict: Verdict; cause: Cause | null; decided_at: string; interest_sha: string; policy: string }
export interface Ledger {
  get(videoId: string): LedgerRecord | undefined;
  put(r: LedgerRecord): void;
  all(): LedgerRecord[];
  save(): void;
}
export const interestHash = (i: Interest): string => createHash("sha256").update(JSON.stringify({ t: [...i.terms].sort(), a: [...i.avoid].sort(), k: [...i.known].sort() })).digest("hex").slice(0, 16);

export class MemoryLedger implements Ledger {
  protected rows = new Map<string, LedgerRecord>();
  get(id: string) { return this.rows.get(id); }
  put(r: LedgerRecord) { this.rows.set(r.videoId, r); }
  all() { return [...this.rows.values()]; }
  save() { /* nothing to write */ }
}

export class JsonLedger extends MemoryLedger {
  constructor(private path: string) {
    super();
    if (existsSync(path)) for (const r of JSON.parse(readFileSync(path, "utf8")) as LedgerRecord[]) this.rows.set(r.videoId, r);
  }
  override save() { mkdirSync(dirname(this.path), { recursive: true }); writeFileSync(this.path, JSON.stringify(this.all(), null, 2) + "\n"); }
}
