# LC-02U — Understanding-enhanced Studio implementation report

Status: WORKING_OFFLINE_INTEGRATION; HEURISTIC_UNVERIFIED; SEMANTIC_COMPLETENESS_NOT_ESTABLISHED.

Studio now compiles the selected source into a readable, source-linked inventory before interpretation. The exact recorded inventory is passed to the configured interpreter as fallible structured context. After human acceptance and fresh-recipient delivery, separate local inventories analyse the actual packet's textual fields and the observed answer. Results distinguish candidate meaning carried by the representation from question-focused evidence in the response. This is an implemented extension of the existing application, not a replacement framework.

## Starting checkpoint and scope

Working repository: C:\Projects\project-language. Starting branch: main; HEAD: b6b1f0f09abeb869b2021e9324fc20584d3b13b2. The tree already contained substantial uncommitted Studio/OpenCode/settings work, the new untracked core/understanding prototype, book/docs additions and an unrelated deleted math entry. Those unrelated changes were preserved. The baseline status and 330 scoped file hashes are recorded in `evidence/lc-02u-001/baseline.json`.

Before changes, 9 Python tests and 57 Studio tests passed. The default global Python lacked spaCy, but the existing repository `.venv\Scripts\python.exe` already provided spaCy 3.8.16 and NLTK 3.10.4. No dependency or model download was needed. Post-change parent verification is reported separately below; it was not misrepresented as a pre-change baseline.

Inspected boundaries: core/understanding's Python prototype, core/record's derived document record, the unrelated core/compiler context capability, core/language communication state, Studio comparison/version/acceptance/delivery/log contracts, current Go runtime and four-model/five-role configuration. The provider registry was consulted. The new Python component was reused; core/record, core/compiler and core/language were not replaced, merged or promoted to authority.

## Implemented path

1. The reusable `core/understanding/adapter.mjs` invokes a bounded Python child with shell disabled, fixed arguments, UTF-8 JSON stdin and strict JSON/schema/span/hash validation. It selects the repository virtual environment by default and permits an explicit executable in Settings. Input, output, stderr and runtime are bounded. Provider credentials are omitted from the child environment.
2. Python retains the existing file CLI and adds single/batch JSON stdin. Published request/inventory schemas are shared with Python's documented bounded keyword validator and JS Zod validation. Exact CRLF and Unicode code-point offsets are preserved; existing JS proposal anchors remain UTF-16 and are converted explicitly for candidate matching. The engine's additive wire version is 0.1.1; inventory schema remains language-understanding-inventory/0.1.
3. Start Comparison compiles the actual selected case, not a substituted migration string. Source, public context, profile/version/digests, engine provenance and timestamp form a content-addressed artifact in the existing chained journal. The source compiler does not receive the recipient question or reference answer.
4. The interpreter request contains the exact inventory, its artifact ID and a source-priority instruction. System instructions also say that heuristic labels are not evidence or authority, and may be rejected. Strict Proposal fields were not extended.
5. Proposal alignment is separate metadata keyed to the proposal digest: source-span/text candidate matches, unidentified counterparts, quotations versus unsupported inference, modality/negation/unknown/timing/condition flags, and unresolved reference cues. Candidate matching is never certified equivalence.
6. Existing correction, version binding and human acceptance remain. An optional challenger review uses the same validation seam, stays advisory and requires acknowledgment before acceptance. Profile/compiler/source drift blocks pending acceptance; it does not silently recompile or overwrite an earlier version.
7. Ordinary and Language arms retain equal original source information and the same question. Only the Language interpreter receives the compiler hints. The extra transformation is recorded as a new prospective LC-02U treatment; no advantage is assumed.
8. After each captured answer, local batch analysis compiles delivered textual fields with their JSON paths and origin categories, plus the answer's decision and explanation independently. Embedded source and copied citation evidence are kept distinct from derived communication. Raw JSON syntax is not treated as prose. No extra recipient request or answer repair occurs.
9. Meaning-transferred analysis excludes embedded source copies from claimed derived preservation. It surfaces wording/source-linked candidates, potential changes and unmatched additions-or-paraphrases for review. Meaning-reconstructed analysis uses separately defined source-grounded question requirements, not whole-source repetition. Unrelated omissions are NOT_SCORED. Semantic application and support remain NOT_ASSESSED/NEEDS_REVIEW.
10. Simple Mode keeps Start Comparison → Approve & Finish → See Results. Its first table appears before the interpreter response returns. Clicking a meaning reveals the exact passage. Results show what travelled, the observable answer and what remains uncertain. Technical metadata remains in Settings/Advanced/export. No understanding percentage is shown.

## Demonstration and evidence

`evidence/lc-02u-001/demo-final/viewer.html` is a self-contained readable migration demonstration. `migration-demo.json` preserves initial source sentences, candidate units, interpreter commitments, delivered packets, both recipient responses and post-response comparisons; `events.jsonl` retains the chained evidence. A local manifest hashes the files.

All model responses and commitments in this demonstration are explicitly SCRIPTED fixtures, not newly observed AI results. No hosted calls were made. The selected Studio migration text has five sentences and five units under the narrow rule. The preserved standalone prototype uses “and not permission” and has five sentences and six units. The exact texts are both present; the difference was not silently repaired or called evidence of complete meaning.

`mutation-probe.json` records a deliberate may/only-after → must/before change. It produces POSSIBLE_MODALITY_CHANGE, POSSIBLE_CONDITION_LOSS and POSSIBLE_TIMING_CHANGE while semantic preservation remains NOT_ASSESSED. The probe is an authored engineering test, not a model-performance result.

## Actual verification

- Python: **15 passed** (`python-final.txt`), including standalone CLI preservation, stdin/batch wire validation, Unicode/CRLF, exact spans/hashes, one-to-many units, unknowns, negation/conditional permission, missing dependencies and adversarial legal/interview/reference cases.
- Studio: **70 passed** (`studio-delivery.txt`), including real Python boundary, safe invocation, time/byte limits, malformed output, profile/source identity, source priority over incorrect heuristic labels, exact recorded hints, withheld-question isolation, fresh-arm separation, second-pass identities, no additional recipient call, short-answer treatment, advisory challenge, mutation flags, wrong-speaker limitations, failed post-analysis retention and captured replay.
- Parent `npm run verify`: TypeScript passed; **1,114 passed, 3 skipped, 0 failed** (`parent-verify.txt`). Core TS tests remain distinct from the Python/Studio checks.
- Actual Chromium: first-pass table visible while the injected interpreter is still waiting, exact source reveal, human review, both second-pass reports, reload without regeneration, profile persistence and mobile layout passed (`browser-final/browser.json`). Settings and existing comparison/provider failure regressions also passed (`browser-settings/`, `browser-regression/`). Browser provider responses were injected offline, not real hosted models.
- A narrow contract validator initially rejected Zod's propertyNames keyword; support was added and the declared-context round trip, schema consistency and full suite passed afterward. Failed test logs are retained.
- `git diff --check` passed. Hugo was not run because canonical manuscript sources were not edited.

## Unverified meaning judgments and remaining limits

The compiler is still a lexical/extractive baseline. It does not establish completeness, resolve pronouns, attribute speakers, build cross-sentence relations or validate legal interpretations. Even an inadequate label such as treating “approval is required” as a statement remains possible. Exact quotation binding is not entailment; shared wording is not preservation. Wrong speaker attribution can remain undetected except as a review-required alignment. These limitations are explicit in tests, UI and artifacts.

Question requirements are defined separately from evaluated model outputs and grounded in exact original-source passages, but are implementation-authored UNADJUDICATED_REFERENCE criteria. They are not independently adjudicated gold or independently authored unseen evaluation cases. There is no validated AI-equivalence reviewer, confirmatory result, full-source semantic-preservation claim, proof of internal mental state or Language advantage. Human acceptance permits communication only and cannot be supplied by the compiler or model.

This version can make fallible analyses visible and investigate candidate changes. Independently evaluated semantic judgments and unseen cases remain future research work. No manuscript claims were promoted.

## Run and review

Restart the Node server with its current data directory, or start a separate development run from C:\Projects\project-language:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs
```

Open the printed URL. Settings → Understanding Compiler selects the Python executable and technical-policy/general profile. Press Start Comparison, review the source-linked table and proposal, then Approve & Finish and See Results. Missing Python dependencies stop explicitly. Opening the page and saving settings make no hosted calls.

An offline demo can be generated into a new directory with:

```powershell
node --experimental-transform-types apps/language-demo/evaluation/run-understanding-demo.mjs PATH_TO_NEW_DIRECTORY
```

The detailed wire API, bounds, comparison rules and limitations are in `docs/LC-02U.md`. Existing historical runs remain captured; older runs lacking LC-02U metadata are not silently backfilled. Original manifests, source fixtures, questions, provider routes and prior evidence were preserved. No live OpenCode requests, manuscript changes, commits or pushes were performed.
