import { sha256, stableStringify } from "./redact.ts"
import type { SourceState } from "./types.ts"
import type { ProvenanceEvent, ProvenanceEventV2 } from "./types.ts"

export const EDGE_SCHEMA = "opencode-vfs.edge.v1" as const
export const EDGE_RECORD_SCHEMA = "opencode-vfs.edge-record.v1" as const
export const ARTIFACT_REGISTRATION_SCHEMA = "opencode-vfs.artifact-registration.v1" as const

export type WorkRef = { kind: "work"; work_id: string; version?: number }
export type ArtifactRef = {
  kind: "artifact"
  artifact_id: string
  schema: string
  producer?: { component: string; version?: string }
}
export type EventRef = { kind: "event"; event_id: string; session_id: string }
export type OperationRef = { kind: "operation"; work_id: string; op_id: string }
export type NodeRef = WorkRef | ArtifactRef | EventRef | OperationRef

export type ProvenanceRef = {
  project_id: string
  session_id: string
  event_id?: string
  segment?: string
  source_head?: string
  source_diff_sha256?: string
  work_id?: string
}

export const CAUSAL_RELATIONS = [
  "BELONGS_TO_WORK",
  "USED",
  "PRODUCED",
  "OBSERVED_BY",
  "VERIFIED_BY",
  "SUPPORTED_BY",
  "ACCEPTED_BY",
  "DEPENDS_ON",
] as const
export type CausalRelation = (typeof CAUSAL_RELATIONS)[number]

export type CausalEdge = {
  schema: typeof EDGE_SCHEMA
  edge_id: string
  project_id: string
  work?: WorkRef
  from: NodeRef
  relation: CausalRelation
  to: NodeRef
  producer: { component: string; version: string }
  provenance?: ProvenanceRef
  source?: SourceState
}

export type EdgeRecord = {
  schema: typeof EDGE_RECORD_SCHEMA
  record_id: string
  edge: CausalEdge
  recorded_at: string
  recorder: { component: "opencode-vfs"; version: string }
}

export type ArtifactRegistration = {
  schema: typeof ARTIFACT_REGISTRATION_SCHEMA
  registration_id: string
  project_id: string
  artifact: ArtifactRef
  provenance?: ProvenanceRef
  source?: SourceState
  registered_at: string
  recorder: { component: "opencode-vfs"; version: string }
}

export type Validation<T> = { ok: true; value: T } | { ok: false; code: string; message: string }
const HASH = /^[0-9a-f]{64}$/
const ID_MAX = 512
const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= ID_MAX
const fail = <T>(code: string, message: string): Validation<T> => ({ ok: false, code, message })

export function validateWorkRef(value: unknown): Validation<WorkRef> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("WORK_REF_MALFORMED", "work ref must be an object")
  const v = value as Record<string, unknown>
  if (v.kind !== "work" || !nonEmpty(v.work_id)) return fail("WORK_REF_BAD_ID", "work ref requires kind=work and work_id")
  if (v.version !== undefined && (!Number.isInteger(v.version) || (v.version as number) < 1)) return fail("WORK_REF_BAD_VERSION", "work version must be a positive integer")
  return { ok: true, value: value as WorkRef }
}

export function validateArtifactRef(value: unknown): Validation<ArtifactRef> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("ARTIFACT_REF_MALFORMED", "artifact ref must be an object")
  const v = value as Record<string, unknown>
  if (v.kind !== "artifact" || !nonEmpty(v.artifact_id) || !nonEmpty(v.schema)) return fail("ARTIFACT_REF_BAD_ID", "artifact ref requires kind, artifact_id, and schema")
  if (v.producer !== undefined) {
    const p = v.producer as Record<string, unknown>
    if (!p || typeof p !== "object" || !nonEmpty(p.component) || (p.version !== undefined && !nonEmpty(p.version))) return fail("ARTIFACT_REF_BAD_PRODUCER", "producer component/version is malformed")
  }
  return { ok: true, value: value as ArtifactRef }
}

export function validateNodeRef(value: unknown): Validation<NodeRef> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("NODE_REF_MALFORMED", "endpoint must be an object")
  const v = value as Record<string, unknown>
  if (v.kind === "work") return validateWorkRef(value)
  if (v.kind === "artifact") return validateArtifactRef(value)
  if (v.kind === "event" && nonEmpty(v.event_id) && nonEmpty(v.session_id)) return { ok: true, value: value as EventRef }
  if (v.kind === "operation" && nonEmpty(v.work_id) && nonEmpty(v.op_id)) return { ok: true, value: value as OperationRef }
  return fail("NODE_REF_UNSUPPORTED", "endpoint kind or identity is unsupported")
}

export function validateProvenanceRef(value: unknown, projectID?: string): Validation<ProvenanceRef> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("PROVENANCE_MALFORMED", "provenance must be an object")
  const v = value as Record<string, unknown>
  if (!nonEmpty(v.project_id) || !nonEmpty(v.session_id)) return fail("PROVENANCE_MISSING_ID", "project_id and session_id are required")
  if (projectID !== undefined && v.project_id !== projectID) return fail("PROVENANCE_PROJECT_MISMATCH", "provenance project does not match ledger")
  for (const key of ["event_id", "segment", "source_head", "work_id"] as const) if (v[key] !== undefined && !nonEmpty(v[key])) return fail("PROVENANCE_BAD_FIELD", `${key} must be non-empty`)
  if (v.source_diff_sha256 !== undefined && (typeof v.source_diff_sha256 !== "string" || !HASH.test(v.source_diff_sha256))) return fail("PROVENANCE_BAD_DIFF", "source_diff_sha256 must be 64 lowercase hex chars")
  return { ok: true, value: value as ProvenanceRef }
}

export function validateSourceState(value: unknown): Validation<SourceState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("SOURCE_MALFORMED", "source must be an object")
  const v = value as Record<string, unknown>
  if (!nonEmpty(v.root) || typeof v.status !== "string" || typeof v.diffSha256 !== "string" || !HASH.test(v.diffSha256)) return fail("SOURCE_BAD_STATE", "source root/status/diffSha256 are invalid")
  for (const key of ["remote", "branch", "head"] as const) if (v[key] !== null && typeof v[key] !== "string") return fail("SOURCE_BAD_STATE", `${key} must be string or null`)
  return { ok: true, value: value as SourceState }
}

export function validateProvenanceEvent(value: unknown): Validation<ProvenanceEvent | ProvenanceEventV2> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("EVENT_MALFORMED", "event must be an object")
  const v = value as Record<string, unknown>
  if (v.schema !== "opencode-vfs.event.v1" && v.schema !== "opencode-vfs.event.v2") return fail("EVENT_BAD_SCHEMA", "unsupported event schema")
  if (!nonEmpty(v.eventID) || !nonEmpty(v.projectID) || !nonEmpty(v.sessionID) || !Number.isInteger(v.sequence) || (v.sequence as number) < 0 || !nonEmpty(v.at) || Number.isNaN(Date.parse(v.at as string)) || !nonEmpty(v.kind)) return fail("EVENT_BAD_IDENTITY", "event identity fields are malformed")
  const source = validateSourceState(v.source); if (!source.ok) return source as Validation<ProvenanceEvent | ProvenanceEventV2>
  if (v.schema === "opencode-vfs.event.v1" && v.work !== undefined) return fail("EVENT_V1_WORK", "v1 events cannot contain WorkRef")
  if (v.schema === "opencode-vfs.event.v2" && v.work !== undefined) { const work = validateWorkRef(v.work); if (!work.ok) return work as Validation<ProvenanceEvent | ProvenanceEventV2> }
  return { ok: true, value: value as ProvenanceEvent | ProvenanceEventV2 }
}

export function edgeIdentity(input: Omit<CausalEdge, "schema" | "edge_id">): string {
  return sha256(stableStringify({ schema: EDGE_SCHEMA, project_id: input.project_id, work: input.work ?? null, from: input.from, relation: input.relation, to: input.to, producer: input.producer }))
}

export function buildEdge(input: Omit<CausalEdge, "schema" | "edge_id">): CausalEdge {
  const edge = { schema: EDGE_SCHEMA, edge_id: "", ...input } as CausalEdge
  edge.edge_id = edgeIdentity(input)
  const valid = validateEdge(edge, input.project_id)
  if (!valid.ok) throw new Error(`${valid.code}: ${valid.message}`)
  return edge
}

export function validateEdge(value: unknown, projectID?: string): Validation<CausalEdge> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("EDGE_MALFORMED", "edge must be an object")
  const v = value as Record<string, unknown>
  if (v.schema !== EDGE_SCHEMA || typeof v.edge_id !== "string" || !HASH.test(v.edge_id)) return fail("EDGE_BAD_SCHEMA_OR_ID", "edge schema/id invalid")
  if (!nonEmpty(v.project_id) || (projectID !== undefined && v.project_id !== projectID)) return fail("EDGE_BAD_PROJECT", "edge project invalid")
  if (!(CAUSAL_RELATIONS as readonly unknown[]).includes(v.relation)) return fail("EDGE_BAD_RELATION", "unknown causal relation")
  for (const endpoint of [v.from, v.to]) { const result = validateNodeRef(endpoint); if (!result.ok) return result as Validation<CausalEdge> }
  if (v.work !== undefined) { const result = validateWorkRef(v.work); if (!result.ok) return result as Validation<CausalEdge> }
  const p = v.producer as Record<string, unknown>
  if (!p || typeof p !== "object" || !nonEmpty(p.component) || !nonEmpty(p.version)) return fail("EDGE_BAD_PRODUCER", "edge producer required")
  if (v.provenance !== undefined) { const result = validateProvenanceRef(v.provenance, v.project_id as string); if (!result.ok) return result as Validation<CausalEdge> }
  if (v.source !== undefined) { const result = validateSourceState(v.source); if (!result.ok) return result as Validation<CausalEdge> }
  const { schema: _s, edge_id: _i, ...body } = v
  if (edgeIdentity(body as Omit<CausalEdge, "schema" | "edge_id">) !== v.edge_id) return fail("EDGE_ID_MISMATCH", "edge id does not match semantic content")
  return { ok: true, value: value as CausalEdge }
}

export function validateEdgeRecord(value: unknown, projectID?: string): Validation<EdgeRecord> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("EDGE_RECORD_MALFORMED", "edge record must be an object")
  const v = value as Record<string, unknown>
  if (v.schema !== EDGE_RECORD_SCHEMA || typeof v.record_id !== "string" || !HASH.test(v.record_id)) return fail("EDGE_RECORD_BAD_ID", "edge record schema/id invalid")
  if (!nonEmpty(v.recorded_at) || Number.isNaN(Date.parse(v.recorded_at))) return fail("EDGE_RECORD_BAD_TIME", "recorded_at must be parseable")
  const edge = validateEdge(v.edge, projectID); if (!edge.ok) return edge as Validation<EdgeRecord>
  const recorder = v.recorder as Record<string, unknown>
  if (!recorder || recorder.component !== "opencode-vfs" || !nonEmpty(recorder.version)) return fail("EDGE_RECORD_BAD_RECORDER", "recorder invalid")
  return { ok: true, value: value as EdgeRecord }
}

export function validateArtifactRegistration(value: unknown, projectID?: string): Validation<ArtifactRegistration> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("ARTIFACT_REGISTRATION_MALFORMED", "registration must be an object")
  const v = value as Record<string, unknown>
  if (v.schema !== ARTIFACT_REGISTRATION_SCHEMA || typeof v.registration_id !== "string" || !HASH.test(v.registration_id)) return fail("ARTIFACT_REGISTRATION_BAD_ID", "registration schema/id invalid")
  if (!nonEmpty(v.project_id) || (projectID !== undefined && v.project_id !== projectID)) return fail("ARTIFACT_REGISTRATION_BAD_PROJECT", "registration project invalid")
  const artifact = validateArtifactRef(v.artifact); if (!artifact.ok) return artifact as Validation<ArtifactRegistration>
  if (v.provenance !== undefined) { const provenance = validateProvenanceRef(v.provenance, v.project_id as string); if (!provenance.ok) return provenance as Validation<ArtifactRegistration> }
  if (v.source !== undefined) { const source = validateSourceState(v.source); if (!source.ok) return source as Validation<ArtifactRegistration> }
  if (!nonEmpty(v.registered_at) || Number.isNaN(Date.parse(v.registered_at))) return fail("ARTIFACT_REGISTRATION_BAD_TIME", "registered_at must be parseable")
  return { ok: true, value: value as ArtifactRegistration }
}
