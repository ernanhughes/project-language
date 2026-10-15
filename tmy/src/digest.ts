// The daily digest. It says what to look at, what is listed but not pushed, what was not shown and why, and what the scan
// could not see. Nothing is ranked by a total, and nothing that was dropped is dropped without a line saying so.
import type { Interest } from "./interest.ts";
import type { ScanResult } from "./scan.ts";
import type { Decision } from "./screen.ts";

const line = (d: Decision) => `- [${d.entry.title}](${d.entry.url}) — ${d.entry.channelName}, ${d.entry.published.slice(0, 10)}`;

export function renderDigest(r: ScanResult, interest: Interest, configuredChannels: number): string {
  const by = (v: Decision["verdict"]) => r.decisions.filter(d => d.verdict === v);
  const look = by("LOOK"), avail = by("AVAILABLE"), held = by("WITHHOLD");
  const failed = r.channels.filter(c => c.status === "failed");
  const gaps = r.channels.filter(c => c.possible_gap);
  const out: string[] = [];
  out.push(`# Too Much YouTube — ${r.scanned_at.slice(0, 10)}`, "", `Purpose, in your words: ${interest.purpose}`, "",
    `${r.decisions.length} new videos screened from ${r.channels.length - failed.length} of ${configuredChannels} channels. ${look.length} to look at, ${avail.length} available, ${held.length} not shown.`, "");
  out.push(`## Look at these (${look.length})`, "", ...(look.length ? look.flatMap(d => [line(d), `  - why: ${d.reasons.map(x => x.text).join("; ")}`]) : ["Nothing new matched strongly."]), "");
  out.push(`## Available, not pushed (${avail.length})`, "", ...(avail.length ? avail.flatMap(d => [line(d), `  - ${d.reasons.map(x => x.text).join("; ")}`]) : ["None."]), "");
  out.push(`## Not shown (${held.length})`, "");
  const causes = new Map<string, Decision[]>();
  for (const d of held) causes.set(d.cause ?? "other", [...(causes.get(d.cause ?? "other") ?? []), d]);
  if (held.length === 0) out.push("None.");
  for (const [cause, ds] of causes) {
    out.push(`**${cause}** (${ds.length}) — ${ds[0]!.reasons[0]!.text}`);
    for (const d of ds) out.push(`- ${d.entry.title} — ${d.entry.channelName}`);
    out.push("");
  }
  out.push("## What this scan could not see", "",
    "- It covers only the channels you configured, and only the latest videos each feed lists.",
    ...(r.channels.some(c => c.older) ? [`- ${r.channels.reduce((n, c) => n + c.older, 0)} listed videos were older than the window and were not screened.`] : []),
    "- It decided from titles and descriptions. It did not read any transcript, so a video that matters but does not say so in its title or description can be in the not-shown list.",
    ...failed.map(c => `- Could not read **${c.title}**: ${c.error}`),
    ...gaps.map(c => `- **${c.title}**: the feed was full and every entry was new, so older videos since the last scan may be missing.`),
    ...(r.channels.some(c => c.refused) ? [`- ${r.channels.reduce((n, c) => n + c.refused, 0)} feed entries were malformed and refused.`] : []),
    "- Whether the videos are good, or whether you would have chosen them, is not observed.", "");
  return out.join("\n");
}
