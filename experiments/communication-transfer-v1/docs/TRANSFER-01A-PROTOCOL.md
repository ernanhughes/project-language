# TRANSFER-01A — offline engineering protocol v0.2

Status: OFFLINE_ONLY. This adds Pi integration to the supplied v0.1 scaffold; it does not supersede its historical traces or authorize real inference. Model responses are explicitly scripted. No scientific or manuscript promotion is permitted.

## Implementation and visibility

The experiment calls the existing `harness/session.ts` twelve times: A, B and C for each of SOURCE, PLAIN, LINKED and CONTEXT. Each call gets a fresh temporary working directory, agent directory, in-memory session, resource loader and faux provider. There are no tools, context files, skills, prompt templates, extensions or cross-role conversations. The harness disables compaction and retries. Its header comment says 1.0.2; installed dependencies actually pin 1.0.4. No package versions were changed.

A gets the source, task and requested representation format, never reference labels. B gets exactly the serialized channel packet plus the fixed recipient system rules. Only SOURCE transmits the entire source. LINKED and CONTEXT carry actual quotations and UTF-16 start/end offsets, not inaccessible links. B has no fetch tool. C gets only original source, task and anonymous B output plus fixed advisory instructions. C sees no arm, model identity, authored reference, memory, preservation result or earlier conversation. Wording in a response can still reveal representational features; this is metadata blinding, not a guarantee of psychological blinding.

The host/viewer is privileged and shows all three contexts and authored criteria. Its visibility must not be confused with B's visibility. Captures include Pi's temporary working-directory system section and timestamps: evidence stays local and is not a privacy-sanitized publication archive. No credentials are recorded. Storage identities outside captured contexts are hashed.

## Contracts and reuse

| Layer | Existing contract reused | Limit |
|---|---|---|
| Identity | `core/language` canonical JSON and SHA-256 | Content identity, not meaning or verified conversation state |
| Claims | `core/record.validateRecord`, plus exact offset checks | Traceability, not entailment |
| Preservation | `core/preservation.declare/mustKeep/assess` | Uncalibrated lexical instrument; `not_checked` |
| Evidence/criteria | Preservation composes `core/evidence` structured observations and `core/verify` three-valued criteria | Observation does not become truth |
| Context | `core/personal.scopeCovers`, experiment-specific explicit synthetic consent gate | Does not replace full personal authority policy or create a real user profile |
| Retained selection | `core/remembering.selectCandidates` | Extra hard cap needed: existing selector can admit its first oversized item |
| Host | Existing `harness/session.ts`, real Pi AgentSession and fauxProvider | No new provider framework; no real inference |

The actual `host-pi/language.ts` verifies Git-backed threads before projection; this experiment has no accepted conversation thread, so it does not pretend its packet is one. `host-pi/preservation.ts` keeps declarations outside model control; this experiment does the same with fixture obligations. Persistent memory retrieval and semantic-state mutation are intentionally absent. New experiment-level packet and consent wrappers are needed because none of those cores defines a bounded three-party transfer experiment.

Schema `transfer/0.2`: task, source_id, message; optional selected claims `{id,quotation,source_span:{start,end}}`; optional context. Claim ids must be distinct and quotations/offsets must match source exactly. An audit selection accompanies A's output in all arms but is omitted from B's PLAIN wire.

Context items require id, DECLARED/OBSERVED/INFERRED kind, origin, ACTIVE status, scope, valid future expiry, explicit purpose/recipient/transmission permission, integer version, conflict ids, text and support standing. Stale, irrelevant, unconsented, unsupported, malformed and explicitly conflicting items are excluded with reasons. Neither recency nor inferred confidence resolves a conflict. Synthetic permission is a fixture declaration, not real human consent. A prompt-injection string remains data; faux tests establish role separation, not resistance by a real model.

Receipt `transfer-receipt/0.2` binds source hash, fixed rule hashes, exact provider contexts and their hashes, actual returned assistant JSON, delivery wire/hash/byte count, exclusions, authored assessment and preservation diagnostic. Corrections and refusals are explicit arrays; the basic successful run applies no corrections. Fresh output directories and `wx` writes refuse overwriting; manifest SHA-256 detects later modification. This is application-level write-once evidence, not filesystem WORM storage.

## Fair comparator and accounting

Same source, question, scripted selected claims, answer format, public rules and A/B/C call opportunities across conditions. Non-SOURCE receiver packets all have a 3,000 UTF-8-byte ceiling INCLUDING quotation metadata and context. Context consumes this budget; it is not a free extra channel. SOURCE is a separately reported high-information comparator with no equal-bandwidth claim. A role-level input cap is 24,000 bytes; output cap 6,000 bytes; shared run reservation 300,000 bytes, at most 12 calls, 15 seconds per call, zero retries and fallback. Reserve full output allowance before provider processing; reservations are not released after failure.

There is no model tokenizer or real provider usage in this milestone. Exact bytes and wall latency are measured; token counts remain UNKNOWN. Byte limits are not presented as matched model token budgets. A future live protocol must lock tokenizer-based aggregate input/output/thinking reservations and provider billing separately. Faux output byte limits and local timing do not qualify that future live runner. No executable real-model route exists here.

The primary four-arm run uses one relevant synthetic observed-context item. `runAblations()` actively runs three CONTEXT variants through real Pi sessions, with relevant, unrelated and contradictory history under one shared nine-call reservation. Unsupported/conflicting material is excluded before transmission. These are plumbing controls, not scores or findings.

## Assessment and failures

Authored synthetic reference assessment is separate from C. Exact answer comparison and verbatim quote support are mechanical diagnostics. A quote can be authentic while its interpretation is wrong. Neither repeated fields nor unanimous A/B/C agreement demonstrates comprehension. Independent human adjudication has not happened. The rubric in `ASSESSMENT-RUBRIC.md` was written in this implementation session and needs independent review; it is structurally separate, not independently validated.

Negative tests cover omitted condition, reversed scope, stale/unsupported memory, contradictions, context injection, missing/incorrect spans, introduced quotations, UNKNOWN, wrong answer endorsed by a biased judge, duplicate-source contamination and budget exhaustion. Failures are never repaired into passes. No correction loop, retries, fallback, automatic continuation or model output repair is implemented.

Hallucination Energy remains NOT_COMPUTED. A later observer requires implementation/calibration version, dev-only FP/FN against independently labelled unsupported additions and held-out separation. It must not be called a validated probability. Taint is excluded entirely: no identity, stable personality or permission inference is authorized.

Run gates remain: offline integration → independently reviewed corpus/rubric and contamination audit → approved prospective source/model/request lock and bounded live runner → explicitly authorized feasibility run. None is automatically promoted into a book claim.
