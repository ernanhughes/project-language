import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyMutation,
  initThread,
  verifyThread,
  LanguageError,
} from "../src/index.ts";
import { NOW, item, makeProject, ref, tempDir } from "./helpers.ts";

function base(project: string) {
  return {
    project_path: project,
    thread_id: "t",
    producer: { type: "model" as const },
    source_event: { refs: [ref("s", "ev")] },
    now: NOW,
  };
}

describe("fault injection", () => {
  it("a fault after state write fails closed with the last valid revision known", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    process.env["OPENCODE_LANGUAGE_FAULT"] = "after-state";
    try {
      await assert.rejects(
        applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "kf", operations: [{ op: "add", item: item("d1") }] }),
        (e: unknown) => e instanceof LanguageError && e.code === "GIT_FAILURE",
      );
    } finally {
      delete process.env["OPENCODE_LANGUAGE_FAULT"];
    }
    const result = await verifyThread(storeRoot, project, "t");
    // state.md advanced without metadata: unaccepted candidate, never trusted.
    assert.equal(result.status, "human-edit-pending");
    assert.equal(result.last_valid_revision, init.revision);
  });

  it("a fault after meta write is torn and recoverable", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    process.env["OPENCODE_LANGUAGE_FAULT"] = "after-meta";
    try {
      await assert.rejects(
        applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "kf", operations: [{ op: "add", item: item("d1") }] }),
        LanguageError,
      );
    } finally {
      delete process.env["OPENCODE_LANGUAGE_FAULT"];
    }
    const result = await verifyThread(storeRoot, project, "t");
    assert.ok(result.status === "torn" || result.status === "corrupt" || result.status === "human-edit-pending", result.status);
    const { recoverThread } = await import("../src/index.ts");
    const recovered = await recoverThread(storeRoot, project, "t", true);
    assert.equal(recovered.revision, init.revision);
  });

  it("a fault around staging/commit leaves history without the partial revision", async () => {
    const { listHistory } = await import("../src/index.ts");
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    process.env["OPENCODE_LANGUAGE_FAULT"] = "after-stage";
    try {
      await assert.rejects(
        applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "kf", operations: [{ op: "add", item: item("d1") }] }),
        LanguageError,
      );
    } finally {
      delete process.env["OPENCODE_LANGUAGE_FAULT"];
    }
    assert.equal((await listHistory(storeRoot, project, "t")).length, 1);
  });
});