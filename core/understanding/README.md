# Understanding (proposed core module; Step 1 Python baseline)

The new `core/understanding` is a **candidate meaning-extraction boundary**.
It is NOT the existing `core/compiler` (different project functionality),
NOT `core/record` (the semantic document record), and NOT `core/language`
(communication state). It supplies candidate source-linked units for later review.

The NLP implementation remains in `python/` and is an **unverified linguistic baseline**; `adapter.mjs` supplies the Studio process boundary:
- spaCy segments exact English source text into sentences, using `en_core_web_sm` if installed, otherwise `spacy.blank('en')` with `sentencizer` (explicitly marked as lacking trained syntax);
- NLTK provides lexical token features;
- a narrow set of visible rules proposes candidate force labels. It splits `and not permission to` into two units without incorrectly claiming a global prohibition;
- output includes a readable table and JSON with source hashes, offsets, profile identity, method and explicit limitations.

**No semantic understanding, coreference resolution, cross-sentence graph or coverage validation is claimed.** The Python component itself makes no provider requests. Studio integration is implemented below; model-based interpretation and human acceptance remain separate stages.

## Run locally

```powershell
cd C:\Projects\project-language\core\understanding\python
python -m pip install -e .
python -m understanding --text examples/migration.txt --profile profiles/technical-policy.json --source-id migration --format table
python -m understanding --text examples/migration.txt --profile profiles/technical-policy.json --source-id migration --format json
python -m unittest discover -s tests -v
```

To use trained spaCy annotations beyond sentence boundaries, install the optional English pipeline separately:

```powershell
python -m spacy download en_core_web_sm
```

The example needs **no** NLTK corpus download. The fallback deliberately does not pretend to supply grammatical parsing or entity recognition.

## Studio integration (LC-02U)

`adapter.mjs` now invokes the Python CLI in a bounded child process, without a shell or a new HTTP service. Studio automatically runs the first inventory before interpretation and separate inventories of delivered textual fields and observed recipient responses afterward. This does not turn this module into `core/compiler`, `core/record`, or an authority mechanism.

```powershell
# From C:\Projects\project-language, using the existing virtual environment:
.\.venv\Scripts\python.exe -m understanding --text core/understanding/python/examples/migration.txt --profile core/understanding/python/profiles/technical-policy.json --format json
.\.venv\Scripts\python.exe -m unittest discover -s core/understanding/python/tests -v
node --experimental-transform-types apps/language-demo/server/app.mjs
```

A configured Python executable is passed as one argument to spawn, with `shell:false`. The default is the repository virtual environment, then `python`. See Studio Settings to change the executable/profile. No global Python configuration, provider credentials or NLP downloads are used by the child.

The CLI additionally supports `--stdin-json` with `{source_id, source_text, profile, profile_version, context}` and a versioned batch request. File-based flags and table/JSON output remain supported. The wire contracts are in `schemas/request-v0.1.json` and `schemas/inventory-v0.1.json`. Both Python and JavaScript validate the published schema subset. Profile versions and canonical digests, source SHA-256, Unicode code-point offsets and exact quotations are checked. Existing JS proposal anchors remain UTF-16; their alignment conversion is explicit.

The inventory keeps `HEURISTIC_UNVERIFIED`, `NOT_EVALUATED`, and `NOT_ESTABLISHED`. Normal source-quote and lexical alignment are not semantic entailment. No claim of resolved pronouns, speaker attribution, complete extraction, independent gold validation or internal recipient understanding is introduced. General/legal/interview examples remain limitations tests for the narrow profiles.

Full integration documentation: `apps/language-demo/docs/LC-02U.md`; delivery report: `apps/language-demo/LC-02U-REPORT.md`. No automatic conversion to core/record or acceptance of compiler classifications occurs.
