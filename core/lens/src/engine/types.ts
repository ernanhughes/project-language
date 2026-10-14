export type Survival = "preserved" | "partial" | "lost" | "unknown";

export interface SourceRef {
  id: string;
  kind: string;
  uri?: string;
  version?: string;
  scope?: string;
  observed_at?: string;
}

export interface SourceInput extends SourceRef {
  content: string;
}

export type LensMode = "SOURCE" | "BRIEF" | "STRUCTURED";

export interface ProducerRef {
  plugin: "opencode-lens";
  version: string;
  model?: string;
}

export interface PreservationReport {
  claim_survival?: Survival;
  qualifier_survival?: Survival;
  numerical_survival?: Survival;
  uncertainty_survival?: Survival;
  provenance_survival?: Survival;
  unsupported_additions?: string[];
  notes?: string[];
}

export interface RepresentationArtifact {
  artifact_id: string;
  source: SourceRef;
  purpose: string;
  mode: LensMode;
  representation: string;
  derived_from: string[];
  producer: ProducerRef;
  preservation: PreservationReport;
}

export type LensFailureCode =
  | "SOURCE_UNAVAILABLE"
  | "MODE_UNSUPPORTED"
  | "TRANSFORMATION_FAILED"
  | "PRESERVATION_UNKNOWN"
  | "SOURCE_IDENTITY_MISMATCH"
  | "CONFIG_INVALID";

export class LensError extends Error {
  readonly code: LensFailureCode;
  constructor(code: LensFailureCode, message: string) {
    super(message);
    this.name = "LensError";
    this.code = code;
  }
}
