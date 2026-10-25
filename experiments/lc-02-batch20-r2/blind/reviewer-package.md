# Independent reader review — 16 communications

**Reviewer ID:** ______________________

**Standing:** independent reader review. This package contains no expected answer, experimental-arm information or previous model output. Please do not consult the repository or any other file. Answer only from the communication and question shown.

## How to answer

For each case, choose exactly one label: **YES**, **NO**, **UNKNOWN** or **SOURCE_CONFLICT**. Then write a short explanation, quote the exact source passage(s) you relied on, rate your confidence from 1 (very low) to 5 (very high), and note any ambiguity you think a reasonable reader could defend.

### Label meanings

- **YES:** The source states or entails the proposition.
- **NO:** The source states its negation, expressly prohibits it, or does not establish the requested permission or condition. Say which reading applies.
- **UNKNOWN:** The source leaves a question-relevant fact, condition or authority unresolved, or contains a genuine ambiguity that the text does not settle.
- **SOURCE_CONFLICT:** The source contains unresolved contradictory provisions of equal standing and supplies no precedence rule.

### Question scopes

- **SOURCE_RELATIVE:** Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.
- **EXTERNAL_FACTUAL_VERIFICATION:** The question asks about the external world, not only about what the supplied communication says. The communication may assert something without establishing that it is true in reality.
- **ACTION_AUTHORITY:** The question asks whether an actual actor or system may execute an operation now. A communication that describes a permission does not by itself grant the reader action authority.

### Output

Return the completed JSON object using the companion `response-template.json`. Do not add fields that reveal another reviewer’s answer. If you are a model-based reviewer, say so in `reviewer_standing`; your judgment is provisional, not human independent adjudication.

## R1E-01

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
The on-call engineer may fail over to the secondary region when the primary region has been unavailable for ten continuous minutes. Monitoring shows the primary region unavailable for twelve continuous minutes. No other condition applies.
```

**Question:** May the on-call engineer fail over now?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-02

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
The staging database must not be copied to removable media. The operator proposes copying the staging database to a removable drive.
```

**Question:** Does the policy permit the operator to copy the staging database to removable media?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-03

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
The vendor's security questionnaire is due on 30 November. The record does not state whether the vendor returned it. No other document is supplied.
```

**Question:** Did the vendor return the security questionnaire?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-04

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
Section 4.2 says the archivist may delete expired drafts after the retention review. Section 4.2, with the same effective date, says the archivist must not delete any expired draft. The excerpt gives no precedence rule.
```

**Question:** Does the excerpt unambiguously permit deleting expired drafts after the retention review?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-05

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
The request was submitted in the portal on 3 March. The exception applies to requests submitted before 1 March. The portal record does not show whether 3 March is the submission date or the date the portal synchronized the request.
```

**Question:** Was the request submitted before 1 March?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-06

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
The policy says the archive team is not authorised to delete legal-hold records. The archive team proposes deleting a legal-hold record.
```

**Question:** Does the policy authorise the archive team to delete the legal-hold record?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-07

**Declared context:** synthetic interview communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
Reviewer: The chair approved the plan after the note. The note does not say whether 'the plan' refers to the rollout plan or the test plan. Reviewer: Did the chair approve the rollout plan?
```

**Question:** Did the chair approve the rollout plan?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-08

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
The incident desk may page the database engineer when replication lag stays above 20 seconds for at least 5 continuous minutes. The dashboard shows 9 uninterrupted minutes above 20 seconds. The page is sent to the on-call rotation. The policy also discusses office access badges, which are irrelevant here.
```

**Question:** May the incident desk page the database engineer now?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-09

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
During an outage, operators may copy the backup key into an isolated terminal for diagnostics. The exception does not allow sending the key by email. An operator proposes emailing the key during an outage.
```

**Question:** Does the exception permit emailing the key?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-10

**Declared context:** synthetic interview communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
Reviewer: May we circulate the draft to the client? Lead: No, the client copy needs legal clearance. Reviewer: May we circulate it internally? Lead: Yes, internal circulation is approved.
```

**Question:** May the team circulate the draft to the client?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-11

**Declared context:** synthetic interview communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
Reviewer: May we circulate the draft to the client? Lead: No, the client copy needs legal clearance. Reviewer: May we circulate it internally? Lead: Yes, internal circulation is approved.
```

**Question:** May the team circulate the draft internally?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-12

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
The exception closes at 17:00 UTC. A request timestamped after 17:00 UTC requires fresh approval. This request is timestamped 17:00:01 UTC. No fresh approval is recorded.
```

**Question:** May this request use the exception without fresh approval?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-13

**Declared context:** synthetic technical-policy communication.

**Question scope:** EXTERNAL_FACTUAL_VERIFICATION — The question asks about the external world, not only about what the supplied communication says. The communication may assert something without establishing that it is true in reality.

**Communication:**

```text
The supplied policy document states that the production backup is encrypted at rest. No independent audit or system evidence is supplied.
```

**Question:** Is the production backup actually encrypted at rest?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-14

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
The supplied policy document states that the production backup is encrypted at rest. No independent audit or system evidence is supplied.
```

**Question:** Does the supplied document state that the production backup is encrypted at rest?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-15

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
A release may be deployed only if the security review is accepted and the change ticket is approved. The security review is accepted. The change ticket is not approved. No other approval applies.
```

**Question:** May the release be deployed?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________


## R1E-16

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
Clause 7 says the auditor may access the log archive. Clause 9, with the same effective date, says the auditor must not access the log archive. The document states that neither clause takes precedence.
```

**Question:** May the auditor access the log archive under this document?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________

