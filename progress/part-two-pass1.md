# Part II, pass 1: progress log

Machine-readable twin: `part-two-pass1.json`. Final report: `part-two-pass1-REPORT.md`.

## History
1. First pass built the human-side Radar slice and the admission prerequisite existed uncommitted.
2. Repair pass 1: the commit stack was rebuilt as two self-contained commits (admission, then Radar).
3. Cross-review found six control-flow defects in the Radar and an evidence-packaging gap in admission. Repair pass 2 (this state) fixed them and rebuilt the stack again.

## Repair pass 2: what changed
- Selection governs presentation: a rendering may use only compiler-selected units; an unattached summary is refused; an undecomposed item is not summarised (the source stands).
- Each named unit's own words are checked, not only the claim and qualifier.
- A bridge carries the relation it asserts; it must be the one the subscription asks for.
- Reopening re-runs every gate on the candidate as it is now; only withdrawn or expired decisions reopen; every revision returned validates.
- The presentation text has one definition; the stage ledger reconnects to receipts and is republished.
- `/radar open <id>` reaches AVAILABLE items; nothing AVAILABLE is pushed.
- Context values are validated; an unobserved or unknown calendar is not read as free.
- Admission evidence: the four verification logs are committed (gitignore negation), a reconciliation manifest explains the CRLF fingerprints, and future provenance hashing normalises line endings.

## Not done
The inherited LANG-00 fixture fails on Linux (a fake Windows path canonicalises differently). It predates both Part II commits and is left for a separate hardening commit.
No commit is pushed.
