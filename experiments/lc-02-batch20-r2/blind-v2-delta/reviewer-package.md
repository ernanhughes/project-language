# Independent reader review — 3 communications

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

## R1E-04

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
Section 4.2 says the archivist may delete expired drafts after the retention review. Section 4.2, with the same effective date, says the archivist must not delete any expired draft. The excerpt gives no precedence rule.
```

**Question:** What is the status of deleting expired drafts after the retention review under the excerpt?

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
The incident desk may page the database engineer when replication lag stays above 20 seconds for at least 5 continuous minutes. The dashboard currently shows 9 uninterrupted minutes above 20 seconds. The page is sent to the on-call rotation. The policy also discusses office access badges, which are irrelevant here.
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


## R1E-16

**Declared context:** synthetic technical-policy communication.

**Question scope:** SOURCE_RELATIVE — Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.

**Communication:**

```text
Clause 7 says the auditor may access the log archive. Clause 9, with the same effective date, says the auditor must not access the log archive. The document states that neither clause takes precedence.
```

**Question:** What is the status of auditor access to the log archive under this document?

**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT

**Explanation:**

____________________________________________________________________________

**Exact source passage(s) relied on:**

____________________________________________________________________________

**Confidence (1–5):** ____

**Suspected ambiguity (if any):**

____________________________________________________________________________

