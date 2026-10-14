import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { makeProject, tempDir } from "./helpers.ts";

const run = promisify(execFile);
const CLI = fileURLToPath(new URL("../src/cli.js", import.meta.url));

async function cli(storeRoot: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run(process.execPath, [CLI, "--store-root", storeRoot, ...args], { cwd: tempDir("lang-cwd-") });
    return { code: 0, stdout: stdout as string, stderr: stderr as string };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { code: e.code ?? 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

describe("local CLI", () => {
  it("covers init/show/verify/apply/history/render with structured output and exit codes", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const now = "2026-10-02T00:00:00.000Z";
    const init = await cli(storeRoot, ["init", "--project", project, "--thread", "t", "--key", "k0", "--now", now, "--json"]);
    assert.equal(init.code, 0, init.stderr);
    const initObj = JSON.parse(init.stdout) as { revision: string };
    assert.match(initObj.revision, /^rev_/);

    const show = await cli(storeRoot, ["show", "--project", project, "--thread", "t"]);
    assert.equal(show.code, 0, show.stderr);
    assert.ok(show.stdout.includes("# Communication state"));

    const verify = await cli(storeRoot, ["verify", "--project", project, "--thread", "t", "--json"]);
    assert.equal(verify.code, 0, verify.stderr);
    assert.equal((JSON.parse(verify.stdout) as { status: string }).status, "ok");

    const opsFile = `${storeRoot}/ops.json`;
    writeFileSync(opsFile, JSON.stringify([{ op: "add", item: { id: "d1", kind: "decision", text: "Decided", actor: "user", standing: "explicit", scope: "episode", sources: [{ session_id: "s", message_id: "m", sha256: "b".repeat(64) }] } }]), "utf8");
    const apply = await cli(storeRoot, ["apply", "--project", project, "--thread", "t", "--key", "k1", "--parent", initObj.revision, "--ops", opsFile, "--now", now, "--json"]);
    assert.equal(apply.code, 0, apply.stderr);

    const history = await cli(storeRoot, ["history", "--project", project, "--thread", "t", "--json"]);
    assert.equal(history.code, 0, history.stderr);
    assert.equal((JSON.parse(history.stdout) as unknown[]).length, 2);

    const render = await cli(storeRoot, ["render", "--project", project, "--thread", "t"]);
    assert.equal(render.code, 0, render.stderr);
    assert.ok(render.stdout.includes("<<<LANGUAGE-PROJECTION-START>>>"));
  });

  it("recover requires the discard flag and missing threads never fall back", async () => {
    const storeRoot = tempDir("lang-store-");
    const project = makeProject();
    const denied = await cli(storeRoot, ["recover", "--project", project, "--thread", "t"]);
    assert.notEqual(denied.code, 0);
    assert.match(denied.stderr, /discard/);
    const missing = await cli(storeRoot, ["show", "--project", project, "--thread", ""]);
    assert.notEqual(missing.code, 0);
  });

  it("help states the local-only non-goals", async () => {
    const storeRoot = tempDir("lang-store-");
    const help = await cli(storeRoot, ["help"]);
    assert.equal(help.code, 0);
    assert.ok(help.stdout.includes("local-only") || help.stdout.includes("No model call"));
  });
});
