import { LanguageError } from "./errors.ts";
import { validateThreadId } from "./identity.ts";

export const ENABLED_ENV = "OPENCODE_LANGUAGE_ENABLED";
export const THREAD_ENV = "OPENCODE_LANGUAGE_THREAD_ID";
export const HOME_ENV = "OPENCODE_LANGUAGE_HOME";
export const PROJECT_ENV = "OPENCODE_LANGUAGE_PROJECT";

export interface PluginConfig {
  enabled: boolean;
  thread_id: string | null;
  store_root_override: string | null;
  project_override: string | null;
}

type Env = Record<string, string | undefined>;

/** Disabled by default: only the literal "1" enables the plugin. */
export function loadPluginConfig(env: Env = process.env as Env): PluginConfig {
  const enabled = env[ENABLED_ENV] === "1";
  const rawThread = env[THREAD_ENV];
  let thread_id: string | null = null;
  if (rawThread !== undefined && rawThread !== "") {
    try {
      thread_id = validateThreadId(rawThread);
    } catch (err) {
      throw new LanguageError("INVALID_INPUT", `invalid ${THREAD_ENV}: ${(err as Error).message}`);
    }
  }
  const home = env[HOME_ENV];
  const project = env[PROJECT_ENV];
  return {
    enabled,
    thread_id,
    store_root_override: home !== undefined && home !== "" ? home : null,
    project_override: project !== undefined && project !== "" ? project : null,
  };
}
