import { describe, expect, test } from "../../../harness/bun-test.ts";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkEngine, WorkError } from "../src/engine.ts";
import { EQUALS_ZERO, miniDeclaration, stubAdapters, stubProvider, stubRegistry, tempEngine } from "./helpers.ts";

describe("plan execution", () => {
  test("CALL_MODEL forwards generic constraints and materializes a bounded response artifact", async () => {
    const project = mkdtempSync(join(tmpdir(), "wk-model-output-")); const seen: unknown[] = []
    const provider = { async callModel(input: unknown) { seen.push(input); return { text: "response" } } }
    const engine = new WorkEngine(project, { store_dir: mkdtempSync(join(tmpdir(), "wk-model-store-")) }, stubRegistry(undefined, undefined, undefined, "fixture-0", provider), { modelProvider: provider })
    const input = miniDeclaration({ plan: [
      { op_id: "ask", kind: "CALL_MODEL", prompt: "respond", model: "muse_go", data_policy: "private", max_output_tokens: 321, session_id: "writer-session", output_path: ".writer/response.txt" },
      { op_id: "run", kind: "RUN_COMMAND", command: "node", args: ["-e", "process.exit(0)"] },
      { op_id: "ev", kind: "CAPTURE_EVIDENCE", source_op: "run" },
      { op_id: "vr", kind: "VERIFY", criterion: EQUALS_ZERO, evidence: ["ev"] },
      { op_id: "pf", kind: "BUILD_PROOF", obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO, evidence: ["ev"], verification: "vr" }] },
    ] })
    const { declaration } = engine.declare(input); await engine.run(declaration.work_id)
    expect(seen[0]).toEqual({ prompt: "respond", model: "muse_go", data_policy: "private", max_output_tokens: 321, session_id: "writer-session" })
    expect(readFileSync(join(project, ".writer", "response.txt"), "utf8")).toBe("response")
  })
  test("full chain threads artifacts to AWAITING_ACCEPTANCE", async () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("AWAITING_ACCEPTANCE");
    expect(run.ops.map((o) => `${o.op_id}:${o.status}`).join(",")).toBe("run:ok,ev:ok,vr:ok,pf:ok");
    const kinds = run.ops.map((o) => (o.output as Record<string, unknown>)["evidence_id"] ?? (o.output as Record<string, unknown>)["verification_id"] ?? (o.output as Record<string, unknown>)["proof_id"] ?? (o.output as Record<string, unknown>)["exit_code"]);
    expect(kinds[0]).toBe(0);
    expect(typeof kinds[1]).toBe("string");
    expect(typeof kinds[2]).toBe("string");
    expect(typeof kinds[3]).toBe("string");
  });

  test("nonzero exit is an observation, not an op failure", async () => {
    const engine = tempEngine(stubAdapters({ verdict: "FAIL" }));
    const input = miniDeclaration({
      plan: [
        { op_id: "run", kind: "RUN_COMMAND", command: "node", args: ["-e", "process.exit(3)"] },
        { op_id: "ev", kind: "CAPTURE_EVIDENCE", source_op: "run" },
        { op_id: "vr", kind: "VERIFY", criterion: EQUALS_ZERO, evidence: ["ev"] },
        {
          op_id: "pf",
          kind: "BUILD_PROOF",
          obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO, evidence: ["ev"], verification: "vr" }],
        },
      ],
    });
    const { declaration } = engine.declare(input);
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("AWAITING_ACCEPTANCE");
    expect((run.ops[0]?.output as Record<string, unknown>)["exit_code"]).toBe(3);
  });

  test("unspawnable command blocks the run with COMMAND_SPAWN_FAILED", async () => {
    const engine = tempEngine();
    const input = miniDeclaration({
      plan: [{ op_id: "run", kind: "RUN_COMMAND", command: "definitely-not-a-real-binary-xyz" }],
      success: {
        obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO }],
        acceptance: { checks: [{ name: "x", command: "true" }] },
      },
    });
    // Plan without BUILD_PROOF fails coverage first; give it coverage via a proof op.
    const covered = {
      ...input,
      plan: [
        ...(input["plan"] as unknown[]),
        { op_id: "ev", kind: "CAPTURE_EVIDENCE", source_op: "run" },
        { op_id: "vr", kind: "VERIFY", criterion: EQUALS_ZERO, evidence: ["ev"] },
        {
          op_id: "pf",
          kind: "BUILD_PROOF",
          obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO, evidence: ["ev"], verification: "vr" }],
        },
      ],
    };
    const { declaration } = engine.declare(covered);
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    expect(run.ops[0]?.status).toBe("error");
    expect(run.ops[0]?.error_code).toBe("COMMAND_SPAWN_FAILED");
    expect(run.ops).toHaveLength(1);
  });

  test("model output is structurally rejected as evidence", async () => {
    const engine = tempEngine(stubAdapters(), { modelProvider: stubProvider() });
    const input = miniDeclaration({
      plan: [
        { op_id: "ask", kind: "CALL_MODEL", prompt: "What is the exit code?" },
        { op_id: "vr", kind: "VERIFY", criterion: EQUALS_ZERO, evidence: ["ask"] },
        {
          op_id: "pf",
          kind: "BUILD_PROOF",
          obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO, evidence: ["ask"], verification: "vr" }],
        },
      ],
    });
    const { declaration } = engine.declare(input);
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    const vrOp = run.ops.find((o) => o.op_id === "vr");
    expect(vrOp?.status).toBe("error");
    expect(vrOp?.error_code).toBe("MODEL_OUTPUT_NOT_EVIDENCE");
  });

  test("CALL_MODEL without a provider blocks with an explicit question", async () => {
    const engine = tempEngine();
    const input = miniDeclaration({
      plan: [{ op_id: "ask", kind: "CALL_MODEL", prompt: "Decide something." }],
      success: {
        obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO }],
        acceptance: { checks: [{ name: "x", command: "true" }] },
      },
    });
    const covered = {
      ...input,
      plan: [
        ...(input["plan"] as unknown[]),
        { op_id: "run", kind: "RUN_COMMAND", command: "node", args: ["-e", "process.exit(0)"] },
        { op_id: "ev", kind: "CAPTURE_EVIDENCE", source_op: "run" },
        { op_id: "vr", kind: "VERIFY", criterion: EQUALS_ZERO, evidence: ["ev"] },
        {
          op_id: "pf",
          kind: "BUILD_PROOF",
          obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO, evidence: ["ev"], verification: "vr" }],
        },
      ],
    };
    const { declaration } = engine.declare(covered);
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    expect(run.unresolved).toHaveLength(1);
    expect(run.unresolved[0]?.question).toContain("Model required");
    expect(run.unresolved[0]?.raised_by_op).toBe("ask");
  });

  test("REQUEST_AUTHORITY records the request and blocks (stub, no granter)", async () => {
    const engine = tempEngine();
    const base = miniDeclaration();
    const input = {
      ...base,
      plan: [
        { op_id: "auth", kind: "REQUEST_AUTHORITY", scope: "deploy", reason: "would need it" },
        ...(base["plan"] as unknown[]),
      ],
    };
    const { declaration } = engine.declare(input);
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    expect(run.unresolved[0]?.question).toContain("Authority requested");
  });

  test("ASK_HUMAN blocks with the question recorded", async () => {
    const engine = tempEngine();
    const base = miniDeclaration();
    const input = {
      ...base,
      plan: [{ op_id: "q", kind: "ASK_HUMAN", question: "Which cache format?" }, ...(base["plan"] as unknown[])],
    };
    const { declaration } = engine.declare(input);
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    expect(run.unresolved[0]?.question).toBe("Which cache format?");
  });

  test("run records persist and latest-run resolution works", async () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const run = await engine.run(declaration.work_id);
    expect(engine.store.getRun(declaration.work_id, run.run_id).state).toBe("AWAITING_ACCEPTANCE");
    try {
      engine.store.getRun(declaration.work_id, `wr_${"f".repeat(32)}`);
      expect.unreachable();
    } catch (error) {
      expect(String(error)).toContain("WORK_RUN_NOT_FOUND");
    }
    void WorkError;
  });
});
