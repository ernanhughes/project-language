/**
 * Subprocess adapter: runs the real opencode-expertise CLI over a configured
 * corpus and normalizes its JSON brief into the Work knowledge shape.
 *
 * Transport (deliberately boring):
 * - argv array via execFileSync — never shell interpolation, never shell:true;
 * - `python -m opencode_expertise.cli <query> --config <cfg> --json [--max-findings N]`;
 * - PYTHONPATH pointed at the checkout's src (explicit; no venv dependence);
 * - explicit timeout; stdout must be a single JSON brief object.
 *
 * Nothing is copied or reimplemented: ranking, extraction, and source
 * semantics stay inside opencode-expertise. This module only resolves
 * configuration, invokes, parses, validates, and normalizes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { UpstreamError } from "./adapters.ts";
import type { ExpertiseAdapter, ExpertiseBrief } from "./expertise.ts";

export const DEFAULT_EXPERTISE_TIMEOUT_MS = 60_000;
export const EXPERTISE_CLI_MODULE = "opencode_expertise.cli";

export type SubprocessExpertiseConfig = {
  repoDir: string;
  configPath: string;
  pythonPath: string;
  timeoutMs: number;
  version: string;
};

function readPackageVersion(repoDir: string): string {
  try {
    const text = readFileSync(join(repoDir, "pyproject.toml"), "utf8");
    const match = text.match(/^version\s*=\s*"([^"]+)"\s*$/m);
    if (match) return match[1] as string;
  } catch {
    // fall through
  }
  return "0.0.0-unknown";
}

/**
 * Resolve runtime configuration deterministically. Missing pieces fail as
 * coded UpstreamErrors (mapped by the engine to BLOCKED vs error paths).
 * Nothing is spawned here — availability probing stays side-effect free.
 */
export function resolveExpertiseRuntime(projectDir: string): SubprocessExpertiseConfig {
  const repoDir =
    process.env["OPENCODE_EXPERTISE_REPO"] && process.env["OPENCODE_EXPERTISE_REPO"].length > 0
      ? resolve(process.env["OPENCODE_EXPERTISE_REPO"])
      : resolve(join(process.cwd(), "..", "opencode-expertise"));
  if (!existsSync(join(repoDir, "src", "opencode_expertise", "__init__.py"))) {
    throw new UpstreamError(
      "UPSTREAM_NOT_AVAILABLE",
      `opencode-expertise checkout not found at ${repoDir} (set OPENCODE_EXPERTISE_REPO)`,
    );
  }
  const envConfig = process.env["OPENCODE_EXPERTISE_CONFIG"];
  const configPath =
    envConfig && envConfig.length > 0 ? resolve(envConfig) : resolve(join(projectDir, ".opencode", "expertise.json"));
  if (!existsSync(configPath)) {
    throw new UpstreamError(
      "EXPERTISE_CONFIG_MISSING",
      `no expertise configuration at ${configPath} (set OPENCODE_EXPERTISE_CONFIG or add .opencode/expertise.json)`,
    );
  }
  let configParses = false;
  try {
    JSON.parse(readFileSync(configPath, "utf8"));
    configParses = true;
  } catch {
    configParses = false;
  }
  if (!configParses) {
    throw new UpstreamError("EXPERTISE_CONFIG_INVALID", `expertise configuration at ${configPath} is not valid JSON`);
  }
  const pythonPath =
    process.env["OPENCODE_EXPERTISE_PYTHON"] && process.env["OPENCODE_EXPERTISE_PYTHON"].length > 0
      ? process.env["OPENCODE_EXPERTISE_PYTHON"]
      : "python";
  const timeoutRaw = process.env["OPENCODE_EXPERTISE_TIMEOUT_MS"];
  const timeoutParsed = timeoutRaw !== undefined ? Number.parseInt(timeoutRaw, 10) : Number.NaN;
  const timeoutMs =
    Number.isInteger(timeoutParsed) && (timeoutParsed as number) > 0 ? (timeoutParsed as number) : DEFAULT_EXPERTISE_TIMEOUT_MS;
  return { repoDir, configPath, pythonPath, timeoutMs, version: readPackageVersion(repoDir) };
}

function probePython(pythonPath: string): void {
  try {
    execFileSync(pythonPath, ["--version"], { encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const e = error as { code?: unknown };
    throw new UpstreamError(
      "UPSTREAM_NOT_AVAILABLE",
      `python executable "${pythonPath}" unavailable (${String(e.code ?? e).slice(0, 120)}); set OPENCODE_EXPERTISE_PYTHON`,
    );
  }
}

export type RawFinding = {
  text?: unknown;
  references?: Array<{
    source_id?: unknown;
    locator?: unknown;
    title?: unknown;
    start_line?: unknown;
    end_line?: unknown;
    revision?: unknown;
  }>;
  score?: unknown;
  evidence_status?: unknown;
  kind?: unknown;
  caveat?: unknown;
};

export type RawBrief = {
  task?: unknown;
  domains?: unknown;
  findings?: RawFinding[];
  contradictions?: unknown;
  open_questions?: unknown;
  searched_sources?: unknown;
  query_terms?: unknown;
};

/** Parse + shape-check raw CLI JSON. Pure function, unit-tested directly. */
export function parseBriefJson(stdout: string): RawBrief {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new UpstreamError("EXPERTISE_BAD_OUTPUT", "expertise CLI did not emit valid JSON on stdout");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new UpstreamError("EXPERTISE_BAD_OUTPUT", "expertise CLI JSON must be a brief object");
  }
  const brief = parsed as RawBrief;
  if (!Array.isArray(brief.findings)) {
    throw new UpstreamError("EXPERTISE_BAD_OUTPUT", "expertise brief JSON must carry a findings array");
  }
  for (let i = 0; i < brief.findings.length; i++) {
    const f: RawFinding | undefined = brief.findings[i];
    if (typeof f !== "object" || f === null || typeof f.text !== "string") {
      throw new UpstreamError("EXPERTISE_BAD_OUTPUT", `brief.findings[${i}] must carry text`);
    }
  }
  return brief;
}

function briefIdFor(query: string, top_k: number | undefined, findings: RawBrief["findings"]): string {
  const hash = createHash("sha256");
  hash.update(canonicalBriefInput(query, top_k, findings));
  return `xb_${hash.digest("hex").slice(0, 32)}`;
}

function canonicalBriefInput(query: string, top_k: number | undefined, findings: RawBrief["findings"]): string {
  return JSON.stringify({
    query,
    top_k: top_k ?? null,
    findings: (findings ?? []).map((f) => ({
      text: f?.text ?? "",
      refs: (f?.references ?? []).map((r) => `${r?.source_id ?? ""}:${r?.locator ?? ""}`),
    })),
  });
}

/** Normalize a raw CLI brief into the Work ExpertiseBrief shape (provenance preserved). */
export function normalizeBrief(raw: RawBrief, input: { query: string; version: string }): ExpertiseBrief {
  const findings = (raw.findings ?? []).map((f, i) => {
    const refs = Array.isArray(f.references) ? f.references : [];
    const first = refs[0] as Record<string, unknown> | undefined;
    const compact =
      first && typeof first["source_id"] === "string" && typeof first["locator"] === "string"
        ? `${first["source_id"]}:${first["locator"]}`
        : undefined;
    const title =
      first && typeof first["title"] === "string" && (first["title"] as string).length > 0
        ? (first["title"] as string)
        : typeof first?.["locator"] === "string"
          ? (first?.["locator"] as string)
          : "untitled";
    return {
      finding_id: `F${i + 1}`,
      ...(compact !== undefined ? { note_id: compact } : {}),
      title,
      excerpt: (f.text as string) ?? "",
      ...(typeof f.score === "number" ? { score: f.score } : {}),
      references: refs.map((r) => ({
        source_id: String(r.source_id ?? ""),
        locator: String(r.locator ?? ""),
        ...(r.title !== undefined && r.title !== null ? { title: String(r.title) } : {}),
        ...(typeof r.start_line === "number" ? { start_line: r.start_line } : {}),
        ...(typeof r.end_line === "number" ? { end_line: r.end_line } : {}),
        ...(typeof r.revision === "string" ? { revision: r.revision } : {}),
      })),
      ...(typeof f.evidence_status === "string" ? { evidence_status: f.evidence_status } : {}),
      ...(typeof f.kind === "string" ? { kind: f.kind } : {}),
      ...(f.caveat !== undefined && f.caveat !== null ? { caveat: String(f.caveat) } : {}),
    };
  });
  const asArray = (v: unknown): string[] | undefined =>
    Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : undefined;
  return {
    brief_id: briefIdFor(input.query, undefined, raw.findings),
    capability: "expertise",
    version: input.version,
    query: input.query,
    findings,
    retrieved_at: new Date().toISOString(),
    ...(() => {
      const searched = asArray(raw.searched_sources);
      const terms = asArray(raw.query_terms);
      const domains = asArray(raw.domains);
      if (searched === undefined && terms === undefined && domains === undefined) return {};
      return {
        provenance: {
          ...(searched !== undefined ? { searched_sources: searched } : {}),
          ...(terms !== undefined ? { query_terms: terms } : {}),
          ...(domains !== undefined ? { domains } : {}),
        },
      };
    })(),
  };
}

export function subprocessExpertiseAdapter(config: SubprocessExpertiseConfig): ExpertiseAdapter {
  return {
    async search(input: { query: string; top_k?: number }) {
      if (typeof input.query !== "string" || input.query.length === 0) {
        throw new UpstreamError("EXPERTISE_BAD_QUERY", "search query must be a non-empty string");
      }
      probePython(config.pythonPath);
      const args = [
        "-m",
        EXPERTISE_CLI_MODULE,
        input.query,
        "--config",
        config.configPath,
        "--json",
        ...(input.top_k !== undefined ? ["--max-findings", String(input.top_k)] : []),
      ];
      let stdout: string;
      try {
        stdout = execFileSync(config.pythonPath, args, {
          encoding: "utf8",
          timeout: config.timeoutMs,
          maxBuffer: 8 * 1024 * 1024,
          cwd: config.repoDir,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            PYTHONPATH:
              join(config.repoDir, "src") +
              (process.env["PYTHONPATH"] ? `${delimiter}${process.env["PYTHONPATH"]}` : ""),
          },
        });
      } catch (error) {
        const e = error as {
          code?: unknown;
          message?: string;
          status?: unknown;
          stderr?: unknown;
        };
        if (e.code === "ETIMEDOUT" || (typeof e.message === "string" && e.message.includes("timed out"))) {
          throw new UpstreamError("EXPERTISE_TIMEOUT", `expertise search exceeded ${config.timeoutMs}ms`);
        }
        if (e.code === "ENOENT") {
          throw new UpstreamError(
            "UPSTREAM_NOT_AVAILABLE",
            `python executable "${config.pythonPath}" vanished at invoke time; set OPENCODE_EXPERTISE_PYTHON`,
          );
        }
        throw new UpstreamError(
          "EXPERTISE_FAILED",
          `expertise search exited ${String(e.status ?? e.code ?? "?")}: ${String(e.stderr ?? e.message ?? e).slice(0, 300)}`,
        );
      }
      const raw = parseBriefJson(String(stdout));
      return { brief: normalizeBrief(raw, { query: input.query, version: config.version }) };
    },
  };
}
