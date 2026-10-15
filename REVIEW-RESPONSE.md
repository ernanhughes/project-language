# Response to the cross-review of `3239630`

A second AI reviewed this repository at commit `3239630af2755bead748c1a674fde515041e592a` and wrote its findings to `planning/reviews/part-one-code-review.md` in the `language` repository. This file answers every finding. Each is one of:

- **Fixed**: changed in code, with a regression test that reproduces the reviewer's case.
- **Limit**: true, and left; now stated where a reader will see it.
- **Not built**: needs work this project has not done, or needs a real model or real readers.
- **Prose**: belongs to the manuscript, not the code.

Two cautions that apply to the whole table. First, **the same author found and fixed these**, so a fix is a patch to the test that found the bug, not independent validation; the next review should try to break the fixes. Second, the review was made against `3239630`; some findings overlap weaknesses fixed earlier the same day (marked *already addressed*).

Test counts at the time of writing: 952 tests, 949 passing, 3 skipped (live-Postgres integration tests for the lifted `remembering` module), 0 failing; typecheck clean.

## Chapter 7: `core/record`

| Finding | Status | Notes |
|---|---|---|
| P1 Attached qualifiers vanish in record-derived views | **Fixed** | Diagram shows conditions on claims that are also relation endpoints; timeline shows conditions on ordered claims and on exception relations. Tests use the reviewer's reproduction. |
| P2 Table has no entry ids; "every line" test excludes tables | **Fixed** | Tables carry an `id` column for claims and relations. The "every line" test now covers diagram, timeline and every table row. |
| P2 `validateRecord` accepts an empty passage | **Fixed** | `EMPTY_PASSAGE`. |
| P2 `validateRecord` does not check `source_id` | **Fixed** | `SOURCE_MISMATCH`. |
| Tests: the field-list assertion is true by construction | **Fixed** | Replaced by an enforced schema: any field outside the allowed set is `UNKNOWN_FIELD`, so reader or rendering information cannot ride along on any record. |
| A qualifier's condition can be invented | **Fixed** | `CONDITION_NOT_IN_PASSAGE`: the condition (and the gap) must lie inside the passage it cites. |
| Host does not validate the record before rendering | **Fixed** | `render_from_record` refuses a record that fails validation. |
| Repeated quotations resolve to their first occurrence | **Limit** | `locate` returns the first occurrence; no chosen span is stored. |
| No semantic check that a label means what its passage says | **Limit** | By design: the record is a reading, and traceability is not faithfulness. |
| No concepts field, no extraction, no revision log | **Not built** | Unchanged. |

## Chapter 8: `core/sidecar`

| Finding | Status | Notes |
|---|---|---|
| P1 A derived item can carry arbitrary content | **Fixed** | A derived item's `content` is its quotation, verbatim; `validateItem` rejects anything else (`CONTENT_NOT_QUOTE`). The system's reading travels in a separate `gloss`, shown on its own line labelled "the system's words, not checked against the source". |
| P2 Missing source silently passes re-validation | **Fixed** | `SOURCE_UNAVAILABLE`. An anchor that cannot be checked is a failure. |
| P2 Retrieved items not checked against their pinned excerpt | **Fixed** | Content must equal the excerpt; the hash must be well formed (`EXTERNAL_MISMATCH`). The external document itself is still not re-read. |
| P2 Malformed stored objects can throw | **Fixed** | `MALFORMED`; the host also guards the call. |
| P2 The item id can be recomputed, so it shows integrity not authorship | **Limit** | Stated. The id is not authentication. |
| Test "not fed back into the model's context" overreaches | **Fixed** | Retitled: it shows nothing is added to the system prompt; the model's own tool calls still contain what it wrote. |
| A model can name `drew_on` ids that do not exist | **Fixed** | `DREW_ON_UNKNOWN`. |
| A model can flood the margin | **Fixed** | Cap on open candidates (`maxOpen`, default 8); proposals and searches are refused past it until the reader dismisses something. |
| Limits are any non-empty string | *Already addressed*, then extended | Vacuous, stub, non-limiting and pasted-boilerplate limits are refused. A hollow well-formed limit still passes (pinned). |
| Ledger events: only shown, used and dismissed are emitted | **Limit** | Stated in the example and README. The ledger counts supplied events; it observes no reader. |
| No person model; no fact-checking; no assumption comparison | **Not built** | Unchanged. |

## Chapter 9: `core/relations`

| Finding | Status | Notes |
|---|---|---|
| P1 A model can displace a human adjudication by asking for another label | **Fixed** | `effectiveRecords` (in the core): a person's adjudication is not displaced by a later non-adjudication. The host also refuses the relabel and does not record it. Test reproduces the reviewer's sequence. |
| P2 Adjudication clears all caveats even when the relation is kept | **Fixed** | The scope flag stays unless the person says the scope is shared (`confirms_scope`), or the relation they settle on does not depend on scope. |
| P2 The reader command cannot supply a direction | **Fixed** | `dir=<direction>` and `scope-confirmed` flags. |
| P2 Core `adjudicate` trusts the caller's `type: "human"` | **Limit** | The host command is the permission boundary, not authentication. Stated. |
| P2 Scope is string equality, only for support and contradiction | **Limit** | Stated. |
| Classifier misses an explicit update, a scope condition, a contradiction with no negation word | *Already addressed* in part | The update cue was added; the probe is no longer independent of it (an 8-pair regression set guards it). The other two remain. |
| The near-duplicate test cannot establish lack of value | **Limit** | "Adds nothing" is now measured as novelty against the text being read, over invented snippets. It shows the measure behaves; it does not show a reader finds the item worthless. |
| Task filtering is a fixed lookup | **Limit** | Not learned or measured relevance. |

## Chapter 10: `core/preservation`

| Finding | Status | Notes |
|---|---|---|
| P1 A check can be "validated" while an obligation has no probe | **Fixed** (already addressed, then pinned) | `unprobed` obligations keep the check unvalidated. The reviewer's exact declaration (`mustSay("positive")` + `mustNotSay("negative")` on "Alpha.") is now a test. A forbidden-claim obligation can be probed by giving it a sample of the forbidden claim. |
| P2 Instrument standing is a caller assertion | **Fixed** | A bare `"validated"` is not believed. `assess` believes an instrument only if it is a validation whose probes were run against the same obligations (compared by a hash of the obligations, not the declaration's timestamp). |
| P2 Timestamps unvalidated; declaration-before-generation not demonstrable in the browser | **Fixed** | Unparseable times throw (`INVALID_TIME`). The browser host declares its obligations once, before any submission, so the late-declaration flag can fire; a test makes it. |
| P2 `changeNumber` changes all numbers though its comment says the first | **Fixed** | First only. |
| Function measure does not establish answerability or effort | **Limit** | Narration now says "as a proxy". |
| Pattern order can accept negated claims; additions catch only numbers and absolute words | **Limit** | Stated in the README. |
| The `lens` report misses reversals and hedge-to-certainty | *Already addressed* | Order-, negation- and hedge-aware. Blind to an antonym swapped into a long sentence; false alarm on paraphrase (both pinned). |
| Keyword-stuffing | *Already addressed* | Anchored obligations; the probe shreds sentences. Copying key phrases around nonsense still passes (pinned). |

## Chapter 11: `core/ladder`

| Finding | Status | Notes |
|---|---|---|
| P1 Intent confirmation survives a change of reading | **Fixed** | A translation carries a fingerprint of the readings it rests on; a confirmation records the fingerprint it was given for; if the readings change it is reported as unasked and stale. Test reproduces the reviewer's sequence. |
| P2 A later model proposal unsets the human decision | **Fixed** | A proposal never displaces a settled or deferred decision. Only a person's later settle or defer does. |
| P2 `probeBinding` calls an invalid selector stable | **Fixed** | Stability requires valid selections; `invalid_selection` is reported. |
| P2 Editing a passage without updating its hash keeps old settlements | **Fixed** | The passage hash is recomputed at use, so an edit invalidates earlier resolutions (`STALE_BINDING`). |
| P2 The retry fixture counts failed attempts, not retries | **Fixed** | A retry is an attempt after the first; four attempts is allowed, five is not. Attempt numbering must be 1..n. |
| Translation relations are caller-supplied; the count of options set aside is bookkeeping | **Limit** | Stated. |
| A person may rubber-stamp the wrong meaning | **Limit** | Inherent. |
| Simulated selectors prove nothing about a model | **Limit** | Already stated; unchanged. |
| The Context Language Models paragraph may conflate the two records | **Prose** | An open question for the author, raised in the rewrite log. |

## Chapter 12: `core/browser`

| Finding | Status | Notes |
|---|---|---|
| P1 The row gate does not check the condition it claims to preserve | **Fixed** | The row and diagram obligations require the condition's actual words and the gap interval, not cue words. The instrument is probed by altering the condition's value and the gap's interval. The reviewer's case ("over ten seconds", "12:00 to 15:00") is refused. |
| P1 Evidence preservation is not enforced | **Fixed** | Each hypothesis must keep its evidence on its own row, with its type; each evidence arrow must keep its direction in the diagram. Probed by replacing the evidence with "none cited" and by reversing an arrow. |
| P1 An earlier acceptance overrides a later fallback; a third attempt is accepted | **Fixed** | The lifecycle lives in the core (`viewState`): a view is open until accepted or handed back; both are terminal. Further submissions are refused and not recorded. Only the reader reopens a task (`/browser reset <task>`). |
| P1 Record validation is not in the delivery path; annotations unchecked | **Fixed** | `browse` and the host validate the record first; if it fails, every view falls back to the source. Annotations carry only the condition and gap, which `validateRecord` now guarantees lie inside the cited passage; the system's gloss is left out. |
| The highlight is located but not rendered | **Fixed** | `/browser show look_up_fact <query>` reports where the passage is, or that it was not found; an empty query finds nothing. |
| The cost test measures nothing | **Fixed** | Retitled: it counts stages and measures no cost. |
| Stale narration: "core/language, the Chapter 7 record"; "simply ruled out" | **Fixed** | Both rewritten. |
| Source access alongside every accepted view; interactive margin Q&A; automatic extraction | **Not built** | Unchanged. |
| The record fixture lacks the remediation sequence and its exception; keeps a tension about the partition interval | **Not built** | Unchanged; stored as the source has it. |
| The gate governs `/browser`'s views, not arbitrary assistant messages | **Limit** | Stated. |
| Candidate additions and late flags do not affect `gateDecision` | **Limit** | Only instrument standing and obligation outcomes do. Stated. |

## Cross-cutting

| Finding | Status | Notes |
|---|---|---|
| Host independence of `core/` | Confirmed by the reviewer | A static import check; no second host has been tried. |
| Policy that belongs in the core lives in adapters | **Partly fixed** | Moved into the core with host-independent tests: relation precedence, the view lifecycle, the ladder's resolution rule and intent binding. Still in adapters: sidecar term matching, retrieval and derivation; the command parsing. |
| Nothing is rung D or E | **Limit** | Unchanged. Every fix here is a mechanism check with a scripted stand-in for the model. |
