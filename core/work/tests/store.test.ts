import { describe, expect, test } from "../../../harness/bun-test.ts";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adapterAvailability, localEvidenceAdapter } from "../src/adapters.ts";
import { miniDeclaration, tempEngine } from "./helpers.ts";

describe("store", () => {
  test("declaration round-trip; second identical put is duplicate", () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const again = engine.store.putDeclaration(declaration);
    expect(again.duplicate).toBe(true);
  });

  test("stored bytes are immutable (different bytes under same path fail)", () => {
    const engine = tempEngine();
    const { declaration } = engine.declare(miniDeclaration());
    const path = engine.store.declarationPath(declaration.work_id, 1);
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    parsed.objective.statement = "Rewritten objective.";
    writeFileSync(path, JSON.stringify(parsed), "utf8");
    expect(() => engine.store.putDeclaration(declaration)).toThrow("WORK_NOT_IMMUTABLE");
    expect(() => engine.store.getDeclaration(declaration.work_id, 1)).toThrow("WORK_HASH_MISMATCH");
  });

  test("missing declarations and runs fail clearly; get is read-only", () => {
    const engine = tempEngine();
    expect(() => engine.store.getDeclaration(`wk_${"a".repeat(32)}`, 1)).toThrow("WORK_NOT_FOUND");
    expect(() => engine.store.getDeclaration(engine.declare(miniDeclaration()).declaration.work_id, 99)).toThrow(
      "WORK_NOT_FOUND",
    );
    const { declaration } = engine.declare(miniDeclaration());
    const path = engine.store.declarationPath(declaration.work_id, 1);
    const before = statSync(path).mtimeMs;
    const bytes = readFileSync(path, "utf8");
    engine.store.getDeclaration(declaration.work_id, 1);
    expect(readFileSync(path, "utf8")).toBe(bytes);
    expect(statSync(path).mtimeMs).toBe(before);
    expect(engine.store.listRuns(declaration.work_id)).toEqual([]);
    expect(engine.store.listAcceptances(declaration.work_id)).toEqual([]);
  });
});

describe("adapters", () => {
  test("all three upstreams resolve in this environment", () => {
    const availability = adapterAvailability();
    expect(availability["evidence"]?.available).toBe(true);
    expect(availability["verify"]?.available).toBe(true);
    expect(availability["proof"]?.available).toBe(true);
  });

  test("env override selects the upstream checkout (sibling is the fallback)", () => {
    const prev = process.env["OPENCODE_EVIDENCE_PKG"];
    const fake = mkdtempSync(join(tmpdir(), "wk-pkg-"));
    mkdirSync(join(fake, "src"), { recursive: true });
    writeFileSync(join(fake, "src", "capture.ts"), "// marker", "utf8");
    process.env["OPENCODE_EVIDENCE_PKG"] = fake;
    try {
      expect(localEvidenceAdapter().pkg).toBe(fake);
    } finally {
      if (prev === undefined) delete process.env["OPENCODE_EVIDENCE_PKG"];
      else process.env["OPENCODE_EVIDENCE_PKG"] = prev;
    }
    // Without override, the adjacent sibling resolves.
    expect(localEvidenceAdapter().pkg.replaceAll("\\", "/").endsWith("/core/evidence")).toBe(true);
  });
});
