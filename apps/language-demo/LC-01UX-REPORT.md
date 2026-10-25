# LC-01UX — Simple Mode

2026-10-23. Implemented and verified offline. No live OpenCode calls, commits or pushes.

## Normal workflow

Simple Mode is the default. One prominent button is shown for the current step:

1. **Start Test** approves the displayed finite remote plan (with explicit service-use confirmation) and runs interpreter then challenger. It stops before semantic acceptance.
2. **Approve & Finish** requires the human's version-specific review checkbox, accepts that exact version, constructs the packet and runs only the recipient.
3. **See Results** is a local display action. It shows the answer, conditions transmitted, unresolved information and errors. It does not assert that repeated conditions prove comprehension. Unassessed omissions are identified as unassessed.

The short explanation has an expandable, human-readable exact-state review, including claims, conditions, exceptions, uncertainty, challenges and original source quotations. It does not display schemas or hashes. Correction and stop controls are secondary, optional paths; corrections remain proposals and consume the existing model/request budget. A changed version clears the review checkbox.

Advanced contains all prior controls, model/API metadata, limits, source editors, schemas, hashes, raw JSON, logs, packet inspection and trace exports. Existing Advanced workflows still work. The old scenario-specific pre-filled clarification was removed so museum terminology is not silently submitted for an archive scenario.

## Existing accepted S-17

Default startup detects the specifically requested `.data/lc-01s-s17-01/events.jsonl`, validates its hash chain and task binding, and resumes accepted Version 2, `6dad8fdedab27c2746faf67e43f7aabf3e6eba1a4f46baf0632fa01ed4cbb3c6`.

The original session currently records four model requests, including an unsuccessful recipient attempt, and no successful recipient transfer. It has two requests remaining under the saved six-request ceiling. Its saved estimated spending ceiling is US$9.61 and prior reservations total US$0.23192; these values come from the existing history and were not changed by this task. Simple Mode displays the actual saved limits rather than resetting them to defaults.

Only **Finish Test** is prominent. It never invokes the interpreter, challenger or mediator and never creates another acceptance event. It verifies the accepted content digest, current plan identity/approval, remaining request/reservation capacity and the packet before sending. If approval was lost on restart or configuration change, the same click explicitly approves the displayed current plan before recipient execution; applicable service use must still be confirmed. Approval is never restored from historical events.

After a successful resumed delivery, results appear immediately. Failures remain recorded, with a plain-English explanation; no automatic retry occurs. A completed delivery cannot be dispatched again through the guided action. Stop does not erase or reject an earlier accepted version.

Historical plan/source receipts remain untouched. This source revision changes the current plan/qualification standing; it does not regenerate an old lock merely to pass an expected hash. Launch normally and review the newly displayed plan. Old `--expected-plan-hash` commands must continue to reject source/configuration drift.

## Verification

- **41 Studio tests passed**, including guided sequencing, explicit review, no acceptance during Start, repeat prevention, expired approval and recipient-only resume.
- Parent verification passed: typecheck, **1,114 tests passed, three skipped, zero failed**.
- Real Chromium Simple Mode tests passed for: new three-button workflow; existing accepted S-17 finishing with one main press; accepted but unapproved state blocked; new unapproved state blocked; understandable failed provider call.
- The accepted-session browser regression used a **copy** of the real S-17 log and an injected provider. It issued exactly one injected recipient request, no prior-role calls and no replacement acceptance. It confirmed the original log was unchanged during that test. A synthetic accepted-version fixture is available when that local session is absent.
- Actual default startup was inspected read-only: accepted S-17 selected, Finish Test visible, original log unchanged during that inspection, no inference. The updated interface was visually inspected.
- Advanced Go/injected and fixture Chromium regressions passed. Failed development checks are preserved: an initially broad test locator and a legacy browser test's reliance on the removed pre-filled correction were corrected; no model output or historical result was repaired.

Evidence: `evidence/lc-01ux-001/`. The final Simple browser receipt is `browser-simple-verified/browser.json`; other browser receipts, test logs, screenshots and resume verification are retained alongside it. No real model response was generated during this implementation.

## Final journal audit

The end-of-session byte audit detected one appended PREPARATION_GATE_FAILURE / PROSPECTIVE_PLAN_MISMATCH event in the real journal. Its origin was not established. All baseline journal bytes remain an unchanged prefix; accepted Version 2 and the four recorded requests are unchanged, with no new transfer. The event is retained rather than deleted. This is separate from the browser tests and read-only inspection, which each checked for no journal mutation during their own interval. See `evidence/lc-01ux-001/preservation.json`.

## Open it

Restart the old Studio server so it loads the updated engine, then from `C:\Projects\project-language` run:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs --enable-remote
```

Open the printed local URL. The existing process-environment `OPENCODE_API_KEY` is the only credential mechanism. Startup itself sends no model request. The app automatically finds the accepted S-17 test and displays Finish Test. Review the saved budget and any required service confirmation before pressing it.

To inspect without enabling remote requests, omit `--enable-remote`. For a fresh offline fixture walkthrough, use `--fixtures --data NEW_DIRECTORY`. No existing session or historical evidence is reset or overwritten.
