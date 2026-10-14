import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  acceptHumanEdit,
  applyMutation,
  initThread,
  recoverThread,
  resolveStorePaths,
  verifyThread,
  LanguageError,
} from "../src/index.ts";
import { NOW, NOW2, item, makeProject, ref, tempDir } from "./helpers.ts";

function base(project: string) {
  return {
    project_path: project,
    thread_id: "t",
    producer: { type: "model" as const },
    source_event: { refs: [ref("s", "ev")] },
    now: NOW,
  };
}

describe("torn state and recovery", () => {
  it("detects torn state/metadata disagreement and refuses it as trusted", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    await applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    const paths = resolveStorePaths(storeRoot, project, "t");
    writeFileSync(paths.meta_path, "not json\n", "utf8");
    const result = await verifyThread(storeRoot, project, "t").catch((e: unknown) => e);
    // Unparseable metadata is torn: either a thrown TORN_STATE or a torn status.
    if (result instanceof LanguageError) assert.equal(result.code, "TORN_STATE");
    else assert.equal((result as { status: string }).status, "torn");
  });

  it("detects receipt/hash disagreement and finds the last valid revision", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const r1 = await applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    const paths = resolveStorePaths(storeRoot, project, "t");
    // Corrupt the working receipt bytes.
    writeFileSync(`${paths.revisions_dir}/${r1.revision}.json`, '{"tampered":true}\n', "utf8");
    const result = await verifyThread(storeRoot, project, "t");
    assert.ok(result.status === "torn" || result.status === "corrupt", result.status);
    assert.ok(result.last_valid_revision !== undefined);
  });

  it("explicit recovery restores the last valid revision without touching the source repo", async () => {
    const { listAll } = await import("./helpers.ts");
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const before = new Set(listAll(project));
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const r1 = await applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    const paths = resolveStorePaths(storeRoot, project, "t");
    writeFileSync(paths.state_path, "# garbage\n", "utf8");
    await assert.rejects(recoverThread(storeRoot, project, "t", false), /discard confirmation/);
    const recovered = await recoverThread(storeRoot, project, "t", true);
    assert.equal(recovered.revision, r1.revision);
    assert.equal((await verifyThread(storeRoot, project, "t")).status, "ok");
    assert.deepEqual(new Set(listAll(project)), before);
  });

  it("accepts a valid human edit with attribution and reason", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const r1 = await applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }, { op: "add", item: item("d2") }] });
    const paths = resolveStorePaths(storeRoot, project, "t");
    const { parseState, serializeState } = await import("../src/index.ts");
    const state = parseState(readFileSync(paths.state_path, "utf8"));
    const edited = state.items.map((i) => (i.id === "d1" ? { ...i, text: "human corrected text" } : i));
    writeFileSync(paths.state_path, serializeState({ schema: state.schema, items: edited, superseded: state.superseded }), "utf8");
    const accepted = await acceptHumanEdit({ storeRoot }, {
      projectPath: project, threadId: "t", expectedParent: r1.revision,
      idempotencyKey: "h1", sourceEvent: { refs: [ref("human-sess", "hm1")] }, now: NOW2,
    });
    assert.equal(accepted.origin, "human-edit");
    assert.equal((await verifyThread(storeRoot, project, "t")).revision, accepted.revision);
  });

  it("rejects malformed human edits without creating a revision", async () => {
    const { listHistory } = await import("../src/index.ts");
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const paths = resolveStorePaths(storeRoot, project, "t");
    writeFileSync(paths.state_path, "# not a state\n", "utf8");
    await assert.rejects(
      acceptHumanEdit({ storeRoot }, {
        projectPath: project, threadId: "t", expectedParent: init.revision,
        idempotencyKey: "h1", sourceEvent: { refs: [ref("hs", "hm")] }, now: NOW2,
      }),
      /does not parse|no-op/,
    );
    assert.equal((await listHistory(storeRoot, project, "t")).length, 1);
  });

  it("human removals require a reason and stay historically recoverable", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const r1 = await applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }, { op: "add", item: item("d2") }] });
    const paths = resolveStorePaths(storeRoot, project, "t");
    const { parseState, serializeState } = await import("../src/index.ts");
    const state = parseState(readFileSync(paths.state_path, "utf8"));
    const trimmed = { schema: state.schema, items: state.items.filter((i) => i.id !== "d1"), superseded: state.superseded };
    writeFileSync(paths.state_path, serializeState(trimmed), "utf8");
    await assert.rejects(
      acceptHumanEdit({ storeRoot }, {
        projectPath: project, threadId: "t", expectedParent: r1.revision,
        idempotencyKey: "h1", sourceEvent: { refs: [ref("hs", "hm")] }, now: NOW2,
      }),
      /require a reason/,
    );
    const accepted = await acceptHumanEdit({ storeRoot }, {
      projectPath: project, threadId: "t", expectedParent: r1.revision,
      idempotencyKey: "h1", sourceEvent: { refs: [ref("hs", "hm")] }, reason: "d1 was wrong", now: NOW2,
    });
    // The removed item remains recoverable through Git history.
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(execFile);
    const { stdout } = await run("git", ["show", `${accepted.git_commit}^:state.md`], { cwd: paths.thread_dir });
    assert.ok((stdout as string).includes("d1"));
  });

  it("automated mutation cannot silently overwrite a human correction", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const init = await initThread({ storeRoot, projectPath: project, threadId: "t", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    const r1 = await applyMutation({ storeRoot }, { ...base(project), expected_parent: init.revision, idempotency_key: "k1", operations: [{ op: "add", item: item("d1") }] });
    const paths = resolveStorePaths(storeRoot, project, "t");
    const { parseState, serializeState } = await import("../src/index.ts");
    const state = parseState(readFileSync(paths.state_path, "utf8"));
    writeFileSync(paths.state_path, serializeState({ schema: state.schema, items: state.items.map((i) => ({ ...i, text: "human text" })), superseded: state.superseded }), "utf8");
    const h = await acceptHumanEdit({ storeRoot }, {
      projectPath: project, threadId: "t", expectedParent: r1.revision,
      idempotencyKey: "hh", sourceEvent: { refs: [ref("hs", "hm")] }, now: NOW2,
    });
    await assert.rejects(
      applyMutation({ storeRoot }, { ...base(project), expected_parent: h.revision, idempotency_key: "k9", operations: [{ op: "revise", id: "d1", text: "model overwrite" }] }),
      (e: unknown) => e instanceof LanguageError && e.code === "HUMAN_GUARD",
    );
    // Explicit acknowledgement is non-silent and therefore permitted.
    const ok = await applyMutation({ storeRoot }, {
      ...base(project), expected_parent: h.revision, idempotency_key: "k10",
      operations: [{ op: "revise", id: "d1", text: "reviewed update", acknowledge_human: true }],
    });
    assert.equal(ok.idempotent_replay, false);
  });
});