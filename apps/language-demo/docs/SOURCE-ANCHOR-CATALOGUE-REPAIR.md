# Source-anchor catalogue repair

The user-supplied trace (2) was inspected offline as data. Latest comparison ID: 0fa6f02a-1ee4-41bb-97a8-a42af5a5043a. Interpreter event 64 preserved UNKNOWN standing and progressed to human acceptance. Recipient event 74 answered NO but supplied invalid citation coordinates; event 75 records SOURCE_SPAN. This was the first recipient response, not a completed two-arm comparison.

Observed versus actual UTF-16 exclusive-end offsets:

| Quotation | Returned | Actual |
|---|---|---|
| First sentence | 0–86 | 0–96 |
| Owner approval | 87–152 | 97–162 |
| New-migration limit | 254–281 | 268–301 |

The NO decision matches the provisional development reference, but the response failed source validation. No completed semantic or two-arm result is claimed. Earlier failures in the cumulative trace remain separate attempts.

## Prospective change

The existing Runtime now attaches a deterministic exact-source anchor catalogue to requests that already contain original source text. It contains a full-source anchor and sentence anchors with source identity/hash and JavaScript UTF-16 offsets. A model can copy a complete anchor rather than count characters. Both recipient arms receive the same catalogue; source-free requests receive none. A catalogue location is not proof of entailment, permission or acceptance.

Source anchors are generated from the exact input before request hashing and recorded with the actual MODEL_REQUEST. They do not alter delivered packets, accepted versions, strict schemas or reference answers. Existing Understanding configuration hashes include the catalogue implementation. This changes prospective request bytes and is not a reproduction of earlier prompts.

No returned model output is normalized, repaired, retried or promoted. The failed run and user attachments remain untouched. No hosted calls, credential access, manuscript edits, commit or push.

## Offline checks

Regression tests cover the observed migration coordinates, unchanged rejection of wrong offsets, astral Unicode/CRLF, repeated quotations, source-hash rejection, arm symmetry, source-free input and no mutation. The existing actual Chromium walkthrough passed with injected responses and zero hosted calls; evidence/source-anchors-browser-001 contains screenshots and results. Full Studio suite results are reported in the completion message.

To use the prospective repair, restart the existing Studio process and refresh the browser. Start Comparison explicitly begins a new attempt with new calls. A model may still disregard the catalogue; strict validation remains in force.
