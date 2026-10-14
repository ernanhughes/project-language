import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  acquireThreadLock,
  describeThreadLock,
  initThread,
  resolveStorePaths,
  LanguageError,
} from "../src/index.ts";
import { NOW, makeProject, tempDir } from "./helpers.ts";

const run = promisify(execFile);

describe("inter-process locking", () => {
  it("a second process cannot enter the critical section", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    void init;
    const paths = resolveStorePaths(storeRoot, project, "t");
    const holder = `${paths.locks_dir}/holder.mjs`;
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      holder,
      `import { acquireThreadLock } from ${JSON.stringify(new URL("../src/lock.ts", import.meta.url).href)};\n` +
        `const lock = await acquireThreadLock(${JSON.stringify(paths.locks_dir)}, { timeoutMs: 50 });\n` +
        `await new Promise((r) => setTimeout(r, 3000));\nlock.release();\n`,
      "utf8",
    );
    const child = (await import("node:child_process")).spawn(process.execPath, ["--experimental-transform-types", holder], { stdio: "ignore" });
    try {
      await new Promise((r) => setTimeout(r, 800));
      const info = describeThreadLock(paths.locks_dir);
      assert.ok(info !== null && typeof info["pid"] === "number");
      await assert.rejects(
        acquireThreadLock(paths.locks_dir, { timeoutMs: 500, pollMs: 50 }),
        (e: unknown) => e instanceof LanguageError && e.code === "THREAD_LOCKED",
      );
    } finally {
      child.kill();
      await new Promise((r) => setTimeout(r, 300));
    }
    // After the holder dies, the lock file remains (no auto-break); explicit release path works.
    const { forceReleaseThreadLock } = await import("../src/index.ts");
    assert.throws(() => forceReleaseThreadLock(paths.locks_dir, "nope"), /confirmation/);
    forceReleaseThreadLock(paths.locks_dir, "BREAK-LOCK");
    const lock = await acquireThreadLock(paths.locks_dir, { timeoutMs: 2000 });
    lock.release();
  });

  it("the lock is released after a thrown failure", async () => {
    const { applyMutation } = await import("../src/index.ts");
    const { ref, item } = await import("./helpers.ts");
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    await assert.rejects(
      applyMutation({ storeRoot }, {
        project_path: project, thread_id: "t", expected_parent: init.revision,
        idempotency_key: "kb", producer: { type: "model" },
        source_event: { refs: [ref("s", "ev")] }, now: NOW,
        operations: [{ op: "revise", id: "ghost", text: "x" }],
      }),
      /unknown item/,
    );
    const paths = resolveStorePaths(storeRoot, project, "t");
    const lock = await acquireThreadLock(paths.locks_dir, { timeoutMs: 2000 });
    lock.release();
    // And the failed mutation committed nothing.
    const { listHistory } = await import("../src/index.ts");
    assert.equal((await listHistory(storeRoot, project, "t")).length, 1);
    void item;
  });
});