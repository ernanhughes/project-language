import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AttentionError, correct, decompose, forget, gradeOf, knows, omissionPlan, parseTranscript, planForPurpose, resolvePurpose,
  selectWindowsLocally, timesOf, validateJudgement, validateUnits, visibleState,
  type Judgement, type KnowledgeState, type Unit, type UnitProposal,
} from "../src/attention/index.ts";
import {
  NOW, IRIS_TERMS, TRANSCRIPT, conceptUses, judgements, mina, minaKnows, parsed, iris, irisKnows, scriptedProposals, scriptedProposer, tom,
} from "../fixtures/talk.ts";

const dec = decompose(parsed, scriptedProposer);
const units = dec.units;
const byId = (id: string) => units.find(u => u.id === id)!;
const BUDGET = 140;
const plan = (p: typeof iris, b = BUDGET) => planForPurpose(units, parsed.source, p, judgements[p.id]!, b);

// ─── the transcript, in the skill's format ──────────────────────────────────────────────────────────
test("the youtube-transcript format parses: minutes, hours, offsets that point back into the source", () => {
  const p = parseTranscript("[0:15] I took the camera out, painted it\n[1:02:03] much later\n", "demo");
  assert.deepEqual(p.lines.map(l => [l.stamp, l.seconds, l.text]), [["0:15", 15, "I took the camera out, painted it"], ["1:02:03", 3723, "much later"]]);
  for (const l of p.lines) assert.equal(p.source.text.slice(l.start, l.end), l.text);
  assert.equal(p.source.sha256.length, 64);
});

test("a malformed line, an impossible time, time going backwards and an empty transcript are refused", () => {
  assert.throws(() => parseTranscript("0:15 no brackets", "x"), /TRANSCRIPT_LINE_MALFORMED/);
  assert.throws(() => parseTranscript("[0:75] bad seconds", "x"), /TRANSCRIPT_TIME_INVALID/);
  assert.throws(() => parseTranscript("[0:20] a\n[0:10] b", "x"), /TRANSCRIPT_TIME_BACKWARDS/);
  assert.throws(() => parseTranscript("\n\n", "x"), /TRANSCRIPT_EMPTY/);
});

test("well-formed but implausible timestamps are warned about: 900 lines inside two seconds is a unit error, not a talk", () => {
  const collapsed = Array.from({ length: 900 }, (_, k) => `[0:0${Math.floor(k / 450)}] line ${k}`).join("\n");
  assert.match(parseTranscript(collapsed, "x").warnings[0]!, /TIMESTAMPS_IMPLAUSIBLE/);
  assert.deepEqual(parsed.warnings, [], "the invented talk is fine");
  const honest = Array.from({ length: 900 }, (_, k) => `[${Math.floor(k * 1.5 / 60)}:${String(Math.floor(k * 1.5) % 60).padStart(2, "0")}] line ${k}`).join("\n");
  assert.deepEqual(parseTranscript(honest, "x").warnings, []);
});

// ─── decomposition: structure may be proposed, content may not ──────────────────────────────────────
test("units are exact spans of the pinned transcript, and every one walks back to timestamps", () => {
  assert.deepEqual(validateUnits(units, parsed.source), []);
  assert.equal(dec.refused.length, 0);
  assert.deepEqual(timesOf(byId("u-scope"), parsed), ["[4:02]", "[53:20]"]);
  assert.deepEqual(timesOf(byId("u-benchmark"), parsed), ["[41:50-42:10]"]);
});

test("one unit can join minute 4 and minute 53: two spans, forty-nine minutes apart, one thought", () => {
  const u = byId("u-scope");
  assert.equal(u.spans.length, 2);
  assert.match(u.text, /a fault means a crash and nothing worse/);
  assert.match(u.text, /assumes bounded delays/);
});

test("a proposer cannot supply content: the text of a unit is whatever is at its spans, even if the proposal says otherwise", () => {
  const sneaky = [{ ...scriptedProposals[1]!, text: "The protocol is proven safe against everything." } as UnitProposal];
  const d = decompose(parsed, () => sneaky);
  assert.equal(d.units[0]!.text, parsed.lines[4]!.text);
  assert.doesNotMatch(d.units[0]!.text, /proven safe/);
});

test("proposals naming no line, a missing line, a duplicate id or an unaccepted dependency are refused with their reason", () => {
  const bad: UnitProposal[] = [
    { id: "a", role: "other", lines: [], dependsOn: [] },
    { id: "b", role: "other", lines: [99], dependsOn: [] },
    { id: "ok", role: "other", lines: [1], dependsOn: [] },
    { id: "ok", role: "other", lines: [2], dependsOn: [] },
    { id: "needs-b", role: "claim", lines: [3], dependsOn: ["b"] },
    { id: "needs-needs-b", role: "claim", lines: [4], dependsOn: ["needs-b"] },
  ];
  const d = decompose(parsed, () => bad);
  assert.deepEqual(d.units.map(u => u.id), ["ok"]);
  assert.deepEqual(Object.fromEntries(d.refused.map(r => [r.id, r.code])), { a: "NO_LINES", b: "UNKNOWN_LINE", ok: "DUPLICATE_ID", "needs-b": "DEPENDENCY_NOT_ACCEPTED", "needs-needs-b": "DEPENDENCY_NOT_ACCEPTED" });
});

// ─── why pieces cannot be judged one at a time ──────────────────────────────────────────────────────
test("scoring fixed windows on their own words drops the quiet qualifier that governs the loud result", () => {
  const w = selectWindowsLocally(parsed, 3, IRIS_TERMS, 2);
  const kept = w.filter(x => x.kept).map(x => x.stamps);
  const minute4 = w.find(x => x.text.includes("a fault means a crash"))!;
  const minute53 = w.find(x => x.text.includes("bounded delays"))!;
  assert.equal(minute4.kept, false, "minute 4 has none of the purpose's words, so a local scorer drops it");
  assert.equal(minute53.kept, true);
  assert.ok(kept.length >= 1);
  // the same purpose over whole units keeps both halves, because they are one unit
  const p = plan(iris);
  assert.ok(p.shown.includes("u-scope"));
  assert.equal(byId("u-scope").spans.length, 2);
});

// ─── relevance is a relation to a purpose ───────────────────────────────────────────────────────────
test("the same units and the same budget give three readers three different results", () => {
  const sets = [iris, tom, mina].map(p => plan(p).shown.slice().sort().join(","));
  assert.equal(new Set(sets).size, 3);
  assert.deepEqual(plan(iris).shown.slice().sort(), ["u-clock-sync", "u-proof", "u-quorum", "u-scope", "u-sync-sense"]);
  assert.deepEqual(plan(tom).shown.slice().sort(), ["u-benchmark", "u-history"]);
  assert.deepEqual(plan(mina).shown.slice().sort(), ["u-benchmark", "u-clock-sync", "u-quorum"]);
});

test("a unit judged not relevant still travels with the unit that depends on it, and says why", () => {
  const t = plan(tom);
  assert.deepEqual(t.attached, ["u-scope"]);
  const d = t.decisions.find(x => x.unit_id === "u-scope")!;
  assert.equal(d.verdict, "not_relevant");
  assert.match(d.reason, /u-benchmark depends on it/);
  assert.equal(d.reopenable, false);
  assert.deepEqual(plan(mina).attached, ["u-scope"]);
});

test("a qualifier is attached only if the unit that needs it is actually shown", () => {
  const judged = judgements[tom.id]!.map(x => (x.unit_id === "u-benchmark" ? { ...x, verdict: "not_relevant" as const } : x));
  const p = planForPurpose(units, parsed.source, tom, judged, BUDGET);
  assert.ok(!p.shown.includes("u-benchmark"));
  assert.ok(!p.attached.includes("u-scope"), "nothing shown depends on it any more");
});

test("everything not shown is withheld with a reason and can be reopened; nothing disappears", () => {
  const p = plan(iris);
  assert.equal(p.decisions.length, units.length);
  for (const id of ["u-history", "u-intro"]) assert.equal(p.decisions.find(d => d.unit_id === id)!.disposition, "withheld");
  const bench = p.decisions.find(d => d.unit_id === "u-benchmark")!;
  assert.equal(bench.disposition, "withheld");
  assert.match(bench.reason, /judged low .*not selected/);
  assert.ok(p.decisions.filter(d => d.disposition === "withheld").every(d => d.reopenable && d.reason.length > 0));
  assert.deepEqual([...p.shown, ...p.attached, ...p.withheld].sort(), units.map(u => u.id).sort());
});

test("a decisive unit is required: it is never traded away for budget", () => {
  const tiny = planForPurpose(units, parsed.source, mina, judgements[mina.id]!, 40);
  assert.ok(tiny.shown.includes("u-benchmark") || tiny.selection.failure !== null);
});

test("a judgement needs a reason, a real citation and the right purpose, and a model's judgement waits for a person", () => {
  const good = judgements[iris.id]![0]!;
  const check = (j: Judgement) => validateJudgement(j, iris, units).map(p => p.code);
  assert.deepEqual(check(good), []);
  assert.deepEqual(check({ ...good, reason: "  " }), ["NO_REASON"]);
  assert.deepEqual(check({ ...good, cites: ["u-proof"] }), ["BAD_CITATION"]);
  assert.deepEqual(check({ ...good, cites: [good.unit_id, "nope"] }), ["BAD_CITATION"]);
  assert.deepEqual(check({ ...good, purpose_id: tom.id }), ["WRONG_PURPOSE"]);
  assert.deepEqual(check({ ...good, unit_id: "ghost", cites: ["ghost"] }), ["UNKNOWN_UNIT", "BAD_CITATION"]);
  assert.deepEqual(check({ ...good, by: "model" }), ["MODEL_JUDGEMENT_NOT_ACCEPTED"]);
  assert.deepEqual(check({ ...good, by: "model", accepted_by: "person" }), []);
  assert.throws(() => planForPurpose(units, parsed.source, iris, [{ ...good, by: "model" }], BUDGET), /INVALID_JUDGEMENTS/);
});

test("a judgement made for one purpose cannot be used for another", () => {
  assert.throws(() => planForPurpose(units, parsed.source, tom, judgements[iris.id]!, BUDGET), (e: unknown) => e instanceof AttentionError && /WRONG_PURPOSE/.test(e.message));
});

test("an inferred purpose is a suggestion beside the declared one, never a replacement; with none declared the person is asked", () => {
  const inferred = { text: "Decide whether to benchmark the protocol", by: "model" as const, why: "she mentioned speed once" };
  const r = resolvePurpose(iris, inferred);
  assert.equal(r.purpose, iris);
  assert.equal(r.suggestion, inferred);
  assert.match(r.note, /does not replace/);
  const none = resolvePurpose(null, inferred);
  assert.equal(none.purpose, null);
  assert.match(none.note, /ask the person/);
  assert.equal(resolvePurpose(iris, null).suggestion, null);
});

// ─── what the person knows ──────────────────────────────────────────────────────────────────────────
test("grades come from dated evidence: not observed and merely exposed are unknown, demonstrated knowledge decays one grade", () => {
  assert.equal(gradeOf(undefined, NOW).grade, "UNKNOWN");
  assert.match(gradeOf(undefined, NOW).why, /not the same as not known/);
  assert.equal(gradeOf({ concept: "c", sense: "s", evidence: [{ kind: "exposed", at: "2026-10-01T00:00:00.000Z", ref: "r" }] }, NOW).grade, "UNKNOWN");
  const used = (at: string) => ({ concept: "c", sense: "s", evidence: [{ kind: "used_correctly" as const, at, ref: "r" }] });
  assert.equal(gradeOf(used("2026-01-01T00:00:00.000Z"), NOW).grade, "KNOWN");
  assert.equal(gradeOf(used("2023-01-01T00:00:00.000Z"), NOW).grade, "PARTIAL", "three years old: rusty");
  assert.equal(gradeOf({ concept: "c", sense: "s", evidence: [{ kind: "worked_with", at: "2026-09-01T00:00:00.000Z", ref: "r" }] }, NOW).grade, "PARTIAL");
});

test("a later mistake against an earlier demonstration is a conflict, and a conflict is uncertainty", () => {
  const f = { concept: "c", sense: "s", evidence: [{ kind: "used_correctly" as const, at: "2026-01-01T00:00:00.000Z", ref: "r" }, { kind: "mistake" as const, at: "2026-06-01T00:00:00.000Z", ref: "r" }] };
  assert.equal(gradeOf(f, NOW).grade, "UNKNOWN");
  assert.match(gradeOf(f, NOW).why, /conflicts with a later mistake/);
  const mended = { ...f, evidence: [...f.evidence, { kind: "stated" as const, at: "2026-08-01T00:00:00.000Z", ref: "r" }] };
  assert.equal(gradeOf(mended, NOW).grade, "KNOWN");
});

test("a familiar term in another sense is not a known meaning", () => {
  const k = knows(irisKnows, "partial synchrony", "the delay bound is known to the protocol", NOW);
  assert.equal(k.grade, "UNKNOWN");
  assert.equal(k.sense_mismatch, true);
  assert.equal(k.known_sense, "the delay bound exists but is unknown");
  assert.equal(knows(irisKnows, "quorum", "a majority of the nodes", NOW).grade, "KNOWN");
});

test("omission needs known in this sense AND not needed: the quorum definition goes for Iris and stays for Mina", () => {
  const p = plan(iris);
  const forIris = omissionPlan(units.filter(u => p.shown.includes(u.id)), p.shown, units, conceptUses, irisKnows, NOW);
  const q = forIris.find(d => d.unit_id === "u-quorum")!;
  assert.equal(q.treatment, "omit");
  const s = forIris.find(d => d.unit_id === "u-sync-sense")!;
  assert.equal(s.treatment, "keep");
  assert.equal(s.sense_mismatch, true, "the opening case of the chapter: a familiar word, a different meaning");
  const m = plan(mina);
  const forMina = omissionPlan(units.filter(u => m.shown.includes(u.id)), m.shown, units, conceptUses, minaKnows, NOW);
  assert.equal(forMina.find(d => d.unit_id === "u-quorum")!.treatment, "keep", "she was only exposed to it");
});

test("known is not safe to omit: a known unit that a shown unit depends on stays; partial collapses; no concept keeps", () => {
  const A: Unit = { ...byId("u-quorum"), id: "A", dependsOn: [] };
  const B: Unit = { ...byId("u-round"), id: "B", dependsOn: ["A"] };
  const state: KnowledgeState = [{ concept: "ca", sense: "sa", evidence: [{ kind: "stated", at: "2026-01-01T00:00:00.000Z", ref: "r" }] }];
  const uses = [{ unit_id: "A", concept: "ca", sense: "sa" }];
  const chain = omissionPlan([A], ["A", "B"], [A, B], uses, state, NOW)[0]!;
  assert.equal(chain.treatment, "keep");
  assert.match(chain.why, /known is not safe to omit/);
  assert.equal(omissionPlan([A], ["A"], [A, B], uses, state, NOW)[0]!.treatment, "omit");
  const partial: KnowledgeState = [{ concept: "ca", sense: "sa", evidence: [{ kind: "worked_with", at: "2026-06-01T00:00:00.000Z", ref: "r" }] }];
  assert.equal(omissionPlan([A], ["A"], [A, B], uses, partial, NOW)[0]!.treatment, "collapse");
  assert.equal(omissionPlan([A], ["A"], [A, B], [], state, NOW)[0]!.treatment, "keep");
});

test("the person can see the state with its evidence, correct it, and forget it; the original is not mutated", () => {
  const rows = visibleState(irisKnows, NOW);
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.evidence.length > 0 && r.why.length > 0));
  const corrected = correct(irisKnows, "partial synchrony", "the delay bound exists but is unknown", "mistake", "2026-10-10T00:00:00.000Z");
  assert.equal(knows(corrected, "partial synchrony", "the delay bound exists but is unknown", NOW).grade, "UNKNOWN");
  assert.equal(knows(irisKnows, "partial synchrony", "the delay bound exists but is unknown", NOW).grade, "KNOWN", "the original is unchanged");
  const gone = forget(irisKnows, "quorum");
  assert.equal(gone.length, 1);
  assert.equal(knows(gone, "quorum", "a majority of the nodes", NOW).grade, "UNKNOWN");
  assert.equal(irisKnows.length, 2);
  assert.equal(correct([], "x", "y", "stated", NOW).length, 1);
});
