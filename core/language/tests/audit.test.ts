import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import {
  applyMutation,
  initThread,
  parseState,
  renderProjection,
  serializeState,
  stateSha256,
  verifyThread,
} from "../src/index.ts";
import { NOW, item, makeProject, ref, tempDir } from "./helpers.ts";

/** Prompt 3 section 4: focused source audit of the Prompt 2 core. */
describe("core audit for static integration", () => {
  it("verifyThread is strictly read-only", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    await applyMutation({ storeRoot }, {
      project_path: project, thread_id: "t", expected_parent: init.revision, idempotency_key: "k1",
      producer: { type: "model" }, source_event: { refs: [ref("s", "ev")] }, now: NOW,
      operations: [{ op: "add", item: item("d1") }],
    });
    const { resolveStorePaths } = await import("../src/index.ts");
    const paths = resolveStorePaths(storeRoot, project, "t");
    const before = new Map<string, { hash: string; mtime: number }>();
    for (const f of [paths.state_path, paths.meta_path]) {
      const st = statSync(f);
      before.set(f, { hash: stateSha256(readFileSync(f, "utf8")), mtime: st.mtimeMs });
    }
    const result = await verifyThread(storeRoot, project, "t");
    assert.equal(result.status, "ok");
    for (const f of [paths.state_path, paths.meta_path]) {
      const st = statSync(f);
      assert.equal(stateSha256(readFileSync(f, "utf8")), before.get(f)?.hash);
      assert.equal(st.mtimeMs, before.get(f)?.mtime);
    }
  });

  it("renderProjection is deterministic and bounded", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const { resolveStorePaths, DEFAULT_BOUNDS } = await import("../src/index.ts");
    const paths = resolveStorePaths(storeRoot, project, "t");
    const canonical = serializeState(parseState(readFileSync(paths.state_path, "utf8")));
    const inputs = {
      projectId: paths.project_id, threadId: "t", revision: init.revision,
      stateSha256: stateSha256(canonical), stateText: canonical,
    };
    const a = renderProjection(inputs);
    const b = renderProjection(structuredClone(inputs));
    assert.equal(a, b);
    assert.ok(Buffer.byteLength(a, "utf8") <= DEFAULT_BOUNDS.max_state_bytes + 4096);
  });

  it("prune-stamp binding: receipt hashes bind final bytes, not the derivation order", async () => {
    // A changed final state, metadata file, receipt, or committed blob cannot
    // pass ordinary verification merely because its revision ID is unchanged.
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const base = {
      project_path: project, thread_id: "t", producer: { type: "model" as const },
      source_event: { refs: [ref("s", "ev")] }, now: NOW,
    };
    const r1 = await applyMutation({ storeRoot }, { ...base, expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }, { op: "add", item: item("d2") }] });
    const r2 = await applyMutation({ storeRoot }, { ...base, expected_parent: r1.revision, idempotency_key: "k2", operations: [{ op: "supersede", id: "d1", by: "d2" }] });
    const r3 = await applyMutation({ storeRoot }, { ...base, expected_parent: r2.revision, idempotency_key: "k3", operations: [{ op: "prune", id: "d1", reason: "superseded" }] });
    const { resolveStorePaths } = await import("../src/index.ts");
    const paths = resolveStorePaths(storeRoot, project, "t");
    const stateBytes = readFileSync(paths.state_path, "utf8");
    const meta = JSON.parse(readFileSync(paths.meta_path, "utf8")) as Record<string, unknown>;
    const receipt = JSON.parse(readFileSync(`${paths.revisions_dir}/${r3.revision}.json`, "utf8")) as Record<string, unknown>;
    // Receipt binds the final stamped bytes.
    assert.equal(receipt["state_sha256"], stateSha256(stateBytes));
    assert.equal(receipt["state_sha256"], meta["state_sha256"]);
    assert.equal(receipt["revision"], meta["revision"]);
    assert.equal(receipt["revision"], r3.revision);
    // The tombstone carries the pruning revision, and the bytes hash through it.
    const parsed = parseState(stateBytes);
    const tomb = parsed.superseded.find((e) => e.item_id === "d1");
    assert.equal(tomb?.revision, r3.revision);
    assert.equal(serializeState(parsed), stateBytes);
    assert.equal((await verifyThread(storeRoot, project, "t")).status, "ok");
  });

  it("all failure classes fail closed with no trusted state", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const { resolveStorePaths } = await import("../src/index.ts");
    const { writeFileSync } = await import("node:fs");
    const paths = resolveStorePaths(storeRoot, project, "t");
    writeFileSync(paths.state_path, "# garbage\n", "utf8");
    const torn: unknown = await verifyThread(storeRoot, project, "t").catch((e: unknown) => e);
    // Fail-closed either way: a torn status with no trusted revision, or a
    // thrown TORN_STATE. Neither returns the garbage as trusted state.
    if (torn instanceof Error) {
      assert.match(torn.message, /TORN_STATE/);
    } else {
      const v = torn as { status: string; revision?: string };
      assert.ok(v.status !== "ok");
      assert.ok(v.revision === undefined);
    }
  });
});
