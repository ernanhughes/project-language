import { describe, expect, test } from "../../../harness/bun-test.ts";
import { CapabilityRegistry } from "../src/capabilities.ts";
import { EQUALS_ZERO, fixtureExpertise, miniDeclaration, stubAdapters, stubProvider, tempEngine } from "./helpers.ts";

/** A second fixture source under a different capability id (multi-source works). */
const NOTES_A = [
  { note_id: "E7", title: "Persisted-format changes need compatibility review", excerpt: "Existing persisted data must remain readable after a format change." },
  { note_id: "N1", title: "Structured logging", excerpt: "Prefer structured logging with correlation IDs." },
];

describe("expertise boundary: knowledge is not decision", () => {
  test("unconfigured expertise blocks loudly; Work stays v1 with zero amendments", async () => {
    const engine = tempEngine();
    const base = miniDeclaration();
    const { declaration } = engine.declare({
      ...base,
      plan: [
        { op_id: "q", kind: "SEARCH_EXPERTISE", query: "persisted cache compatibility" },
        ...(base["plan"] as unknown[]),
      ],
    });
    const before = JSON.stringify(engine.store.getDeclaration(declaration.work_id, 1));
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    expect(run.ops[0]?.status).toBe("blocked");
    expect(run.ops[0]?.error_code).toBe("RUN_BLOCKED");
    expect(run.unresolved).toHaveLength(1);
    expect(run.unresolved[0]?.question).toContain("expertise");
    expect(run.unresolved[0]?.raised_by_op).toBe("q");
    // Nothing mutated: still v1, no amendments, same bytes.
    const view = engine.get(declaration.work_id) as { versions: number };
    expect(view.versions).toBe(1);
    expect(JSON.stringify(engine.store.getDeclaration(declaration.work_id, 1))).toBe(before);
  });

  test("unknown capability id is a configuration error, not a block", async () => {
    const engine = tempEngine();
    const base = miniDeclaration();
    const { declaration } = engine.declare({
      ...base,
      plan: [
        { op_id: "q", kind: "SEARCH_EXPERTISE", query: "x", capability: "ghost-source" },
        ...(base["plan"] as unknown[]),
      ],
    });
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    expect(run.ops[0]?.error_code).toBe("CAPABILITY_UNKNOWN");
  });

  test("fixture expertise produces an attributable knowledge artifact", async () => {
    const registry = new CapabilityRegistry();
    const stubs = stubAdapters();
    registry.register({ id: "evidence", version: "s", operations: ["CAPTURE_EVIDENCE"], available: true, handle: stubs.evidence });
    registry.register({ id: "verify", version: "s", operations: ["VERIFY"], available: true, handle: stubs.verify });
    registry.register({ id: "proof", version: "s", operations: ["BUILD_PROOF"], available: true, handle: stubs.proof });
    registry.register({ id: "expertise-fixture", version: "fixture-0", operations: ["SEARCH_EXPERTISE"], available: true, handle: fixtureExpertise(NOTES_A) });
    const { WorkEngine } = await import("../src/engine.ts");
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const engine = new WorkEngine(
      mkdtempSync(join(tmpdir(), "wk-x-proj-")),
      { store_dir: mkdtempSync(join(tmpdir(), "wk-x-store-")) },
      registry,
    );
    const base = miniDeclaration();
    const { declaration } = engine.declare({
      ...base,
      plan: [
        { op_id: "k", kind: "SEARCH_EXPERTISE", query: "persisted cache compatibility", capability: "expertise-fixture" },
        ...(base["plan"] as unknown[]),
      ],
    });
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("AWAITING_ACCEPTANCE");
    const kop = run.ops.find((o) => o.op_id === "k");
    expect(kop?.status).toBe("ok");
    const out = kop?.output as Record<string, unknown>;
    expect(out["kind"]).toBe("knowledge");
    expect(out["capability"]).toBe("expertise-fixture");
    expect(typeof out["brief_id"]).toBe("string");
    expect((out["via"] as Record<string, unknown>)["capability"]).toBe("expertise-fixture");
  });

  test("proposal exists without amending: versions, bytes, amendments untouched", async () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const before = JSON.stringify(engine.store.getDeclaration(declaration.work_id, 1));
    const { proposal } = engine.propose(declaration.work_id, {
      kind: "ADD_OBLIGATION",
      basis: [{ kind: "knowledge", brief_id: "xb_abc", capability: "expertise-fixture", capability_version: "fixture-0", op_id: "k" }],
      proposed_change: {
        add_obligations: [{ description: "compat holds", criterion: EQUALS_ZERO }],
      },
      by: "test-reasoner",
      capability: "expertise-fixture",
    });
    expect(proposal.proposal_id).toMatch(/^wp_[0-9a-f]{32}$/);
    expect(proposal.status).toBe("PROPOSED");
    expect(engine.store.getProposal(declaration.work_id, proposal.proposal_id)).toEqual(proposal);
    const view = engine.get(declaration.work_id) as { versions: number };
    expect(view.versions).toBe(1);
    expect(JSON.stringify(engine.store.getDeclaration(declaration.work_id, 1))).toBe(before);
  });

  test("invalid proposals fail closed; ghost work cannot be proposed against", () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    for (const bad of [
      { kind: "ADD_EVERYTHING", proposed_change: {} },
      { kind: "ADD_OBLIGATION", proposed_change: {} },
      { kind: "ADD_OBLIGATION", proposed_change: { add_obligations: [{ description: "", criterion: 1 }] } },
      { kind: "CHANGE_PLAN", proposed_change: { plan: [{ op_id: "x" }] } },
    ]) {
      try {
        engine.propose(declaration.work_id, bad);
        expect.unreachable();
      } catch (error) {
        expect(String(error)).toMatch(/INVALID_PROPOSAL|INVALID_PLAN/);
      }
    }
    try {
      engine.propose(`wk_${"0".repeat(32)}`, { kind: "ADD_OBLIGATION", proposed_change: { add_obligations: [] } });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).toContain("WORK_NOT_FOUND");
    }
  });

  test("proposal never auto-applies: status stays PROPOSED across amend + run", async () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const { proposal } = engine.propose(declaration.work_id, {
      kind: "ADD_OBLIGATION",
      proposed_change: { add_obligations: [{ description: "compat holds", criterion: EQUALS_ZERO }] },
      by: "test",
    });
    await engine.run(declaration.work_id);
    engine.amend(declaration.work_id, { reason: "unrelated tweak", add_acceptance_checks: [{ name: "x", command: "true" }] });
    expect(engine.store.getProposal(declaration.work_id, proposal.proposal_id).status).toBe("PROPOSED");
  });

  test("knowledge and model output can never enter verification or proof as evidence", async () => {
    const engine = tempEngine(stubAdapters(), { modelProvider: stubProvider() });
    const base = miniDeclaration();
    const input = {
      ...base,
      plan: [
        { op_id: "k", kind: "SEARCH_EXPERTISE", query: "x", capability: "expertise-fixture" },
        { op_id: "ask", kind: "CALL_MODEL", prompt: "opine" },
        { op_id: "vr", kind: "VERIFY", criterion: EQUALS_ZERO, evidence: ["k"] },
        {
          op_id: "pf",
          kind: "BUILD_PROOF",
          obligations: [{ description: "mini exits 0", criterion: EQUALS_ZERO, evidence: ["ask"], verification: "vr" }],
        },
      ],
    };
    // Register the fixture capability this plan names.
    engine.capabilities.register({
      id: "expertise-fixture",
      version: "fixture-0",
      operations: ["SEARCH_EXPERTISE"],
      available: true,
      handle: fixtureExpertise(NOTES_A),
    });
    const { declaration } = engine.declare(input);
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    const vrOp = run.ops.find((o) => o.op_id === "vr");
    expect(vrOp?.status).toBe("error");
    expect(vrOp?.error_code).toBe("KNOWLEDGE_NOT_EVIDENCE");
  });

  test("expertise output cannot be captured as evidence (wrong source kind)", async () => {
    const engine = tempEngine();
    engine.capabilities.register({
      id: "expertise-fixture",
      version: "fixture-0",
      operations: ["SEARCH_EXPERTISE"],
      available: true,
      handle: fixtureExpertise(NOTES_A),
    });
    const base = miniDeclaration();
    const { declaration } = engine.declare({
      ...base,
      plan: [
        { op_id: "k", kind: "SEARCH_EXPERTISE", query: "x", capability: "expertise-fixture" },
        { op_id: "evk", kind: "CAPTURE_EVIDENCE", source_op: "k" },
        ...(base["plan"] as unknown[]),
      ],
    });
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("BLOCKED");
    expect(run.ops.find((o) => o.op_id === "evk")?.error_code).toBe("EVIDENCE_SOURCE_INVALID");
  });

  test("malformed and oversized briefs fail loudly, never enter the run", async () => {
    const engine = tempEngine();
    const garbage = {
      async search() {
        return { brief: { nope: true } };
      },
    };
    const huge = {
      async search() {
        return { brief: { brief_id: "xb_huge", findings: [{ finding_id: "F1", title: "t", excerpt: "x".repeat(70000) }] } };
      },
    };
    engine.capabilities.register({ id: "garbage-source", version: "f", operations: ["SEARCH_EXPERTISE"], available: true, handle: garbage });
    engine.capabilities.register({ id: "huge-source", version: "f", operations: ["SEARCH_EXPERTISE"], available: true, handle: huge });
    const base = miniDeclaration();
    for (const [capability, code] of [["garbage-source", "EXPERTISE_BRIEF_INVALID"], ["huge-source", "EXPERTISE_BRIEF_TOO_LARGE"]] as const) {
      const { declaration } = engine.declare({
        ...base,
        plan: [{ op_id: "k", kind: "SEARCH_EXPERTISE", query: "x", capability }, ...(base["plan"] as unknown[])],
      });
      const run = await engine.run(declaration.work_id);
      expect(run.state).toBe("BLOCKED");
      expect(run.ops.find((o) => o.op_id === "k")?.error_code).toBe(code);
    }
  });
});
