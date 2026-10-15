// Usage:
//   npm run tmy -- scan --subscriptions <subscriptions.csv|.json> --interest <interest.txt> [--ledger <file>] [--out <digest.md>] [--fixtures <dir>]
//
// With --fixtures <dir>, feeds are read from <dir>/<channelId>.xml and the network is not touched.
// Without it, each configured channel's public feed is fetched from youtube.com. Nothing else is fetched.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderDigest } from "./digest.ts";
import { parseInterest } from "./interest.ts";
import { JsonLedger, MemoryLedger } from "./ledger.ts";
import { scan } from "./scan.ts";
import { parseSubscriptionsJson, parseTakeoutCsv } from "./subscriptions.ts";

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const k = args.indexOf(`--${name}`); return k >= 0 ? args[k + 1] : undefined; };
if (args[0] !== "scan" || !opt("subscriptions") || !opt("interest")) {
  console.error("usage: npm run tmy -- scan --subscriptions <file> --interest <file> [--ledger <file>] [--out <file>] [--fixtures <dir>]");
  process.exit(2);
}
const subFile = opt("subscriptions")!;
const subText = readFileSync(subFile, "utf8");
const subs = subFile.endsWith(".json") ? parseSubscriptionsJson(subText) : parseTakeoutCsv(subText);
for (const r of subs.refused) console.error(`subscription line ${r.line} refused: ${r.reason}`);
const interest = parseInterest(readFileSync(opt("interest")!, "utf8"));
const ledger = opt("ledger") ? new JsonLedger(opt("ledger")!) : new MemoryLedger();
const fixtures = opt("fixtures");
const fetchText = fixtures
  ? async (url: string) => { const id = /channel_id=([\w-]+)/.exec(url)![1]!; const p = join(fixtures, `${id}.xml`); if (!existsSync(p)) throw new Error(`no fixture for ${id}`); return readFileSync(p, "utf8"); }
  : async (url: string) => { const res = await fetch(url, { headers: { "user-agent": "project-language-tmy/0.1" } }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); };
const result = await scan({ subscriptions: subs.subscriptions, interest, ledger, now: new Date().toISOString(), fetchText });
const digest = renderDigest(result, interest, subs.subscriptions.length);
if (opt("out")) { writeFileSync(opt("out")!, digest); console.log(`wrote ${opt("out")}`); } else console.log(digest);
