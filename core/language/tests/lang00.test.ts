import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);

function sha(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

describe("LANG-00 fixture reproducibility", () => {
  it("regeneration reproduces every frozen golden byte", async () => {
    const out = mkdtempSync(join(tmpdir(), "lang00-repro-"));
    const script = fileURLToPath(new URL("../../experiments/LANG-00/scripts/make-fixture.mjs", import.meta.url));
    await run(process.execPath, [script, out]);
    const hashesPath = fileURLToPath(new URL("../../experiments/LANG-00/expected/hashes.json", import.meta.url));
    const frozen = JSON.parse(readFileSync(hashesPath, "utf8")) as { files: Record<string, string> };
    for (const [rel, expected] of Object.entries(frozen.files)) {
      assert.equal(sha(readFileSync(join(out, rel), "utf8")), expected, rel);
    }
  });
});
