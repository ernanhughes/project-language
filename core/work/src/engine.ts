import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { buildAcceptance, type AcceptanceOutcome, type AcceptanceRecord } from "./acceptance.ts";
import {
  normalizeClaimViaVerify,
  UpstreamError,
  type EvidenceAdapter,
  type JsonObject,
  type ModelProvider,
  type ProofAdapter,
  type VerifyAdapter,
} from "./adapters.ts";
import { CapabilityError, CapabilityRegistry } from "./capabilities.ts";
import { canonicalize, sha256Hex } from "./canonical.ts";
import { resolveStoreDir, type WorkConfig } from "./config.ts";
import { EXPERTISE_CAPABILITY_ID, MAX_BRIEF_BYTES, validateBrief, type ExpertiseAdapter, type ExpertiseBrief } from "./expertise.ts";
import { validatePlan, type Operation } from "./ops.ts";
import { normalizeProposal, type WorkProposal } from "./proposals.ts";
import { type OpResult, type RunRecord, type RunState } from "./runs.ts";
import { WorkStore } from "./store.ts";
import {
  deriveAmendmentId,
  deriveQuestionId,
  normalizeDeclaration,
  type Amendment,
  type WorkDeclaration,
} from "./work.ts";
import {
  EVIDENCE_PKG_REF,
  PLUGIN_ID,
  PLUGIN_VERSION,
  PROOF_PKG_REF,
  RUN_SCHEMA,
  VERIFY_PKG_REF,
  WORK_SCHEMA,
} from "./version.ts";

export class WorkError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
  }
}

export type Adapters = {
  evidence: EvidenceAdapter;
  verify: VerifyAdapter;
  proof: ProofAdapter;
};

/** Duck-type guard so constructor callers may pass a registry or a legacy bundle. */
function isRegistry(value: CapabilityRegistry | Adapters): value is CapabilityRegistry {
  const v = value as unknown as Record<string, unknown>;
  return typeof v["require"] === "function" && typeof v["register"] === "function";
}

/** Backwards-compatible adapter bundle → registry (used by tests/dev tooling). */
export function registryFromAdapters(
  adapters: Adapters,
  versions?: { evidence?: string; verify?: string; proof?: string },
): CapabilityRegistry {  const registry = new CapabilityRegistry();
  registry.register({
    id: "evidence",
    version: versions?.evidence ?? "0.0.0-local",
    operations: ["CAPTURE_EVIDENCE"],
    available: true,
    handle: adapters.evidence,
  });
  registry.register({
    id: "verify",
    version: versions?.verify ?? "0.0.0-local",
    operations: ["VERIFY"],
    available: true,
    handle: adapters.verify,
  });
  registry.register({
    id: "proof",
    version: versions?.proof ?? "0.0.0-local",
    operations: ["BUILD_PROOF"],
    available: true,
    handle: adapters.proof,
  });
  return registry;
}

export type EngineOptions = {
  modelProvider?: ModelProvider;
};

const MAX_STREAM_CHARS = 16_384;
const COMMAND_TIMEOUT_MS = 120_000;

function sliceStream(value: string): string {
  return value.length > MAX_STREAM_CHARS ? value.slice(-MAX_STREAM_CHARS) : value;
}

function deriveRunId(work_id: string, work_version: number, started_at: string): string {
  return `wr_${sha256Hex(canonicalize({ work_id, work_version, started_at })).slice(0, 32)}`;
}

type OpOutput =
  | { kind: "command_observation"; command: string; exit_code: number; stdout: string; stderr: string; cwd: string }
  | { kind: "evidence"; evidence_id: string; path: string; via?: CapabilityVia }
  | { kind: "verification"; verification_id: string; verdict: string; via?: CapabilityVia }
  | { kind: "proof"; proof_id: string; status: string; obligation_statuses: JsonObject[]; via?: CapabilityVia }
  | { kind: "knowledge"; brief_id: string; capability: string; capability_version: string; findings: unknown[]; via?: CapabilityVia }
  | { kind: "model_output"; text: string; note: string }
  | { kind: "authority_request"; scope: string; reason: string }
  | { kind: "human_question"; question_id: string };

type CapabilityVia = { capability: string; version: string };

export class WorkEngine {
  readonly store: WorkStore;
  readonly storeDir: string;
  readonly projectDir: string;
  readonly capabilities: CapabilityRegistry;
  private readonly config: WorkConfig;
  private readonly modelProvider?: ModelProvider;

  constructor(
    projectDir: string,
    overrides: WorkConfig = {},
    registryOrAdapters: CapabilityRegistry | Adapters,
    options: EngineOptions = {},
  ) {
    this.projectDir = projectDir;
    this.config = overrides;
    this.storeDir = resolveStoreDir(projectDir, overrides);
    this.store = new WorkStore(this.storeDir);
    this.capabilities = isRegistry(registryOrAdapters)
      ? registryOrAdapters
      : registryFromAdapters(registryOrAdapters);
    this.modelProvider = options.modelProvider;
  }

  /** Resolve a usable capability handle or throw a coded WorkError. */
  private capability<T>(id: string): { handle: T; version: string } {
    try {
      const handle = this.capabilities.require<T>(id);
      const descriptor = this.capabilities.describe(id);
      return { handle, version: descriptor.version };
    } catch (error) {
      if (error instanceof CapabilityError) throw new WorkError(error.code, error.message);
      throw error;
    }
  }

  private blockWithQuestion(message: string, question: string, op_id: string): never {
    const blocked = new WorkError("RUN_BLOCKED", message);
    (blocked as WorkError & { question?: string; op_id?: string }).question = question;
    (blocked as WorkError & { question?: string; op_id?: string }).op_id = op_id;
    throw blocked;
  }

  private upstreamDirs(work_id: string, run_id: string): { evidence: string; verify: string; proof: string } {
    // Run-scoped upstream storage: each run re-observes the world, and
    // re-observed identical content carries fresh timestamps. A shared store
    // would collide loudly on the second write (same content id, different
    // bytes) — the recorded content-vs-event identity distinction. Scoping
    // stores per run gives each observation event its own home.
    const base = join(this.storeDir, "upstream", work_id, run_id);
    const cfg = this.config;
    return {
      evidence: cfg.evidence_store_dir ?? join(base, "evidence"),
      verify: cfg.verification_store_dir ?? join(base, "verify"),
      proof: cfg.proof_store_dir ?? join(base, "proof"),
    };
  }

  /** DECLARE_WORK: validate declaration + plan, check plan covers success, persist v1. */
  declare(input: unknown): { declaration: WorkDeclaration; path: string } {
    const normalized = normalizeDeclaration(input);
    if (!normalized.ok) throw new WorkError(normalized.code, normalized.message);
    const plan = validatePlan(normalized.declaration.plan);
    if (!plan.ok) throw new WorkError(plan.code, plan.message);
    this.checkPlanCoverage(normalized.declaration.success.obligations, plan.ops);
    const stored = this.store.putDeclaration(normalized.declaration);
    return { declaration: normalized.declaration, path: stored.path };
  }

  /** Plan must pursue every declared success obligation (canonical criterion equality). */
  private checkPlanCoverage(
    obligations: Array<{ description: string; criterion: unknown }>,
    ops: Operation[],
  ): void {
    const covered = new Set<string>();
    for (const op of ops) {
      if (op.kind === "BUILD_PROOF") {
        for (const o of op.obligations) covered.add(canonicalize(o.criterion));
      }
    }
    for (const o of obligations) {
      if (!covered.has(canonicalize(o.criterion))) {
        throw new WorkError(
          "PLAN_COVERS_SUCCESS",
          `success obligation "${o.description}" has no BUILD_PROOF obligation with an equal criterion (declare how it will be pursued)`,
        );
      }
    }
  }

  /**
   * AMEND_WORK: changing what success means (or how it is pursued) is a new
   * immutable version with a reason — never a silent mutation. Only the
   * latest version can be amended; obligations/checks are append-only.
   */
  amend(
    work_id: string,
    input: {
      reason: unknown;
      claim?: unknown;
      add_obligations?: unknown[];
      add_acceptance_checks?: unknown[];
      plan?: unknown;
      amended_by?: unknown;
    },
  ): { declaration: WorkDeclaration; amendment: Amendment; path: string } {
    const latest = this.latestDeclaration(work_id);
    if (typeof input.reason !== "string" || input.reason.length === 0) {
      throw new WorkError("INVALID_AMENDMENT", "amendment reason is required (changing success must be auditable)");
    }
    const add_obligations = input.add_obligations ?? [];
    const add_acceptance_checks = input.add_acceptance_checks ?? [];
    if (!Array.isArray(add_obligations) || !Array.isArray(add_acceptance_checks)) {
      throw new WorkError("INVALID_AMENDMENT", "add_obligations / add_acceptance_checks must be arrays when present");
    }
    if (add_obligations.length === 0 && add_acceptance_checks.length === 0 && input.plan === undefined && input.claim === undefined) {
      throw new WorkError("INVALID_AMENDMENT", "amendment must change something (claim, obligations, checks, or plan)");
    }
    for (let i = 0; i < add_obligations.length; i++) {
      const o = add_obligations[i] as Record<string, unknown>;
      if (typeof o !== "object" || o === null || typeof o["description"] !== "string" || o["description"].length === 0 || o["criterion"] === undefined) {
        throw new WorkError("INVALID_AMENDMENT", `add_obligations[${i}] needs description + criterion`);
      }
    }
    for (let i = 0; i < add_acceptance_checks.length; i++) {
      const c = add_acceptance_checks[i] as Record<string, unknown>;
      if (typeof c !== "object" || c === null || typeof c["name"] !== "string" || typeof c["command"] !== "string") {
        throw new WorkError("INVALID_AMENDMENT", `add_acceptance_checks[${i}] needs name + command`);
      }
    }
    let plan = latest.plan;
    if (input.plan !== undefined) {
      const validated = validatePlan(input.plan);
      if (!validated.ok) throw new WorkError(validated.code, validated.message);
      plan = validated.ops;
    }
    let claim = latest.claim;
    if (input.claim !== undefined) {
      if (typeof input.claim !== "object" || input.claim === null || Array.isArray(input.claim)) {
        throw new WorkError("INVALID_AMENDMENT", "claim must be an object when present");
      }
      const c = input.claim as Record<string, unknown>;
      if (typeof c["statement"] !== "string" || c["statement"].length === 0) {
        throw new WorkError("INVALID_AMENDMENT", "claim.statement must be a non-empty string");
      }
      if (c["subject"] !== undefined && typeof c["subject"] !== "string") {
        throw new WorkError("INVALID_AMENDMENT", "claim.subject must be a string when present");
      }
      claim = {
        statement: c["statement"],
        ...(typeof c["subject"] === "string" ? { subject: c["subject"] } : {}),
      };
    }
    const amended_at = new Date().toISOString();
    const amendment: Amendment = {
      amendment_id: deriveAmendmentId({
        work_id,
        from_version: latest.work_version,
        reason: input.reason,
        ...(input.claim !== undefined ? { claim: input.claim } : {}),
        add_obligations,
        add_acceptance_checks,
        amended_at,
      }),
      work_id,
      from_version: latest.work_version,
      to_version: latest.work_version + 1,
      reason: input.reason,
      ...(input.claim !== undefined
        ? {
            claim: {
              statement: (input.claim as Record<string, unknown>)["statement"] as string,
              ...(((input.claim as Record<string, unknown>)["subject"] as string | undefined)
                ? { subject: (input.claim as Record<string, unknown>)["subject"] as string }
                : {}),
            },
          }
        : {}),
      add_obligations: add_obligations as Amendment["add_obligations"],
      add_acceptance_checks: add_acceptance_checks as Amendment["add_acceptance_checks"],
      amended_by: typeof input.amended_by === "string" && input.amended_by.length > 0 ? input.amended_by : "caller",
      amended_at,
    };
    const next: WorkDeclaration = {
      ...latest,
      work_version: latest.work_version + 1,
      claim,
      plan,
      success: {
        obligations: [
          ...latest.success.obligations,
          ...add_obligations.map((o) => {
            const r = o as Record<string, unknown>;
            return {
              description: r["description"] as string,
              criterion: r["criterion"],
              required: typeof r["required"] === "boolean" ? (r["required"] as boolean) : true,
            };
          }),
        ],
        acceptance: {
          checks: [
            ...latest.success.acceptance.checks,
            ...add_acceptance_checks.map((c) => {
              const r = c as Record<string, unknown>;
              return {
                name: r["name"] as string,
                command: r["command"] as string,
                ...(Array.isArray(r["args"]) ? { args: r["args"] as string[] } : {}),
                ...(typeof r["cwd"] === "string" ? { cwd: r["cwd"] as string } : {}),
              };
            }),
          ],
        },
      },
      state: "DECLARED",
      artifacts: [],
      unresolved: [],
      provenance: { ...latest.provenance, amendments: [...latest.provenance.amendments, amendment] },
      content_hash: "",
    };
    next.content_hash = this.hashDeclaration(next);
    const planCheck = validatePlan(next.plan);
    if (!planCheck.ok) throw new WorkError(planCheck.code, planCheck.message);
    this.checkPlanCoverage(next.success.obligations, planCheck.ops);
    const stored = this.store.putDeclaration(next);
    return { declaration: next, amendment, path: stored.path };
  }

  /** Registry-provided model provider, if one is registered and available. */
  private registryModelProvider(): ModelProvider | undefined {
    const reg = this.capabilities.lookup("model");
    if (!reg || !reg.available || reg.handle == null) return undefined;
    return reg.handle as ModelProvider;
  }

  /**
   * Record a proposal against the latest declaration version. Persisted with
   * status PROPOSED and no apply path: only an explicit work_amend changes
   * Work. Declarations are never touched here (asserted by tests).
   */
  propose(
    work_id: string,
    input: { kind: unknown; basis?: unknown; proposed_change: unknown; by?: unknown; capability?: unknown },
  ): { proposal: WorkProposal; path: string } {
    const declaration = this.latestDeclaration(work_id);
    const normalized = normalizeProposal(input, work_id, declaration.work_version);
    if (!normalized.ok) throw new WorkError(normalized.code, normalized.message);
    const stored = this.store.putProposal(work_id, normalized.proposal);
    return { proposal: normalized.proposal, path: stored.path };
  }

  private hashDeclaration(declaration: WorkDeclaration): string {
    const { content_hash: _omitted, ...body } = declaration as unknown as Record<string, unknown>;
    return sha256Hex(canonicalize(body));
  }

  latestDeclaration(work_id: string): WorkDeclaration {
    // Latest = highest stored version; versions are sequential from 1.
    let version = 1;
    let latest: WorkDeclaration | null = null;
    for (;;) {
      try {
        latest = this.store.getDeclaration(work_id, version);
        version++;
      } catch {
        break;
      }
    }
    if (!latest) throw new WorkError("WORK_NOT_FOUND", `no declaration for ${work_id}`);
    return latest;
  }

  /** Execute a declaration's plan. Deterministic ops run without any model. */
  async run(work_id: string, opts: { version?: number; modelProvider?: ModelProvider } = {}): Promise<RunRecord> {
    const declaration =
      opts.version === undefined ? this.latestDeclaration(work_id) : this.store.getDeclaration(work_id, opts.version);
    const plan = validatePlan(declaration.plan);
    if (!plan.ok) throw new WorkError(plan.code, plan.message);
    // Re-check coverage at run time: the plan must still pursue success.
    this.checkPlanCoverage(declaration.success.obligations, plan.ops);

    const provider = opts.modelProvider ?? this.modelProvider;
    const started_at = new Date().toISOString();
    const run_id = deriveRunId(work_id, declaration.work_version, started_at);
    const dirs = this.upstreamDirs(work_id, run_id);
    const outputs = new Map<string, OpOutput>();
    const opResults: OpResult[] = [];
    const unresolved: RunRecord["unresolved"] = [];
    let blocked: { code: string; message: string } | null = null;

    const claim = await this.normalizeClaim(declaration);

    for (const op of plan.ops) {
      if (blocked) break;
      try {
        const output = await this.executeOp(op, {
          declaration,
          claim,
          outputs,
          dirs,
          provider,
          work_id,
          run_id,
        });
        outputs.set(op.op_id, output);
        opResults.push({ op_id: op.op_id, kind: op.kind, status: "ok", output: output as unknown as Record<string, unknown> });
      } catch (error) {
        const code = error instanceof WorkError ? error.code : "OP_ERROR";
        const message = error instanceof Error ? error.message : String(error);
        if (code === "RUN_BLOCKED") {
          const detail = error as WorkError & { question?: string; op_id?: string };
          if (detail.question) {
            unresolved.push({
              question_id: deriveQuestionId({ work_id, question: detail.question, raised_at: new Date().toISOString() }),
              question: detail.question,
              status: "open",
              raised_by_op: detail.op_id ?? op.op_id,
              raised_at: new Date().toISOString(),
            });
          }
          opResults.push({ op_id: op.op_id, kind: op.kind, status: "blocked", error_code: code, error: message });
          blocked = { code, message };
        } else {
          opResults.push({ op_id: op.op_id, kind: op.kind, status: "error", error_code: code, error: message });
          blocked = { code, message };
        }
      }
    }

    const state: RunState = blocked ? "BLOCKED" : "AWAITING_ACCEPTANCE";
    const run: RunRecord = {
      schema: RUN_SCHEMA,
      run_id,
      work_id,
      work_version: declaration.work_version,
      state,
      ops: opResults,
      unresolved,
      started_at,
      ended_at: new Date().toISOString(),
    };
    this.store.putRun(work_id, run);
    return run;
  }

  private async normalizeClaim(declaration: WorkDeclaration): Promise<JsonObject> {
    try {
      return await normalizeClaimViaVerify(declaration.claim);
    } catch (error) {
      if (error instanceof UpstreamError) throw new WorkError(error.code, error.message);
      throw error;
    }
  }

  private async executeOp(
    op: Operation,
    ctx: {
      declaration: WorkDeclaration;
      claim: JsonObject;
      outputs: Map<string, OpOutput>;
      dirs: { evidence: string; verify: string; proof: string };
      provider?: ModelProvider;
      work_id: string;
      run_id: string;
    },
  ): Promise<OpOutput> {
    switch (op.kind) {
      case "RUN_COMMAND": {
        return this.runCommand(op.command, op.args ?? [], op.cwd, op.subject);
      }
      case "CAPTURE_EVIDENCE": {
        const source = ctx.outputs.get(op.source_op);
        if (!source) throw new WorkError("DANGLING_REF", `op ${op.op_id} references unknown op ${op.source_op}`);
        if (source.kind !== "command_observation") {
          throw new WorkError(
            "EVIDENCE_SOURCE_INVALID",
            `CAPTURE_EVIDENCE needs a RUN_COMMAND observation, not ${source.kind}`,
          );
        }
        const { handle: evidence, version } = this.capability<EvidenceAdapter>("evidence");
        const obs = source as unknown as { command: string; exit_code: number; stdout: string; stderr: string; cwd: string; subject?: string };
        const record = await evidence.buildCommandRecord({
          command: obs.command,
          exit_code: obs.exit_code,
          stdout: obs.stdout,
          stderr: obs.stderr,
          cwd: obs.cwd,
          subject: op.subject ?? obs.subject,
        });
        const stored = await evidence.put(record, ctx.dirs.evidence);
        void stored;
        return {
          kind: "evidence",
          evidence_id: (record as { evidence_id: string }).evidence_id,
          path: "",
          via: { capability: "evidence", version },
        };
      }
      case "VERIFY": {
        const records: JsonObject[] = [];
        const { handle: evidence, version: evidenceVersion } = this.capability<EvidenceAdapter>("evidence");
        void evidenceVersion;
        for (const ref of op.evidence) {
          const out = ctx.outputs.get(ref);
          if (!out) throw new WorkError("DANGLING_REF", `op ${op.op_id} references unknown op ${ref}`);
          if (out.kind === "model_output") {
            throw new WorkError(
              "MODEL_OUTPUT_NOT_EVIDENCE",
              `op ${ref} is model output and must never enter verification as evidence`,
            );
          }
          if (out.kind === "knowledge") {
            throw new WorkError(
              "KNOWLEDGE_NOT_EVIDENCE",
              `op ${ref} is retrieved knowledge and must never enter verification as evidence (propose first, verify observations)`,
            );
          }
          if (out.kind !== "evidence") {
            throw new WorkError("EVIDENCE_KIND_INVALID", `op ${ref} produced ${out.kind}, not evidence`);
          }
          records.push(
            await evidence.get((out as { evidence_id: string }).evidence_id, ctx.dirs.evidence),
          );
        }
        const { handle: verify, version } = this.capability<VerifyAdapter>("verify");
        const { receipt } = await verify.check(
          {
            claim: ctx.claim,
            criterion: op.criterion,
            evidence: records,
          },
          { projectDir: this.projectDir, storeDir: ctx.dirs.verify },
        );
        return {
          kind: "verification",
          verification_id: (receipt as { verification_id: string }).verification_id,
          verdict: (receipt as { verdict: string }).verdict,
          via: { capability: "verify", version },
        };
      }
      case "BUILD_PROOF": {
        const evidenceByOp = new Map<string, JsonObject>();
        const receiptsByOp = new Map<string, JsonObject>();
        const { handle: evidence } = this.capability<EvidenceAdapter>("evidence");
        const { handle: verify } = this.capability<VerifyAdapter>("verify");
        const { handle: proof, version: proofVersion } = this.capability<ProofAdapter>("proof");
        for (const o of op.obligations) {
          for (const ref of o.evidence) {
            if (!evidenceByOp.has(ref)) {
              const out = ctx.outputs.get(ref);
              if (!out) throw new WorkError("DANGLING_REF", `unknown op ${ref}`);
              if (out.kind === "model_output") {
                throw new WorkError("MODEL_OUTPUT_NOT_EVIDENCE", `op ${ref} is model output, not evidence`);
              }
              if (out.kind === "knowledge") {
                throw new WorkError("KNOWLEDGE_NOT_EVIDENCE", `op ${ref} is retrieved knowledge, not evidence`);
              }
              if (out.kind !== "evidence") throw new WorkError("EVIDENCE_KIND_INVALID", `op ${ref} is ${out.kind}`);
              evidenceByOp.set(
                ref,
                await evidence.get((out as { evidence_id: string }).evidence_id, ctx.dirs.evidence),
              );
            }
          }
          if (!receiptsByOp.has(o.verification)) {
            const out = ctx.outputs.get(o.verification);
            if (!out) throw new WorkError("DANGLING_REF", `unknown op ${o.verification}`);
            if (out.kind !== "verification") {
              throw new WorkError("RECEIPT_KIND_INVALID", `op ${o.verification} is ${out.kind}, not a verification`);
            }
            receiptsByOp.set(
              o.verification,
              await verify.get(
                (out as { verification_id: string }).verification_id,
                { projectDir: this.projectDir, storeDir: ctx.dirs.verify },
              ),
            );
          }
        }
        const claimId = (ctx.claim as { claim_id: string }).claim_id;
        const { artifact, obligation_statuses } = await proof.build(
          {
            claim: ctx.claim,
            obligations: op.obligations.map((o) => ({
              description: o.description,
              claim_id: claimId,
              criterion: o.criterion,
              evidence_ids: o.evidence.map((ref) => {
                const rec = evidenceByOp.get(ref) as { evidence_id: string };
                return rec.evidence_id;
              }),
              verification_id: (receiptsByOp.get(o.verification) as { verification_id: string }).verification_id,
              ...(o.required !== undefined ? { required: o.required } : {}),
            })),
            evidence: [...evidenceByOp.values()],
            verifications: [...receiptsByOp.values()],
          },
          { projectDir: this.projectDir, storeDir: ctx.dirs.proof },
        );
        return {
          kind: "proof",
          proof_id: (artifact as { proof_id: string }).proof_id,
          status: (artifact as { status: string }).status,
          obligation_statuses,
          via: { capability: "proof", version: proofVersion },
        };
      }
      case "SEARCH_EXPERTISE": {
        const capabilityId = op.capability ?? EXPERTISE_CAPABILITY_ID;
        let adapter: ExpertiseAdapter;
        let version: string;
        try {
          ({ handle: adapter, version } = this.capability<ExpertiseAdapter>(capabilityId));
        } catch (error) {
          if (error instanceof WorkError && error.code === "CAPABILITY_UNAVAILABLE") {
            this.blockWithQuestion(
              `op ${op.op_id}: ${error.message}`,
              `Knowledge capability "${capabilityId}" unavailable for query "${op.query.slice(0, 200)}" — configure it or proceed without retrieved knowledge`,
              op.op_id,
            );
          }
          throw error;
        }
        let brief: ExpertiseBrief;
        try {
          ({ brief } = await adapter.search({ query: op.query, ...(op.top_k !== undefined ? { top_k: op.top_k } : {}) }));
        } catch (error) {
          if (error instanceof WorkError) throw error;
          // Environment/config failures are actionable missing inputs (BLOCKED);
          // execution failures (timeout, bad output) are op errors.
          if (error instanceof UpstreamError) {
            if (
              error.code === "UPSTREAM_NOT_AVAILABLE" ||
              error.code === "EXPERTISE_CONFIG_MISSING" ||
              error.code === "EXPERTISE_CONFIG_INVALID"
            ) {
              this.blockWithQuestion(
                `op ${op.op_id}: ${error.message}`,
                `Knowledge capability "${capabilityId}" not ready (${error.code}: ${error.message}) — fix the environment or proceed without retrieved knowledge`,
                op.op_id,
              );
            }
            throw new WorkError(error.code, error.message);
          }
          throw new WorkError("EXPERTISE_SEARCH_FAILED", `capability "${capabilityId}" search failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 300));
        }
        const validated = validateBrief(brief);
        if (!validated.ok) throw new WorkError(validated.code, validated.message);
        return {
          kind: "knowledge",
          brief_id: validated.brief.brief_id,
          capability: capabilityId,
          capability_version: version,
          findings: validated.brief.findings,
          via: { capability: capabilityId, version },
        };
      }
      case "CALL_MODEL": {
        const provider = ctx.provider ?? this.registryModelProvider();
        if (!provider) {
          this.blockWithQuestion(
            `op ${op.op_id} needs a model and none is configured`,
            `Model required to answer: ${op.prompt.slice(0, 300)}`,
            op.op_id,
          );
        }
        const { text } = await provider.callModel({ prompt: op.prompt, ...(op.model ? { model: op.model } : {}), ...(op.data_policy ? { data_policy: op.data_policy } : {}), ...(op.max_output_tokens ? { max_output_tokens: op.max_output_tokens } : {}), ...(op.temperature !== undefined ? { temperature: op.temperature } : {}), ...(op.reasoning_effort ? { reasoning_effort: op.reasoning_effort } : {}), ...(op.session_id ? { session_id: op.session_id } : {}) });
        if (op.output_path) {
          const target = resolve(this.projectDir, op.output_path);
          const rel = relative(this.projectDir, target);
          if (rel.startsWith("..") || resolve(target) === resolve(this.projectDir)) throw new WorkError("OUTPUT_PATH_INVALID", `op ${op.op_id}: output_path must stay inside project`);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, text, "utf8");
        }
        return { kind: "model_output", text, note: "model output is not evidence and cannot enter VERIFY" };
      }
      case "REQUEST_AUTHORITY": {
        const blocked = new WorkError("RUN_BLOCKED", `op ${op.op_id}: no authority engine exists (request recorded)`);
        (blocked as WorkError & { question?: string; op_id?: string }).question =
          `Authority requested for scope "${op.scope}": ${op.reason} (no granter configured)`;
        (blocked as WorkError & { question?: string; op_id?: string }).op_id = op.op_id;
        throw blocked;
      }
      case "ASK_HUMAN": {
        const blocked = new WorkError("RUN_BLOCKED", `op ${op.op_id}: human input requested`);
        (blocked as WorkError & { question?: string; op_id?: string }).question = op.question;
        (blocked as WorkError & { question?: string; op_id?: string }).op_id = op.op_id;
        throw blocked;
      }
    }
  }

  private runCommand(command: string, args: string[], cwd?: string, subject?: string): OpOutput {
    const workdir = cwd ?? process.cwd();
    const fullCommand = [command, ...args].join(" ");
    const base = { kind: "command_observation" as const, command: fullCommand, cwd: workdir };
    const withSubject = subject !== undefined ? { subject } : {};
    try {
      const stdout = execFileSync(command, args, {
        cwd: workdir,
        encoding: "utf8",
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      return {
        ...base,
        ...withSubject,
        exit_code: 0,
        stdout: sliceStream(String(stdout)),
        stderr: "",
      };
    } catch (error) {
      const e = error as { status?: unknown; stdout?: unknown; stderr?: unknown; code?: unknown; message?: string };
      if (typeof e.status === "number") {
        // Nonzero exit is an observation, not an op failure: verification judges it.
        return {
          ...base,
          ...withSubject,
          exit_code: e.status,
          stdout: sliceStream(String(e.stdout ?? "")),
          stderr: sliceStream(String(e.stderr ?? "")),
        };
      }
      throw new WorkError(
        "COMMAND_SPAWN_FAILED",
        `could not execute "${command}": ${String(e.code ?? e.message ?? e).slice(0, 300)}`,
      );
    }
  }

  /**
   * CHECK_ACCEPTANCE as a separate stage (never part of the plan, never part
   * of proof): re-observe the world with fresh command executions and record
   * whether the declared acceptance checks hold. Acceptance inherits the
   * specification gap — it checks what was declared, nothing more.
   */
  async accept(work_id: string, opts: { run_id?: string } = {}): Promise<AcceptanceRecord> {
    const declaration = this.latestDeclaration(work_id);
    const runId = opts.run_id ?? this.latestRunId(work_id);
    const run = this.store.getRun(work_id, runId);
    if (run.state !== "AWAITING_ACCEPTANCE") {
      throw new WorkError("ACCEPTANCE_PREMATURE", `run ${runId} is ${run.state}; acceptance needs AWAITING_ACCEPTANCE`);
    }
    let proof_id: string | null = null;
    for (const op of run.ops) {
      if (op.status === "ok" && op.output && (op.output as Record<string, unknown>)["kind"] === "proof") {
        proof_id = (op.output as Record<string, unknown>)["proof_id"] as string;
      }
    }
    const checks = declaration.success.acceptance.checks.map((c) => {
      const observed = this.runCommandSync(c.command, c.args ?? [], c.cwd);
      return { name: c.name, command: [c.command, ...(c.args ?? [])].join(" "), exit_code: observed.exit_code };
    });
    const failed = checks.filter((c) => c.exit_code !== 0);
    const outcome = failed.length === 0 ? "ACCEPTED" : "REJECTED";
    const record = buildAcceptance({
      work_id,
      work_version: declaration.work_version,
      run_id: run.run_id,
      proof_id,
      outcome,
      reason:
        failed.length === 0
          ? `all ${checks.length} acceptance checks exit 0 (declared checks only — see specification gap)`
          : `${failed.length}/${checks.length} acceptance checks failed: ${failed.map((f) => `${f.name} (exit ${f.exit_code})`).join(", ")}`,
      checks,
    });
    this.store.putAcceptance(work_id, record);
    return record;
  }

  private runCommandSync(command: string, args: string[], cwd?: string): { exit_code: number } {
    const out = this.runCommand(command, args, cwd);
    return { exit_code: (out as { exit_code: number }).exit_code };
  }

  private latestRunId(work_id: string): string {
    const runs = this.store.listRuns(work_id);
    if (runs.length === 0) throw new WorkError("WORK_NO_RUNS", `no runs recorded for ${work_id}`);
    return runs[runs.length - 1] as string;
  }

  /** Composed status view. Read-only composition, no new judgment. */
  get(work_id: string): Record<string, unknown> {
    const declaration = this.latestDeclaration(work_id);
    const runIds = this.store.listRuns(work_id);
    const runs = runIds.map((id) => {
      const r = this.store.getRun(work_id, id);
      return { run_id: r.run_id, work_version: r.work_version, state: r.state, ops: r.ops.length, unresolved: r.unresolved.length };
    });
    const acceptanceIds = this.store.listAcceptances(work_id);
    const acceptances = acceptanceIds.map((id) => {
      const a = this.store.getAcceptance(work_id, id);
      return { acceptance_id: a.acceptance_id, outcome: a.outcome, work_version: a.work_version, run_id: a.run_id };
    });
    const latestAcceptance =
      acceptances.length > 0 ? this.store.getAcceptance(work_id, acceptanceIds[acceptanceIds.length - 1] as string) : null;
    const latestRun = runs.length > 0 ? this.store.getRun(work_id, runIds[runIds.length - 1] as string) : null;
    const proposalIds = this.store.listProposals(work_id);
    const proposals = proposalIds.map((id) => {
      const p = this.store.getProposal(work_id, id);
      return { proposal_id: p.proposal_id, kind: p.kind, status: p.status, work_version: p.work_version };
    });
    let derived_status = "DECLARED";
    if (latestAcceptance && latestAcceptance.work_version === declaration.work_version) {
      derived_status = latestAcceptance.outcome;
    } else if (latestRun && latestRun.work_version === declaration.work_version) {
      derived_status = latestRun.state;
    } else if (runs.length > 0) {
      derived_status = "READY";
    }
    return {
      work_id: declaration.work_id,
      work_version: declaration.work_version,
      versions: declaration.provenance.amendments.length + 1,
      objective: declaration.objective,
      claim: declaration.claim,
      obligations: declaration.success.obligations.length,
      acceptance_checks: declaration.success.acceptance.checks.length,
      plan_ops: declaration.plan.length,
      amendments: declaration.provenance.amendments,
      unresolved: latestRun?.unresolved ?? [],
      runs,
      acceptances,
      proposals,
      derived_status,
      declaration,
    };
  }

  async doctor(): Promise<Record<string, unknown>> {
    let store_writable = false;
    let message: string | undefined;
    try {
      mkdirSync(join(this.storeDir, "works"), { recursive: true });
      const probe = join(this.storeDir, "works", ".write-probe");
      writeFileSync(probe, "ok", "utf8");
      unlinkSync(probe);
      store_writable = true;
    } catch (error) {
      message = `store not writable: ${String(error).slice(0, 200)}`;
    }
    const { capabilities } = await this.capabilities.health();
    return {
      ok: store_writable,
      plugin: PLUGIN_ID,
      version: PLUGIN_VERSION,
      schema: WORK_SCHEMA,
      upstream: {
        evidence: EVIDENCE_PKG_REF,
        verify: VERIFY_PKG_REF,
        proof: PROOF_PKG_REF,
      },
      capabilities,
      store_dir: this.storeDir,
      store_writable,
      model_inference: "none (engine core; models only via injected provider)",
      network: "none",
      node: process.version,
      ...(message !== undefined ? { message } : {}),
    };
  }
}
