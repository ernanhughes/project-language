# TRANSFER-01A — Local Pi integration handoff

**Target repository:** `C:\Projects\project-language`.

**Prerequisite:** Copy the sibling `communication-transfer-v1` scaffold to `experiments/communication-transfer-v1`. Read all repository instructions, verify Git status and preserve existing changes. Do not assume the remote default branch equals the local checkout.

**Mission:** Convert the supplied scripted communication-transfer scaffold into an offline-capable three-role Pi-agent experiment. Keep model inference disabled, keep the Language book/site unchanged and do not run externally hosted or local real models without separate approval.

## Tasks

1. Inspect existing `core/language`, `core/record`, `core/preservation`, `core/remembering`, `core/personal`, `core/evidence`, `core/verify`, `host-pi/` and `harness/session.ts`. Reuse their actual contracts, validation and scope restrictions. Existing host-independent libraries must not import Pi. Review exact pinned Pi 1.0.4 APIs; do not create another model/provider framework.
2. Extend the scaffold to use `fauxProvider` through real Pi sessions or a bounded injected text adapter. Separate AI A/sender, AI B/receiver, and AI C/advisory judge; create non-overlapping conversation/session storage and prohibit cross-role hidden prompt/context leakage. Run a strict recipient-visibility test proving B cannot see the gold answer or original source except in the SOURCE comparator.
3. Define source identity, message/provenance/obligation/state schemas, correct spans and immutable transfer receipts. Keep declared, observed and inferred context separate, each with origin, current status, scope, expiry, data-use permission, version and conflicts. Refuse unsupported memory and stale state; record exactly which context items reached a provider.
4. Trace every stage in the viewer: source; A's selected claims; transmitted bytes and tokens; B's inferred answer; C's blinded advisory rubric; independent authored/human rubric; corrections, exclusions, refusals, cost, energy and latency. Show unknowns and block accidental evidence promotion. Browser UI must work without a remote server or actual models in offline mode.
5. Add an importer plan for Hugging Face `pminervini/HaluEval` summarization (`document/right_summary/hallucinated_summary`) with explicit revision, licence, provenance and split IDs. Exclude any records already used in Hallucination Energy fitting or earlier evaluation; hold out by source near-duplicate. If unavailable, report blocked and keep synthetic fixtures rather than invent examples.
6. Define paired tasks and fair model baselines: SOURCE, PLAIN, LINKED, CONTEXT. Match end-to-end constraints (especially transferred token budget). SOURCE has more information and is reported separately. LINKED must provide actual accessible source quotes/anchors, not just a hash. B is denied hidden source access. Add active ablations of relevant history versus irrelevant/conflicting history after the basic comparison is viable.
7. Treat Hallucination Energy as an optional versioned **secondary observer**, not a validated hallucination probability. Match to labelled unsupported additions, calibrate with dev-only data, and report FP/FN. Taint remains an unbuilt hypothesis: if later derived from consented synthetic history, report source/models/tools/turns that co-produced it; never infer identity, stable personality or permission to transmit.
8. Design a prospective OpenCode Go three-role route matrix, **not an executable approved configuration**: DeepSeek V4.1 Flash (A), Qwen3.8 Flash (B), GLM-5.3 (C), with sender/receiver rotations. Confirm exact current model IDs, endpoint families and auth headers against provider documentation and local pinned adapter; never silently assume a historical route works. One model serving as C provides advisory review, not independent gold. Freeze prompts and assess judge error against human-adjudicated items before a real run.
9. Enforce request scopes, explicit consent for any personal-context transmission, timeouts, total token budgets, max calls, provider retry zero, no fallback, accounting reservations and receipt privacy. Only a future separately author-approved locked run may make real requests. Do not load `.env` or saved auth for the offline milestone.
10. Test failure and negative controls: missing task condition, reversed scope, stale memory, contradictory history, prompt injection inside retrieved context, missing span, introduced assertions, uncertain/UNKNOWN answer, model agreement on a wrong answer, judge bias, same-source leakage and budget exhaustion. Do not score scripted outputs as a gain.

## Deliverables and stop

- `experiments/communication-transfer-v1/` executable offline with Pi faux-provider integration and tests.
- Real-browser visualization screenshot with one trace for each arm; exact request and answer visibility.
- Dataset manifest and independent assessment rubric, plus disjoint dev/held-out selection plan.
- Fixed comparator protocol with fair bandwidth and role blinding; design the real-model run but do not execute it.
- `experiments/communication-transfer-v1/TRANSFER-01A-REPORT.md` including actual tests, unresolved problems, cost proposal, and PASS/REFINE/BLOCK recommendation.
- Exact staged, unstaged and untracked inventory; preserve all previous work, no commit, push or publication.

**Only after PASS:** consider a separate explicit approval for an inexpensive three-model pilot. Its observed model responses must not be substituted for the scripted demo, and human/AI transfer is a later independent validation domain.
