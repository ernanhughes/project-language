# Context admission under constraint (v1)

Primary mapping: Language working unit **II-02, retrieval versus admission**. Fixed references: project-language `3239630af2755bead748c1a674fde515041e592a`, language planning `3de3aea`, Pi 1.0.4, completed Pi book (42 chapters/six parts/appendices) and pi-agents. No manuscript or numbering change. The design was recorded in `language/planning/experiments/context-admission-v1.md` before this implementation.

## Claim and roles

The implemented mechanism takes trusted host declarations of permission, time, standing and structured scope and passes independent eligibility gates to the existing compiler. Requests and similarity do not confer eligibility. The compiler selects and renders; a final check bounds the entire managed block, including framing, in exact UTF-8 bytes and estimated tokens. If that block exceeds either cap, projection fails closed rather than emitting a partial source. These are managed-block caps, not full-prompt or provider-token guarantees.

Reuse: lifted `core/compiler`, lexical `cosineScore` for the comparison, shared real-Pi harness with only `context_request` enabled. No new compiler, memory engine or Pi code in core. The new module establishes narrow caller-side admission declarations that the compiler itself does not establish.

The synthetic task asks for the payments/production retry limit at a fixed time. Six immutable-in-practice fixture records supply current authorised configuration, unauthorised configuration, stale contradiction, irrelevant lexical match, stuffed note and similar instruction. The independent reader parses only exact declared configuration data with matching structured scope; it returns a unique numeric value or abstains for absence/conflict. The oracle goes only to the evaluator. Numeric mutations, renamed/reordered IDs and temporal boundary tests probe dependence on fixture answers or identifiers. This demonstrates a typed lookup, not comprehension.

## Conditions and controls

1. Indiscriminate: request and include all six, intentionally bypassing gates and budget. Synthetic unsafe control.
2. Similarity-only: request lexical top three, with deterministic ID tie breaks; intentionally bypass admission/budget. Same synthetic unsafe control.
3. Constrained: request all; host gates and lifted compilation decide membership and budget. This is the adapter default. Unsafe modes are host-owned experiment options, absent from tool arguments.

The same candidate set, query, task, reader and evaluator are used. Retrieval `searchText` is a declared index field; the adversarial records deliberately supply exact query matches. This is not an externally fitted retrieval benchmark or a claim about all lexical rankers. Contradictory values are deliberately distinct so controls discriminate; abstention is reported separately from a wrong answer.

Each condition runs a real AgentSession and tool loop through pi-ai's faux provider. The provider requests IDs, observes tool feedback and context again, and computes a response from the block parsed from its actual normalized transcript. It is never given the oracle or admission decisions. A second independent evaluator checks an exact block observed once. Tool failure, missing loop completion or observer/reader disagreement fails the harness. Raw messages preserve tool declarations, tool calls and tool results; seeing a tool call alone does not count as execution.

Additional recorded real-loop controls: forged model authority/time/standing/budget fields, omission of the necessary source, zero byte budget. Deterministic tests also check source integrity, purpose grants, source-kind/standing gates, supersession, time boundaries, unknown IDs, Unicode byte counts, current conflicts and altered/missing/duplicated provider observations. Unknown-ID requests are refused without bodies and leave the last host-held request state intact; initial host-selected admissible context can therefore remain available.

## Receipts, dimensions and failures

Record available → retrieved → eligible → selected → assembled → delivered for every candidate with source reference/hash and reason. Before callback observation, delivered is `not_observed`. Used/helpful remain unobserved/unmeasured for a real model. Empty framing may be observed with zero items; a suppressed over-budget packet is not a delivery. Eligibility means passage through gates after retrieval, not just a property of stored text.

Report separately: permission violations, currentness violations, scope/schema/standing violations, source/hash provenance, valid admission reasons, byte/token estimates, budget fit, compilation failure, correctness, abstention and harness failures. Unsafe baselines can retain source provenance while lacking valid admission reasons. No aggregate score. Zero delivered bytes fit a budget but a named failure and abstention remain visible.

Fail on any prohibited constrained item delivered, missing provenance/reason, exceeded managed cap, model alteration of host records, falsely observed receipt, unexpected comparison output, Pi/tool failure or Part I regression. Integrity errors throw before projection; policy/budget assembly failures emit no source bodies. Two permitted current conflicting records can both be admitted; the reader abstains rather than assigning authority from wording.

## Execution and preservation

Run `npm run example:admission`, or `npm run example:admission -- --output NEW_DIRECTORY`. A new run directory is mandatory; existing results are not overwritten. Each run records inputs, evaluator oracle, source hashes, runtime versions, source fingerprints, current Git state, plans, transitions, compiler traces, raw provider requests and dimensions. Failures retain `failure.json`; successful observations have `report.json`. Regression/build logs and the pinned/live distinction accompany the initial evidence separately. No credentials, network model or external dataset are needed.

## Limits

The callback proves local normalized input to a scripted provider, not a remote HTTP request, model attention, comprehension or utility. Host records are trusted declarations, not authenticated principals or discovered currentness. Exact-schema checks do not establish semantic relevance for prose. Restricting one managed projection is not a sandbox for other extensions, user/assistant history or other channels. An unrelated later context handler could change delivery; the callback must be observed afresh. No general injection-resistance, memory-quality, semantic-preservation or real-model improvement claim follows. Part I's preservation measure remains a named separate limitation.
