# Part II: context admission under constraint

Run `npm run example:admission` from project-language. This uses Pi 1.0.4's real session/tool/context loop with the declared faux provider. It compares indiscriminate, similarity-only and constrained delivery, then probes forged authority, omitted context and an insufficient budget. Evidence goes into a fresh directory printed at the end; no run is overwritten.

Claim: host-owned grants, time, standing and structured scope govern admission of synthetic configuration data, independently of model requests and lexical ranking. Existing compiler code performs selection and assembly. Exact block receipt is observed at the provider callback. This supports working unit II-02, not an entire Part II runtime or real-model benefit.

See [protocol](../../experiments/context-admission-v1/PROTOCOL.md), [manifest](../../experiments/context-admission-v1/manifest.json), [core](../../core/admission/src/index.ts) and [Pi seam](../../host-pi/admission.ts). The inventory and evaluator oracle live in [the fixed fixture](../../core/admission/fixtures/retry-context.ts); the scripted reader does not see the oracle.

Focused checks: `node --experimental-transform-types --test core/admission/tests/admission.test.ts host-pi/admission.test.ts`. Full checks: `npm run verify`.
