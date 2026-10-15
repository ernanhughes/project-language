// One scan: fetch each configured channel's feed, screen what is new, and account for every entry exactly once.
import { feedUrl, parseFeed } from "./feed.ts";
import type { Interest } from "./interest.ts";
import { interestHash, type Ledger } from "./ledger.ts";
import { screen, type Decision } from "./screen.ts";
import type { Subscription } from "./subscriptions.ts";

export interface ChannelReport {
  channelId: string; title: string;
  status: "ok" | "failed";
  error?: string;
  entries: number; refused: number; already_seen: number; new: number;
  /** The feed shows only the latest videos. If it is full and all of it is new, older videos since the last scan may not appear. */
  possible_gap: boolean;
}
export interface ScanResult {
  scanned_at: string;
  interest_sha: string;
  decisions: Decision[];
  channels: ChannelReport[];
}
export const FEED_SIZE = 15;

export async function scan(i: {
  subscriptions: readonly Subscription[]; interest: Interest; ledger: Ledger; now: string;
  fetchText: (url: string) => Promise<string>;
}): Promise<ScanResult> {
  const sha = interestHash(i.interest);
  const decisions: Decision[] = []; const channels: ChannelReport[] = [];
  for (const sub of i.subscriptions) {
    const report: ChannelReport = { channelId: sub.channelId, title: sub.title, status: "ok", entries: 0, refused: 0, already_seen: 0, new: 0, possible_gap: false };
    try {
      const feed = parseFeed(await i.fetchText(feedUrl(sub.channelId)));
      report.entries = feed.entries.length; report.refused = feed.refused.length;
      for (const entry of feed.entries) {
        const seen = i.ledger.get(entry.videoId);
        // seen and shown or listed: do not decide again. Seen and withheld: decide again only if the interest has changed.
        if (seen && (seen.verdict !== "WITHHOLD" || seen.interest_sha === sha)) { report.already_seen++; continue; }
        const d = screen(entry, i.interest);
        decisions.push(d); report.new++;
        i.ledger.put({ videoId: entry.videoId, channelId: entry.channelId || sub.channelId, title: entry.title, verdict: d.verdict, cause: d.cause, decided_at: i.now, interest_sha: sha, policy: d.policy });
      }
      report.possible_gap = report.entries >= FEED_SIZE && report.already_seen === 0;
    } catch (e) {
      report.status = "failed"; report.error = String((e as Error).message ?? e).slice(0, 160);
    }
    channels.push(report);
  }
  i.ledger.save();
  return { scanned_at: i.now, interest_sha: sha, decisions, channels };
}
