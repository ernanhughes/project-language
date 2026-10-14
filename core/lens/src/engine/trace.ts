import type { RepresentationArtifact } from "./types.ts";

export interface LensTrace {
  trace_id: string;
  operation: "render" | "compare" | "health";
  artifact_ids: string[];
  notes: string[];
}

export function traceFor(operation: LensTrace["operation"], artifacts: RepresentationArtifact[], notes: string[] = []): LensTrace {
  return {
    trace_id: `lens-trace-${artifacts.map((a) => a.artifact_id).join("-") || "none"}`.slice(0, 96),
    operation,
    artifact_ids: artifacts.map((a) => a.artifact_id),
    notes,
  };
}
