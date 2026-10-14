import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { sha256Hex } from "./canonical.ts";

export type WorkConfig = {
  store_dir?: string;
  evidence_store_dir?: string;
  verification_store_dir?: string;
  proof_store_dir?: string;
  project_dir?: string;
};

/**
 * Storage: per-project user-data space by default; explicit opt-in
 * otherwise via OPENCODE_WORK_DIR or <project>/.opencode/work.json.
 * Upstream artifact stores default to per-work subdirectories of the work
 * store unless explicitly configured (keeps one work's material together
 * while never mixing it with sibling-owned layouts).
 */
export function defaultStoreDir(projectDir: string): string {
  const canonical = resolve(projectDir).replace(/\\/g, "/").toLowerCase();
  const slug = sha256Hex(canonical).slice(0, 12);
  return join(userDataDir(), "opencode-work", "projects", `wk-${slug}`);
}

function userDataDir(): string {
  if (process.platform === "win32") {
    return process.env["APPDATA"] ?? join(homedir(), "AppData", "Roaming");
  }
  return process.env["XDG_DATA_HOME"] ?? join(homedir(), ".local", "share");
}

export function loadFileConfig(projectDir: string): WorkConfig {
  const path = join(resolve(projectDir), ".opencode", "work.json");
  if (!existsSync(path)) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`WORK_CONFIG_INVALID: ${path} is not valid JSON`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`WORK_CONFIG_INVALID: ${path} must be a JSON object`);
  }
  const cfg = parsed as Record<string, unknown>;
  const out: WorkConfig = {};
  for (const key of ["store_dir", "evidence_store_dir", "verification_store_dir", "proof_store_dir", "project_dir"] as const) {
    if (cfg[key] !== undefined) {
      if (typeof cfg[key] !== "string") throw new Error(`WORK_CONFIG_INVALID: ${key} must be a string`);
      if ((cfg[key] as string).length > 0) out[key] = cfg[key] as string;
    }
  }
  return out;
}

export function resolveStoreDir(projectDir: string, overrides: WorkConfig = {}): string {
  const env = process.env["OPENCODE_WORK_DIR"];
  if (env && env.length > 0) return resolve(env);
  const fileCfg = loadFileConfig(projectDir);
  const configured = overrides.store_dir ?? fileCfg.store_dir;
  if (configured && configured.length > 0) return resolve(projectDir, configured);
  return defaultStoreDir(projectDir);
}
