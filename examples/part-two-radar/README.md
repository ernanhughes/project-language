# Part II, human-side Radar slice

Run: `npm run example:radar`. Focused tests: `node --experimental-transform-types --test core/radar/tests/attention.test.ts host-pi/radar.test.ts`.

One invented afternoon, five invented candidates, one Pi session with a scripted model. The code contract is `PART-TWO-CONTRACT.md`; the fixture is `core/radar/fixtures/afternoon.ts`; expected results are written in the tests, not the fixture.

| Case | What it checks |
|---|---|
| A, preprint | A subscription for "a new, peer-reviewed result" is enforced as written. An unreviewed preprint does not match, and the subscription is not rewritten to make it. |
| B, different mechanism | Lexical closeness and a model's assertion do not establish that it weakens the tracked claim. Unresolved unless a person or domain rule supplies a bridge naming both scopes. |
| C, lossy BRIEF | A rendering that names the qualifier's unit and says only "safe" passes membership, nesting and dependency closure and fails on wording. The resolution rises, or the source stands. |
| D, contradiction in a meeting | `BRIEF + QUEUE`; after the meeting a new revision `BRIEF + NOW`. The resolution does not change because the timing did. |
| E, keyword-stuffed decoy | Retrieved; not eligible (no grant, wrong domain); never presented. |

## Evidence scope

Printed by the example and asserted by a test (`EVIDENCE_SCOPE`, `core/radar/src/attention/scope.ts`).

**Establishes:** the declared gates are enforced; dependency closure is applied; a qualifier mutation is caught; a timing transition is versioned; a model boundary and an interface boundary are observed in the harness, as separate receipts.

**Does not establish:** real-model language quality; that anyone noticed, understood, used or benefited from anything; that a message was rendered (the receipt records an interface call); cross-domain discovery (the bridge is supplied); open-world coverage; general semantic fidelity; prevalence; that the timing table is the right policy for a person.

**Observation boundary:** model side, the provider callback in the Pi harness; human side, the call to the Pi UI `notify`.
**Model mode:** scripted faux provider. **Fixture scope:** one afternoon.
