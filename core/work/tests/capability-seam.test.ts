import { describe, expect, test } from "../../../harness/bun-test.ts";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { registryFromAdapters } from "../src/engine.ts";
import { EQUALS_ZERO, miniDeclaration, stubAdapters, tempEngine } from "./helpers.ts";

/** No hidden orchestration: engine resolves capabilities only through the registry. */
describe("capability seam preserves W0 behavior", () => {
  test("evidence/verify/proof outputs carry capability provenance", async () => {
    const engine = tempEngine(stubAdapters());
    const { declaration } = engine.declare(miniDeclaration());
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("AWAITING_ACCEPTANCE");
    const byId = new Map(run.ops.map((o) => [o.op_id, o.output as Record<string, unknown>]));
    expect(byId.get("ev")).toMatchObject({ kind: "evidence", via: { capability: "evidence", version: "stub-0" } });
    expect(byId.get("vr")).toMatchObject({ kind: "verification", via: { capability: "verify", version: "stub-0" } });
    expect(byId.get("pf")).toMatchObject({ kind: "proof", via: { capability: "proof", version: "stub-0" } });
  });

  test("registry-backed model provider is used when no injected provider exists", async () => {    const registry = registryFromAdapters(stubAdapters());
    registry.register({
      id: "model",
      version: "registry-model-0",
      operations: ["CALL_MODEL"],
      available: true,
      handle: { callModel: async () => ({ text: "registry model says hi" }) },
    });
    const { WorkEngine } = await import("../src/engine.ts");
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const engine = new WorkEngine(
      mkdtempSync(join(tmpdir(), "wk-m-proj-")),
      { store_dir: mkdtempSync(join(tmpdir(), "wk-m-store-")) },
      registry,
    );
    const base = miniDeclaration();
    const { declaration } = engine.declare({
      ...base,
      plan: [{ op_id: "ask", kind: "CALL_MODEL", prompt: "Say hi." }, ...(base["plan"] as unknown[])],
    });
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("AWAITING_ACCEPTANCE");
    const ask = run.ops.find((o) => o.op_id === "ask");
    expect(ask?.status).toBe("ok");
    expect((ask?.output as Record<string, unknown>)["text"]).toBe("registry model says hi");
  });

  test("engine never touches sibling implementations directly (static scan)", () => {
    const srcFiles = readdirSync(join(import.meta.dirname, "..", "src")).filter((f) => f.endsWith(".ts"));
    const stripComments = (content: string): string =>
      content
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .map((line) => {
          let out = "";
          let inString: string | null = null;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i] as string;
            if (inString) {
              out += ch;
              if (ch === inString && line[i - 1] !== "\\") inString = null;
            } else if (ch === '"' || ch === "'" || ch === "`") {
              inString = ch;
              out += ch;
            } else if (ch === "/" && line[i + 1] === "/") {
              break;
            } else {
              out += ch;
            }
          }
          return out;
        })
        .join("\n");
    const siblingPaths = ["opencode-evidence", "opencode-verify", "opencode-proof", "opencode-expertise", "opencode-remembering", "opencode-relate", "opencode-radar", "opencode-lens", "project-context"];
    const siblingClasses = ["EvidenceStore", "VerificationEngine", "ProofEngine", "normalizeCommandResult", "buildRecord("];
    // Rule 1: non-relative, non-builtin dynamic import() lives only in adapters.ts.
    // (Relative imports like ./plugin and node:/bun: builtins are own-code/std.)
    // Rule 2: sibling checkout names live only in adapters.ts and
    // expertise_subprocess.ts (the two sanctioned external boundaries),
    // plus the single own-capability id in expertise.ts (contract naming
    // its absent path), plus *_REF provenance pins in version.ts.
    const nonRelativeImport = /[^a-zA-Z]import\s*\(\s*(?!["'`](\.\/|\.\.\/|node:|bun:))/;
    const boundaryFiles = new Set(["adapters.ts", "expertise_subprocess.ts"]);
    for (const file of srcFiles) {
      const content = stripComments(readFileSync(join(import.meta.dirname, "..", "src", file), "utf8"));
      if (!boundaryFiles.has(file)) {
        expect(nonRelativeImport.test(content), `${file} uses non-relative dynamic import()`).toBe(false);
      }
      if (!boundaryFiles.has(file) && file !== "expertise.ts" && file !== "version.ts") {
        for (const token of siblingPaths) {
          expect(content.includes(token), `${file} references sibling ${token}`).toBe(false);
        }
      }
      if (file === "expertise.ts") {
        for (const token of siblingPaths.filter((t) => t !== "opencode-expertise")) {
          expect(content.includes(token), `expertise.ts references sibling ${token}`).toBe(false);
        }
      }
      if (file === "version.ts") {
        for (const line of content.split("\n")) {
          for (const token of siblingPaths) {
            if (line.includes(token)) {
              expect(line.includes("_REF"), `version.ts line references ${token} outside a *_REF pin: ${line.trim().slice(0, 80)}`).toBe(true);
            }
          }
        }
      }
      if (file === "engine.ts") {
        for (const token of siblingClasses) {
          expect(content.includes(token), `engine.ts references ${token}`).toBe(false);
        }
      }
    }
    // Positive controls: the boundary exists exactly where claimed.
    const adapters = stripComments(readFileSync(join(import.meta.dirname, "..", "src", "adapters.ts"), "utf8"));
    expect(adapters.includes("opencode-evidence")).toBe(true);
    expect(/[^a-zA-Z]import\s*\(\s*(?!["'`](\.\/|\.\.\/|node:|bun:))/.test(adapters)).toBe(true);
    expect(adapters.includes("from \"../") || adapters.includes("from '../")).toBe(false);
  });

  test("legacy adapters-bundle constructor still works (W0 harness compat)", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { WorkEngine } = await import("../src/engine.ts");
    const { stubAdapters } = await import("./helpers.ts");
    const { miniDeclaration } = await import("./helpers.ts");
    const engine = new WorkEngine(
      mkdtempSync(join(tmpdir(), "wk-legacy-proj-")),
      { store_dir: mkdtempSync(join(tmpdir(), "wk-legacy-store-")) },
      stubAdapters() as never,
    );
    const { declaration } = engine.declare(miniDeclaration());
    const run = await engine.run(declaration.work_id);
    expect(run.state).toBe("AWAITING_ACCEPTANCE");
    expect(engine.capabilities.lookup("evidence")?.available).toBe(true);
  });

  test("EQUALS_ZERO helper still shapes criteria (sanity)", () => {
    expect(EQUALS_ZERO).toEqual({
      kind: "evidence_field",
      path: "observation.exit_code",
      operator: "EQUALS",
      expected: 0,
    });
  });
});
