// Check the preserved observation's files against the checksums recorded with it, byte for byte.
// Run from the repository root:  node experiments/context-admission-v1/verify-checksums.mjs <run-directory>
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: verify-checksums.mjs <run-directory>");
const sums = JSON.parse(readFileSync(resolve(dir, "checksums.json"), "utf8"));
let bad = 0;
for (const [file, expected] of Object.entries(sums)) {
  let actual;
  try { actual = createHash("sha256").update(readFileSync(resolve(dir, file))).digest("hex"); } catch { actual = "MISSING"; }
  const ok = actual === expected;
  if (!ok) bad++;
  console.log(`${ok ? "ok      " : "MISMATCH"} ${file}`);
}
console.log(bad === 0 ? `all ${Object.keys(sums).length} files match` : `${bad} of ${Object.keys(sums).length} do not match`);
process.exit(bad === 0 ? 0 : 1);
