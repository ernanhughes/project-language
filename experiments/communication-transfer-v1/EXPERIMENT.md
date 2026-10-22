# TRANSFER-01 — Prospective experiment contract

Status: `SCAFFOLD_ONLY / MODEL_EXECUTION_NOT_AUTHORIZED / NO_HUMAN_BENEFIT_CLAIM`

## Research question

Does a versioned, source-linked and correction-capable communication packet allow AI B to reconstruct consequential information from AI A more reliably than an ordinary compressed message, under equivalent source, task, model and transfer budgets?

## Three roles

1. **AI A (sender):** sees the full source and task; creates a bounded message for B. Sender may not access gold labels or future judge output.
2. **AI B (receiver):** sees only the transmitted packet and allowed scoped context; answers independent questions and cites what it can support. Source-only reference arm explicitly exposes the entire source.
3. **AI C (advisory judge):** sees original source, task, and anonymized B output; rates each supported/unsupported claim and uncertainty. Its opinion is not gold; expert/adjudicated target answers are kept separately.

No direct A↔C or B↔C backchannel. No hidden provider conversation history. Freeze agent system prompts and exact model identifiers, generation/receiver quotas, network settings and observed wire bytes.

## First experimental arms

| Arm | Receiver input | Why |
|---|---|---|
| SOURCE | Full original source | Full-source comparator; not equal-bandwidth, not guaranteed better |
| PLAIN | Ordinary AI-A message | Baseline communication |
| LINKED | Same budget: authored source references, task and constraints | Controls whether provenance alone is enough |
| CONTEXT | Same budget: LINKED plus only authorised current/historical context | Incremental context/memory hypothesis |

Additional ablations (NOT in the first run): no history/current only, historical only, memory only, correction enabled/disabled, Taint observational feature, calibrated Hallucination Energy observer/intervention. Avoid a kitchen-sink arm and attributing its result to one factor.

## Corpus and judgement

Begin with 12–20 development items from openly permitted, pinned HaluEval summarisation plus 2–4 **original synthetic** unit cases. A future test corpus is disjoint by document/near-duplicate and by previously used Hallucination Energy calibration sources. Freeze all gold obligations independently (prefer blinded expert adjudication) **before** examining model responses. The dataset's right/hallucinated summary pairs provide adversarial controls but are not automatically independent semantic gold.

Focus on exception, negation, scope, uncertainty, provenance and unsupported additions. Also include cases where the correct answer is UNKNOWN or source-conflicted.

## Metrics and claims

Primary proposed metric: proportion of pre-specified critical reconstruction questions correctly answered with appropriate abstention, by item. Report separately: unsupported-addition rate; missed/strengthened qualifiers; correct references; response-format failures; elapsed time; input/output/transmitted tokens; total cost; and correction overhead. Show pairwise item-level results and uncertainty intervals, not just a judge score.

LLM C review must be blind to condition and remain advisory. Agreement of three models is not proof of semantic transfer. Hallucination Energy is a preregistered **secondary observer** only, if its calibrated implementation is available; compare against independent labels and report false positives/negatives. Do not collapse it into a hallucination probability or semantic truth.

## Data governance and context

Each memory item needs source, created time, relevance scope, current standing, permitted use, and expiry or retention rule. Keep declared instruction distinct from observation/inference. No real-user profile, private history, cross-user Taint or broad context harvesting. Candidate Taint is not user identity, and is never made an authority signal.

## Visualization requirements

Show A source and selected passage, message bytes leaving A, exact received message at B, relevant history/current context, B's reconstruction, C's comments, source/rubric reference, status of factual supports and additions, energy reading with status/calibration, and all token/cost/timing effects. Explicitly distinguish original evidence from AI output, human adjudication from AI advice, and SCRIPTED demo from LIVE run. Persist source and wire hashes, role IDs and versions.

## Authorisation gates

- Gate 0: Offline faux-agent smoke, contract tests and reproducible viewer (this scaffold).
- Gate 1: Pi adapter qualification using injected/faux providers, no real call.
- Gate 2: Dataset provenance, licence, pinned revision, contamination audit, independent criterion review.
- Gate 3: Explicit operator approval for exact models/routes, credentials, budget, max total calls, timeout and no retry/fallback.
- Gate 4: Small real-model feasibility pilot with completely recorded costs and failures; inspect adverse cases before separate held-out run.
- Gate 5: Predeclared held-out comparative evaluation and independent source-based human review; no automatic manuscript claim promotion.

No remote Git commit/push/publication or paid/local real-model inference is authorised by this scaffold.
