import { LensError } from "./engine/types.ts";

export interface LensConfig {
  defaultMaxBriefSentences: number;
  model?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): LensConfig {
  const raw = env["LENS_MAX_BRIEF_SENTENCES"];
  let maxBrief = 3;
  if (raw !== undefined) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
      throw new LensError("CONFIG_INVALID", "LENS_MAX_BRIEF_SENTENCES must be an integer 1..20");
    }
    maxBrief = parsed;
  }
  const model = env["LENS_MODEL"];
  return model ? { defaultMaxBriefSentences: maxBrief, model } : { defaultMaxBriefSentences: maxBrief };
}
