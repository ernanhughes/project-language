# tmy — Too Much YouTube

A filter for a long list of subscriptions. It looks at what is new, decides from what you said you are working on what is worth your time, and tells you what it could not see. It is the book's Part II as a tool: too much information, a declared purpose, a decision for every item, a record of what was withheld and why, and an honest statement of coverage.

This replaces the older `C:\Projects\tmy` (Python, Postgres, Ollama embeddings). That project searched transcripts by similarity to a markdown file. The idea carried over; the mechanism did not, because similarity is not relevance (Chapters 9 and 15). What carried over: a list of channels, the latest videos per channel, transcripts with timestamps, and "what I am working on" as the thing everything is measured against. What changed: that statement is now a declared purpose with terms, not a vector; every video gets a decision with a reason; withheld videos stay listed and are re-screened if your interest changes; and the digest ends with what the scan could not see.

## Run

```text
npm run tmy -- scan --subscriptions tmy/sample/subscriptions.json --interest tmy/sample/interest.txt --fixtures tmy/sample/feeds
```

Add `--days 7` to screen only videos published in the last week (everything older is counted and reported, not screened). Without `--fixtures` it fetches each configured channel's public feed from youtube.com (`/feeds/videos.xml?channel_id=...`, about the 15 latest videos, no API key). Nothing else is fetched. Add `--ledger tmy/.data/ledger.json` to remember what has been decided, so nothing is shown twice, and `--out digest.md` to write the digest to a file.

Your subscriptions: the YouTube "All subscriptions" page lists name, @handle and subscriber count but not the channel id the feeds need. Save those as a tab-separated file (`handle<TAB>name<TAB>subscribers`, header first) and run `npm run tmy -- resolve --handles <file> --out <subscriptions.json>`; it looks each handle up once on youtube.com (about 0.7 s apart) and writes the ids. `npm run tmy -- snapshot --subscriptions <file> --out <dir>` saves every feed locally so the screen can be tuned offline with `--fixtures`. Or use Google Takeout exports `subscriptions.csv` (YouTube and YouTube Music, then subscriptions). Pass that file directly, or a JSON list of `{channelId, title}`.

Your interest is a short file of plain lines (see `tmy/sample/interest.txt`): `purpose`, `terms`, `avoid`, `known`.

## What it does now

1. Reads the feed of every configured channel. A channel that fails, a malformed entry and a feed that may have lost older videos are all reported, not swallowed.
2. Screens each new video on its title and the first 500 characters of its description only (the rest is usually links and sponsors): two of your terms, at least one in the title (or four in the description), means **look**; fewer means **available** (listed, not pushed); none means **withheld**; an avoided word in the title means **withheld**, and a topic you said you already know means **available**.
3. Writes a digest: what to look at, what is available, what was not shown and the reason for each, and what the scan could not see.

## What it does not do yet

- It does not read transcripts. The screen decides from titles and descriptions, so a video that matters and does not say so in either can be withheld; the digest says this on every run.
- It does not judge whether a video is good, or interesting in a way your terms do not capture. Terms are a baseline, not understanding. A model judge is the next step, and where it is used it must propose, with you deciding.
- It does not schedule itself, store anything in Postgres, or look at what you have already watched.
- Nothing measures whether the digest saves you time. That is untested.

## First real run (2026-10-15, a draft interest file)

195 subscriptions resolved, 195 feeds read, 169 videos from the last week screened. The first rule (two terms anywhere) pushed 49 videos, many on one generic word in a description; the second (above) pushes 19. Personal files live in `tmy/.data/`, which is git-ignored.

## Next slices (not built)

1. Transcript stage: fetch captions for the videos worth a closer look (English first), cut them into units with timestamps using `core/radar/src/attention/transcript.ts`, and judge them against the purpose.
2. A judge: a model proposes verdicts with reasons, the existing relevance rules (`relevance.ts`) hold it to them, and you accept or correct.
3. Knowledge: a graded state of what you already know, so new means new to you, not new to the channel.
4. A Postgres ledger and a daily run.

## Tests

`npm test` includes `tmy/tests/tmy.test.ts`. They use invented feeds (`tmy/fixtures/feeds.ts`) and never touch the network.
