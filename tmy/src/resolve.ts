// Turn the handles on your "All subscriptions" page into channel ids, which the feed reader needs.
// The page lists name, @handle and subscriber count but not the channel id. A channel's own page does carry it
// (in its RSS link), so each handle is looked up once and the result saved.
import { CHANNEL_ID } from "./feed.ts";
import type { Subscription } from "./subscriptions.ts";

export interface HandleRow { handle: string; name: string; subscribers: string }
export interface HandleParse { rows: HandleRow[]; refused: { line: number; reason: string }[] }

/** Tab-separated: handle, name, subscribers. The first line is a header. */
export function parseHandleTsv(tsv: string): HandleParse {
  const lines = tsv.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows: HandleRow[] = []; const refused: HandleParse["refused"] = []; const seen = new Set<string>();
  lines.slice(1).forEach((line, k) => {
    const [handle = "", name = "", subscribers = ""] = line.split("\t").map(s => s.trim());
    if (!/^@[\w.\-·]+$/u.test(handle)) return void refused.push({ line: k + 2, reason: `not a handle: ${JSON.stringify(handle.slice(0, 40))}` });
    if (seen.has(handle.toLowerCase())) return void refused.push({ line: k + 2, reason: "duplicate handle" });
    seen.add(handle.toLowerCase());
    rows.push({ handle, name: name || handle, subscribers });
  });
  return { rows, refused };
}

/** The first channel id in a channel page's RSS link. Anything else on the page (a recommended channel) is ignored. */
export function channelIdFromHtml(html: string): string | null {
  const m = /feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/.exec(html) ?? /<meta itemprop="(?:identifier|channelId)" content="(UC[\w-]{22})"/.exec(html);
  return m && CHANNEL_ID.test(m[1]!) ? m[1]! : null;
}

export interface ResolveResult {
  subscriptions: Subscription[];
  failed: { handle: string; name: string; reason: string }[];
}
export async function resolveHandles(
  rows: readonly HandleRow[], fetchText: (url: string) => Promise<string>, opts: { delayMs?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<ResolveResult> {
  const subscriptions: Subscription[] = []; const failed: ResolveResult["failed"] = []; const byId = new Map<string, string>();
  for (const [k, row] of rows.entries()) {
    try {
      const id = channelIdFromHtml(await fetchText(`https://www.youtube.com/${encodeURIComponent(row.handle).replace("%40", "@")}`));
      if (!id) failed.push({ handle: row.handle, name: row.name, reason: "no channel id found on the page" });
      else if (byId.has(id)) failed.push({ handle: row.handle, name: row.name, reason: `same channel as ${byId.get(id)}` });
      else { byId.set(id, row.handle); subscriptions.push({ channelId: id, title: row.name }); }
    } catch (e) {
      failed.push({ handle: row.handle, name: row.name, reason: String((e as Error).message ?? e).slice(0, 120) });
    }
    opts.onProgress?.(k + 1, rows.length);
    if (opts.delayMs && k < rows.length - 1) await new Promise(r => setTimeout(r, opts.delayMs));
  }
  return { subscriptions, failed };
}
