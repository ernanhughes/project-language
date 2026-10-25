# Semantic decomposition qualification

These are exposed development materials, not held-out evidence. Read AUTHORING.md for reference independence limits and the Studio LC-02V report for what is and is not established.

Run from the implementation repository using a new output directory:

```powershell
node --test core/understanding/qualification/checker.test.mjs
node --experimental-transform-types core/understanding/qualification/run.mjs apps/language-demo/evidence/lc-02v-local-002
```

The second command runs only the local Python compiler. An optional third argument is a JSON array of captured model inventories. Each capture needs source.sha256, units with id/text/spans, model, call_id and origin HOSTED_CAPTURE or SCRIPTED. The schema is an analysis input, not an accepted communication packet. Existing interpreter Proposal evidence uses UTF-16 offsets: explicitly convert to codepoint offsets before supplying captures; never relabel offsets silently.

`reviewCandidates` checks source binding and proposes overlap links. It leaves semantic judgments UNKNOWN. `attachReview` records separate attributed advisory findings bound to exact candidate/reference hashes. It retains multiple reviews, including disagreements, without aggregating a score. Exact support spans demonstrate source identity, not entailment. No match may be a faithful paraphrase rather than an omission.

No API calls, credential access or automatic retries occur here. Use the existing Studio interpreter pipeline for any separately authorized extraction. Never turn candidate reference labels into acceptance or action authority.
