#!/usr/bin/env node
/**
 * Zero-inference registration harness for the LANG-00 load check.
 * Drives the REAL compiled plugin setup against a fake host and asserts the
 * registration matrix. No model, no network, no user config.
 *
 * Usage: node scripts/load-harness.mjs   (cwd anywhere; uses temp dirs only)
 */
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import plugin from "../../../dist/src/plugin.js";
import { initThread, applyMutation } from "../../../dist/src/index.js";

const NOW = "2026-10-02T00:00:00.000Z";

function fakeHost(version = "2.0.21", projectDir = "C:/lang00/load project") {
  const hooks = [];
  return {
    hooks,
    ctx: {
      app: { version },
      location: { directory: projectDir, project: { directory: projectDir } },
      session: {
        hook: async (name, fn) => {
          hooks.push({ name, fn });
          return { dispose: async () => {} };
        },
      },
    },
  };
}

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`MISMATCH ${name}: got ${a}, want ${e}`);
    process.exitCode = 1;
  } else {
    console.log(`ok ${name}: ${a}`);
  }
}

async function main() {
  const keep = {};
  for (const k of ["OPENCODE_LANGUAGE_ENABLED", "OPENCODE_LANGUAGE_THREAD_ID", "OPENCODE_LANGUAGE_HOME", "OPENCODE_LANGUAGE_PROJECT"]) {
    keep[k] = process.env[k];
    delete process.env[k];
  }
  try {
    // Disabled: zero hooks.
    {
      const { hooks, ctx } = fakeHost();
      await plugin.setup(ctx);
      check("disabled", hooks.map((h) => h.name), []);
    }
    // Enabled with a real verified thread: exactly ["context"], injects once.
    const project = mkdtempSync(join(tmpdir(), "lang00 load project "));
    const storeRoot = mkdtempSync(join(tmpdir(), "lang00-load-store-"));
    const ref = (s, m) => ({ session_id: s, message_id: m, sha256: "c".repeat(64) });
    const init = await initThread({ storeRoot, projectPath: project, threadId: "load-01", idempotencyKey: "k0", producer: { type: "model" }, now: NOW });
    await applyMutation({ storeRoot }, {
      project_path: project, thread_id: "load-01", expected_parent: init.revision, idempotency_key: "k1",
      producer: { type: "model" }, source_event: { refs: [ref("s", "ev")] }, now: NOW,
      operations: [{ op: "add", item: { id: "d1", kind: "decision", text: "Load check.", actor: "user", standing: "explicit", scope: "load", sources: [ref("s", "m1")] } }],
    });
    process.env["OPENCODE_LANGUAGE_ENABLED"] = "1";
    process.env["OPENCODE_LANGUAGE_THREAD_ID"] = "load-01";
    process.env["OPENCODE_LANGUAGE_HOME"] = storeRoot;
    {
      const { hooks, ctx } = fakeHost("2.0.21", project);
      await plugin.setup(ctx);
      check("enabled", hooks.map((h) => h.name), ["context"]);
      const event = { sessionID: "s", agent: "a", model: { providerID: "p", id: "m" }, system: [{ type: "text", text: "base" }] };
      await hooks[0].fn(event);
      if (event.system.length !== 2) {
        console.error(`MISMATCH inject-once: got ${event.system.length} blocks`);
        process.exitCode = 1;
      } else {
        console.log("ok inject-once: 2 blocks");
      }
      await hooks[0].fn(event);
      if (event.system.length !== 2) {
        console.error("MISMATCH idempotent-hook: duplicate block");
        process.exitCode = 1;
      } else {
        console.log("ok idempotent-hook: still 2 blocks");
      }
    }
    // Bad host version fails clearly.
    delete process.env["OPENCODE_LANGUAGE_ENABLED"];
    {
      const { ctx } = fakeHost("1.0.0");
      let threw = false;
      try {
        process.env["OPENCODE_LANGUAGE_ENABLED"] = "1";
        await plugin.setup(ctx);
      } catch {
        threw = true;
      } finally {
        delete process.env["OPENCODE_LANGUAGE_ENABLED"];
      }
      if (!threw) {
        console.error("MISMATCH bad-version: setup should have thrown");
        process.exitCode = 1;
      } else {
        console.log("ok bad-version: setup threw clearly");
      }
    }
  } finally {
    for (const k of Object.keys(keep)) {
      if (keep[k] === undefined) delete process.env[k];
      else process.env[k] = keep[k];
    }
  }
}

await main();
