import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assess, authorizeUse, emptyState, findContradictions, personalPolicy, reduce, validateEvent, validateRecord,
  type PersonalEvent, type PersonalRecord,
} from "../src/index.ts";
import { T, SCOPE, policyStrict, policyReuseInference, records, asEvents, scenarioState } from "../fixtures/priya.ts";

const base = records();
const code = (fn: () => unknown): string => { try { fn(); return "ACCEPTED"; } catch (e) { return (e as { code?: string }).code ?? String(e); } };
const mutate = (id: string, patch: Record<string, unknown>, drop: string[] = []) => { const r = { ...(base[id] as object), ...patch } as Record<string, unknown>; for (const d of drop) delete r[d]; return r; };

// 1 declared, observed and inferred cannot silently collapse
test("each kind has one origin, and a record claiming another origin is refused", () => {
  const table: [string, Record<string, unknown>, string][] = [
    ["a policy claiming to be observed", mutate("pol-arch-review", { origin: "observed" }), "ORIGIN_MISMATCH"],
    ["an observation claiming to be declared", mutate("obs-expand-derivations", { origin: "declared" }), "ORIGIN_MISMATCH"],
    ["an inference claiming to be declared", mutate("inf-derivations-useful", { origin: "declared" }), "ORIGIN_MISMATCH"],
    ["a declaration made by a model", mutate("pol-arch-review", { source: { by: "model", ref: "faux-model" } }), "DECLARATION_REQUIRES_PERSON"],
    ["a declaration made by the system", mutate("pref-terse-triage", { source: { by: "system", ref: "observer" } }), "DECLARATION_REQUIRES_PERSON"],
    ["a declaration with no authority reference", mutate("pol-arch-review", { authority_ref: null }), "DECLARATION_REQUIRES_AUTHORITY"],
    ["an inference authored by the person (that is a declaration)", mutate("inf-derivations-useful", { source: { by: "person", ref: "priya" } }), "INFERENCE_NOT_BY_PERSON"],
    ["an observation not made by the system", mutate("obs-expand-derivations", { source: { by: "model", ref: "faux-model" } }), "OBSERVATION_REQUIRES_SYSTEM"],
    ["an observation with no evidence record", mutate("obs-expand-derivations", { evidence_id: "ev_nothing" }), "OBSERVATION_NEEDS_EVIDENCE"],
  ];
  for (const [name, rec, want] of table) assert.equal(code(() => validateRecord(rec)), want, name);
  for (const r of Object.values(base)) assert.doesNotThrow(() => validateRecord(r), r.id);
});

// 2 preference cannot become a performance claim or policy
test("a preference carries no performance or benefit field, and a profile cannot be assembled from fields", () => {
  for (const f of ["benefit", "performance", "improves", "effectiveness", "score", "profile", "trait"]) {
    assert.equal(code(() => validateRecord(mutate("pref-terse-triage", { [f]: "x" }))), "FORBIDDEN_FIELD", f);
  }
  assert.equal(code(() => validateRecord(mutate("pref-terse-triage", { dimension: "visual-learner" }))), "UNKNOWN_DIMENSION");
  assert.equal(code(() => validateRecord(mutate("pref-terse-triage", { settings: { depth: "x" } }))), "UNKNOWN_FIELD", "a preference is not a policy and cannot carry settings");
  assert.equal(code(() => validateRecord(mutate("pol-arch-review", { settings: { learner_type: "visual" } }))), "UNKNOWN_DIMENSION");
});

// 3, 9 a person-type or inner state cannot be represented
test("no stable person-type and no inner state can be stored, by kind or by the words of a proposition", () => {
  const kinds: [string, string][] = [["person_type", "PERSON_TYPE_REJECTED"], ["personality", "PERSON_TYPE_REJECTED"], ["learning_style", "PERSON_TYPE_REJECTED"], ["mood", "INNER_STATE_INFERENCE_REJECTED"], ["stress", "INNER_STATE_INFERENCE_REJECTED"], ["fatigue", "INNER_STATE_INFERENCE_REJECTED"], ["motivation", "INNER_STATE_INFERENCE_REJECTED"], ["telepathy", "UNKNOWN_BELIEF_KIND"]];
  for (const [k, want] of kinds) assert.equal(code(() => validateRecord(mutate("inf-derivations-useful", { belief_kind: k }))), want, k);
  const props: [string, string][] = [["Priya is a visual learner", "PERSON_TYPE_REJECTED"], ["she is the kind of person who skims", "PERSON_TYPE_REJECTED"], ["Priya seems stressed before reviews", "INNER_STATE_INFERENCE_REJECTED"], ["she is tired", "INNER_STATE_INFERENCE_REJECTED"], ["she is probably comparing two interfaces", "ACCEPTED"]];
  for (const [p, want] of props) assert.equal(code(() => validateRecord(mutate("inf-derivations-useful", { proposition: p }))), want, p);
});

// 4, 7 observation cannot promote itself; an inference proposes but cannot establish
test("an inference starts as a proposal; nothing in the schema lets it begin established, and an observation has no standing field to promote", () => {
  assert.equal(code(() => validateRecord(mutate("inf-derivations-useful", { standing: "confirmed" }))), "INFERENCE_CANNOT_START_ESTABLISHED");
  assert.equal(code(() => validateRecord(mutate("inf-derivations-useful", { standing: "proposed" }))), "ACCEPTED");
  assert.equal(code(() => validateRecord(mutate("obs-expand-derivations", { standing: "active" }))), "UNKNOWN_FIELD");
  assert.equal(code(() => validateRecord(mutate("obs-expand-derivations", { settings: { depth: "x" } }))), "UNKNOWN_FIELD", "an observation cannot carry policy settings");
  for (const bad of ["retracted", "belief_rejected", "rederivation_blocked", "optional_disabled"] as const) {
    const ev = bad === "retracted" ? { type: bad, at: T.now, id: "x", reason: "r", by: { by: "model", ref: "m" } }
      : bad === "belief_rejected" ? { type: bad, at: T.now, id: "x", reason: "r", by: { by: "system", ref: "s" } }
      : bad === "rederivation_blocked" ? { type: bad, at: T.now, proposition_key: "k", scope: "s", by: { by: "model", ref: "m" } }
      : { type: bad, at: T.now, scope: "s", by: { by: "model", ref: "m" } };
    assert.match(code(() => validateEvent(ev)), /REQUIRES_PERSON/, `${bad} by a non-person`);
  }
});

// 5, 6 history is not applicability; supersession, correction, contradiction, expiry and retraction are distinct
test("retained history is not current applicability: a March record is kept and not projected into October", () => {
  const march = validateRecord(mutate("pol-arch-review", { id: "pol-march", key: "arch.write-path", valid: { from: "2026-03-18T00:00:00.000Z", until: null } }));
  const june = validateRecord(mutate("pol-arch-review", { id: "pol-june", key: "arch.write-path", valid: { from: "2026-06-02T00:00:00.000Z", until: null }, supersedes: "pol-march" }));
  const s = reduce([{ type: "added", at: T.april, record: march }, { type: "added", at: T.april, record: june }]);
  const ctx = { now: T.now, scope: SCOPE };
  const a = assess(s, "pol-march", ctx);
  assert.deepEqual([a.historical, a.applicable, a.status], [true, false, "superseded"]);
  assert.match(a.reasons[0]!, /kept as history, not projected into the present/);
  assert.equal(assess(s, "pol-june", ctx).applicable, true);
  assert.equal(s.entries.get("pol-march")!.record.id, "pol-march", "the March record is still there");
  assert.deepEqual(findContradictions(s), [], "a revision through time is not a contradiction");
});

test("supersession, correction, retraction, expiry, ending and rejection leave different statuses and different reasons", () => {
  const rec = (id: string) => validateRecord(mutate("pol-arch-review", { id, key: `k-${id}` }));
  const events: PersonalEvent[] = ["a", "b", "c", "d", "e"].map(id => ({ type: "added" as const, at: T.april, record: rec(id) }));
  events.push({ type: "superseded", at: T.now, id: "a", by: "x" }, { type: "corrected", at: T.now, id: "b", by: "y", reason: "fixed" },
    { type: "retracted", at: T.now, id: "c", reason: "wrong", by: { by: "person", ref: "priya" } }, { type: "expired", at: T.now, id: "d" });
  const s = reduce(events);
  const status = (id: string) => s.entries.get(id)!.status;
  assert.deepEqual(["a", "b", "c", "d", "e"].map(status), ["superseded", "corrected", "retracted", "expired", "active"]);
  const reasons = new Set(["a", "b", "c", "d"].map(id => assess(s, id, { now: T.now, scope: SCOPE }).reasons[0]));
  assert.equal(reasons.size, 4, "four different reasons");
  assert.ok(["a", "b", "c", "d"].every(id => s.entries.has(id)), "none is deleted from history");
});

test("a validity interval that has ended is expiry by time, without any event", () => {
  const r = validateRecord(mutate("pol-arch-review", { id: "pol-short", valid: { from: T.april, until: "2026-06-01T00:00:00.000Z" } }));
  const s = reduce([{ type: "added", at: T.april, record: r }]);
  assert.equal(assess(s, "pol-short", { now: "2026-05-01T00:00:00.000Z", scope: SCOPE }).applicable, true);
  const after = assess(s, "pol-short", { now: T.now, scope: SCOPE });
  assert.equal(after.applicable, false);
  assert.match(after.reasons.join(" "), /validity interval has ended/);
  assert.equal(after.status, "active", "the record's own status did not change: applicability was derived");
});

test("scope decides applicability, and '*' covers everything while a named scope covers only itself and what is inside it", () => {
  const s = scenarioState();
  const at = (id: string, scope: string) => assess(s, id, { now: T.now, scope }).applicable;
  assert.equal(at("pol-arch-review", SCOPE), true);
  assert.equal(at("pol-arch-review", `${SCOPE}:payments`), true);
  assert.equal(at("pol-arch-review", "technical-triage"), false);
  assert.equal(at("pref-terse-triage", SCOPE), false, "an earlier terse-triage preference does not govern an architecture review");
  assert.equal(at("acc-keyboard", "anything-at-all"), true);
});

test("contradiction is same key, same scope, overlapping validity, different value and no supersession; both stay visible", () => {
  const a = validateRecord(mutate("pref-terse-triage", { id: "p1", key: "pref:depth" }));
  const b = validateRecord(mutate("pref-terse-triage", { id: "p2", key: "pref:depth", setting: "detailed first views" }));
  const same = validateRecord(mutate("pref-terse-triage", { id: "p3", key: "pref:depth" }));
  const later = validateRecord(mutate("pref-terse-triage", { id: "p4", key: "pref:depth", setting: "detailed", valid: { from: "2027-01-01T00:00:00.000Z", until: null } }));
  const earlier = validateRecord(mutate("pref-terse-triage", { id: "p1x", key: "pref:depth", valid: { from: "2026-01-01T00:00:00.000Z", until: "2026-03-01T00:00:00.000Z" } }));
  const add = (...rs: PersonalRecord[]) => reduce(rs.map(record => ({ type: "added" as const, at: T.april, record })));
  assert.equal(findContradictions(add(a, b)).length, 1, "incompatible values at the same time");
  assert.equal(findContradictions(add(a, same)).length, 0, "agreement is not contradiction");
  assert.equal(findContradictions(add(earlier, b)).length, 0, "non-overlapping intervals: the world changed");
  assert.equal(findContradictions(add(a, later)).length, 1, "open-ended interval still overlaps a later one unless it supersedes");
  assert.equal(findContradictions(add(a, { ...later, supersedes: "p1" } as PersonalRecord)).length, 0, "an explicit supersession settles it");
  const s = add(a, b);
  assert.deepEqual([...s.entries.keys()].sort(), ["p1", "p2"], "neither was merged away");
});

// 8 confidence cannot grant authority
test("authority is decided by the policy, never by confidence", () => {
  const believed = base["inf-foundations-known"] as PersonalRecord & { confidence: string };
  assert.equal(believed.confidence, "high");
  const strict = authorizeUse(believed, "REUSE", "architecture-review-communication", policyStrict, T.now);
  assert.equal(strict.allowed, false, "high confidence, no grant");
  assert.match(strict.why, /REUSE_UNAUTHORISED|DATA_SCOPE_UNAUTHORISED/);
  const low = validateRecord(mutate("inf-derivations-useful", { confidence: "low" })) as PersonalRecord;
  assert.equal(authorizeUse(low, "REUSE", "architecture-review-communication", policyReuseInference, T.now).allowed, true, "low confidence, granted");
});

test("access, processing, inference, retention, reuse and disclosure are separate operations with separate grants", () => {
  const policy = personalPolicy("ops-v1", [{ id: "g", purpose: "p", kinds: ["declared_policy"], operations: ["ACCESS", "PROCESS"] }]);
  const rec = base["pol-arch-review"]!;
  const verdicts = (["ACCESS", "PROCESS", "INFER", "RETAIN", "REUSE", "DISCLOSE"] as const).map(op => [op, authorizeUse(rec, op, "p", policy, T.now).allowed]);
  assert.deepEqual(verdicts, [["ACCESS", true], ["PROCESS", true], ["INFER", false], ["RETAIN", false], ["REUSE", false], ["DISCLOSE", false]]);
  assert.equal(authorizeUse(rec, "ACCESS", "another-purpose", policy, T.now).allowed, false, "a grant is bound to a purpose");
  assert.equal(authorizeUse(base["obs-expand-derivations"]!, "ACCESS", "p", policy, T.now).allowed, false, "a grant is bound to a kind of record");
  const expiring = personalPolicy("exp-v1", [{ id: "g", purpose: "p", kinds: ["declared_policy"], operations: ["ACCESS"], expires_at: "2026-06-01T00:00:00.000Z" }]);
  assert.equal(authorizeUse(rec, "ACCESS", "p", expiring, T.now).allowed, false, "an expired grant authorises nothing");
});

test("an event is validated like a record, an added id is added once, and a malformed event is refused", () => {
  assert.equal(code(() => validateEvent({ type: "nope", at: T.now })), "UNKNOWN_EVENT");
  assert.equal(code(() => validateEvent({ type: "added", at: "not a time", record: base["pol-arch-review"] })), "INVALID_TIME");
  assert.equal(code(() => validateEvent({ type: "added", at: T.now, record: { kind: "profile" } })), "UNKNOWN_KIND");
  const r = base["pol-arch-review"]!;
  const s = reduce([{ type: "added", at: T.now, record: r }, { type: "added", at: T.now, record: { ...r, settings: { depth: "changed" } } as PersonalRecord }]);
  assert.equal((s.entries.get(r.id)!.record as { settings: Record<string, string> }).settings["depth"], "full-when-decision-relevant", "a second add does not overwrite");
  assert.equal(reduce([]).entries.size, emptyState().entries.size);
  assert.equal(asEvents(base).length, Object.keys(base).length);
});
