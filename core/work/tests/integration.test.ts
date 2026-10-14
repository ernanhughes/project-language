import { describe, expect, test } from "../../../harness/bun-test.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  localEvidenceAdapter,
  localPackageVersion,
  localProofAdapter,
  localVerifyAdapter,
} from "../src/adapters.ts";
import { CapabilityRegistry } from "../src/capabilities.ts";
import { WorkEngine } from "../src/engine.ts";
import { unavailableExpertise } from "../src/expertise.ts";
import { EQUALS_ZERO } from "./helpers.ts";

function realRegistry(): CapabilityRegistry {
  const registry = new CapabilityRegistry();
  const evidence = localEvidenceAdapter();
  const verify = localVerifyAdapter();
  const proof = localProofAdapter();
  registry.register({
    id: "evidence",
    version: localPackageVersion(evidence.pkg),
    operations: ["CAPTURE_EVIDENCE"],
    available: true,
    handle: evidence,
  });
  registry.register({
    id: "verify",
    version: localPackageVersion(verify.pkg),
    operations: ["VERIFY"],
    available: true,
    handle: verify,
  });
  registry.register({
    id: "proof",
    version: localPackageVersion(proof.pkg),
    operations: ["BUILD_PROOF"],
    available: true,
    handle: proof,
  });
  registry.register(unavailableExpertise());
  registry.register({
    id: "model",
    version: "provider",
    operations: ["CALL_MODEL"],
    available: false,
    unavailableReason: "no model provider injected (integration test default)",
    handle: null,
  });
  return registry;
}

/**
 * Full chain through REAL upstream adapters (siblings adjacent in this
 * environment): node exit 0 -> evidence -> PASS receipt -> COMPLETE proof ->
 * ACCEPTED. This is the runtime's core promise; stub tests cover mechanics.
 */
describe("real-adapter integration", () => {
  test("declare -> run -> accept end-to-end with zero model involvement", async () => {
    const engine = new WorkEngine(
      mkdtempSync(join(tmpdir(), "wk-i-proj-")),
      { store_dir: mkdtempSync(join(tmpdir(), "wk-i-store-")) },
      realRegistry(),
    );
    const { declaration } = engine.declare({
      objective: { statement: "Integration: exit-zero verifies.", source: "system" },
      claim: { statement: "The integration command exited 0.", subject: "integration" },
      success: {
        obligations: [{ description: "integration exits 0", criterion: EQUALS_ZERO }],
        acceptance: { checks: [{ name: "integration", command: "node", args: ["-e", "process.exit(0)"] }] },
      },
      plan: [
        { op_id: "run", kind: "RUN_COMMAND", command: "node", args: ["-e", "process.exit(0)"], subject: "integration" },
        { op_id: "ev", kind: "CAPTURE_EVIDENCE", source_op: "run" },
        { op_id: "vr", kind: "VERIFY", criterion: EQUALS_ZERO, evidence: ["ev"] },
        {
          op_id: "pf",
          kind: "BUILD_PROOF",
          obligations: [{ description: "integration exits 0", criterion: EQUALS_ZERO, evidence: ["ev"], verification: "vr" }],
        },
      ],
      authority: { scope: "integration test only" },
    });
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("AWAITING_ACCEPTANCE");
    const proofOp = run.ops.find((o) => o.op_id === "pf");
    expect((proofOp?.output as Record<string, unknown>)["status"]).toBe("COMPLETE");
    const verdictOp = run.ops.find((o) => o.op_id === "vr");
    expect((verdictOp?.output as Record<string, unknown>)["verdict"]).toBe("PASS");
    const acceptance = await engine.accept(declaration.work_id);
    expect(acceptance.outcome).toBe("ACCEPTED");
    expect((engine.get(declaration.work_id) as { derived_status: string }).derived_status).toBe("ACCEPTED");
  });

  test("real adapters reject tampered bytes (no silent pass-through)", async () => {
    const engine = new WorkEngine(
      mkdtempSync(join(tmpdir(), "wk-i2-proj-")),
      { store_dir: mkdtempSync(join(tmpdir(), "wk-i2-store-")) },
      realRegistry(),
    );
    // Direct adapter check with a forged record must throw, not verify.
    const forged = {
      schema: "opencode.evidence.v1",
      evidence_id: `ev_${"1".repeat(32)}`,
      kind: "command_result",
      observation: { command: "x", exit_code: 0 },
      source: { kind: "process" },
      observed_at: new Date().toISOString(),
      content_hash: "2".repeat(64),
      producer: { plugin: "opencode-evidence", version: "0.1.0" },
    };
    let threw = false;
    try {
      const verify = engine.capabilities.require<{
        check(i: unknown, ctx: unknown): Promise<unknown>;
      }>("verify");
      await verify.check({
        claim: { statement: "x" },
        criterion: EQUALS_ZERO,
        evidence: [forged],
      }, { projectDir: engine.projectDir, storeDir: mkdtempSync(join(tmpdir(), "wk-i2-vr-")) });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
