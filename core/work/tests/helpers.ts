import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256Hex } from "../src/canonical.ts";
import type {
  EvidenceAdapter,
  JsonObject,
  ModelProvider,
  ProofAdapter,
  VerifyAdapter,
} from "../src/adapters.ts";
import { CapabilityRegistry } from "../src/capabilities.ts";
import { WorkEngine } from "../src/engine.ts";
import { unavailableExpertise, type ExpertiseAdapter, type ExpertiseBrief } from "../src/expertise.ts";

function razonableId(prefix: string, input: unknown): string {
  return `${prefix}_${sha256Hex(JSON.stringify(input)).slice(0, 32)}`;
}

/** In-memory stub adapters: deterministic, no upstream code, for engine mechanics. */
export function stubAdapters(opts: { verdict?: string; proofStatus?: string } = {}): {
  evidence: EvidenceAdapter;
  verify: VerifyAdapter;
  proof: ProofAdapter;
} {
  const records = new Map<string, JsonObject>();
  const receipts = new Map<string, JsonObject>();
  const evidence: EvidenceAdapter = {
    pkg: "stub",
    async buildCommandRecord(input) {
      const id = razonableId("ev", [input.command, input.exit_code, input.stdout]);
      const record: JsonObject = { ...input, evidence_id: id, content_hash: "c".repeat(64) };
      records.set(id, record);
      return record;
    },
    async put(record) {
      const id = (record as { evidence_id: string }).evidence_id;
      records.set(id, record);
      return { path: `stub-evidence/${id}` };
    },
    async get(evidence_id) {
      const hit = records.get(evidence_id);
      if (!hit) throw new Error(`EVIDENCE_NOT_FOUND: ${evidence_id}`);
      return hit;
    },
  };
  const verify: VerifyAdapter = {
    pkg: "stub",
    async check(input) {
      const verdict = opts.verdict ?? "PASS";
      const id = razonableId("vr", [input.criterion, verdict]);
      const receipt: JsonObject = { verification_id: id, verdict, claim: input.claim, criterion: input.criterion };
      receipts.set(id, receipt);
      return { receipt };
    },
    async get(verification_id) {
      const hit = receipts.get(verification_id);
      if (!hit) throw new Error(`RECEIPT_NOT_FOUND: ${verification_id}`);
      return hit;
    },
  };
  const artifacts = new Map<string, JsonObject>();
  const proof: ProofAdapter = {
    pkg: "stub",
    async build(input) {
      const status = opts.proofStatus ?? "COMPLETE";
      const id = razonableId("pf", [input.claim, status]);
      const artifact: JsonObject = { proof_id: id, status };
      artifacts.set(id, artifact);
      return { artifact, obligation_statuses: [] };
    },
    async get(proof_id) {
      const hit = artifacts.get(proof_id);
      if (!hit) throw new Error(`PROOF_NOT_FOUND: ${proof_id}`);
      return hit;
    },
    async replay(input) {
      return { replay: "REPLAY_MATCH", proof_id: input.proof_id };
    },
  };
  return { evidence, verify, proof };
}

export function stubProvider(text = "model says hi"): ModelProvider {
  return {
    async callModel() {
      return { text };
    },
  };
}

/** Explicitly-labeled fixture expertise: proves the SEAM in tests, never expertise quality. */
export function fixtureExpertise(
  notes: Array<{ note_id: string; title: string; excerpt: string }>,
  version = "fixture-0",
): ExpertiseAdapter {
  return {
    async search(input) {
      const queryTokens = new Set(
        input.query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3),
      );
      const scored = notes
        .map((n) => {
          const noteTokens = new Set(
            `${n.title} ${n.excerpt}`.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3),
          );
          let score = 0;
          for (const t of queryTokens) if (noteTokens.has(t)) score++;
          return { note: n, score };
        })
        .sort((a, b) => b.score - a.score || (a.note.note_id < b.note.note_id ? -1 : 1));
      const top = scored.slice(0, input.top_k ?? 5);
      const brief: ExpertiseBrief = {
        brief_id: `xb_${sha256Hex(JSON.stringify([input.query, top.map((s) => s.note.note_id)])).slice(0, 32)}`,
        capability: "expertise",
        version,
        query: input.query,
        findings: top.map((s, i) => ({
          finding_id: `F${i + 1}`,
          note_id: s.note.note_id,
          title: s.note.title,
          excerpt: s.note.excerpt,
          score: s.score,
        })),
        retrieved_at: new Date().toISOString(),
      };
      return { brief };
    },
  };
}

/** Registry wiring used across tests: stubs behind the seam + unavailable expertise + optional model. */
export function stubRegistry(
  adapters?: { evidence: EvidenceAdapter; verify: VerifyAdapter; proof: ProofAdapter },
  versions?: { evidence?: string; verify?: string; proof?: string },
  expertise?: ExpertiseAdapter,
  expertiseVersion = "fixture-0",
  modelProvider?: ModelProvider,
): CapabilityRegistry {
  const registry = new CapabilityRegistry();
  const stubs = adapters ?? stubAdapters();
  registry.register({
    id: "evidence",
    version: versions?.evidence ?? "stub-0",
    operations: ["CAPTURE_EVIDENCE"],
    available: true,
    handle: stubs.evidence,
  });
  registry.register({
    id: "verify",
    version: versions?.verify ?? "stub-0",
    operations: ["VERIFY"],
    available: true,
    handle: stubs.verify,
  });
  registry.register({
    id: "proof",
    version: versions?.proof ?? "stub-0",
    operations: ["BUILD_PROOF"],
    available: true,
    handle: stubs.proof,
  });
  if (expertise) {
    registry.register({
      id: "expertise",
      version: expertiseVersion,
      operations: ["SEARCH_EXPERTISE"],
      available: true,
      handle: expertise,
    });
  } else {
    registry.register(unavailableExpertise());
  }
  registry.register({
    id: "model",
    version: "provider",
    operations: ["CALL_MODEL"],
    available: modelProvider !== undefined,
    ...(modelProvider !== undefined
      ? { handle: modelProvider }
      : { handle: null, unavailableReason: "no model provider injected (test default)" }),
  });
  return registry;
}

export function tempEngine(
  adapters?: { evidence: EvidenceAdapter; verify: VerifyAdapter; proof: ProofAdapter },
  options?: { modelProvider?: ModelProvider },
): WorkEngine {
  return new WorkEngine(
    mkdtempSync(join(tmpdir(), "wk-t-proj-")),
    { store_dir: mkdtempSync(join(tmpdir(), "wk-t-store-")) },
    stubRegistry(adapters, undefined, undefined, "fixture-0", options?.modelProvider),
    options ?? {},
  );
}

export const EQUALS_ZERO = {
  kind: "evidence_field",
  path: "observation.exit_code",
  operator: "EQUALS",
  expected: 0,
};

export function miniDeclaration(overrides: Record<string, unknown> = {}) {
  return {
    objective: { statement: "Mini work for engine tests.", source: "system" },
    claim: { statement: "The mini command exited 0.", subject: "mini" },
    success: {
      obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO }],
      acceptance: { checks: [{ name: "mini", command: "node", args: ["-e", "process.exit(0)"] }] },
    },
    plan: [
      { op_id: "run", kind: "RUN_COMMAND", command: "node", args: ["-e", "process.exit(0)"], subject: "mini" },
      { op_id: "ev", kind: "CAPTURE_EVIDENCE", source_op: "run" },
      { op_id: "vr", kind: "VERIFY", criterion: EQUALS_ZERO, evidence: ["ev"] },
      {
        op_id: "pf",
        kind: "BUILD_PROOF",
        obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO, evidence: ["ev"], verification: "vr" }],
      },
    ],
    authority: { scope: "test-only" },
    ...overrides,
  };
}
