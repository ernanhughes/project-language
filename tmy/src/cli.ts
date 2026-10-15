// Usage:
//   npm run tmy -- snapshot --subscriptions <file> --out <dir>      (save each channel's feed once, to tune offline with --fixtures)
//   npm run tmy -- resolve --handles <handles.tsv> --out <subscriptions.json>
//   npm run tmy -- scan --subscriptions <subscriptions.csv|.json> --interest <interest.txt> [--ledger <file>] [--out <digest.md>] [--fixtures <dir>] [--days <n>]
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
if (args[0] === "resolve") {
  if (!opt("handles") || !opt("out")) { console.error("usage: npm run tmy -- resolve --handles <handles.tsv> --out <subscriptions.json>"); process.exit(2); }
  const { parseHandleTsv, resolveHandles } = await import("./resolve.ts");
  const parsed = parseHandleTsv(readFileSync(opt("handles")!, "utf8"));
  for (const r of parsed.refused) console.error(`line ${r.line} refused: ${r.reason}`);
  console.log(`resolving ${parsed.rows.length} handles from youtube.com, one at a time`);
  const res = await resolveHandles(parsed.rows, async (url) => { const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 project-language-tmy/0.1", "accept-language": "en" } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }, { delayMs: Number(opt("delay") ?? 700), onProgress: (d, t) => { if (d % 25 === 0 || d === t) console.log(`  ${d}/${t}`); } });
  writeFileSync(opt("out")!, JSON.stringify(res.subscriptions, null, 2) + "\n");
  console.log(`resolved ${res.subscriptions.length}, failed ${res.failed.length}`);
  for (const f of res.failed) console.log(`  FAILED ${f.handle} (${f.name}): ${f.reason}`);
  process.exit(0);
}
if (args[0] === "snapshot") {
  if (!opt("subscriptions") || !opt("out")) { console.error("usage: npm run tmy -- snapshot --subscriptions <file> --out <dir>"); process.exit(2); }
  const { mkdirSync } = await import("node:fs");
  const { feedUrl } = await import("./feed.ts");
  const sf = opt("subscriptions")!; const st = readFileSync(sf, "utf8");
  const ss = sf.endsWith(".json") ? parseSubscriptionsJson(st) : parseTakeoutCsv(st);
  mkdirSync(opt("out")!, { recursive: true });
  let ok = 0; let bad = 0;
  for (const s of ss.subscriptions) {
    try { const r = await fetch(feedUrl(s.channelId), { headers: { "user-agent": "project-language-tmy/0.1" } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); writeFileSync(join(opt("out")!, `${s.channelId}.xml`), await r.text()); ok++; }
    catch (e) { bad++; console.log(`  FAILED ${s.title}: ${(e as Error).message}`); }
    await new Promise(r => setTimeout(r, Number(opt("delay") ?? 300)));
  }
  console.log(`saved ${ok} feeds to ${opt("out")}, ${bad} failed`);
  process.exit(0);
}
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
const result = await scan({ subscriptions: subs.subscriptions, interest, ledger, now: new Date().toISOString(), fetchText, ...(opt("days") ? { windowDays: Number(opt("days")) } : {}) });
const digest = renderDigest(result, interest, subs.subscriptions.length);
if (opt("out")) { writeFileSync(opt("out")!, digest); console.log(`wrote ${opt("out")}`); } else console.log(digest);
