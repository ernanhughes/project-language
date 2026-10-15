// A channel's public Atom feed: the latest videos, with titles, dates and descriptions. No API key.
// https://www.youtube.com/feeds/videos.xml?channel_id=UC...   (about the 15 most recent videos)
//
// Malformed entries are refused one by one with a reason; one bad entry does not lose the others.
export interface FeedEntry {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  published: string;
  url: string;
  description: string;
}
export interface FeedParse {
  channelId: string | null;
  channelName: string | null;
  entries: FeedEntry[];
  refused: { index: number; reason: string }[];
}

export const CHANNEL_ID = /^UC[\w-]{22}$/;
export const VIDEO_ID = /^[\w-]{11}$/;
export const feedUrl = (channelId: string): string => {
  if (!CHANNEL_ID.test(channelId)) throw new Error(`INVALID_CHANNEL_ID: ${JSON.stringify(channelId)}`);
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
};

/** Real feeds write the channel id without its leading UC. */
export const normaliseChannelId = (id: string | null): string | null => (id === null ? null : /^[\w-]{22}$/.test(id) ? `UC${id}` : id);
const decode = (s: string): string => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
const tag = (xml: string, name: string): string | null => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decode(m[1]!.trim()) : null;
};

export function parseFeed(xml: string): FeedParse {
  const head = xml.split("<entry>")[0] ?? "";
  const channelId = normaliseChannelId(tag(head, "yt:channelId"));
  const channelName = tag(head.slice(head.indexOf("<author>")), "name") ?? tag(head, "title");
  const parts = xml.split("<entry>").slice(1);
  const entries: FeedEntry[] = []; const refused: FeedParse["refused"] = [];
  parts.forEach((raw, index) => {
    const block = raw.split("</entry>")[0]!;
    const videoId = tag(block, "yt:videoId"); const title = tag(block, "title"); const published = tag(block, "published");
    if (!videoId || !VIDEO_ID.test(videoId)) return void refused.push({ index, reason: "missing or malformed video id" });
    if (!title) return void refused.push({ index, reason: "missing title" });
    if (!published || Number.isNaN(Date.parse(published))) return void refused.push({ index, reason: "missing or unparseable date" });
    entries.push({
      videoId, title, published,
      channelId: normaliseChannelId(tag(block, "yt:channelId")) ?? channelId ?? "",
      channelName: tag(block.slice(Math.max(0, block.indexOf("<author>"))), "name") ?? channelName ?? "",
      url: `https://www.youtube.com/watch?v=${videoId}`,
      description: tag(block, "media:description") ?? "",
    });
  });
  return { channelId, channelName, entries, refused };
}
