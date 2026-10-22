# TRANSFER-01B pilot corpus v1 — proposed synthetic material

Status: **PROPOSED_UNADJUDICATED**. Two newly drafted synthetic tasks are in `fixtures/pilot-v1/`. Their source SHA-256 is stored and checked on load. They are development/review material, not a held-out benchmark. Their absence from model training is NOT_KNOWN.

| Task | Family | Source-bound distinctions | Proposed decisions |
|---|---|---|---|
| deployment-policy-v1 | Technical policy | Production versus staging; incident versus exception; rollback target and log-preservation conditions; unresolved third-party archive scope | NO / YES / UNKNOWN |
| study-interpretation-v1 | Research interpretation | Association versus causation; self-selection/confounding; scoped reporting versus general productivity; missing cross-domain observations | NO / YES / UNKNOWN |

Every fixture includes the exact source, source hash, question IDs/text, source-anchored claim spans, ordinary-message test double, expected supported decisions, permitted paraphrase alternatives, critical distinctions, plausible unsupported additions, abstention conditions, and separate task-author and independent-reviewer approval fields. Offsets are UTF-16 indices, not UTF-8 byte offsets. A hash establishes content identity, not independent truth.

Task-author identity is `AI_DRAFT_TRANSFER_01B`, with approval false. Independent-reviewer identity/date/hash are null and approval false. No human signatures or independent review have been invented. A single identity cannot approve both roles. Editing a source invalidates its hash and approval binding; any accepted changes need a new prospective version rather than replacement of historical receipts.

Both tasks have three fixed reconstruction questions. Reviewers should inspect whether UNKNOWN is preferable to a qualified NO for p3/r3; “not demonstrated” and “false” must remain distinct. They may document a permitted alternative before a real run. UNKNOWN caused by a lossy delivery is a possible capacity limitation, not automatically recipient failure. Primary results stay NOT_ADJUDICATED until independent source-bound assessment is available.

The SOURCE, PLAIN, LINKED and CONTEXT arms share source identity, all questions and the same public objective. SOURCE gets the complete original text and is a distinct information comparator. PLAIN gets the ordinary sender message. LINKED gets that message plus exact accessible quotations/spans. CONTEXT adds only scoped synthetic current/historical data, consuming the same 3,000-byte wire ceiling. Hash-only inaccessible source links are never counted as evidence delivered to B. Quote bytes and full-source bytes are reported separately; they do not certify equivalent semantic information.

CONTEXT variants are relevant, irrelevant, conflicting, expired and unavailable history. Only relevant valid history is admitted. Current context is separately labelled synthetic and only restates the interpretation/no-action boundary; it cannot override source obligations. No personal memory, account data or cross-project history is authorized.

HaluEval remains disabled under the existing import plan: its historical contamination ledger, exact licensed subset and exclusion review are unresolved. No external dataset content was downloaded or used. Fresh synthetic authorship avoids blocking this review on that ledger, but is not proof of model-training independence.
