// Reconcile the file fingerprints recorded in a preserved observation with the files as committed.
//
// The first observation hashed working-copy bytes. On a CRLF checkout that differs from the committed
// (LF) bytes for text files, so a reader on another platform sees mismatches that are line endings only.
// This script does NOT change the original record. It writes a separate manifest saying, for each
// recorded fingerprint, whether the LF form, the CRLF form, the file as stored, or none of them matches.
//
// Run from the repository root:  node experiments/context-admission-v1/reconcile-fingerprints.mjs <run-directory>
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: reconcile-fingerprints.mjs <run-directory>");
const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const prov = JSON.parse(readFileSync(resolve(dir, "provenance.json"), "utf8"));
const rows = {};
const tally = { match_lf: 0, match_crlf: 0, match_raw: 0, changed_since_observation: 0, absent: 0 };
for (const [path, recorded] of Object.entries(prov.fingerprints)) {
  if (!existsSync(path)) { rows[path] = { recorded, status: "absent" }; tally.absent++; continue; }
  // The original run decoded every listed file as UTF-8 text, including one binary file. This does the same.
  const raw = readFileSync(path, "utf8");
  const lf = raw.replace(/\r\n/g, "\n");
  const lfHash = sha(lf);
  const crlfHash = sha(lf.replace(/\n/g, "\r\n"));
  const rawHash = sha(raw);
  const status = recorded === lfHash ? "match_lf" : recorded === crlfHash ? "match_crlf" : recorded === rawHash ? "match_raw" : "changed_since_observation";
  rows[path] = { recorded, lf_sha256: lfHash, crlf_sha256: crlfHash, raw_sha256: rawHash, status };
  tally[status]++;
}
const out = {
  note: "Derived from provenance.json and the files as committed. The original record is unchanged. match_crlf: the file is identical to the observed one except that the observation hashed CRLF line endings. match_raw: it matches as stored. changed_since_observation: the content differs and must be explained.",
  observation: prov.runId,
  files: Object.keys(rows).length,
  tally,
  files_by_path: rows,
};
writeFileSync(resolve(dir, "fingerprint-reconciliation.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ observation: prov.runId, ...tally }));
