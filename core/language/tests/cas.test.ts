import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyMutation,
  initThread,
  listHistory,
  resolveStorePaths,
  LanguageError,
  type MutationRequest,
} from "../src/index.ts";
import { NOW, item, makeProject, ref, tempDir } from "./helpers.ts";

function setup() {
  const storeRoot = tempDir("lang-store-");
  const project = makeProject();
  const base = {
    project_path: project,
    thread_id: "t",
    producer: { type: "model" as const },
    source_event: { refs: [ref("s", "ev")] },
    now: NOW,
  };
  return { storeRoot, project, base };
}

describe("CAS and idempotency", () => {
  it("wrong expected parent causes CAS_CONFLICT with no commit", async () => {
    const { storeRoot, project, base } = setup();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    await assert.rejects(
      applyMutation({ storeRoot }, { ...base, expected_parent: "rev_wrong", idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] }),
      (e: unknown) => e instanceof LanguageError && e.code === "CAS_CONFLICT",
    );
    assert.equal((await listHistory(storeRoot, project, "t")).length, 1);
    void init;
  });

  it("same key + same request replays with no new commit", async () => {
    const { storeRoot, project, base } = setup();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const request: MutationRequest = {
      ...base, expected_parent: init.revision, idempotency_key: "k1",
      operations: [{ op: "add", item: item("d1") }],
    };
    const first = await applyMutation({ storeRoot }, request);
    const second = await applyMutation({ storeRoot }, structuredClone(request));
    assert.equal(second.revision, first.revision);
    assert.equal(second.idempotent_replay, true);
    assert.equal((await listHistory(storeRoot, project, "t")).length, 2);
  });

  it("same key + different request causes IDEMPOTENCY_CONFLICT", async () => {
    const { storeRoot, project, base } = setup();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const request: MutationRequest = {
      ...base, expected_parent: init.revision, idempotency_key: "k1",
      operations: [{ op: "add", item: item("d1") }],
    };
    await applyMutation({ storeRoot }, request);
    await assert.rejects(
      applyMutation({ storeRoot }, { ...request, operations: [{ op: "add", item: item("d2") }] }),
      (e: unknown) => e instanceof LanguageError && e.code === "IDEMPOTENCY_CONFLICT",
    );
  });

  it("receipts are immutable: same path with different bytes is corruption", async () => {
    const { storeRoot, project, base } = setup();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const r1 = await applyMutation({ storeRoot }, { ...base, expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    const paths = resolveStorePaths(storeRoot, project, "t");
    const receiptPath = `${paths.revisions_dir}/${r1.revision}.json`;
    const tampered = { ...(JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>), origin: "mutation-tampered" };
    const { writeFileSync } = await import("node:fs");
    writeFileSync(receiptPath, `${JSON.stringify(tampered)}\n`, "utf8");
    const { verifyThread } = await import("../src/index.ts");
    const result = await verifyThread(storeRoot, project, "t");
    assert.ok(result.status === "torn" || result.status === "corrupt", result.status);
  });

  it("only owned files are staged; no remote is configured", async () => {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    const { storeRoot, project, base } = setup();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const paths = resolveStorePaths(storeRoot, project, "t");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(`${paths.thread_dir}/stray.txt`, "not owned\n", "utf8");
    await applyMutation({ storeRoot }, { ...base, expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    const { stdout: ls } = await run("git", ["ls-tree", "-r", "--name-only", "HEAD"], { cwd: paths.thread_dir });
    assert.ok(!(ls as string).includes("stray.txt"));
    assert.ok(!(ls as string).includes(".locks/"));
    const { stdout: remotes } = await run("git", ["remote"], { cwd: paths.thread_dir });
    assert.equal((remotes as string).trim(), "");
  });

  it("updating one thread does not alter another thread's CAS parent", async () => {
    const { verifyThread } = await import("../src/index.ts");
    const { storeRoot, project, base } = setup();
    const a = await initThread({ storeRoot, projectPath: project, threadId: "a", idempotencyKey: "ka", producer: { type: "model" }, now: NOW });
    const b = await initThread({ storeRoot, projectPath: project, threadId: "b", idempotencyKey: "kb", producer: { type: "model" }, now: NOW });
    await applyMutation({ storeRoot }, { ...base, thread_id: "a", expected_parent: a.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    assert.equal((await verifyThread(storeRoot, project, "b")).revision, b.revision);
  });

  it("no state is written inside the source project", async () => {
    const { listAll } = await import("./helpers.ts");
    const { storeRoot, project, base } = setup();
    const before = new Set(listAll(project));
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    await applyMutation({ storeRoot }, { ...base, expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    assert.deepEqual(new Set(listAll(project)), before);
  });
});