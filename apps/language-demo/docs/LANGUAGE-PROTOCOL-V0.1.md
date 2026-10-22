# Language Protocol v0.1

Executable schemas live in `protocol/state.mjs`; strict JSON rejects extra authority fields. Source anchors identify origin, source ID, SHA-256, exact UTF-16 offsets and text. A model-message quote cannot pass as a source quote. Source-grounded means mechanically traceable, not semantically true.

Each exchange retains original intent, purpose, audience, immutable sources, versions and typed events. A proposal holds interpretation, outcome, commitments (claim/condition/exception/requirement/prohibition/source_permission/unknown), contradictions, preservation obligations and directed relations. Unknowns remain explicit. Absence of a condition is a review concern, not evidence of permission.

Versions record parent digest, timestamp, transformation, prompt hash, model route and validation. Human acceptance binds the current version digest and `communicate` scope; acceptance never grants external action. A challenge is advisory and cannot revise state. Correction produces a new proposal and needs new acceptance. Rejected, stale and challenged versions remain inspectable. Semantic judgments use REQUIRES_REVIEW; no automated source-truth claim.

LC-01 authority is a single local human operator: propose via models, accept/reject/correct via explicit UI controls; communicate only accepted current versions; nobody may act externally. Context is refused entirely in v0.1, including expired/irrelevant context. This is a narrower implementation of context admission, not a contextual memory system.

Only `language-state/0.1` is supported. Future migrations must write a new version with parent digest and migration identity, invalidate acceptance, and preserve original events. Unknown schema versions fail closed.
