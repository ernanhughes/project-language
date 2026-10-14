import { createHash } from "node:crypto";

/** Canonical JSON: object keys sorted recursively, arrays keep order, compact. */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/** Canonical JSON document bytes: stable key order plus exactly one final newline. */
export function canonicalJsonBytes(value: unknown): string {
  return `${stableStringify(value)}\n`;
}

export function sha256HexUtf8(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function sha256HexOfCanonical(value: unknown): string {
  return sha256HexUtf8(stableStringify(value));
}
