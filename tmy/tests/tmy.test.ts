import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { feedUrl, parseFeed } from "../src/feed.ts";
import { parseSubscriptionsJson, parseTakeoutCsv } from "../src/subscriptions.ts";
import { parseInterest, type Interest } from "../src/interest.ts";
import { screen } from "../src/screen.ts";
import { JsonLedger, MemoryLedger } from "../src/ledger.ts";
import { FEED_SIZE, scan } from "../src/scan.ts";
import { renderDigest } from "../src/digest.ts";
import { CH_A, CH_B, CH_C, FEED_A, FEED_B, entry, feed } from "../fixtures/feeds.ts";

const INTEREST_TEXT = `purpose: Advance my agent work: evaluation, memory and context control.
terms: agent, evaluation, memory, context, retrieval, prompt engineering
avoid: giveaway
known: prompt engineering`;
const interest = parseInterest(INTEREST_TEXT);
const NOW = "2026-10-15T07:00:00.000Z";
const feeds: Record<string, string> = { [CH_A]: FEED_A, [CH_B]: FEED_B };
const fetchText = async (url: string) => { const id = /channel_id=([\w-]+)/.exec(url)![1]!; if (!feeds[id]) throw new Error("HTTP 404"); return feeds[id]!; };
const subs = [{ channelId: CH_A, title: "Agent Lab" }, { channelId: CH_B, title: "Cooking Daily" }, { channelId: CH_C, title: "Gone Channel" }];
const run = (ledger = new MemoryLedger(), i: Interest = interest, f = fetchText) => scan({ subscriptions: subs, interest: i, ledger, now: NOW, fetchText: f });

test("a channel feed parses: entities decoded, channel and video ids kept, a malformed entry refused alone", () => {
  const a = parseFeed(FEED_A);
  assert.equal(a.entries.length, 3);
  assert.equal(a.channelId, CH_A);
  assert.match(a.entries[0]!.description, /context control & compare/);
  assert.equal(a.entries[0]!.url, "https://www.youtube.com/watch?v=aaaaaaaaa01");
  const b = parseFeed(FEED_B);
  assert.equal(b.entries.length, 2);
  assert.deepEqual(b.refused.map(r => r.reason), ["missing or malformed video id"]);
  assert.throws(() => feedUrl("not-a-channel"), /INVALID_CHANNEL_ID/);
  assert.match(feedUrl(CH_A), /feeds\/videos\.xml\?channel_id=UCaaaa/);
});

test("Takeout subscriptions parse, quoted commas and a BOM included; bad and duplicate channels are reported, not dropped silently", () => {
  const csv = `﻿Channel Id,Channel Url,Channel Title\n${CH_A},http://www.youtube.com/channel/${CH_A},"Agent Lab, the sequel"\nnope,x,Bad\n${CH_A},x,Dup\n${CH_B},x,Cooking\n`;
  const p = parseTakeoutCsv(csv);
  assert.deepEqual(p.subscriptions.map(s => s.title), ["Agent Lab, the sequel", "Cooking"]);
  assert.deepEqual(p.refused.map(r => r.reason.replace(/:.*/, "")), ["not a channel id", "duplicate channel"]);
  assert.throws(() => parseTakeoutCsv("a,b\n1,2"), /NO_CHANNEL_ID_COLUMN/);
  assert.equal(parseSubscriptionsJson(JSON.stringify([{ channelId: CH_A, title: "T" }, { channelId: "x" }])).refused.length, 1);
});

test("the interest is the person's declared words: a purpose and terms are required", () => {
  assert.deepEqual(interest.terms, ["agent", "evaluation", "memory", "context", "retrieval", "prompt engineering"]);
  assert.throws(() => parseInterest("terms: a"), /INTEREST_NO_PURPOSE/);
  assert.throws(() => parseInterest("purpose: x"), /INTEREST_NO_TERMS/);
});

test("the screen: two terms look, one term is available, none is withheld with the admission that the transcript was not read", () => {
  const e = (title: string, description = "") => ({ videoId: "x".repeat(11), title, published: NOW, channelId: CH_A, channelName: "c", url: "u", description });
  assert.equal(screen(e("Agent memory in practice"), interest).verdict, "LOOK");
  const one = screen(e("Context for dummies", "a cooking channel"), interest);
  assert.equal(one.verdict, "AVAILABLE", "one term is weak evidence; a cooking channel can say context");
  const none = screen(e("Ten-minute pasta", "dinner"), interest);
  assert.equal(none.verdict, "WITHHOLD");
  assert.equal(none.cause, "no_interest_term");
  assert.match(none.reasons[0]!.text, /transcript was not read/);
  assert.equal(none.basis, "metadata");
});

test("an avoided word in the title withholds even when the description matches; a topic you know is listed, not pushed", () => {
  const e = (title: string, description = "") => ({ videoId: "x".repeat(11), title, published: NOW, channelId: CH_A, channelName: "c", url: "u", description });
  const g = screen(e("GIVEAWAY: win a GPU", "agent memory evaluation"), interest);
  assert.deepEqual([g.verdict, g.cause], ["WITHHOLD", "avoid_term"]);
  const k = screen(e("Prompt engineering basics", "prompt engineering for beginners"), interest);
  assert.deepEqual([k.verdict, k.cause], ["AVAILABLE", "known_topics_only"]);
});

test("whole words only: 'agentic' does not match 'agent'", () => {
  const e = { videoId: "y".repeat(11), title: "Agentic everything", published: NOW, channelId: CH_A, channelName: "c", url: "u", description: "" };
  assert.equal(screen(e, interest).verdict, "WITHHOLD");
});

test("a scan accounts for every entry exactly once and reports a channel it could not read", async () => {
  const r = await run();
  const a = r.channels.find(c => c.channelId === CH_A)!, b = r.channels.find(c => c.channelId === CH_B)!, c = r.channels.find(c => c.channelId === CH_C)!;
  assert.deepEqual([a.status, a.entries, a.new, a.already_seen], ["ok", 3, 3, 0]);
  assert.deepEqual([b.status, b.entries, b.refused, b.new], ["ok", 2, 1, 2]);
  assert.equal(c.status, "failed");
  assert.match(c.error!, /404/);
  assert.equal(r.decisions.length, 5);
  assert.equal(new Set(r.decisions.map(d => d.entry.videoId)).size, 5);
  const byVerdict = Object.fromEntries(["LOOK", "AVAILABLE", "WITHHOLD"].map(v => [v, r.decisions.filter(d => d.verdict === v).map(d => d.entry.videoId)]));
  assert.deepEqual(byVerdict["LOOK"], ["aaaaaaaaa01"]);
  assert.deepEqual(byVerdict["AVAILABLE"]!.sort(), ["aaaaaaaaa02", "bbbbbbbbb02"]);
  assert.deepEqual(byVerdict["WITHHOLD"]!.sort(), ["aaaaaaaaa03", "bbbbbbbbb01"]);
});

test("nothing is shown twice, and withheld videos are screened again only when the interest changes", async () => {
  const ledger = new MemoryLedger();
  await run(ledger);
  const again = await run(ledger);
  assert.equal(again.decisions.length, 0);
  assert.equal(again.channels.find(c => c.channelId === CH_A)!.already_seen, 3);
  const changed = parseInterest(INTEREST_TEXT.replace("terms: agent,", "terms: pasta, agent,"));
  const third = await run(ledger, changed);
  assert.deepEqual(third.decisions.map(d => d.entry.videoId).sort(), ["aaaaaaaaa03", "bbbbbbbbb01"], "only the withheld ones are looked at again");
  assert.equal(third.decisions.find(d => d.entry.videoId === "bbbbbbbbb01")!.verdict, "AVAILABLE", "pasta now matches");
});

test("a full feed in which everything is new warns of a possible gap; a feed with something already seen does not", async () => {
  const many = (n: number) => feed(CH_A, "Agent Lab", Array.from({ length: n }, (_, k) => entry(`v${String(k).padStart(10, "0")}`, `Agent memory ${k}`, "2026-10-14T09:00:00+00:00", "", "Agent Lab", CH_A)));
  const ledger = new MemoryLedger();
  const full = await scan({ subscriptions: [subs[0]!], interest, ledger, now: NOW, fetchText: async () => many(FEED_SIZE) });
  assert.equal(full.channels[0]!.possible_gap, true);
  const next = await scan({ subscriptions: [subs[0]!], interest, ledger, now: NOW, fetchText: async () => many(FEED_SIZE + 0) });
  assert.equal(next.channels[0]!.possible_gap, false);
  const small = await scan({ subscriptions: [subs[0]!], interest, ledger: new MemoryLedger(), now: NOW, fetchText: async () => many(3) });
  assert.equal(small.channels[0]!.possible_gap, false);
});

test("the digest names what to look at, what is available, what was not shown and why, and what the scan could not see", async () => {
  const r = await run();
  const md = renderDigest(r, interest, subs.length);
  assert.match(md, /## Look at these \(1\)/);
  assert.match(md, /Evaluating agents: a memory benchmark/);
  assert.match(md, /## Available, not pushed \(2\)/);
  assert.match(md, /## Not shown \(2\)/);
  assert.match(md, /\*\*avoid_term\*\*/);
  assert.match(md, /\*\*no_interest_term\*\*/);
  assert.match(md, /Could not read \*\*Gone Channel\*\*/);
  assert.match(md, /did not read any transcript/);
  assert.match(md, /1 feed entries were malformed/);
  assert.match(md, /from 2 of 3 channels/);
  for (const d of r.decisions) assert.equal(md.split(d.entry.title).length - 1, 1, `${d.entry.title} appears exactly once`);
  assert.doesNotMatch(md, /score/i);
});

test("the ledger persists to a file and reads back", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tmy-"));
  try {
    const path = join(dir, "sub", "ledger.json");
    await run(new JsonLedger(path));
    const back = new JsonLedger(path);
    assert.equal(back.all().length, 5);
    assert.equal(back.get("aaaaaaaaa01")!.verdict, "LOOK");
    assert.equal((await run(back)).decisions.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ─── resolving handles to channel ids ───────────────────────────────────────────────────────────────
import { channelIdFromHtml, parseHandleTsv, resolveHandles } from "../src/resolve.ts";
const pageFor = (id: string) => `<html><link rel="alternate" type="application/rss+xml" href="https://www.youtube.com/feeds/videos.xml?channel_id=${id}"><a href="/channel/UCzzzzzzzzzzzzzzzzzzzzzz">recommended</a></html>`;

test("handles parse from the tab-separated list; bad and duplicate handles are reported", () => {
  const p = parseHandleTsv("handle\tname\tsubscribers\n@Alpha\tAlpha Channel\t1.2k\nnot-a-handle\tX\t1\n@alpha\tDup\t2\n@Beta_1\tBeta\t3m\n");
  assert.deepEqual(p.rows.map(r => r.handle), ["@Alpha", "@Beta_1"]);
  assert.deepEqual(p.refused.map(r => r.reason.replace(/:.*/, "")), ["not a handle", "duplicate handle"]);
});

test("the channel id comes from the page's own RSS link, not from a recommended channel elsewhere on it", () => {
  assert.equal(channelIdFromHtml(pageFor(CH_A)), CH_A);
  assert.equal(channelIdFromHtml("<html>nothing here</html>"), null);
  assert.equal(channelIdFromHtml('<a href="/channel/UCzzzzzzzzzzzzzzzzzzzzzz">x</a>'), null);
});

test("resolving keeps what resolves, and reports a failure, a missing id and a duplicate channel by name", async () => {
  const pages: Record<string, string> = { "@A": pageFor(CH_A), "@B": "<html>no id</html>", "@C": pageFor(CH_A) };
  const rows = ["@A", "@B", "@C", "@D"].map(h => ({ handle: h, name: h.slice(1), subscribers: "" }));
  const r = await resolveHandles(rows, async url => { const h = decodeURIComponent(url.split("youtube.com/")[1]!); if (!(h in pages)) throw new Error("HTTP 404"); return pages[h]!; });
  assert.deepEqual(r.subscriptions, [{ channelId: CH_A, title: "A" }]);
  assert.deepEqual(r.failed.map(f => [f.handle, f.reason.replace(/@\w+/, "@x")]), [["@B", "no channel id found on the page"], ["@C", "same channel as @x"], ["@D", "HTTP 404"]]);
});

test("a real feed writes the channel id without its UC prefix; the parser restores it", () => {
  const p = parseFeed(FEED_A);
  assert.match(FEED_A, new RegExp(`<yt:channelId>${CH_A.slice(2)}</yt:channelId>`));
  assert.equal(p.channelId, CH_A);
  assert.ok(p.entries.every(e => e.channelId === CH_A));
});

test("a window leaves older videos out of the screen, counts them, says so in the digest, and does not record them", async () => {
  const ledger = new MemoryLedger();
  const r = await scan({ subscriptions: [subs[0]!], interest, ledger, now: "2026-10-14T12:00:00.000Z", windowDays: 1, fetchText: async () => FEED_A });
  const a = r.channels[0]!;
  assert.deepEqual([a.entries, a.new, a.older], [3, 1, 2]);
  assert.deepEqual(r.decisions.map(d => d.entry.videoId), ["aaaaaaaaa01"]);
  assert.equal(ledger.all().length, 1, "older entries are not recorded as decided");
  assert.match(renderDigest(r, interest, 1), /2 listed videos were older than the window/);
  assert.equal(a.possible_gap, false);
});

test("boilerplate far down a description does not count, and two terms found only in the description are not enough to push", () => {
  const e = (title: string, description: string) => ({ videoId: "z".repeat(11), title, published: NOW, channelId: CH_A, channelName: "c", url: "u", description });
  const buried = screen(e("Weekly update", "x ".repeat(400) + "agent memory evaluation context"), interest);
  assert.equal(buried.verdict, "WITHHOLD", "terms beyond the first 500 characters are not read");
  const two = screen(e("Weekly update", "this week: agent memory"), interest);
  assert.equal(two.verdict, "AVAILABLE", "two terms, none in the title");
  const four = screen(e("Weekly update", "agent memory evaluation context"), interest);
  assert.equal(four.verdict, "LOOK", "four terms in the part that is read");
  assert.equal(screen(e("Agent memory update", "x"), interest).verdict, "LOOK", "two terms, both in the title");
});
