/** Stable structured error codes for the deterministic core. */

export const ERROR_CODES = [
  "INVALID_INPUT",
  "THREAD_REQUIRED",
  "THREAD_NOT_FOUND",
  "AMBIGUOUS_THREAD",
  "THREAD_LOCKED",
  "CAS_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "TORN_STATE",
  "CORRUPT_HISTORY",
  "BOUND_EXCEEDED",
  "GIT_FAILURE",
  "HUMAN_GUARD",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class LanguageError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(`${code}: ${message}`);
    this.name = "LanguageError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function isLanguageError(value: unknown, code?: ErrorCode): value is LanguageError {
  return value instanceof LanguageError && (code === undefined || value.code === code);
}
