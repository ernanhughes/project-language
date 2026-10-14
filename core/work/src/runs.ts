import { RUN_SCHEMA } from "./version.ts";
import type { ArtifactRef, Question } from "./work.ts";

export type RunState = "RUNNING" | "BLOCKED" | "AWAITING_ACCEPTANCE";

export type OpResult = {
  op_id: string;
  kind: string;
  status: "ok" | "blocked" | "error";
  output?: Record<string, unknown>;
  error_code?: string;
  error?: string;
};

export type RunRecord = {
  schema: typeof RUN_SCHEMA;
  run_id: string;
  work_id: string;
  work_version: number;
  state: RunState;
  ops: OpResult[];
  unresolved: Question[];
  started_at: string;
  ended_at: string | null;
};

export const RUN_ID_PATTERN = /^wr_[0-9a-f]{32}$/;
