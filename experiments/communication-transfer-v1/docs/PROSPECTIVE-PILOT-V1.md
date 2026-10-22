# Prospective pilot v1 — NOT APPROVED, no live dispatch

This is a review design, not an execution authorization. The proposed 48-call / US$1 ceiling remains unapproved. The qualification CLI supports only faux Pi and injected-HTTP evidence.

Main paired comparison: two source-pinned synthetic tasks × four arms (SOURCE, PLAIN, LINKED, CONTEXT-relevant) × two A/B model rotations × three roles = **48 maximum future calls**. A initially DeepSeek V4.1 Flash, B Qwen3.8 Flash, C GLM-5.3; reverse A/B in the matched rotation. C stays advisory. Same sources, questions, public objective, response schema and resource policy per pair. SOURCE is separately reported as a high-information comparator.

The five CONTEXT history variants are implemented and exercised offline. The four additional variants are **not** smuggled into the 48-call main pilot: adding irrelevant/conflicting/expired/unavailable across both tasks/rotations would require another 48 calls and separate authorization. No post-result expansion is automatic.

Proposed per-call output ceiling 2,048 tokens, retry zero, no fallback/repair/continuation, timeout 60 seconds for a future approved live runner (offline fixtures use a one-second deadline). Non-SOURCE channel ceiling 3,000 UTF-8 bytes, inclusive of questions, quotations, metadata and context. Qualifier input admission ceiling 12,000 conservative units, aggregate 576,000 input units and 98,304 output tokens for 48 calls. Those admission units are not measured provider tokens. Successful real execution needs provider/tokenizer confirmation rather than assuming an exact dollar guarantee.

At 12,000 input units and 2,048 output tokens per call, with each model serving 16 calls across rotations, illustrative uncached catalogue allowance is about US$0.51 using the pinned catalogue rates (DeepSeek off-peak $0.15/$0.60, Qwen $0.15/$0.47, GLM $1.40/$4.40 per million input/output tokens); it is about US$0.55 using current documented peak DeepSeek $0.30/$1.20. Add cache/account uncertainty rather than presenting these as invoices. Recheck pricing and explicit reservations at approval time. No charge is incurred by the current milestone.

The versioned qualification lock pins source hashes, proposed questions/criteria, role prompts, exact installed model/API/base identities, request settings, policy and material source bytes. Its `live_authorized` field is permanently false. It qualifies an offline instrument, not the original 01A frozen version or an approved scientific protocol. Changed material requires a new version, not replacing historical locks or evidence.

Before any real pilot:

1. Independent human source/rubric review and distinct author/reviewer approval, including disputed UNKNOWN/NO alternatives; no fabricated signatures.
2. Explicit resolution of installed `/zen/go` paths and Messages x-api-key versus current documented `/inference/go` paths/Bearer. No endpoint substitution on failure.
3. Provider-aware tokenization, reasoning and billing qualification; final finite reservations and cancellation/truncation policy. External billing uncertainty remains disclosed.
4. Freeze exact task/arm schedule, prompts, schemas, source/version/reference hashes, settings and judge controls. C must remain blinded and advisory; primary assessment must be independently source-bound.
5. Separate explicit operator authorization for exact models, routes/auth, privacy, max calls, token caps and spending ceiling; fresh write-once output directory. No saved-auth or automatic .env route.

For the present milestone, judge-control outcomes and all matching decisions are scripted engineering checks. No language advantage, real-model performance or human benefit can be inferred. HaluEval import remains disabled; Hallucination Energy/Taint remain not computed. No new experiment, publication or manuscript update starts automatically.
