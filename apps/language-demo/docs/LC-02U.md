# LC-02U — Understanding integration and contracts

## Start and use

From `C:\Projects\project-language`:

```powershell
node --experimental-transform-types apps/language-demo/server/app.mjs
```

Open the printed loopback URL. Settings includes Understanding Compiler → profile and Python executable. Defaults are technical-policy version 0.1 and the repository `.venv\Scripts\python.exe` (or `.venv/bin/python` on Unix); `python` is used only if that environment is absent. This selects an executable, not an executable-plus-shell-arguments string. Paths with spaces work without quoting inside the Settings field. A missing Python or spaCy/NLTK dependency is an explicit failed analysis, never an LLM fallback. No model/corpus downloads are automatic. For a fresh Python environment, install the existing declared project dependencies deliberately with `<your-python> -m pip install -e core/understanding/python`; installation was not needed during this implementation.

Normal flow remains Start Comparison → Approve & Finish → See Results. The local compiler runs automatically before the interpreter and after each recipient response. It adds no hosted request. An optional challenger or correction is still explicitly requested under “Challenge, correct or stop”; neither accepts meaning automatically. Direct OpenCode execution and model defaults from Settings v2 remain unchanged. Use Offline scripted examples for a no-inference walkthrough.

The original source table appears before the interpreter finishes, through read-only progress polling. Click a proposed meaning to reveal its exact source and sentence. Results distinguish “What meaning travelled”, “What the receiving AI understood” and what remains unverified. Short answers are evaluated against question-focused candidate requirements, not an obligation to repeat unrelated background. No percentage of understanding is displayed.

## Boundaries and provenance

- `core/understanding`: Python NLP baseline and reusable JS child-process adapter.
- `core/record`: existing derived document record, unchanged. No automatic inventory promotion.
- `core/compiler`: existing context compiler, unchanged and unrelated.
- `core/language`: existing communication-state capability, unchanged.
- Studio: orchestrates the inventory, version-bound proposal/acceptance, existing fresh recipients and independent post-analysis metadata. Existing strict Proposal and Answer schemas are retained.

The capability-provider registry in the book repository was consulted. Studio already consumes the parent evidence/canonical and acceptance contracts; no existing registered provider supplied this spaCy/NLTK boundary. The assignment's new Python component is reused rather than rebuilding it or merging it with the unrelated context compiler. No plugin or second application was introduced.

New comparisons carry `LC-02U/0.1` and a prospective identity covering the original case suite, compiler/profile identity, pipeline/CLI/contract hashes and integration/prompt hashes. This is a changed treatment, not reproduction of an older frozen condition. The original case definitions, source strings, questions, reference decisions, provider routes and earlier evidence are preserved.

## Python wire API

Single request on stdin:

```json
{
  "source_id": "example-001",
  "source_text": "Production changes require owner approval.",
  "profile": "technical-policy",
  "profile_version": "0.1",
  "context": {
    "purpose": "software handoff",
    "intended_recipient": "fresh coordinator",
    "declared_context": {}
  }
}
```

Invoke `python -m understanding --stdin-json`. The explicit `profile_version` extends the preferred request by pinning the selected profile. No arbitrary profile path is accepted over this wire boundary. The existing `--text FILE --profile FILE --source-id ID --format table|json` interface remains available.

A batch is `{ "schema": "language-understanding-batch-request/0.1", "documents": [request, ...] }`. Output is `{ "schema": "language-understanding-batch/0.1", "inventories": [...] }`. Individual inventories remain `language-understanding-inventory/0.1`, with additive wire metadata: Unicode offset convention, heuristic standing, context, profile digest and engine version 0.1.1. Python uses a cached NLP pipeline within one batch process; no persistent service is started.

Published JSON Schemas are `core/understanding/schemas/request-v0.1.json` and `inventory-v0.1.json`. JavaScript uses Zod with integrity checks; Python validates the exact published schema keyword subset in `contracts.py` and rejects unsupported validation keywords. That helper is not advertised as a general JSON Schema library. Its consistency with the Zod exports is regression-tested.

Bounds: 65,536 UTF-8 bytes per source, 262,144 bytes per stdin batch, at most 64 documents, 4 MiB stdout, 8 KiB stderr, default 15-second process timeout (configurable up to 60 seconds). The adapter invokes a single configured executable with fixed arguments and shell disabled, limits stream bytes while reading, rejects malformed UTF-8/JSON, and terminates timed-out/oversized children. The child environment omits provider API credentials. Missing dependencies, startup failure and invalid results are explicit error categories with failure provenance; no silent replacement or automatic retry occurs.

Python offsets are Unicode code points, not JavaScript UTF-16 code units. Every sentence and unit is checked against the exact source using code points. Existing model quotation anchors keep their existing UTF-16 contract; source-span candidate alignment converts explicitly. File input preserves CRLF as well as UTF-8 content.

## Initial analysis and interpretation

The compiler receives only the selected case's source and declared public context (purpose, recipient and declared context), never the held-out question or reference answer. The source artifact contains its exact request, validated inventory, profile/engine configuration, timestamp, source hash and a content-addressed artifact ID. `UNDERSTANDING_ARTIFACT` records it in the existing hash-chained journal.

The interpreter receives that exact recorded inventory under `understanding_inventory`, its artifact ID and an explicit provisional-context instruction. The system instruction also prioritizes source text over heuristic labels. The interpreter can reject a label, identify an omission or flag ambiguity. A heuristic “permission” is neither evidence nor action authority. This is structured context, not a verified few-shot example set.

The inventory-to-proposal alignment is separate analysis metadata keyed to the proposal digest. It reports source-span/text candidate matches, missing mechanical counterparts, commitments lacking direct quotations, possible changes in modality/negation/uncertainty/timing/conditions and unresolved reference cues. It never inserts extra fields into the strict Proposal schema or calls shared wording semantic equivalence.

## Accepted state, delivery and answer

Human review still binds an exact proposal digest. Compiler results cannot accept or execute actions. A profile/compiler/source identity change invalidates use of a pending inventory; the operator must reject it and start a new comparison. Corrections create a new proposal and alignment while retaining the original inventory and prior version. Exact human clarifications continue to be shared with both arms. The challenger remains advisory and needs acknowledgment before acceptance.

The ordinary recipient gets the original source and common context, never the compiler inventory. The Language interpreter gets the extra structured-hint transformation; that treatment difference is recorded. Both recipients still get equivalent original source information and the same question in separate sessions.

After each response, Studio extracts relevant textual fields from the delivered object, retaining JSON paths and origin categories. Original source embedded under `/source/text` or an identical ordinary `/message` is marked ORIGINAL_SOURCE_EMBEDDED. Interpretations, commitments, qualifications and declared clarifications are separate. Raw JSON punctuation, IDs, categorical relation labels and copied citation evidence are not treated as ordinary explanatory prose. The answer's decision and explanation are compiled separately. Their identities bind original source, accepted version, actual packet hash, answer hash, arm, JSON path, profile, engine and timestamp.

Comparison A asks what the representation carried. Embedded source is reported but excluded from claimed derived preservation. Source-linked or lexical candidate matches remain NEEDS_REVIEW; no match is NOT_ASSESSED, not automatic loss. Unmatched derived units may be additions, paraphrases, purpose or valid inference and require review. Mutation cues flag potential changes without certifying equivalence.

Comparison B asks what the observable answer demonstrates for the specific question. Its requirements are defined separately from model outputs and grounded in exact source passages. They are implementation-authored provisional UNADJUDICATED_REFERENCE criteria, not independently adjudicated gold or unseen evaluation cases. Decision agreement stays distinct from semantic application and support, which remain unassessed/review-required. Unrelated background omissions are explicitly NOT_SCORED. A short correct refusal need not repeat vendor-copy details. Internal mental state is never inferred from field repetition.

## Historical runs and limitations

Replay loads captured inventories and responses without invoking Python or hosted models. Older runs without LC-02U metadata remain visibly unanalysed; no historical artifact is backfilled or overwritten. Live model failures and failed local analyses remain separate. If post-analysis fails after a valid response, the exact captured response remains in the journal and no second recipient request is sent automatically.

The initial compiler is still extractive and heuristic. It does not establish complete coverage, resolve pronouns, attribute interview speakers, build cross-sentence relationships or provide legal interpretation. Even obvious wording such as “approval is required” can receive an inadequate lexical label. Type labels are proposed functions, not verified semantic facts. No externally evaluated AI-equivalence reviewer has been added. General/legal/interview probes demonstrate honest limitations, not broader competence.

The selected migration comparison has a comma before “not permission”; the narrow rule yields five sentences and five units. The standalone prototype has “and not permission” and yields five sentences and six units. Both exact sources are preserved in the demo. Unit counts are not completeness scores.

## Offline demonstration and checks

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s core/understanding/python/tests -v
node --experimental-transform-types --test apps/language-demo/tests/*.test.mjs
npm run verify
node --experimental-transform-types apps/language-demo/tests/browser-understanding.mjs PATH_TO_NEW_EVIDENCE_DIRECTORY
node --experimental-transform-types apps/language-demo/evaluation/run-understanding-demo.mjs PATH_TO_NEW_DEMO_DIRECTORY
```

Each evidence/demo command requires a new output directory. Demo responses and commitments are explicitly scripted; no real AI performance finding is implied. The standalone examples, full chained journal, initial/second-pass inventories, mutation probe and readable viewer are under `evidence/lc-02u-001/`. No hosted calls are made by these offline tests.
