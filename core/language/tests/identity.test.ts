import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultStoreRoot,
  deriveProjectIdentity,
  resolveThreadPaths,
  sanitizeBasename,
  validateThreadId,
  LanguageError,
} from "../src/index.ts";
import { makeProject, tempDir } from "./helpers.ts";

describe("project identity", () => {
  it("derives basename plus 16 hex chars deterministically", () => {
    const project = makeProject();
    const a = deriveProjectIdentity(project);
    const b = deriveProjectIdentity(project);
    assert.deepEqual(a, b);
    assert.match(a.path_hash16, /^[0-9a-f]{16}$/);
    assert.ok(a.project_id.startsWith(`${a.basename_safe}-`));
    assert.ok(a.project_id.endsWith(a.path_hash16));
    assert.equal(a.path_original, project);
  });

  it("records both original and canonical paths; moving the project changes the id", () => {
    const p1 = makeProject();
    const p2 = makeProject();
    const a = deriveProjectIdentity(p1);
    const b = deriveProjectIdentity(p2);
    assert.notEqual(a.project_id, b.project_id);
    assert.ok(a.path_canonical.length > 0);
  });

  it("windows normalization is deliberate and tested", () => {
    const id = deriveProjectIdentity("C:\\Projects\\Demo\\App");
    // On non-Windows the backslashes are ordinary chars; the property under
    // test is determinism plus documented case handling on win32.
    assert.deepEqual(id, deriveProjectIdentity("C:\\Projects\\Demo\\App"));
    assert.equal(process.platform === "win32", id.path_canonical === id.path_canonical.toLowerCase());
  });

  it("sanitizes hostile basenames and never uses a remote url", () => {
    assert.equal(sanitizeBasename("../../../etc"), "etc");
    assert.equal(sanitizeBasename(""), "project");
    const id = deriveProjectIdentity(makeProject());
    assert.ok(!id.project_id.includes("/") && !id.project_id.includes("\\"));
  });

  it("default store root honors OPENCODE_LANGUAGE_HOME", () => {
    const custom = tempDir("lang-home-");
    assert.equal(defaultStoreRoot({ OPENCODE_LANGUAGE_HOME: custom } as NodeJS.ProcessEnv), custom);
    assert.ok(defaultStoreRoot({}).endsWith(join(".opencode", "language")));
  });

  it("thread ids are mandatory and traversal is rejected", () => {
    assert.throws(() => validateThreadId(""), (e: unknown) => e instanceof LanguageError && e.code === "THREAD_REQUIRED");
    assert.throws(() => validateThreadId(undefined), (e: unknown) => e instanceof LanguageError && e.code === "THREAD_REQUIRED");
    for (const bad of [".", "..", "a/b", "a\\b", "has space", "-lead", "nul\0"]) {
      assert.throws(() => validateThreadId(bad), (e: unknown) => e instanceof LanguageError, bad);
    }
    assert.equal(validateThreadId("thread-1_2.3"), "thread-1_2.3");
  });

  it("missing thread fails closed; nothing is inferred", async () => {
    const { verifyThread } = await import("../src/index.ts");
    const storeRoot = tempDir("lang-store-");
    await assert.rejects(
      verifyThread(storeRoot, makeProject(), "nope"),
      (e: unknown) => e instanceof LanguageError && e.code === "THREAD_NOT_FOUND",
    );
  });

  it("separate threads have separate .git directories", async () => {
    const { initThread } = await import("../src/index.ts");
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const r1 = await initThread({ storeRoot, projectPath: project, threadId: "t1", idempotencyKey: "k1", producer: { type: "model" }, now: "2026-10-02T00:00:00.000Z" });
    const r2 = await initThread({ storeRoot, projectPath: project, threadId: "t2", idempotencyKey: "k2", producer: { type: "model" }, now: "2026-10-02T00:00:00.000Z" });
    assert.equal(r1.project_id, r2.project_id);
    const p1 = resolveThreadPaths(storeRoot, r1.project_id, "t1");
    const p2 = resolveThreadPaths(storeRoot, r1.project_id, "t2");
    assert.notEqual(p1.git_dir, p2.git_dir);
  });

  it("paths with spaces work end to end", async () => {
    const { initThread, verifyThread } = await import("../src/index.ts");
    const base = mkdtempSync(join(tmpdir(), "lang space "));
    const project = join(base, "my project");
    const { mkdirSync } = await import("node:fs");
    mkdirSync(project, { recursive: true });
    const storeRoot = join(base, "store dir");
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t1", idempotencyKey: "k", producer: { type: "model" }, now: "2026-10-02T00:00:00.000Z" });
    const verified = await verifyThread(storeRoot, project, "t1");
    assert.equal(verified.status, "ok");
    assert.equal(verified.revision, init.revision);
  });
});