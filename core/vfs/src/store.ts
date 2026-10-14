import { existsSync, writeFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import type { ResolvedConfig, ProvenanceEvent } from "./types.ts"
import type { ArtifactRef, ArtifactRegistration, CausalEdge, EdgeRecord, ProvenanceRef } from "./contracts.ts"
import { GitRepo, ensureParent } from "./git.ts"
import { ProvenanceLedger } from "./ledger.ts"
import { sha256, stableStringify } from "./redact.ts"

export class ProvenanceStore {
  readonly repo: GitRepo
  readonly projectRoot: string
  readonly ledger: ProvenanceLedger

  constructor(
    readonly config: ResolvedConfig,
    readonly projectID: string,
    readonly source: GitRepo,
  ) {
    this.repo = GitRepo.ensure(config.storage.repo)
    this.projectRoot = resolve(
      config.storage.repo,
      config.storage.path,
      "projects",
      projectID,
    )
    this.ledger = new ProvenanceLedger(this.projectRoot, projectID)
  }

  registerArtifact(artifact: ArtifactRef, options: { provenance?: ProvenanceRef; source?: import("./types.ts").SourceState; registered_at?: string } = {}): ArtifactRegistration {
    const record = this.ledger.registerArtifact(artifact, options)
    this.commitProject(`provenance(${this.projectID}): register artifact ${artifact.artifact_id}`)
    return record
  }

  recordEdge(input: Omit<CausalEdge, "schema" | "edge_id">, recorded_at?: string): EdgeRecord {
    const record = this.ledger.recordEdge(input, recorded_at)
    this.commitProject(`provenance(${this.projectID}): record edge ${record.edge.edge_id.slice(0, 12)}`)
    return record
  }

  writeSegment(sessionID: string, events: ProvenanceEvent[]): string | null {
    if (events.length === 0) return null

    const now = new Date()
    const stamp = now.toISOString().replace(/[:.]/g, "-")
    const digest = sha256(stableStringify(events)).slice(0, 12)
    const file = join(
      this.projectRoot,
      "sessions",
      safe(sessionID),
      `${stamp}-${digest}.json`,
    )
    if (existsSync(file)) throw new Error(`Provenance segment already exists: ${file}`)
    ensureParent(file)

    const document = {
      schema: "opencode-vfs.session-segment.v1",
      projectID: this.projectID,
      sessionID,
      writtenAt: now.toISOString(),
      source: this.source.describeSource(),
      events,
    }
    writeFileSync(file, JSON.stringify(document, null, 2) + "\n", "utf8")

    const rel = relative(this.repo.root, file)
    if (this.config.storage.autoCommit) {
      this.repo.commitPath(
        rel,
        `provenance(${this.projectID}): capture session ${sessionID}`,
      )
      if (this.config.storage.push) this.repo.push()
    }
    return file
  }

  private commitProject(message: string): void {
    if (!this.config.storage.autoCommit) return
    this.repo.commitPath(relative(this.repo.root, this.projectRoot), message)
    if (this.config.storage.push) this.repo.push()
  }
}

function safe(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_")
}
