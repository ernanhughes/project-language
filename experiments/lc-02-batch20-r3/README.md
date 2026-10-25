# LC-02-BATCH20-R3 — Exploratory live preparation

**Post-run status: APPROVED AND EXECUTED ONCE.** The live result is at
`../../LC-02-BATCH20-R3-LIVE-RESULTS.md`. It made 76 actual hosted requests
(78 reservations; 2 arms aborted before transport by the R1E-07 guard false
positive). The run was not repeated. The preparation record below is retained
as the pre-run state.

**Pre-run status: PENDING EXPLICIT USER APPROVAL. No live request had been made.**

The R2 protocol is preserved unchanged at
`experiments/lc-02-batch20-r2/FROZEN-LIVE-PROTOCOL.json`
(hash `26009e396fa890c85b573fdeec9f0c3be04e4433fbe84b55e8cbb986918959e3`,
`live_execution_authorized: false`).

This directory adds a separately versioned exploratory approval and protocol.
It does not modify the R2 protocol, the V2 design, the prompts, the cases or the
model assignments.

## Files

| File | Purpose |
|---|---|
| `EXPLORATORY-APPROVAL-V2.json` | Pending approval record; hash `baf151edbd24ba3342803e8406b7451c7d28580873de9b8801ddca5d93251bb6` |
| `EXPLORATORY-PROTOCOL-V2.json` | Pending execution protocol; hash `49ed0c4d778f4421eaa445f73ee5ac7a67243072461333e39b4532b07ac30604` |
| `PRE-EXECUTION-REVALIDATION.json` | 22 offline checks; all pass |
| `run-live.mjs` | Live runner; refuses to start without an approved record |
| `analyze-live.mjs` | Post-run analysis report |
| `finalize-approval.mjs` | Converts the pending record to approved; **only after explicit user approval** |
| `revalidate.mjs` | Recomputes the pre-execution checks |
| `r3.test.mjs` | Checks that the approval/protocol are internally hashed and pending |

## After explicit approval

```powershell
node --experimental-transform-types experiments/lc-02-batch20-r3/finalize-approval.mjs `
  --approved-by "USER" `
  --statement "I approve the exploratory V2 run under the recorded limitations." `
  --approval-phrase "APPROVE LC-02-R3 V2 EXPLORATORY"

node --experimental-transform-types experiments/lc-02-batch20-r3/run-live.mjs `
  --out experiments/lc-02-batch20-r3/.runs/LIVE-V2-001
```

The live runner uses 80 planned calls and an absolute ceiling of 100. It stops on
cap, case-cap or budget violations; preserves failed arms; and performs no
retries, fallback, resume or post-result tuning.

## Standing

- Reference review: model-based provisional, **not independent human adjudication**.
- Compiler: `BLANK_ENGLISH_FALLBACK`; no spaCy model installed or downloaded.
- Research standing: exploratory, not confirmatory.
- A null or negative result is valid.
- No manuscript, commit or push.
