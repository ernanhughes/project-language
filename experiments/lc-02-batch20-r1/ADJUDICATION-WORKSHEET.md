# LC-02-BATCH20-R1 provisional semantic-adjudication worksheet

**Standing:** implementation-team provisional judgment, not independent human adjudication. The frozen oracle and retrospective scores are unchanged. Source and question are shown before arm identities and model answers.

## Summary of frozen scores (unchanged)

| Arm | Exact matches to frozen oracle |
|---|---|
| A | 18 / 20 |
| B | 14 / 20 |
| C | 14 / 20 |

These are the same unadjusted reference matches reported in `COMBINED-001`. They are not semantic-understanding scores.

## Source-first case blocks

Read the source and question first. The arm ledger follows after these blocks.

### LC20-01 — Readiness versus authorisation

**Source:** The deployment rehearsal completed successfully and the readiness report is green. A green report establishes that the proposed package passed rehearsal checks; it does not authorise production rollout. Every production rollout requires separate sign-off from the service owner. No service-owner sign-off has been issued for release R17.

**Question:** Can the coordinator roll out release R17 to production now?

**Frozen reference:** NO (unadjudicated) · **Provisional source-relative reading:** NO (CLEAR)

**Key exact spans:**
- `161..201` — “it does not authorise production rollout”
- `203..277` — “Every production rollout requires separate sign-off from the service owner”
- `279..336` — “No service-owner sign-off has been issued for release R17”

### LC20-02 — Narrow emergency permission satisfied

**Source:** An incident operator may restore a service into the isolated recovery environment before the normal change review, but only if a signed known-good image is used and the audit log remains intact. Such a restore must not expose the recovery environment to customers. For incident I42 the image signature was verified, the audit log is intact, and the target is the isolated recovery environment. The operator is proposing only this private restore.

**Question:** May the operator perform the proposed private restore for incident I42 before normal review?

**Frozen reference:** YES (unadjudicated) · **Provisional source-relative reading:** UNKNOWN (DISPUTED)

**Key exact spans:**
- `21..113` — “may restore a service into the isolated recovery environment before the normal change review”
- `119..160` — “only if a signed known-good image is used”
- `265..392` — “For incident I42 the image signature was verified, the audit log is intact, and the target is the isolated recovery environment”

### LC20-03 — Unresolved vendor status

**Source:** The storage service may keep an encrypted on-premises recovery snapshot for fourteen days. Whether the outside replication vendor may retain its own recovery copy has not been decided. The current record contains neither an approval nor a denial of vendor retention. The service owner will decide after the privacy review.

**Question:** Has the outside replication vendor been approved to retain its recovery copy?

**Frozen reference:** UNKNOWN (unadjudicated) · **Provisional source-relative reading:** UNKNOWN (DISPUTED)

**Key exact spans:**
- `91..183` — “Whether the outside replication vendor may retain its own recovery copy has not been decided”
- `185..265` — “The current record contains neither an approval nor a denial of vendor retention”

### LC20-04 — Synthetic data boundary

**Source:** The rehearsal dataset consists entirely of synthetic test accounts. The runbook permits the test team to copy those synthetic accounts to the validation environment. The permission does not cover customer accounts or production customer records. The requested copy contains twenty production customer records.

**Question:** Does this rehearsal permission allow the requested copy containing production customer records?

**Frozen reference:** NO (unadjudicated) · **Provisional source-relative reading:** NO (CLEAR)

**Key exact spans:**
- `166..244` — “The permission does not cover customer accounts or production customer records”
- `246..308` — “The requested copy contains twenty production customer records”

### LC20-05 — Quoted instruction versus operative direction

**Source:** Interviewer: What did the old handbook say? Engineer: It said, “Delete all audit records after a rollback.” Interviewer: Is that instruction in force now? Engineer: No. The current policy requires preserving all audit records and the old handbook has been retired.

**Question:** Does the current policy instruct operators to delete audit records after rollback?

**Frozen reference:** NO (unadjudicated) · **Provisional source-relative reading:** NO (CLEAR)

**Key exact spans:**
- `54..107` — “It said, “Delete all audit records after a rollback.””
- `165..263` — “No. The current policy requires preserving all audit records and the old handbook has been retired”

### LC20-06 — Missing evidence versus explicit failure

**Source:** The weekend deployment checklist requires an independent reviewer to sign the release note. The operations log records the build hash and the rehearsal result. It contains no reviewer-signature entry, but the operations log is not the repository where signatures are stored. No independent review status is provided in the available documents.

**Question:** Has the requirement for an independent reviewer signature been satisfied?

**Frozen reference:** UNKNOWN (unadjudicated) · **Provisional source-relative reading:** UNKNOWN (CLEAR)

**Key exact spans:**
- `205..273` — “the operations log is not the repository where signatures are stored”
- `275..342` — “No independent review status is provided in the available documents”

### LC20-07 — Conjunctive approval conditions

**Source:** A release candidate can be sent to the staging cluster once security review and release-management review have both been accepted. Neither review may substitute for the other. The security review of candidate K8 is accepted. Release management recorded acceptance of K8 yesterday. Staging is separate from production and this policy makes no production deployment grant.

**Question:** May candidate K8 be sent to staging under this policy?

**Frozen reference:** YES (unadjudicated) · **Provisional source-relative reading:** YES (CLEAR_WITH_MINOR_WORDING)

**Key exact spans:**
- `60..129` — “security review and release-management review have both been accepted”
- `176..223` — “The security review of candidate K8 is accepted”
- `225..279` — “Release management recorded acceptance of K8 yesterday”

### LC20-08 — Security exception limited by later clause

**Source:** Routine credentials must remain in the encrypted vault. During an outage, operators may retrieve the backup credential into a temporary isolated terminal for diagnostics if an incident ticket is open. This exception does not allow posting the credential in a shared chat or copying it into a public issue. Incident ticket Q12 is open and an operator proposes posting the credential into the incident chat.

**Question:** Does the outage exception permit the operator to post the credential in the shared incident chat?

**Frozen reference:** NO (unadjudicated) · **Provisional source-relative reading:** NO (CLEAR)

**Key exact spans:**
- `201..270` — “This exception does not allow posting the credential in a shared chat”
- `338..404` — “an operator proposes posting the credential into the incident chat”

### LC20-09 — Unspecified retention interval

**Source:** The backup policy requires weekly snapshots. Only the latest three weekly snapshots are guaranteed to remain accessible through the automated portal. The policy does not state how long older offline archives may be retained. An archive from six weeks ago is held off-site, and no retention schedule for that storage location is provided.

**Question:** Is the six-week-old off-site archive required to have been deleted by now?

**Frozen reference:** UNKNOWN (unadjudicated) · **Provisional source-relative reading:** UNKNOWN (DISPUTED)

**Key exact spans:**
- `161..223` — “does not state how long older offline archives may be retained”
- `277..336` — “no retention schedule for that storage location is provided”

### LC20-10 — Conditional escalation threshold

**Source:** The incident desk may page the on-call database engineer when replication lag stays above twenty seconds for at least five continuous minutes. The dashboard shows lag above twenty seconds for the last seven uninterrupted minutes. The alert was measured on the production replica specified by the policy. Paging is permitted; restarting the replica still requires a separate incident command.

**Question:** May the incident desk page the on-call database engineer now?

**Frozen reference:** YES (unadjudicated) · **Provisional source-relative reading:** YES (CLEAR)

**Key exact spans:**
- `18..141` — “may page the on-call database engineer when replication lag stays above twenty seconds for at least five continuous minutes”
- `143..228` — “The dashboard shows lag above twenty seconds for the last seven uninterrupted minutes”
- `230..302` — “The alert was measured on the production replica specified by the policy”
- `304..323` — “Paging is permitted”

### LC20-11 — Possibility versus permission

**Source:** A failed checksum may indicate that the replica is stale. The investigation note offers this as one possible explanation, not a verified cause. The note does not grant an operator permission to discard the replica. Replica deletion remains subject to the separate change-control policy, which is not included here.

**Question:** Does the investigation note authorise an operator to delete the replica?

**Frozen reference:** NO (unadjudicated) · **Provisional source-relative reading:** NO (CLEAR)

**Key exact spans:**
- `153..213` — “does not grant an operator permission to discard the replica”
- `215..285` — “Replica deletion remains subject to the separate change-control policy”

### LC20-12 — Future decision explicitly unresolved

**Source:** The vendor asked to replicate an internal diagnostic snapshot next quarter. The source policy says the privacy team has not yet decided whether vendor replication will be authorised. The privacy team will announce its decision after completing a supplier assessment. No future decision or commitment is recorded.

**Question:** Will the privacy team approve the vendor replication request next quarter?

**Frozen reference:** UNKNOWN (unadjudicated) · **Provisional source-relative reading:** UNKNOWN (CLEAR)

**Key exact spans:**
- `116..181` — “has not yet decided whether vendor replication will be authorised”
- `267..311` — “No future decision or commitment is recorded”

### LC20-13 — Speaker attribution with qualified internal approval

**Source:** Reviewer: Can the draft go to the internal working group? Chair: Yes, I approve circulating the draft inside that group. Reviewer: Is it also approved for public publication? Chair: No. Publication requires a separate editorial vote that has not happened. Editor: I will prepare the group copy only.

**Question:** May the editor circulate the draft inside the internal working group?

**Frozen reference:** YES (unadjudicated) · **Provisional source-relative reading:** YES (CLEAR)

**Key exact spans:**
- `65..119` — “Yes, I approve circulating the draft inside that group”
- `186..254` — “Publication requires a separate editorial vote that has not happened”

### LC20-14 — Obsolete quoted rule

**Source:** Host: Someone posted “All candidates are automatically approved when tests pass.” Is that the present rule? Compliance lead: No, that was a discarded draft from last year. The current release policy requires a named approver for every deployment. Host: Does a clean test report waive that approver? Compliance lead: It does not.

**Question:** Under the current release policy, may a candidate be deployed solely because tests pass?

**Frozen reference:** NO (unadjudicated) · **Provisional source-relative reading:** NO (CLEAR)

**Key exact spans:**
- `129..170` — “that was a discarded draft from last year”
- `199..245` — “requires a named approver for every deployment”
- `316..327` — “It does not”

### LC20-15 — Narrative rule and event

**Source:** In the city of Halden, the night bridge may be crossed only while its blue lantern is burning. The keeper lit the blue lantern at midnight and guarded it until sunrise. Mara reached the bridge an hour after midnight, saw the lantern still burning, and walked across. Nothing else in the story restricts her crossing.

**Question:** Under the fictional city rule, was Mara permitted to cross when she did?

**Frozen reference:** YES (unadjudicated) · **Provisional source-relative reading:** YES (CLEAR)

**Key exact spans:**
- `40..93` — “may be crossed only while its blue lantern is burning”
- `169..246` — “Mara reached the bridge an hour after midnight, saw the lantern still burning”

### LC20-16 — Unreliable witness and undetermined event

**Source:** Nera heard a crash somewhere beyond the locked conservatory. She thought the glass door might have broken, but she could not see the door from the corridor. In the next scene the narrator says only that the conservatory remained closed. No character inspected the glass and the narrator never confirmed its condition.

**Question:** Did the glass door definitely break?

**Frozen reference:** UNKNOWN (unadjudicated) · **Provisional source-relative reading:** UNKNOWN (DISPUTED)

**Key exact spans:**
- `88..105` — “might have broken”
- `111..137` — “she could not see the door”
- `274..316` — “the narrator never confirmed its condition”

### LC20-17 — Distinct approval roles

**Source:** The change committee approved the release design and the security lead approved the test plan. Neither approval authorises deployment. A deployment is permitted only after the production owner signs a release grant for that particular version. No production-owner grant has been signed for version V9, although the other two approvals are recorded.

**Question:** May version V9 now be deployed to production?

**Frozen reference:** NO (unadjudicated) · **Provisional source-relative reading:** NO (CLEAR)

**Key exact spans:**
- `95..133` — “Neither approval authorises deployment”
- `161..214` — “only after the production owner signs a release grant”
- `244..300` — “No production-owner grant has been signed for version V9”

### LC20-18 — Inclusive versus exclusive threshold

**Source:** The internal review queue accepts a batch if it contains no more than forty records. Batches with forty-one or more records must be split before submission. The proposed batch contains exactly forty records. The quota concerns this internal review queue and does not say anything about public release.

**Question:** May the exactly-forty-record batch be submitted to the internal review queue without splitting?

**Frozen reference:** YES (unadjudicated) · **Provisional source-relative reading:** YES (CLEAR)

**Key exact spans:**
- `57..83` — “no more than forty records”
- `98..137` — “forty-one or more records must be split”
- `185..206` — “exactly forty records”

### LC20-19 — Explicit deadline and time zone

**Source:** The service-owner-approved exception window closes at 17:00 UTC on 16 October 2026. Requests timestamped after the closing time are outside the exception and require fresh owner approval. The system recorded the proposed request at 18:00 UTC on 16 October 2026. No fresh approval has been recorded.

**Question:** Can this request use the original exception without new owner approval?

**Frozen reference:** NO (unadjudicated) · **Provisional source-relative reading:** NO (DEFENSIBLE_AMBIGUITY)

**Key exact spans:**
- `84..153` — “Requests timestamped after the closing time are outside the exception”
- `188..260` — “The system recorded the proposed request at 18:00 UTC on 16 October 2026”
- `262..297` — “No fresh approval has been recorded”

### LC20-20 — Unresolved contradictory provisions

**Source:** The current policy excerpt says, “After the readiness review passes, the operations lead may publish the internal report.” The next paragraph of the same version says, “The operations lead must never publish that internal report, including after a passed readiness review.” Both paragraphs carry the same effective date. The excerpt provides no precedence rule, correction notice, or authority to resolve the conflict.

**Question:** Does this policy unambiguously permit the operations lead to publish the internal report after a passed review?

**Frozen reference:** SOURCE_CONFLICT (unadjudicated) · **Provisional source-relative reading:** SOURCE_CONFLICT (CLEAR)

**Key exact spans:**
- `89..120` — “may publish the internal report”
- `189..228` — “must never publish that internal report”
- `342..417` — “no precedence rule, correction notice, or authority to resolve the conflict”

## Provisional source-relative status

| Arm | Correct | Acceptable alternative | Overcautious | Overconfident | Mechanical |
|---|---:|---:|---:|---:|---:|
| A | 17 | 1 | 0 | 1 | 1 |
| B | 15 | 3 | 2 | 0 | 0 |
| C | 15 | 2 | 2 | 0 | 1 |

## Case-level arm ledger

| Case | Source-relative expectation | Oracle | A | B | C | Status | Oracle assessment |
|---|---|---|---|---|---|---|---|
| LC20-01 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-02 | UNKNOWN (DISPUTED) | YES | OVERCONFIDENT | CORRECT | CORRECT | VALID/VALID/VALID | QUESTIONABLE |
| LC20-03 | UNKNOWN (DISPUTED) | UNKNOWN | CORRECT | ACCEPTABLE_ALTERNATIVE | ACCEPTABLE_ALTERNATIVE | VALID/VALID/VALID | LABEL_CONVENTION_ISSUE |
| LC20-04 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-05 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-06 | UNKNOWN (CLEAR) | UNKNOWN | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-07 | YES (CLEAR_WITH_MINOR_WORDING) | YES | CORRECT | OVERCAUTIOUS | OVERCAUTIOUS | VALID/VALID/VALID | CONSISTENT |
| LC20-08 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-09 | UNKNOWN (DISPUTED) | UNKNOWN | CORRECT | ACCEPTABLE_ALTERNATIVE | CORRECT | VALID/VALID/VALID | LABEL_CONVENTION_ISSUE |
| LC20-10 | YES (CLEAR) | YES | CORRECT | OVERCAUTIOUS | OVERCAUTIOUS | VALID/VALID/VALID | CONSISTENT |
| LC20-11 | NO (CLEAR) | NO | CORRECT | CORRECT | MECHANICAL_FAILURE | VALID/VALID/FAILED | CONSISTENT |
| LC20-12 | UNKNOWN (CLEAR) | UNKNOWN | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-13 | YES (CLEAR) | YES | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-14 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-15 | YES (CLEAR) | YES | CORRECT_BUT_MECHANICALLY_REJECTED | CORRECT | CORRECT | FAILED/VALID/VALID | MECHANICAL_UNDERCOUNT |
| LC20-16 | UNKNOWN (DISPUTED) | UNKNOWN | ACCEPTABLE_ALTERNATIVE | CORRECT | CORRECT | VALID/VALID/VALID | LABEL_CONVENTION_ISSUE |
| LC20-17 | NO (CLEAR) | NO | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-18 | YES (CLEAR) | YES | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |
| LC20-19 | NO (DEFENSIBLE_AMBIGUITY) | NO | CORRECT | ACCEPTABLE_ALTERNATIVE | ACCEPTABLE_ALTERNATIVE | VALID/VALID/VALID | CONSISTENT |
| LC20-20 | SOURCE_CONFLICT (CLEAR) | SOURCE_CONFLICT | CORRECT | CORRECT | CORRECT | VALID/VALID/VALID | CONSISTENT |

## Semantic faithfulness and provenance

| Case | A semantics | B semantics | C semantics | A provenance/authority | B provenance/authority | C provenance/authority |
|---|---|---|---|---|---|---|
| LC20-01 | FAITHFUL | MOSTLY_FAITHFUL | MOSTLY_FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-02 | OVERCONFIDENT | MOSTLY_FAITHFUL | MOSTLY_FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-03 | FAITHFUL | MOSTLY_FAITHFUL | MOSTLY_FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-04 | FAITHFUL | MOSTLY_FAITHFUL | MOSTLY_FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-05 | FAITHFUL | FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-06 | FAITHFUL | FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-07 | FAITHFUL | OVERCAUTIOUS | OVERCAUTIOUS | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-08 | FAITHFUL | FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-09 | FAITHFUL | MOSTLY_FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-10 | FAITHFUL | OVERCAUTIOUS | OVERCAUTIOUS | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-11 | FAITHFUL | FAITHFUL | MECHANICAL_FAILURE | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | FAILED_OR_INCOMPLETE_STREAM |
| LC20-12 | FAITHFUL | FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-13 | FAITHFUL | FAITHFUL | MOSTLY_FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-14 | FAITHFUL | FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-15 | FAITHFUL | FAITHFUL | FAITHFUL | SOURCE_BINDING | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-16 | FAITHFUL | FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-17 | FAITHFUL | FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-18 | FAITHFUL | MOSTLY_FAITHFUL | MOSTLY_FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-19 | FAITHFUL | DEFENSIBLE_CAUTION | DEFENSIBLE_CAUTION | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |
| LC20-20 | FAITHFUL | FAITHFUL | FAITHFUL | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY | EXACT_CITATIONS / NO_ACTION_AUTHORITY |

## Uncertainty traces (B/C differed from A)

| Case | Arm | Observed | Attribution | Exact source spans | Model evidence |
|---|---|---|---|---|---|
| LC20-02 | B | UNKNOWN | DEFENSIBLE_AMBIGUITY | “only if a signed known-good image is used”<br>“the image signature was verified” | B explanation: 'does not explicitly confirm that the image is a known-good image'. |
| LC20-02 | C | UNKNOWN | DEFENSIBLE_AMBIGUITY | “only if a signed known-good image is used”<br>“the image signature was verified” | C explanation: 'does not explicitly state that a signed known-good image is being used'. |
| LC20-03 | B | NO | LABEL_CONVENTION | “has not been decided”<br>“neither an approval nor a denial of vendor retention” | B explanation: 'no approval exists'; this is a documented-status reading, not a denial of the underlying possibility. |
| LC20-03 | C | NO | LABEL_CONVENTION | “has not been decided”<br>“neither an approval nor a denial of vendor retention” | C explanation: 'has not been approved'; same documented-status reading. |
| LC20-07 | B | UNKNOWN | INTERPRETER_INTRODUCED | “release-management review have both been accepted”<br>“Release management recorded acceptance of K8 yesterday” | B proposal unknowns: whether 'recorded acceptance' constitutes acceptance of the release-management review. Recipient repeats it as the reason for UNKNOWN. |
| LC20-07 | C | UNKNOWN | INTERPRETER_INTRODUCED, RECIPIENT_AMPLIFIED | “release-management review have both been accepted”<br>“Release management recorded acceptance of K8 yesterday” | C proposal lists the same doubt twice and the recipient says 'the packet explicitly lists as unknowns'. |
| LC20-09 | B | NO | LABEL_CONVENTION | “does not state how long older offline archives may be retained”<br>“no retention schedule for that storage location is provided” | B explanation: 'there is no evidence to support the claim that the archive is required to have been deleted'. |
| LC20-09 | C | UNKNOWN | NONE | “does not state how long older offline archives may be retained”<br>“no retention schedule for that storage location is provided” | C explanation preserves the missing schedule directly. |
| LC20-10 | B | UNKNOWN | INTERPRETER_INTRODUCED | “may page the on-call database engineer when replication lag stays above twenty seconds for at least five continuous minutes”<br>“The dashboard shows lag above twenty seconds for the last seven uninterrupted minutes”<br>“The alert was measured on the production replica specified by the policy”<br>“Paging is permitted” | B proposal adds unknowns about whether the dashboard measurement is the same lag metric on the same replica, and whether 'Paging is permitted' is unconditional. The recipient repeats them. |
| LC20-10 | C | UNKNOWN | INTERPRETER_INTRODUCED, RECIPIENT_AMPLIFIED, SOURCE_TRUTH_CONFUSION | “may page the on-call database engineer when replication lag stays above twenty seconds for at least five continuous minutes”<br>“The dashboard shows lag above twenty seconds for the last seven uninterrupted minutes”<br>“Paging is permitted” | C recipient: 'Additionally, source_truth is marked as UNVERIFIED. Therefore, it cannot be definitively stated from the text alone whether the permission is currently active for paging.' |
| LC20-16 | A | NO | LABEL_CONVENTION | “might have broken”<br>“the narrator never confirmed its condition” | A explanation: 'it is not true that the glass door definitely broke; this fact remains unconfirmed'. |
| LC20-16 | B | UNKNOWN | NONE | “might have broken”<br>“the narrator never confirmed its condition” | B preserves the same uncertainty with the UNKNOWN label. |
| LC20-19 | B | UNKNOWN | DEFENSIBLE_AMBIGUITY | “Requests timestamped after the closing time are outside the exception”<br>“The system recorded the proposed request at 18:00 UTC on 16 October 2026” | B explanation distinguishes the request timestamp from the system record time. |
| LC20-19 | C | UNKNOWN | DEFENSIBLE_AMBIGUITY, POSSIBLE_AMPLIFICATION | “Requests timestamped after the closing time are outside the exception”<br>“The system recorded the proposed request at 18:00 UTC on 16 October 2026” | C proposal expands the distinction into 13 commitments and 7 unknowns; the recipient cites the packet's ambiguity. |

## Interpreter and compiler deltas

| Case | Interpreter delta | Understanding inventory | B commitments/unknowns/relations | C commitments/unknowns/relations | Contribution |
|---|---|---|---|---|---|
| LC20-01 | Both mediators add non-question-relevant identity doubts (whether the proposed package is R17); the answer remains NO. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 6/7/0 | 7/6/2 | NONE_IDENTIFIED |
| LC20-02 | B and C both distinguish signature verification from known-good status. C also notes the audit-log duration and the antecedent of 'such a restore'. The added doubt is relevant to the source condition. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 8/7/4 | 8/7/5 | NONE_IDENTIFIED |
| LC20-03 | Both mediators preserve the explicit undecided status in unknowns, then the recipient selects NO. The tension is in the label meaning, not in a lost source fact. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 5/5/2 | 5/5/2 | NONE_IDENTIFIED |
| LC20-04 | Both mediators add a 'contains is not exclusive' doubt. It is technically true but does not change the scope exclusion. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 4/5/1 | 6/7/2 | NONE_IDENTIFIED |
| LC20-05 | Both mediators preserve quotation and supersession. No harmful addition. | spacy/blank-en+sentencizer; 5 segments; 5 units; 0 relations | 4/5/2 | 6/6/2 | NONE_IDENTIFIED |
| LC20-06 | Both mediators preserve the distinction between an absent log entry and an absent signature. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 7/4/2 | 6/6/1 | NONE_IDENTIFIED |
| LC20-07 | Both mediators add a distinction between recording an acceptance and the review being accepted. The source does not require that distinction in ordinary policy reading. | spacy/blank-en+sentencizer; 5 segments; 5 units; 0 relations | 6/5/2 | 7/8/3 | POSSIBLE_MISCLASSIFICATION |
| LC20-08 | Both mediators preserve the later exception and distinguish diagnostic retrieval from chat disclosure. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 6/7/3 | 6/6/4 | NONE_IDENTIFIED |
| LC20-09 | B and C both add unknowns; C's explanation keeps the missing schedule as the operative reason, whereas B's NO converts absence of evidence into a negative answer. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 6/6/1 | 5/8/0 | NONE_IDENTIFIED |
| LC20-10 | Both mediators invent a requirement to establish that the dashboard metric is the policy metric. The source explicitly supplies the production replica, the seven-minute duration, and the statement 'Paging is permitted'. C adds more unknowns than B and the recipient cites source_truth as a further reason to abstain. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 5/6/1 | 5/9/2 | NOT_IDENTIFIABLE |
| LC20-11 | C's interpreter never returned a valid proposal; the provider stream ended with stop_reason=error and no completion. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 6/6/0 | — | NOT_ASSESSED |
| LC20-12 | Both mediators preserve the future-decision uncertainty; C adds more qualifications but no decision change. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 5/10/0 | 6/8/3 | NONE_IDENTIFIED |
| LC20-13 | C adds an unresolved speaker-attribution note for the sentence after 'Chair: No.' The answer remains YES. | spacy/blank-en+sentencizer; 6 segments; 6 units; 0 relations | 7/5/1 | 7/7/1 | POSSIBLE_SPEAKER_HINT |
| LC20-14 | Both mediators preserve the discarded-draft attribution and the current named-approver rule. | spacy/blank-en+sentencizer; 6 segments; 6 units; 0 relations | 5/8/2 | 5/7/2 | NONE_IDENTIFIED |
| LC20-15 | No semantic disagreement. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 7/6/3 | 9/4/0 | NONE_IDENTIFIED |
| LC20-16 | No semantic change; the arms choose different labels for the same epistemic state. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 9/4/2 | 9/4/6 | NONE_IDENTIFIED |
| LC20-17 | Both mediators preserve the distinct approval roles and the absent version-specific grant. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 7/7/2 | 7/6/2 | NONE_IDENTIFIED |
| LC20-18 | Both mediators add non-question-relevant doubts about the word 'quota' and the sufficiency of 'if'. The answer remains YES. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 5/6/1 | 6/8/1 | NONE_IDENTIFIED |
| LC20-19 | B and C both preserve the recording-time/request-time distinction. C elaborates it more. The source genuinely distinguishes 'timestamped' from 'system recorded'. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 10/4/3 | 13/7/2 | POSSIBLE_AMPLIFICATION |
| LC20-20 | Both mediators preserve the equal-standing contradiction and do not choose a winner. | spacy/blank-en+sentencizer; 4 segments; 4 units; 0 relations | 5/4/2 | 6/4/3 | NONE_IDENTIFIED |

