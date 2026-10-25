# Live source-anchor check

Status: COMPLETE — exploratory development, not validation.

One DeepSeek V4.1 Flash interpretation and two fresh Qwen3.8 Flash recipients were executed through the configured OpenCode Go provider. Three requests, three HTTP attempts, zero retries. Completion cap: 16,384 per request. Isolated request cap: three. Credentials came from OPENCODE_API_KEY in the process environment; no saved credentials were read.

Codex inspected the exact proposal and accepted its digest for communication under the user's instruction to test live calls. This was delegated AI test review, not independent human semantic adjudication. The acceptance API records LOCAL_OPERATOR; a preceding DELEGATED_TEST_REVIEW event records who actually inspected it. No external application actions were performed.

| Check | Ordinary | Language |
|---|---|---|
| Recipient decision | NO | NO |
| Schema | Pass | Pass |
| Exact source citations | 2/2 pass | 2/2 pass |
| Candidate decision reference | Agreement | Agreement |
| Local second-pass analysis | Complete | Complete |

Reference standing: UNADJUDICATED_REFERENCE. No observed false permission on this question. This one exposed development case shows no representation advantage, no completeness or independent understanding validation. The interpreter separated the first sentence into two meanings, retained UNKNOWN correctly and used source anchors. Its cautious unresolved-pronoun and extra ambiguity readings, and a SOURCE_STATED entry combining source quotation with interpretive uncertainty, remain semantic review points. Recipient wording such as “prohibited” also warrants scope review; a correct decision alone does not certify every explanation.

Provider-reported usage: 2,999 + 1,400 + 2,847 input tokens; 7,508 + 327 + 425 output tokens; total 15,506 tokens. Reported estimated total cost $0.01089979, not verified billing. No additional model calls for analysis.

Evidence includes source inventory, exact requests/prompts/catalogues, raw results, acceptance, packet hashes, both deliveries, both local analyses and cumulative journal. after-interpreter.json and start-report.html preserve the first-stage snapshot; after-recipients.json and accept-report.html preserve completion. start-manifest.json hashes events.jsonl as it existed after the first stage; the journal was subsequently appended. Its original hash is verifiable against the corresponding prefix. final-manifest.json hashes final file bytes.

Offline verification: all 79 Studio tests passed; seven focused protocol/catalogue tests passed; actual injected-response Chromium walkthrough passed. No commit or push. Historical user runs remain untouched.
