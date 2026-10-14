import { createHash } from "node:crypto";

/**
 * Deterministic canonical JSON, family rules (cf. opencode-evidence@88cc2e6):
 * sorted keys, no whitespace, undefined props dropped, array holes -> null,
 * non-finite -> null, Date -> ISO, bigint/function/symbol throw.
 * Independent copy; only used for Work's own records, never upstream bytes.
 */
export function canonicalize(value: unknown): string {
  return stringifyCanonical(value);
}

function stringifyCanonical(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "null";
  const t = typeof value;
  if (t === "number") {
    if (!Number.isFinite(value as number)) return "null";
    return JSON.stringify(value);
  }
  if (t === "boolean") return value ? "true" : "false";
  if (t === "string") return JSON.stringify(value);
  if (t === "bigint") {
    throw new Error("WORK_NON_JSON_VALUE: bigint has no canonical JSON form");
  }
  if (t === "function" || t === "symbol") {
    throw new Error(`WORK_NON_JSON_VALUE: ${t} has no canonical JSON form`);
  }
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) {
    return `[${value.map((item) => stringifyCanonical(item)).join(",")}]`;
  }
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stringifyCanonical(obj[k])}`).join(",")}}`;
  }
  throw new Error(`WORK_NON_JSON_VALUE: unsupported typeof ${t}`);
}

export function prettyCanonical(value: unknown): string {
  return `${JSON.stringify(JSON.parse(canonicalize(value)), null, 2)}\n`;
}

export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}
