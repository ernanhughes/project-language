/** Stable hook/config diagnostics. Never carry state text or secrets. */

export const DIAGNOSTICS = [
  "LANG_DISABLED",
  "LANG_THREAD_REQUIRED",
  "LANG_PROJECT_MISMATCH",
  "LANG_STATE_MISSING",
  "LANG_STATE_INVALID",
  "LANG_HUMAN_EDIT_PENDING",
  "LANG_ALREADY_PRESENT",
  "LANG_CONFLICTING_PROJECTION",
  "LANG_INJECTED",
  "LANG_REPLACED",
  "LANG_API_UNSUPPORTED",
] as const;

export type DiagnosticCode = (typeof DIAGNOSTICS)[number];

export interface HookDiagnostic {
  code: DiagnosticCode;
  plugin: "opencode-language";
  session_id: string | null;
  agent: string | null;
  model: { provider_id: string | null; id: string | null } | null;
  project_id: string | null;
  thread_id: string | null;
  revision: string | null;
  state_sha256: string | null;
  block_sha256: string | null;
  pre_blocks: number;
  post_blocks: number;
}

export class PluginError extends Error {
  readonly code: DiagnosticCode;
  readonly diagnostic: Omit<HookDiagnostic, "code">;

  constructor(code: DiagnosticCode, message: string, diagnostic: Omit<HookDiagnostic, "code">) {
    super(`${code}: ${message}`);
    this.name = "PluginError";
    this.code = code;
    this.diagnostic = diagnostic;
  }
}
