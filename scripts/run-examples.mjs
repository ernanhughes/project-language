// Run every example in turn and report which exited cleanly. No model is called.
// Usage: npm run examples
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const evidence = mkdtempSync(join(tmpdir(), "project-language-evidence-"));
const examples = [
	["example:conversation-state", []],
	["example:ch07", []],
	["example:ch08", []],
	["example:ch09", []],
	["example:ch10", []],
	["example:ch11", []],
	["example:ch12", []],
	// the admission example writes an evidence directory; keep it out of the repository
	["example:admission", ["--", "--output", join(evidence, "admission")]],
	["example:radar", []],
	["example:talk", []],
];
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
let failed = 0;
for (const [name, args] of examples) {
	const r = spawnSync(npm, ["run", "-s", name, ...args], { encoding: "utf8", shell: process.platform === "win32" });
	const ok = r.status === 0;
	if (!ok) failed++;
	console.log(`${ok ? "ok    " : "FAILED"} npm run ${name}`);
	if (!ok) console.log((r.stderr || r.stdout || "").split("\n").slice(-8).join("\n"));
}
console.log(failed === 0 ? `\nall ${examples.length} examples ran` : `\n${failed} of ${examples.length} failed`);
process.exit(failed === 0 ? 0 : 1);
