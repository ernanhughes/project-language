# Integration handoff — LANG-UC-01 / Step 1

Authoring priority: review `book/07a-the-understanding-compiler.md` as a Part I chapter insertion **after** Chapter 7. Do not renumber Chapter 8–37 until editorial review. The chapter is an authorial draft, not automatically part of Hugo and not an accepted manuscript claim.

Implementation target: merge `core/understanding` into `C:\Projects\project-language\core\understanding`; keep Python package separate from `core/compiler`, `core/record`, `core/language`, and the Pi host. Inspect current local code first: GitHub main was used only to understand these boundaries and can lag local work.

Step-1 acceptance criteria:
1. Input: a UTF-8 text passage + source identity + explicit JSON profile.
2. Output: a human-readable table and JSON, multiple candidate rows per source sentence permitted.
3. Exact source spans and source hash verified; no invented source quote.
4. Labels distinguish `does_not_confer_permission` from global prohibition.
5. Unknowns kept unresolved. No silent model call or embedding required.
6. Extraction method and version recorded; unsupported capabilities exposed (coreference and relation graph not implemented).
7. Tests cover segmentation, one-to-many, negation/permission, offsets, versioning and unknowns.

Future steps (separate authority):
- trained parsing/semantic-role labelling, deontic scope, cross-sentence anaphora, model-assisted candidate interpretations, relation graph;
- independent coverage and support evaluation against manually adjudicated reference;
- Studio Meaning Inspector and accepted-state adapter;
- legal/interview/fiction profiles evaluated in-domain.

Do not claim spaCy or NLTK on their own recover full meaning. Do not claim the rules baseline is a validated understanding compiler. Do not edit the canonical numbered manuscript, run hosted inference, commit or push without the user's requested integration procedure.
