import { describe, expect, test } from "../../../harness/bun-test.ts";
import { WorkError } from "../src/engine.ts";
import { EQUALS_ZERO, miniDeclaration, tempEngine } from "./helpers.ts";

describe("declaration", () => {
  test("valid declaration persists with derived id and hash", () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    expect(declaration.work_id).toMatch(/^wk_[0-9a-f]{32}$/);
    expect(declaration.work_version).toBe(1);
    expect(declaration.state).toBe("DECLARED");
    expect(declaration.content_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(engine.store.getDeclaration(declaration.work_id, 1)).toEqual(declaration);
  });

  test("invalid declarations fail closed", () => {
    const engine = tempEngine();
    const bad = [
      miniDeclaration({ objective: { statement: "" } }),
      miniDeclaration({ objective: { statement: "x", source: "oracle" } }),
      miniDeclaration({ claim: {} }),
      miniDeclaration({ success: { obligations: [], acceptance: { checks: [{ name: "a", command: "true" }] } } }),
      miniDeclaration({ success: { obligations: [{ description: "d", criterion: EQUALS_ZERO }], acceptance: { checks: [] } } }),
      miniDeclaration({ plan: [] }),
      miniDeclaration({ authority: {} }),
    ];
    for (const input of bad) {
      try {
        engine.declare(input);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(WorkError);
      }
    }
  });

  test("keeps semantic objectives bounded", () => {
    const engine = tempEngine();
    expect(() => engine.declare(miniDeclaration({
      objective: { statement: "metadata context ".repeat(300), source: "system" },
      claim: { statement: "metadata context", subject: "writer" },
    }))).toThrow();
  });

  test("plan must cover every success obligation", () => {
    const engine = tempEngine();
    const uncovered = miniDeclaration({
      success: {
        obligations: [
          { description: "mini exits 0", criterion: EQUALS_ZERO },
          { description: "something else", criterion: { kind: "evidence_field", path: "a", operator: "EXISTS" } },
        ],
        acceptance: { checks: [{ name: "mini", command: "node", args: ["-e", "process.exit(0)"] }] },
      },
    });
    try {
      engine.declare(uncovered);
      expect.unreachable();
    } catch (error) {
      expect((error as WorkError).code).toBe("PLAN_COVERS_SUCCESS");
    }
  });

  test("plan references must point backwards", () => {
    const engine = tempEngine();
    const base = miniDeclaration();
    const forward = {
      ...base,
      plan: [
        { op_id: "ev", kind: "CAPTURE_EVIDENCE", source_op: "run" },
        { op_id: "run", kind: "RUN_COMMAND", command: "node", args: ["-e", "process.exit(0)"] },
      ],
    };
    try {
      engine.declare(forward);
      expect.unreachable();
    } catch (error) {
      expect((error as WorkError).code).toBe("INVALID_PLAN");
    }
  });
});
