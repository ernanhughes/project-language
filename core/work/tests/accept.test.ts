import { describe, expect, test } from "../../../harness/bun-test.ts";
import { WorkError } from "../src/engine.ts";
import { miniDeclaration, stubAdapters, tempEngine } from "./helpers.ts";

describe("acceptance (separate from proof)", () => {
  test("all checks exit 0 -> ACCEPTED with reason and proof link", async () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const run = await engine.run(declaration.work_id);
    const acceptance = await engine.accept(declaration.work_id);
    expect(acceptance.outcome).toBe("ACCEPTED");
    expect(acceptance.acceptance_id).toMatch(/^ac_[0-9a-f]{32}$/);
    expect(acceptance.work_version).toBe(1);
    expect(acceptance.run_id).toBe(run.run_id);
    expect(typeof acceptance.proof_id).toBe("string");
    expect(acceptance.reason.length).toBeGreaterThan(0);
    const view = engine.get(declaration.work_id) as { derived_status: string };
    expect(view.derived_status).toBe("ACCEPTED");
  });

  test("failing check -> REJECTED with named failures", async () => {
    const engine = tempEngine();
    const input = miniDeclaration({
      success: {
        obligations: [{ description: "mini exits 0", criterion: { kind: "evidence_field", path: "observation.exit_code", operator: "EQUALS", expected: 0 } }],
        acceptance: { checks: [{ name: "compat-like", command: "node", args: ["-e", "process.exit(1)"] }] },
      },
    });
    const { declaration } = engine.declare(input);
    await engine.run(declaration.work_id);
    const acceptance = await engine.accept(declaration.work_id);
    expect(acceptance.outcome).toBe("REJECTED");
    expect(acceptance.reason).toContain("compat-like");
    const view = engine.get(declaration.work_id) as { derived_status: string };
    expect(view.derived_status).toBe("REJECTED");
  });

  test("COMPLETE proof with REJECTED acceptance: the specification gap, miniature", async () => {
    // Stub proof says COMPLETE (verdict PASS); acceptance re-observes the
    // world and finds the undeclared requirement violated. Both records
    // coexist without contradiction — that coexistence IS the finding.
    const engine = tempEngine(stubAdapters({ verdict: "PASS", proofStatus: "COMPLETE" }));
    const input = miniDeclaration({
      success: {
        obligations: [{ description: "mini exits 0", criterion: { kind: "evidence_field", path: "observation.exit_code", operator: "EQUALS", expected: 0 } }],
        acceptance: { checks: [{ name: "undeclared-intent", command: "node", args: ["-e", "process.exit(1)"] }] },
      },
    });
    const { declaration } = engine.declare(input);
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("AWAITING_ACCEPTANCE");
    const acceptance = await engine.accept(declaration.work_id);
    expect(acceptance.outcome).toBe("REJECTED");
    expect(acceptance.proof_id).not.toBeNull();
  });

  test("acceptance before/without a completed run is premature", async () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    try {
      await engine.accept(declaration.work_id);
      expect.unreachable();
    } catch (error) {
      expect((error as WorkError).code).toBe("WORK_NO_RUNS");
    }
    // Blocked run cannot be accepted either.
    const blocked = miniDeclaration({
      plan: [{ op_id: "q", kind: "ASK_HUMAN", question: "halt" }],
    });
    const { declaration: b } = engine.declare({
      ...blocked,
      plan: [
        ...(blocked["plan"] as unknown[]),
        { op_id: "run", kind: "RUN_COMMAND", command: "node", args: ["-e", "process.exit(0)"] },
        { op_id: "ev", kind: "CAPTURE_EVIDENCE", source_op: "run" },
        { op_id: "vr", kind: "VERIFY", criterion: { kind: "evidence_field", path: "observation.exit_code", operator: "EQUALS", expected: 0 }, evidence: ["ev"] },
        {
          op_id: "pf",
          kind: "BUILD_PROOF",
          obligations: [{ description: "mini exits 0", criterion: { kind: "evidence_field", path: "observation.exit_code", operator: "EQUALS", expected: 0 }, evidence: ["ev"], verification: "vr" }],
        },
      ],
    });
    const run = await engine.run(b.work_id);
    expect(run.state).toBe("BLOCKED");
    try {
      await engine.accept(b.work_id);
      expect.unreachable();
    } catch (error) {
      expect((error as WorkError).code).toBe("ACCEPTANCE_PREMATURE");
    }
  });
});
