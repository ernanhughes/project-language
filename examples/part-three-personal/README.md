# Part III, personal mediation

Run: `npm run example:personal` (the full composed morning), or `npm run example:personal -- ch21` … `ch28` for one chapter (earlier chapters run first, silently). Focused tests: `node --experimental-transform-types --test core/personal/tests/*.test.ts host-pi/personal.test.ts`.

One invented person (Priya), one invented architecture-review morning, one Pi session with a scripted model, three fake services. The code contract is [`PART-THREE-CONTRACT.md`](../../PART-THREE-CONTRACT.md); the fixture is `core/personal/fixtures/priya.ts`; expected results are written in the tests, not the fixture.

The composed scenario: a review in ten minutes; a decisive qualifier that must survive every view; a declared standing policy; an observation; two model proposals (one scoped, one overbroad); a current instruction; an overlay; an accessibility requirement; a reminder-only friction contract; a portable boundary; a correction; the session ending.

## Evidence scope

Printed by the example and asserted by a test (`EVIDENCE_SCOPE`, `core/personal/src/scope.ts`).

**Establishes:** the kinds and origins of personal records are kept apart and enforced; person-types and inner states cannot be stored; an inference proposes and cannot authorise itself; history is not applicability; confidence is not authority; the decisive qualifier survives in the personalised and generic views; an overlay ends and sheds its effects; a goal does not authorise friction and overrides never escalate it; a boundary is applied exactly, refused where only a broader control exists, and unconfirmed offline, with six separate stages; a belief is inspectable and a named correction operation (wrong or forget) invalidates dependents; a model tool call only proposes and forged session entries gain no influence.

**Does not establish:** that any personalisation helps anyone; real-model behaviour; that the declared policies (consequence bar, time-per-token, friction ordering) are right; that any real service honours a boundary; physical erasure; protection against a hostile writer of session entries; coverage of real use.

**Observation boundary:** the Pi session entries and UI notify calls in the harness; the fake services' own state; the `core/verify` readback check.
**Model mode:** scripted faux provider. **Fixture scope:** one invented morning, one invented person, three fake services.
