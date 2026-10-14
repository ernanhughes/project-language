import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Adapter seam between the Work runtime and the three sibling plugins.
 *
 * The engine is written against these narrow interfaces. The bundled
 * `LocalAdapters` import the REAL upstream code at configured paths —
 * nothing is vendored or reimplemented here (rebuilding sibling semantics
 * would violate their own architectural rules). Until registry publication,
 * set OPENCODE_EVIDENCE_PKG / OPENCODE_VERIFY_PKG / OPENCODE_PROOF_PKG or
 * keep the sibling checkouts adjacent (../opencode-evidence, ...).
 * Missing checkouts fail loudly as UPSTREAM_NOT_AVAILABLE, never silently.
 */

export type JsonObject = Record<string, unknown>;

export interface EvidenceAdapter {
  readonly pkg: string;
  buildCommandRecord(input: {
    command: string;
    exit_code: number;
    stdout: string;
    stderr: string;
    cwd?: string;
    subject?: string;
  }): Promise<JsonObject>;
  put(record: JsonObject, storeDir: string): Promise<{ path: string }>;
  get(evidence_id: string, storeDir: string): Promise<JsonObject>;
}

export interface VerifyAdapter {
  readonly pkg: string;
  check(
    input: {
      claim: unknown;
      criterion: unknown;
      evidence: JsonObject[];
    },
    ctx: { projectDir: string; storeDir: string },
  ): Promise<{ receipt: JsonObject }>;
  get(verification_id: string, ctx: { projectDir: string; storeDir: string }): Promise<JsonObject>;
}

export interface ProofAdapter {
  readonly pkg: string;
  build(
    input: {
      claim: unknown;
      obligations: unknown[];
      evidence: JsonObject[];
      verifications: JsonObject[];
    },
    ctx: { projectDir: string; storeDir: string },
  ): Promise<{ artifact: JsonObject; obligation_statuses: JsonObject[] }>;
  get(proof_id: string, ctx: { projectDir: string; storeDir: string }): Promise<JsonObject>;
  replay(
    input: {
      proof_id: string;
      evidence?: JsonObject[];
      verifications?: JsonObject[];
    },
    ctx: { projectDir: string; storeDir: string },
  ): Promise<JsonObject>;
}

/** Model boundary: the ONLY operation allowed to touch a model. */
export interface ModelProvider {
  callModel(input: { prompt: string; model?: string; data_policy?: "training_allowed" | "private" | "local_only"; max_output_tokens?: number; temperature?: number; reasoning_effort?: string; session_id?: string }): Promise<{ text: string }>;
}

export class UpstreamError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
  }
}

function resolvePkgDir(envVar: string, sibling: string, marker: string): string {
  // Source lives in src/ and the host bundle in dist/. In both cases sibling
  // checkouts are adjacent to this package, not the calling application's cwd.
  const here = dirname(fileURLToPath(import.meta.url));
  // In project-language the providers sit side by side under core/, named without the opencode- prefix.
  const unified = resolve(here, "..", "..", sibling.replace(/^opencode-/, ""));
  const adjacent = resolve(here, "..", "..", sibling);
  const candidates = [process.env[envVar], unified, adjacent, resolve(join(process.cwd(), "..", sibling))].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  for (const dir of candidates) {
    if (existsSync(join(dir, marker))) return dir;
  }
  throw new UpstreamError(
    "UPSTREAM_NOT_AVAILABLE",
    `${sibling} checkout not found (set ${envVar}); see DESIGN.md for the registry path`,
  );
}

type EvidenceMod = {
  normalizeCommandResult: (i: JsonObject) => JsonObject;
  buildRecord: (i: JsonObject) => JsonObject;
  EvidenceStore: new (dir: string) => {
    put(r: JsonObject): { path: string };
    get(id: string): JsonObject;
  };
};

type VerifyMod = {
  VerificationEngine: new (
    dir: string,
    overrides?: JsonObject,
  ) => {
    check(i: JsonObject): { receipt: JsonObject };
    get(id: string): JsonObject;
  };
  normalizeClaim: (i: unknown) => { ok: boolean; claim?: JsonObject; code?: string; message?: string };
};

type ProofMod = {
  ProofEngine: new (
    dir: string,
    overrides?: JsonObject,
  ) => {
    build(i: JsonObject): { artifact: JsonObject; obligation_statuses: JsonObject[] };
    get(id: string): JsonObject;
    replay(i: JsonObject): JsonObject;
  };
};

export function localEvidenceAdapter(): EvidenceAdapter {
  const pkg = resolvePkgDir("OPENCODE_EVIDENCE_PKG", "opencode-evidence", join("src", "capture.ts"));
  let mod: EvidenceMod | null = null;
  const load = async (): Promise<EvidenceMod> => {
    if (!mod) {
      const capture = (await import(pathToFileURL(join(pkg, "src", "capture.ts")).href)) as unknown as EvidenceMod;
      const store = (await import(pathToFileURL(join(pkg, "src", "store.ts")).href)) as unknown as EvidenceMod;
      mod = {
        normalizeCommandResult: capture.normalizeCommandResult,
        buildRecord: capture.buildRecord,
        EvidenceStore: store.EvidenceStore,
      };
    }
    return mod;
  };
  return {
    pkg,
    async buildCommandRecord(input) {
      const m = await load();
      return m.buildRecord(m.normalizeCommandResult({ ...input }) as JsonObject) as JsonObject;
    },
    async put(record, storeDir) {
      const m = await load();
      return new m.EvidenceStore(storeDir).put(record);
    },
    async get(evidence_id, storeDir) {
      const m = await load();
      return new m.EvidenceStore(storeDir).get(evidence_id);
    },
  };
}

export function localVerifyAdapter(): VerifyAdapter {
  const pkg = resolvePkgDir("OPENCODE_VERIFY_PKG", "opencode-verify", join("src", "engine.ts"));
  return {
    pkg,
    async check(input, ctx) {
      const m = (await import(pathToFileURL(join(pkg, "src", "engine.ts")).href)) as unknown as VerifyMod;
      const engine = new m.VerificationEngine(ctx.projectDir, { store_dir: ctx.storeDir });
      return engine.check({ ...input }) as { receipt: JsonObject };
    },
    async get(verification_id, ctx) {
      const m = (await import(pathToFileURL(join(pkg, "src", "engine.ts")).href)) as unknown as VerifyMod;
      return new m.VerificationEngine(ctx.projectDir, { store_dir: ctx.storeDir }).get(verification_id) as JsonObject;
    },
  };
}

export async function normalizeClaimViaVerify(input: unknown): Promise<JsonObject> {
  const pkg = resolvePkgDir("OPENCODE_VERIFY_PKG", "opencode-verify", join("src", "claim.ts"));
  const m = (await import(pathToFileURL(join(pkg, "src", "claim.ts")).href)) as unknown as VerifyMod;
  const result = m.normalizeClaim(input);
  if (!result.ok || !result.claim) {
    throw new UpstreamError(result.code ?? "INVALID_CLAIM", result.message ?? "claim invalid");
  }
  return result.claim;
}

export function localProofAdapter(): ProofAdapter {
  const pkg = resolvePkgDir("OPENCODE_PROOF_PKG", "opencode-proof", join("src", "engine.ts"));
  return {
    pkg,
    async build(input, ctx) {
      const m = (await import(pathToFileURL(join(pkg, "src", "engine.ts")).href)) as unknown as ProofMod;
      const engine = new m.ProofEngine(ctx.projectDir, { store_dir: ctx.storeDir });
      return engine.build({ ...input }) as unknown as {
        artifact: JsonObject;
        obligation_statuses: JsonObject[];
      };
    },
    async get(proof_id, ctx) {
      const m = (await import(pathToFileURL(join(pkg, "src", "engine.ts")).href)) as unknown as ProofMod;
      return new m.ProofEngine(ctx.projectDir, { store_dir: ctx.storeDir }).get(proof_id) as JsonObject;
    },
    async replay(input, ctx) {
      const m = (await import(pathToFileURL(join(pkg, "src", "engine.ts")).href)) as unknown as ProofMod;
      const engine = new m.ProofEngine(ctx.projectDir, { store_dir: ctx.storeDir });
      return engine.replay({ ...input }) as unknown as JsonObject;
    },
  };
}

/** Read a sibling package version for capability provenance (guarded). */
export function localPackageVersion(pkgDir: string): string {
  try {
    const parsed = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as Record<string, unknown>;
    return typeof parsed["version"] === "string" ? (parsed["version"] as string) : "0.0.0-unknown";
  } catch {
    return "0.0.0-unknown";
  }
}
/** Adapter availability probe for health checks (no imports, just markers). */
export function adapterAvailability(): Record<string, { available: boolean; path: string | null }> {
  const specs = [
    ["evidence", "OPENCODE_EVIDENCE_PKG", "opencode-evidence", join("src", "capture.ts")],
    ["verify", "OPENCODE_VERIFY_PKG", "opencode-verify", join("src", "engine.ts")],
    ["proof", "OPENCODE_PROOF_PKG", "opencode-proof", join("src", "engine.ts")],
  ] as const;
  const out: Record<string, { available: boolean; path: string | null }> = {};
  for (const [name, envVar, sibling, marker] of specs) {
    try {
      out[name] = { available: true, path: resolvePkgDir(envVar, sibling, marker) };
    } catch {
      out[name] = { available: false, path: null };
    }
  }
  return out;
}
