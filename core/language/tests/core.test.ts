import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveRevisionId, applyMutation, initThread } from "../src/index.ts";
import { NOW, item, makeProject, ref, tempDir } from "./helpers.ts";

describe("revisions and init", () => {
  it("derives stable revision ids from canonical inputs", () => {
    const inputs = {
      project_id: "p", thread_id: "t", parent_revision: "rev_genesis",
      state_sha256: "0".repeat(64), idempotency_key: "k",
      producer: { type: "model" as const }, ops_digest: "d", created_at: NOW,
    };
    assert.equal(deriveRevisionId(inputs), deriveRevisionId(inputs));
    assert.notEqual(deriveRevisionId(inputs), deriveRevisionId({ ...inputs, parent_revision: "other" }));
    assert.match(deriveRevisionId(inputs), /^rev_[0-9a-f]{32}$/);
  });

  it("init creates one valid commit and receipt", async () => {
    const { verifyThread, listHistory } = await import("../src/index.ts");
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k", producer: { type: "model", id: "test" }, now: NOW, sessionId: "sess-1" });
    assert.equal(init.origin, "init");
    assert.equal(init.idempotent_replay, false);
    const verified = await verifyThread(storeRoot, project, "t");
    assert.equal(verified.status, "ok");
    assert.equal(verified.revision, init.revision);
    const history = await listHistory(storeRoot, project, "t");
    assert.equal(history.length, 1);
    assert.equal(history[0]?.origin, "init");
  });

  it("repeated identical init is idempotent (no second commit)", async () => {
    const { listHistory } = await import("../src/index.ts");
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const args = { storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k", producer: { type: "model" as const }, now: NOW };
    const first = await initThread(args);
    const second = await initThread(args);
    assert.equal(second.revision, first.revision);
    assert.equal(second.idempotent_replay, true);
    assert.equal((await listHistory(storeRoot, project, "t")).length, 1);
  });

  it("incompatible init fails instead of overwriting", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const args = { storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k", producer: { type: "model" as const }, now: NOW };
    await initThread(args);
    await assert.rejects(initThread({ ...args, idempotencyKey: "different" }), /already initialized|INVALID_INPUT/);
  });

  it("valid add/revise/standing/supersede operations apply", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const base = { project_path: project, thread_id: "t", producer: { type: "model" as const }, source_event: { refs: [ref("s", "ev")] }, now: NOW };
    const r1 = await applyMutation({ storeRoot }, { ...base, expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    assert.equal(r1.idempotent_replay, false);
    const r2 = await applyMutation({ storeRoot }, {
      ...base, expected_parent: r1.revision, idempotency_key: "k2",
      operations: [
        { op: "revise", id: "d1", text: "new text" },
        { op: "set-standing", id: "d1", standing: "tentative" },
        { op: "add", item: item("d2") },
      ],
    });
    const r3 = await applyMutation({ storeRoot }, {
      ...base, expected_parent: r2.revision, idempotency_key: "k3",
      operations: [{ op: "supersede", id: "d1", by: "d2" }],
    });
    const { verifyThread } = await import("../src/index.ts");
    assert.equal((await verifyThread(storeRoot, project, "t")).revision, r3.revision);
  });

  it("unrestricted deletion is rejected; prune needs superseded + reason + tombstone", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const base = { project_path: project, thread_id: "t", producer: { type: "model" as const }, source_event: { refs: [ref("s", "ev")] }, now: NOW };
    const r1 = await applyMutation({ storeRoot }, { ...base, expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }, { op: "add", item: item("d2") }] });
    // Pruning an active item fails.
    await assert.rejects(
      applyMutation({ storeRoot }, { ...base, expected_parent: r1.revision, idempotency_key: "kx", operations: [{ op: "prune", id: "d1", reason: "nope" }] }),
      /only superseded/,
    );
    const r2 = await applyMutation({ storeRoot }, { ...base, expected_parent: r1.revision, idempotency_key: "k2", operations: [{ op: "supersede", id: "d1", by: "d2" }] });
    // Prune without a reason fails.
    await assert.rejects(
      applyMutation({ storeRoot }, { ...base, expected_parent: r2.revision, idempotency_key: "ky", operations: [{ op: "prune", id: "d1", reason: "" }] }),
      /requires a reason/,
    );
    const r3 = await applyMutation({ storeRoot }, { ...base, expected_parent: r2.revision, idempotency_key: "k3", operations: [{ op: "prune", id: "d1", reason: "superseded by d2" }] });
    const { parseState, resolveStorePaths } = await import("../src/index.ts");
    const { readFileSync } = await import("node:fs");
    const state = parseState(readFileSync(resolveStorePaths(storeRoot, project, "t").state_path, "utf8"));
    assert.ok(!state.items.some((i) => i.id === "d1"));
    const tomb = state.superseded.find((e) => e.item_id === "d1");
    assert.ok(tomb?.pruned);
    assert.equal(tomb?.revision, r3.revision);
  });

  it("bounds are enforced and invalid requests commit nothing", async () => {
    const { listHistory, LanguageError } = await import("../src/index.ts");
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const base = { project_path: project, thread_id: "t", producer: { type: "model" as const }, source_event: { refs: [ref("s", "ev")] }, now: NOW };
    const big = item("big", { text: "x".repeat(5000) });
    await assert.rejects(
      applyMutation({ storeRoot, bounds: { policy_version: "bounds/v1", max_state_bytes: 100, max_items: 200, max_item_text_bytes: 4096, max_sources_per_item: 12, max_supersession_entries: 100, max_scope_bytes: 512, max_actor_bytes: 128 } },
        { ...base, expected_parent: init.revision, idempotency_key: "kb", operations: [{ op: "add", item: big }] }),
      (e: unknown) => e instanceof LanguageError && e.code === "BOUND_EXCEEDED",
    );
    await assert.rejects(
      applyMutation({ storeRoot }, { ...base, expected_parent: init.revision, idempotency_key: "kb2", operations: [{ op: "revise", id: "ghost", text: "x" }] }),
      /unknown item/,
    );
    assert.equal((await listHistory(storeRoot, project, "t")).length, 1);
  });
});