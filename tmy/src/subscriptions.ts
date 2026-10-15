// Your subscriptions. Google Takeout writes them as subscriptions.csv:
//   Channel Id,Channel Url,Channel Title
// A plain JSON list of {channelId, title} works too. Invalid channel ids are reported, not silently skipped.
import { CHANNEL_ID } from "./feed.ts";

export interface Subscription { channelId: string; title: string }
export interface SubscriptionParse { subscriptions: Subscription[]; refused: { line: number; reason: string }[] }

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = false; else cur += c; }
    else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export function parseTakeoutCsv(csv: string): SubscriptionParse {
  const rows = csv.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim().length > 0);
  const subscriptions: Subscription[] = []; const refused: SubscriptionParse["refused"] = [];
  const header = splitCsvLine(rows[0] ?? "").map(h => h.trim().toLowerCase());
  const idCol = header.indexOf("channel id"); const titleCol = header.indexOf("channel title");
  if (idCol < 0) throw new Error("SUBSCRIPTIONS_NO_CHANNEL_ID_COLUMN");
  const seen = new Set<string>();
  rows.slice(1).forEach((row, k) => {
    const cells = splitCsvLine(row); const channelId = (cells[idCol] ?? "").trim();
    if (!CHANNEL_ID.test(channelId)) return void refused.push({ line: k + 2, reason: `not a channel id: ${JSON.stringify(channelId.slice(0, 30))}` });
    if (seen.has(channelId)) return void refused.push({ line: k + 2, reason: "duplicate channel" });
    seen.add(channelId);
    subscriptions.push({ channelId, title: (titleCol >= 0 ? cells[titleCol] : "")?.trim() || channelId });
  });
  return { subscriptions, refused };
}

export function parseSubscriptionsJson(json: string): SubscriptionParse {
  const raw = JSON.parse(json) as { channelId?: unknown; title?: unknown }[];
  const subscriptions: Subscription[] = []; const refused: SubscriptionParse["refused"] = [];
  raw.forEach((r, k) => {
    if (typeof r.channelId !== "string" || !CHANNEL_ID.test(r.channelId)) return void refused.push({ line: k + 1, reason: "not a channel id" });
    subscriptions.push({ channelId: r.channelId, title: typeof r.title === "string" && r.title ? r.title : r.channelId });
  });
  return { subscriptions, refused };
}
