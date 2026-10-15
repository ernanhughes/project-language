// Invented channel feeds in YouTube's Atom shape. Titles, channels and ids are made up for this repository.
export const CH_A = "UCaaaaaaaaaaaaaaaaaaaaaa";
export const CH_B = "UCbbbbbbbbbbbbbbbbbbbbbb";
export const CH_C = "UCcccccccccccccccccccccc";

export const entry = (videoId: string, title: string, published: string, description: string, channel: string, channelId: string) => `
  <entry>
    <id>yt:video:${videoId}</id>
    <yt:videoId>${videoId}</yt:videoId>
    <yt:channelId>${channelId}</yt:channelId>
    <title>${title}</title>
    <published>${published}</published>
    <author><name>${channel}</name></author>
    <media:group><media:description>${description}</media:description></media:group>
  </entry>`;

export const feed = (channelId: string, channel: string, entries: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <yt:channelId>${channelId}</yt:channelId>
  <title>${channel}</title>
  <author><name>${channel}</name></author>${entries.join("")}
</feed>`;

export const FEED_A = feed(CH_A, "Agent Lab", [
  entry("aaaaaaaaa01", "Evaluating agents: a memory benchmark", "2026-10-14T09:00:00+00:00", "We build an evaluation for agent memory and context control &amp; compare retrieval strategies.", "Agent Lab", CH_A),
  entry("aaaaaaaaa02", "Prompt engineering basics", "2026-10-13T09:00:00+00:00", "A tour of prompt engineering for beginners.", "Agent Lab", CH_A),
  entry("aaaaaaaaa03", "GIVEAWAY: win a GPU", "2026-10-12T09:00:00+00:00", "Enter now. Also mentions agent hardware.", "Agent Lab", CH_A),
]);
export const FEED_B = feed(CH_B, "Cooking Daily", [
  entry("bbbbbbbbb01", "Ten-minute pasta", "2026-10-14T10:00:00+00:00", "Dinner in ten minutes.", "Cooking Daily", CH_B),
  entry("bbbbbbbbb02", "Context for dummies", "2026-10-13T10:00:00+00:00", "A cooking channel using the word context once.", "Cooking Daily", CH_B),
  "<entry><title>no id here</title></entry>",
]);
