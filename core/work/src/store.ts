import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prettyCanonical } from "./canonical.ts";
import type { AcceptanceRecord } from "./acceptance.ts";
import { validateAcceptance } from "./acceptance.ts";
import { PROPOSAL_ID_PATTERN, type WorkProposal } from "./proposals.ts";
import type { RunRecord } from "./runs.ts";
import { RUN_ID_PATTERN } from "./runs.ts";
import { checkDeclarationIntegrity, WORK_ID_PATTERN, type WorkDeclaration } from "./work.ts";

export const MAX_WORK_FILE_BYTES = 1_048_576;

/**
 * WorkStore: declarations are immutable version files
 * (works/<id>/v<n>.json); executions are separate immutable records
 * (runs/, acceptance-*.json). Nothing is ever mutated in place.
 */
export class WorkStore {
  constructor(readonly dir: string) {}

  workDir(work_id: string): string {
    if (!WORK_ID_PATTERN.test(work_id)) {
      throw new Error("WORK_BAD_ID: work_id must match /^wk_[0-9a-f]{32}$/");
    }
    return join(this.dir, "works", work_id);
  }

  declarationPath(work_id: string, version: number): string {
    return join(this.workDir(work_id), `v${version}.json`);
  }

  runPath(work_id: string, run_id: string): string {
    if (!RUN_ID_PATTERN.test(run_id)) {
      throw new Error("WORK_BAD_RUN_ID: run_id must match /^wr_[0-9a-f]{32}$/");
    }
    return join(this.workDir(work_id), "runs", `${run_id}.json`);
  }

  private writeJsonAtomic(dest: string, value: unknown, capError: string): string {
    const serialized = prettyCanonical(value);
    if (serialized.length > MAX_WORK_FILE_BYTES) {
      throw new Error(`${capError}: payload is ${serialized.length} bytes (cap ${MAX_WORK_FILE_BYTES})`);
    }
    mkdirSync(join(dest, ".."), { recursive: true });
    const existing = this.tryRead(dest);
    if (existing !== null) {
      if (existing === serialized) return dest;
      throw new Error(`WORK_NOT_IMMUTABLE: ${dest} already holds different bytes (records are append-only)`);
    }
    const tmp = join(dest, "..", `.tmp-${process.pid}-${Date.now()}.json`);
    writeFileSync(tmp, serialized, "utf8");
    renameSync(tmp, dest);
    return dest;
  }

  private tryRead(dest: string): string | null {
    try {
      const stat = statSync(dest);
      if (stat.size > MAX_WORK_FILE_BYTES) {
        throw new Error(`WORK_TOO_LARGE: stored file is ${stat.size} bytes`);
      }
      return readFileSync(dest, "utf8");
    } catch (error) {
      if ((error as Error).message.startsWith("WORK_TOO_LARGE")) throw error;
      return null;
    }
  }

  putDeclaration(declaration: WorkDeclaration): { path: string; duplicate: boolean } {
    const integrity = checkDeclarationIntegrity(declaration);
    if (!integrity.ok) throw new Error(`${integrity.code}: ${integrity.message}`);
    const dest = this.declarationPath(declaration.work_id, declaration.work_version);
    const existed = this.tryRead(dest) !== null;
    const path = this.writeJsonAtomic(dest, declaration, "WORK_TOO_LARGE");
    return { path, duplicate: existed };
  }

  getDeclaration(work_id: string, version: number): WorkDeclaration {
    const dest = this.declarationPath(work_id, version);
    const raw = this.tryRead(dest);
    if (raw === null) throw new Error(`WORK_NOT_FOUND: no declaration ${work_id} v${version}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`WORK_MALFORMED: ${dest} is not valid JSON`);
    }
    const declaration = parsed as WorkDeclaration;
    const integrity = checkDeclarationIntegrity(declaration);
    if (!integrity.ok) throw new Error(`${integrity.code}: ${integrity.message} (${dest})`);
    return declaration;
  }

  putRun(work_id: string, run: RunRecord): { path: string } {
    const dest = this.runPath(work_id, run.run_id);
    this.writeJsonAtomic(dest, run, "WORK_TOO_LARGE");
    return { path: dest };
  }

  getRun(work_id: string, run_id: string): RunRecord {
    const dest = this.runPath(work_id, run_id);
    const raw = this.tryRead(dest);
    if (raw === null) throw new Error(`WORK_RUN_NOT_FOUND: no run ${run_id}`);
    try {
      return JSON.parse(raw) as RunRecord;
    } catch {
      throw new Error(`WORK_MALFORMED: ${dest} is not valid JSON`);
    }
  }

  putAcceptance(work_id: string, record: AcceptanceRecord): { path: string } {
    const structural = validateAcceptance(record);
    if (!structural.ok) throw new Error(`${structural.code}: ${structural.message}`);
    const dest = join(this.workDir(work_id), `acceptance-${record.acceptance_id}.json`);
    this.writeJsonAtomic(dest, record, "WORK_TOO_LARGE");
    return { path: dest };
  }

  getAcceptance(work_id: string, acceptance_id: string): AcceptanceRecord {
    const dest = join(this.workDir(work_id), `acceptance-${acceptance_id}.json`);
    const raw = this.tryRead(dest);
    if (raw === null) throw new Error(`WORK_ACCEPTANCE_NOT_FOUND: no acceptance ${acceptance_id}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`WORK_MALFORMED: ${dest} is not valid JSON`);
    }
    const structural = validateAcceptance(parsed);
    if (!structural.ok) throw new Error(`${structural.code}: ${structural.message} (${dest})`);
    return structural.record;
  }

  /** Lexicographically sorted run ids (run ids embed time, so this is chronological). */
  listRuns(work_id: string): string[] {    let entries: string[];
    try {
      entries = readdirSync(join(this.workDir(work_id), "runs"), { withFileTypes: false }) as string[];
    } catch {
      return [];
    }
    return entries
      .filter((f) => f.startsWith("wr_") && f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .sort();
  }

  listAcceptances(work_id: string): string[] {
    let entries: string[];
    try {
      entries = readdirSync(this.workDir(work_id), { withFileTypes: false }) as string[];
    } catch {
      return [];
    }
    return entries
      .filter((f) => f.startsWith("acceptance-ac_") && f.endsWith(".json"))
      .map((f) => f.slice("acceptance-".length, -".json".length))
      .sort();
  }

  proposalPath(work_id: string, proposal_id: string): string {
    if (!PROPOSAL_ID_PATTERN.test(proposal_id)) {
      throw new Error("PROPOSAL_BAD_ID: proposal_id must match /^wp_[0-9a-f]{32}$/");
    }
    return join(this.workDir(work_id), "proposals", `${proposal_id}.json`);
  }

  /** Proposals are immutable once recorded; status never leaves PROPOSED in V1. */
  putProposal(work_id: string, proposal: WorkProposal): { path: string; duplicate: boolean } {
    const dest = this.proposalPath(work_id, proposal.proposal_id);
    const existed = this.tryRead(dest) !== null;
    const path = this.writeJsonAtomic(dest, proposal, "WORK_TOO_LARGE");
    return { path, duplicate: existed };
  }

  getProposal(work_id: string, proposal_id: string): WorkProposal {
    const dest = this.proposalPath(work_id, proposal_id);
    const raw = this.tryRead(dest);
    if (raw === null) throw new Error(`WORK_PROPOSAL_NOT_FOUND: no proposal ${proposal_id}`);
    try {
      return JSON.parse(raw) as WorkProposal;
    } catch {
      throw new Error(`WORK_MALFORMED: ${dest} is not valid JSON`);
    }
  }

  listProposals(work_id: string): string[] {
    let entries: string[];
    try {
      entries = readdirSync(join(this.workDir(work_id), "proposals"), { withFileTypes: false }) as string[];
    } catch {
      return [];
    }
    return entries
      .filter((f) => f.startsWith("wp_") && f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .sort();
  }
}
