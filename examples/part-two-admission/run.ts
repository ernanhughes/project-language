// Unit II-02 executable observation. Pi-specific code stays in host-pi.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digest, STRATEGIES, BASE_COMMIT } from "../../core/admission/src/index.ts";
import { SOURCES, TASK, ORACLE } from "../../core/admission/fixtures/retry-context.ts";
import { runAdmissionCondition } from "../../host-pi/admission-harness.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--output")) throw new Error("Usage: npm run example:admission -- [--output NEW_DIRECTORY]");
const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
const output = args[1] ? resolve(args[1]) : resolve(root, "experiments/context-admission-v1/results", runId);
if (existsSync(output)) throw new Error("Evidence directory already exists; choose a new path.");
mkdirSync(dirname(output), { recursive: true }); mkdirSync(output);
const json = (name: string, value: unknown) => writeFileSync(resolve(output, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const git = (...a: string[]) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();
const fingerprintFiles = ["package.json", "package-lock.json", "harness/session.ts",
  "core/admission/src/index.ts", "core/admission/fixtures/retry-context.ts", "core/admission/tests/admission.test.ts",
  "host-pi/admission.ts", "host-pi/admission-harness.ts", "host-pi/admission.test.ts",
  "examples/part-two-admission/run.ts", "experiments/context-admission-v1/PROTOCOL.md", "experiments/context-admission-v1/manifest.json",
  ...git("ls-files", "core/compiler", "core/relate/src/engine/compatibility.ts").split(/\r?\n/).filter(Boolean)];
// Platform-independent: line endings are normalised to LF before hashing, so a CRLF checkout and an LF checkout agree.
const canonicalDigest = (text: string) => digest(text.split("\r\n").join("\n"));
const fingerprints = Object.fromEntries([...new Set(fingerprintFiles)].map(path => [path, canonicalDigest(readFileSync(resolve(root, path), "utf8"))]));
const versions = Object.fromEntries(["pi-ai", "pi-agent-core", "pi-coding-agent"].map(name => [name,
  JSON.parse(readFileSync(resolve(root, "node_modules/@earendil-works", name, "package.json"), "utf8")).version]));
for (const version of Object.values(versions)) assert.equal(version, "1.0.4");
json("provenance.json", { runId, fingerprintHashing: "sha256 of UTF-8 text with CRLF normalised to LF", recordedAt: new Date().toISOString(), command: "npm run example:admission",
  projectLanguageBase: BASE_COMMIT, actualHead: git("rev-parse", "HEAD"), languagePlanningBase: "3de3aea",
  workingTreeAtStart: git("status", "--short"), node: process.version, platform: process.platform, versions, fingerprints,
  provider: "faux", boundary: "normalized transcript at faux provider callback (not remote HTTP)",
  realModelEvaluation: false, fixtureSha256: digest(JSON.stringify({ task: TASK, sources: SOURCES })),
  oracleRole: "evaluator only; reader and provider are not passed ORACLE" });
json("inputs.json", { task: TASK, sources: SOURCES, evaluatorOracle: ORACLE });
const runs: Awaited<ReturnType<typeof runAdmissionCondition>>[] = [];
try {
  for (const strategy of STRATEGIES) {
    const r = await runAdmissionCondition(TASK, SOURCES, strategy, ORACLE.value); runs.push(r);
    assert.equal(r.evaluation.delivery.confirmed, true);
    if (strategy === "constrained") {
      const d = r.evaluation.dimensions;
      assert.deepEqual(d.permissionViolations, []); assert.deepEqual(d.currentnessViolations, []);
      assert.deepEqual(d.scopeOrSchemaViolations, []); assert.equal(d.provenanceCovered, true);
      assert.equal(d.admissionReasonsCovered, true); assert.equal(d.budgetFits, true);
      assert.equal(d.taskCorrect, true); assert.equal(r.plan.failure, null);
    }
  }
  assert.equal(runs[0]!.evaluation.dimensions.abstained, true);
  assert.equal(runs[1]!.evaluation.dimensions.taskCorrect, false);
  const forged = await runAdmissionCondition(TASK, SOURCES, "constrained", ORACLE.value, { request: {
    ids: SOURCES.map(s => s.id), principal: "another-reader", grants: ["allow-all"], standing: "declared",
    validUntil: null, maxBytes: 999999, maxEstimatedTokens: 999999,
  } }); runs.push(forged);
  assert.deepEqual(forged.evaluation.delivery.deliveredIds, ["current"]);
  const missing = await runAdmissionCondition(TASK, SOURCES, "constrained", ORACLE.value,
    { request: { ids: SOURCES.slice(1).map(s => s.id) } }); runs.push(missing);
  assert.deepEqual(missing.response, { outcome: "abstain", reason: "NO_FACT" });
  const tight = await runAdmissionCondition({ ...TASK, maxBytes: 0 }, SOURCES, "constrained", ORACLE.value); runs.push(tight);
  assert.equal(tight.plan.failure, "ASSEMBLED_BUDGET_EXCEEDED");
  assert.deepEqual(tight.response, { outcome: "abstain", reason: "NO_FACT" });
  const labels = [...STRATEGIES, "forged_authority", "needed_source_not_requested", "zero_byte_budget"];
  json("provider-requests.json", runs.map((r, i) => ({ condition: labels[i], requests: r.providerRequests, toolResults: r.toolResults, response: r.response })));
  json("report.json", { status: "passed", unit: "II-02", runId, conditions: runs.map((r, i) => ({ condition: labels[i],
    request: r.request, plan: r.plan, evaluation: r.evaluation })),
    limits: ["typed synthetic lookup", "host declarations trusted", "managed block budget only; tokens estimated", "faux provider; real-model use and benefit unobserved"] });
  for (const [i, r] of runs.entries()) console.log(JSON.stringify({ condition: labels[i], delivered: r.evaluation.delivery.deliveredIds,
    answer: r.response, bytes: r.plan.bytes, estimatedTokens: r.plan.estimatedTokens, budgetFits: r.plan.budgetFits,
    permissionViolations: r.evaluation.dimensions.permissionViolations, currentnessViolations: r.evaluation.dimensions.currentnessViolations }));
  console.log(`Evidence: ${output}`);
} catch (error) {
  json("failure.json", { status: "failed", error: String(error), completedRuns: runs });
  throw error;
}
