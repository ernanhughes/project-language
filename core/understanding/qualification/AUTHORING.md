# Reference authorship

Standing: **UNADJUDICATED_REFERENCE**. A separate AI agent (`blind_reference`) authored these inventories from source text. They are not validated gold or independent human validation.

The agent read `apps/language-demo/evaluation/cases.mjs` to obtain the lc02-d1 source. Adjacent questions and reference fields were visible in that read but were not used as authoring inputs. Strict isolation from adjacent annotations therefore cannot be claimed. No baseline pipeline, interpreter outputs, other fixture files, or existing reference annotation files were inspected.

Three additional passages were newly authored for development: interview attribution, temporal permission with exception, and pronoun ambiguity. They are exposed synthetic development material, not held-out or confirmatory evidence. The same separate agent authored their sources and inventories; agreement cannot establish independent reference validity.

Units retain attribution, conditional force and uncertainty. Relations record interpretive uncertainty. Necessary conditions are not assumed sufficient, and silence is not turned into prohibition. Human adjudication is required for stronger evidential use.

Hashes are SHA-256 of raw UTF-8 source strings. Spans use zero-based Unicode codepoint offsets with exclusive ends and no normalization. All unit and relation spans were checked against source slices.

No experiment, remote inference service, network request, credential access, or commit was performed.
