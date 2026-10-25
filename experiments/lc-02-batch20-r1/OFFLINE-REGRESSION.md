# LC-02-BATCH20-R1 offline regression

**Standing:** contract and mechanical tests with frozen, scripted and injected inputs. No hosted model was called. These results do not establish improved model behaviour.

Frozen `results.json` SHA-256: `35fcf7326392d6154a90c0aaeb6350c57911a85d9b5d9985831c7b99b8c6d047`

| Check | Status | Before | After | Control | Why it matters |
|---|---|---|---|---|---|
| all-frozen-artifacts-unchanged | PASS | 146 recorded artifact hashes | 146/146 exact | Diagnosis writes only new files under experiments/lc-02-batch20-r1/. | Any rewritten request, response, event, failure or hash would invalidate the evidence base. |
| frozen-results-unchanged | PASS | 35fcf7326392d6154a90c0aaeb6350c57911a85d9b5d9985831c7b99b8c6d047 | 35fcf7326392d6154a90c0aaeb6350c57911a85d9b5d9985831c7b99b8c6d047 | All case records remain addressable; no rewrite or rescore. | Any silent alteration of the frozen comparison would invalidate the diagnosis. |
| citation-hash-host-resolution | PASS | frozen arm status=FAILED; strict=SOURCE_BINDING; supplied hash length=58 | resolveCitations=HOST_RESOLVED_HASH,HOST_RESOLVED_HASH,HOST_RESOLVED_HASH,HOST_RESOLVED_HASH; canonical hash restored=true | A wrong span is still rejected (SOURCE_SPAN); a wrong source id is still rejected (SOURCE_BINDING). | Model truncation of a 64-character hash can turn a correct answer into UNASSESSABLE. |
| host-resolution-does-not-repair-spans | PASS | wrong span=SOURCE_SPAN; wrong id=SOURCE_BINDING | Both remain rejected | This is the control that prevents host resolution from becoming citation fabrication. | Repairing a wrong span would let a model attach an unsupported claim to arbitrary text. |
| source-relative-contract | PASS | packet carried source_truth=UNVERIFIED with no scope explanation; recipient could cite it as a reason to abstain | contract=lc02-r1/source-relative/1; answer_scope=SOURCE_RELATIVE; source_truth_scope=EXTERNAL_FACTUAL_VERIFICATION_ONLY; interpretation=FALLIBLE_AID_NOT_SOURCE; authority=false | Action authority remains false; source verification remains UNVERIFIED. | Provenance metadata can be mistaken for a prohibition on source-relative reasoning (observed in LC20-10 C). |
| provenance-confusion-detector | PASS | No evaluator distinguished source-relative reasoning from external verification; LC20-10 C counted as a plain UNKNOWN. | LC20-10 C flags=["PROVENANCE_SCOPE_CONFUSION"] | LC20-10 A flags=[] (no provenance confusion) | A provenance warning used as an abstention reason can be mistaken for justified uncertainty. |
| one-sentence-multiple-units | PASS | LC20-10 inventory: 4 units; final unit kind=requirement (REQUIRED) | LC20-10 inventory: 5 units; explicit permission unit='Paging is permitted' kind=permission | General profile remains unsplit for the same source (checked separately). | A semicolon-joined independent permission and requirement were collapsed into one requirement unit. |
| classifier-corrections | PASS | LC20-07: 'can be sent...once'=statement; 'Neither review may substitute'=permission; LC20-11 'may indicate'=permission | LC20-07: 'can be sent...once'=conditional_permission; 'Neither review may substitute'=prohibition; LC20-11 'may indicate'=statement | The source text and exact spans are unchanged. | Lexical "may" and "can" rules mislabelled a role prohibition as a permission and a conditional permission as a statement. |
| prerequisites-separate | PASS | LC20-02 condition was one undifferentiated unit; no prerequisite list existed | LC20-02 prerequisites=["a signed known-good image is used","the audit log remains intact"] | The exact quoted source span is unchanged and the prerequisite strings are substrings of it. | Two independently attached conditions were not separately inspectable. |
| label-rubric-separates-statuses | PASS | Frozen table counts every non-match as WORSENED and every failed arm as UNASSESSABLE, without distinguishing label conventions from semantic errors. | {"REFERENCE_MATCH":47,"ACCEPTABLE_ALTERNATIVE":7,"REFERENCE_DISAGREEMENT":4,"MECHANICAL_FAILURE":2} | The frozen table is not rewritten; this is a separate provisional re-read. | Treating NO/UNKNOWN conventions as comprehension failures overstates mediation harm. |
| c-vs-b-has-no-semantic-improvement | PASS | C_vs_B: 1 improved, 0 worsened, 5 both-wrong, 13 both-correct, 1 unassessable | C/B label differences: {"A":"CORRECT","B":"ACCEPTABLE_ALTERNATIVE","C":"CORRECT"} and {"A":"CORRECT","B":"CORRECT","C":"MECHANICAL_FAILURE"} | C and B remain tied on every clear case; the one difference is a label convention, the other is a provider failure. | Reporting a label-convention win as an Understanding advantage. |

## Scripted label re-read (not a rescore)

Statuses: {"REFERENCE_MATCH":47,"ACCEPTABLE_ALTERNATIVE":7,"REFERENCE_DISAGREEMENT":4,"MECHANICAL_FAILURE":2}

| Case | Arm | Frozen decision | Decision source | Mechanical | Rubric status |
|---|---|---|---|---|---|
| LC20-01 | A | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-01 | B | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-01 | C | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-02 | A | YES | VALIDATED | PASS | ACCEPTABLE_ALTERNATIVE |
| LC20-02 | B | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-02 | C | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-03 | A | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-03 | B | NO | VALIDATED | PASS | ACCEPTABLE_ALTERNATIVE |
| LC20-03 | C | NO | VALIDATED | PASS | ACCEPTABLE_ALTERNATIVE |
| LC20-04 | A | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-04 | B | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-04 | C | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-05 | A | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-05 | B | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-05 | C | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-06 | A | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-06 | B | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-06 | C | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-07 | A | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-07 | B | UNKNOWN | VALIDATED | PASS | REFERENCE_DISAGREEMENT |
| LC20-07 | C | UNKNOWN | VALIDATED | PASS | REFERENCE_DISAGREEMENT |
| LC20-08 | A | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-08 | B | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-08 | C | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-09 | A | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-09 | B | NO | VALIDATED | PASS | ACCEPTABLE_ALTERNATIVE |
| LC20-09 | C | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-10 | A | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-10 | B | UNKNOWN | VALIDATED | PASS | REFERENCE_DISAGREEMENT |
| LC20-10 | C | UNKNOWN | VALIDATED | PASS | REFERENCE_DISAGREEMENT |
| LC20-11 | A | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-11 | B | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-11 | C | — | NONE | FAILED | MECHANICAL_FAILURE |
| LC20-12 | A | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-12 | B | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-12 | C | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-13 | A | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-13 | B | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-13 | C | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-14 | A | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-14 | B | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-14 | C | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-15 | A | YES | CAPTURED_UNVALIDATED | FAILED | MECHANICAL_FAILURE |
| LC20-15 | B | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-15 | C | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-16 | A | NO | VALIDATED | PASS | ACCEPTABLE_ALTERNATIVE |
| LC20-16 | B | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-16 | C | UNKNOWN | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-17 | A | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-17 | B | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-17 | C | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-18 | A | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-18 | B | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-18 | C | YES | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-19 | A | NO | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-19 | B | UNKNOWN | VALIDATED | PASS | ACCEPTABLE_ALTERNATIVE |
| LC20-19 | C | UNKNOWN | VALIDATED | PASS | ACCEPTABLE_ALTERNATIVE |
| LC20-20 | A | SOURCE_CONFLICT | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-20 | B | SOURCE_CONFLICT | VALIDATED | PASS | REFERENCE_MATCH |
| LC20-20 | C | SOURCE_CONFLICT | VALIDATED | PASS | REFERENCE_MATCH |

The re-read uses the implementation-team provisional adjudication ledger. It does not alter the frozen table. Mechanical failures remain separate from semantic disagreements.

