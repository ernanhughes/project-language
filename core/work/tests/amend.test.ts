import { describe, expect, test } from "../../../harness/bun-test.ts";
import { readFileSync } from "node:fs";
import { WorkError } from "../src/engine.ts";
import { EQUALS_ZERO, miniDeclaration, tempEngine } from "./helpers.ts";

describe("amendments", () => {
  test("amendment bumps version, appends obligations, preserves v1 bytes", () => {
    const engine = tempEngine();
    const { declaration: v1 } = engine.declare(miniDeclaration());
    const v1Path = engine.store.declarationPath(v1.work_id, 1);
    const v1Bytes = readFileSync(v1Path, "utf8");
    const newCriterion = { kind: "evidence_field", path: "observation.compat", operator: "EQUALS", expected: true };
    const base = miniDeclaration();
    const { declaration: v2, amendment } = engine.amend(v1.work_id, {
      reason: "Coverage check discovered an undeclared compat requirement.",
      add_obligations: [{ description: "compat holds", criterion: newCriterion }],
      add_acceptance_checks: [{ name: "compat", command: "node", args: ["-e", "process.exit(0)"] }],
      plan: [
        ...(base["plan"] as unknown[]),
        {
          op_id: "pf2",
          kind: "BUILD_PROOF",
          obligations: [{ description: "compat holds", criterion: newCriterion, evidence: ["ev"], verification: "vr" }],
        },
      ],
    });
    expect(v2.work_version).toBe(2);
    expect(v2.success.obligations).toHaveLength(2);
    expect(v2.success.acceptance.checks).toHaveLength(2);
    expect(v2.provenance.amendments).toHaveLength(1);
    expect(amendment.amendment_id).toMatch(/^wa_[0-9a-f]{32}$/);
    expect(amendment.from_version).toBe(1);
    expect(amendment.to_version).toBe(2);
    // v1 file untouched by the amendment.
    expect(readFileSync(v1Path, "utf8")).toBe(v1Bytes);
    expect(engine.store.getDeclaration(v1.work_id, 1).work_version).toBe(1);
  });

  test("amendment requires a reason and a real change", () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    for (const bad of [
      () => engine.amend(declaration.work_id, { reason: "" }),
      () => engine.amend(declaration.work_id, { reason: "no change" }),
      () => engine.amend(`wk_${"0".repeat(32)}`, { reason: "ghost", add_obligations: [] }),
    ]) {
      try {
        bad();
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(WorkError);
      }
    }
  });

  test("amendment with new obligations must also declare pursuit (plan coverage)", () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const newCriterion = { kind: "evidence_field", path: "observation.other", operator: "EXISTS" };
    try {
      engine.amend(declaration.work_id, {
        reason: "new obligation without a plan to pursue it",
        add_obligations: [{ description: "other", criterion: newCriterion }],
      });
      expect.unreachable();
    } catch (error) {
      expect((error as WorkError).code).toBe("PLAN_COVERS_SUCCESS");
    }
    // With a replaced plan that covers it, the amendment succeeds.
    const base = miniDeclaration();
    const amended = engine.amend(declaration.work_id, {
      reason: "new obligation with explicit pursuit",
      add_obligations: [{ description: "other", criterion: newCriterion }],
      plan: [
        ...(base["plan"] as unknown[]),
        {
          op_id: "pf2",
          kind: "BUILD_PROOF",
          obligations: [{ description: "other", criterion: newCriterion, evidence: ["ev"], verification: "vr" }],
        },
      ],
    });
    expect(amended.declaration.work_version).toBe(2);
    expect(EQUALS_ZERO).toBeDefined();
  });

  test("amendment may widen the claim with a reason (versioned meaning change)", () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const amended = engine.amend(declaration.work_id, {
      reason: "spec widened to include compatibility",
      claim: { statement: "Build gate plus compat is satisfied.", subject: "build-gate" },
    });
    expect(amended.declaration.work_version).toBe(2);
    expect(amended.declaration.claim.statement).toBe("Build gate plus compat is satisfied.");
    expect(amended.amendment.claim?.statement).toBe("Build gate plus compat is satisfied.");
    // Runs of v2 verify under the new claim text.
    expect(engine.latestDeclaration(declaration.work_id).claim.statement).toContain("compat");
  });

  test("sequential amendments chain versions; latest() follows", () => {    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    engine.amend(declaration.work_id, { reason: "first", add_acceptance_checks: [{ name: "x", command: "true" }] });
    const third = engine.amend(declaration.work_id, { reason: "second", add_acceptance_checks: [{ name: "y", command: "true" }] });
    expect(third.declaration.work_version).toBe(3);
    expect(engine.latestDeclaration(declaration.work_id).work_version).toBe(3);
  });
});
