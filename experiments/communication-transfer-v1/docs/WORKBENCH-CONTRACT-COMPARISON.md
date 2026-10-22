# TRANSFER-01B-WB — contract comparison and bounded reuse

Reference repository: `C:\Projects\language\experiments\language-workbench`, read-only. Reviewed CONTRACT/README, actual `workbench/model_contracts.py`, `model_runtime.py`, `model_provider.py`, `service.py`, `walkthrough.py` and `tests/test_negotiation_walkthrough.py` / model-runtime tests. Their file hashes are preserved in the WB source inventory. No Python runtime/services were copied or executed.

| Contract | Workbench RT-07 | TRANSFER-01B and optional WB reuse |
|---|---|---|
| Roles | Interpreter / reviewer / fresh recipient | Four-arm baseline stays sender / recipient / advisory evaluator. WB extension separately uses interpreter / reviewer / fresh recipient; host assessment stays outside that exchange |
| Proposal | Pending operations cite original expressions; accepted state untouched | Pending proposals wrap existing validated `language.state/v1`; no transfer until explicit fixture decision |
| Challenge/revision | Named element challenge; complete revision cites responds_to | Exact proposal and challenge IDs; correction bound to its base revision and explicit clarification |
| Acceptance | Exact reviewed protected sets; human command; interpretation acceptance differs from grant | `SIMULATED_HUMAN` only; exact proposal hash and reviewed constraint ID set; no authority-grant field or execution path |
| Semantic history | Original expressions, proposals, accepted states, corrections and journal head | Original expression preserved; proposals and accepted history retained; current revision and source hashes make old envelopes stale |
| Transfer | Verified accepted envelope, no pending operations or transcript | Accepted state only plus version/scope/expiry and no-grants label; recipient gets envelope and novel question only |
| Isolation | Recipient stateless and envelope-only; prior demonstration is readback | Separate real Pi session/storage per role call; novel action-decision response; no hidden reference key |
| Evidence | Immutable request/response/validation/replay records | Fresh output directories, hash manifests, exact provider-visible requests and actual faux assistant responses |
| Budget/retry | Configured reservations; runtime may explicitly retry | Equal four request opportunities per pair; shared bounded reservations; retries zero, no fallback/repair |
| Assessment | Automated workflow checks; readback is not independent comprehension | Host-only authored decision diagnostics with NOT_ADJUDICATED primary status; reviewer is never presented as independent evaluator |

Existing `project-language` conversation state already provides source references, explicit/tentative/disputed standing, ambiguity resolution, canonical serialization and revision IDs. The new extension reuses `validateState`, `serializeState` and `deriveRevisionId`, plus the existing Pi harness and qualification reservation primitive. It does not reimplement those formats or mutate the core.

The core does not supply the Workbench's pending-proposal/challenge/acceptance orchestration. The small experiment-level reducer adds only that bounded profile and stale-envelope refusal. It uses no Git-backed thread store: its hash/revision records are NOT claimed to be a `verifyThread`-verified persistent conversation. Existing core Git/store APIs would create local history beyond this experiment's needs; no repository commit was necessary. Hashes do not authenticate an actual human.

The core validator caught an early error: ambiguity resolution cited the same reference as its opening source. The fixture now keeps opening references separate from `resolved_by` clarification, as the existing contract requires. The failing test log was preserved. No core semantics were relaxed to make the fixture pass.

Historical Workbench hosted checks, price catalogue and configured model routes are background engineering records, not current provider qualification or evidence of communication effectiveness. Its optional retry policy is not adopted. Its local HTTP authentication/UI configuration is unrelated to this offline experiment and was not changed.
