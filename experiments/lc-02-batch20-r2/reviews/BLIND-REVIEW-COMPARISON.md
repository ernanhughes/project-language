# Blind review comparison

**Standing:** two model-based provisional reviewers, not human independent adjudication. The design hash and both response hashes are recorded. The comparison was produced only after both reviews were complete.

- Design: `2c88429b777baca7207aad13ea3041746bc0a99d0d96fcc217aed81856c78de4`
- Reviewer A: `e3a8e704e5ef908d36a42da830a7b8531e9a88aa1a59b18f4ca6c426882ad037`
- Reviewer B: `3b4b01e73610749946a25e22f2010d227d6eff6c5c61ac845c2609f413427464`
- Agreement: 16/16; disagreements: 0
- Reference comparison (post-review, not independent validation): A 16/16, B 16/16

## Design issues

- **R1E-04 — META_QUESTION_AMBIGUITY:** Both reviewers chose SOURCE_CONFLICT but both noted that the word "unambiguously" permits a reasonable NO answer. Rewrite the question to ask for the status of the permission rather than whether it is unambiguous.
- **R1E-08 — LOW_CONFIDENCE_PRESENT_TENSE:** Reviewer B reads the dashboard statement as present-tense but asks whether it could be historical. The source says "shows" and the question says "now"; consider making the current-episode wording explicit before v2.
- **R1E-16 — META_QUESTION_AMBIGUITY:** Both reviewers chose SOURCE_CONFLICT but noted that the yes/no form "May the auditor access" permits NO or UNKNOWN. Rewrite the question to ask for the status under the document.

## Case comparison

| Case | Class | Scope | Expected | A | B | Agreement | A conf. | B conf. | Flags |
|---|---|---|---|---|---|---|---:|---:|---|
| R1E-01 | FULLY_SPECIFIED_PERMISSION | SOURCE_RELATIVE | YES | YES | YES | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-02 | FULLY_SPECIFIED_PROHIBITION | SOURCE_RELATIVE | NO | NO | NO | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-03 | FULLY_SPECIFIED_UNKNOWN | SOURCE_RELATIVE | UNKNOWN | UNKNOWN | UNKNOWN | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-04 | FULLY_SPECIFIED_CONFLICT | SOURCE_RELATIVE | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | AGREE | 4 | 4 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-05 | GENUINE_AMBIGUITY | SOURCE_RELATIVE | UNKNOWN | UNKNOWN | UNKNOWN | AGREE | 4 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-06 | AUTHORITY_DENIAL | SOURCE_RELATIVE | NO | NO | NO | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-07 | GENUINE_AMBIGUITY | SOURCE_RELATIVE | UNKNOWN | UNKNOWN | UNKNOWN | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-08 | COMPLETE_BUT_DISTRACTED | SOURCE_RELATIVE | YES | YES | YES | AGREE | 5 | 4 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-09 | QUALIFIED_EXCEPTION | SOURCE_RELATIVE | NO | NO | NO | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-10 | SPEAKER_SCOPE | SOURCE_RELATIVE | NO | NO | NO | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-11 | SPEAKER_SCOPE | SOURCE_RELATIVE | YES | YES | YES | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-12 | TEMPORAL_BOUNDARY | SOURCE_RELATIVE | NO | NO | NO | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-13 | EXTERNAL_VERIFICATION | EXTERNAL_FACTUAL_VERIFICATION | UNKNOWN | UNKNOWN | UNKNOWN | AGREE | 4 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-14 | SOURCE_RELATIVE_SCOPE_PAIR | SOURCE_RELATIVE | YES | YES | YES | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-15 | MULTI_CONDITION | SOURCE_RELATIVE | NO | NO | NO | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |
| R1E-16 | FULLY_SPECIFIED_CONFLICT | SOURCE_RELATIVE | SOURCE_CONFLICT | SOURCE_CONFLICT | SOURCE_CONFLICT | AGREE | 5 | 5 | A:AMBIGUITY_REPORTED, B:AMBIGUITY_REPORTED |

## Reviewer ambiguity notes

### R1E-01

- **A:** None material. The only possible issue is whether 'unavailable' in the monitoring statement matches the policy's sense of unavailable, but the text presents it as the applicable measurement.
- **B:** None material; 'may' is read as permission, which is what the question asks.

### R1E-02

- **A:** A removable drive is naturally a form of removable media; no plausible reading of the text makes the proposed drive exempt.
- **B:** None material.

### R1E-03

- **A:** None; the source expressly disclaims the relevant fact rather than implying either answer.
- **B:** None material; silence about return is not evidence either way.

### R1E-04

- **A:** One could read the question's word 'unambiguously' as calling for NO because the text is not unambiguous. However, the unresolved equal-standing contradiction is precisely the SOURCE_CONFLICT pattern, which better identifies why no single permission can be derived.
- **B:** Because the question asks whether the excerpt 'unambiguously permit[s],' a reader could answer NO on the ground that the prohibition prevents unambiguous permission. I use SOURCE_CONFLICT because the communication presents unresolved contradictory provisions of equal standing with no precedence rule, which matches the defined label.

### R1E-05

- **A:** The sentence 'The request was submitted in the portal on 3 March' could be read as fixing the submission date, but the next sentence explicitly denies that 3 March is necessarily the submission date. That tension is the ambiguity, and it is unresolved.
- **B:** The communication itself identifies the unresolved date ambiguity, so UNKNOWN reflects that ambiguity rather than a gap in my reading.

### R1E-06

- **A:** None material; a proposal is not a grant of authority.
- **B:** 'Not authorised' denies authority rather than using the word 'prohibited,' but either way it does not grant the requested authorisation.

### R1E-07

- **A:** The referential ambiguity of 'the plan' is the central unresolved point; the text does not choose between the two candidates.
- **B:** The referent of 'the plan' is explicitly ambiguous in the source; the interview question does not resolve it.

### R1E-08

- **A:** None material. The badge discussion is expressly irrelevant, and the on-call rotation sentence describes delivery rather than adding a condition.
- **B:** The dashboard reading is stated in the present tense; I read it as describing the current uninterrupted episode. If it were a stale historical episode, the 'now' question could be less certain, but the text gives no such indication.

### R1E-09

- **A:** None material; the source negates the specific proposed method rather than merely staying silent about it.
- **B:** None material.

### R1E-10

- **A:** The answer could be read as 'not yet' pending clearance rather than a permanent prohibition, but either way the present question is answered No on the supplied facts.
- **B:** None material; the answer is an express refusal at this time.

### R1E-11

- **A:** None material. The approval is specific to internal circulation and does not extend to the client.
- **B:** None material.

### R1E-12

- **A:** The treatment of a request stamped exactly 17:00:00 is not specified, but this request is one second later and plainly falls within 'after 17:00 UTC'.
- **B:** None material; 17:00:01 is plainly after 17:00.

### R1E-13

- **A:** A reader might treat an authoritative policy statement as sufficient evidence of the fact, but under the stated external-verification scope it establishes only what the document claims.
- **B:** A reader might answer YES by treating the document's assertion as proof, but that would conflate what the document says with external reality, which this question scope expressly separates.

### R1E-14

- **A:** None; the absence of independent evidence affects truth, not whether the document makes the statement.
- **B:** None material; this is a source-relative question about the document's statement, not its truth.

### R1E-15

- **A:** None material; 'only if ... and ...' plainly requires both conditions.
- **B:** None material; 'only if ... and ...' requires both conditions.

### R1E-16

- **A:** One could label this NO on the theory that a prohibition should be read conservatively, but the source supplies no such precedence rule and the equal-standing conflict is express.
- **B:** A reader could answer UNKNOWN because the document does not resolve the conflict, but SOURCE_CONFLICT is the defined label for unresolved contradictory provisions of equal standing with no precedence rule.

## Decision

**CONDITIONAL_NO_GO_V1_NEEDS_V2.** The v1 design should not be run until the identified question-form ambiguities are corrected in a new version and the changed cases are re-reviewed.
