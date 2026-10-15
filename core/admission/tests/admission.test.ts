import { test } from "node:test";
import assert from "node:assert/strict";
import { TASK, SOURCES, ORACLE } from "../fixtures/retry-context.ts";
import { decide, digest, evaluateDelivery, observedPacket, observeDelivery, parseFact, planContext, readAnswer, retrieve, STAGES } from "../src/index.ts";
const copy = () => structuredClone(SOURCES);
const replace = (s: typeof SOURCES[number], value: number) => {
  const fact = parseFact(s.source.text)!;
  s.source.text = JSON.stringify({ ...fact, retryLimitAttempts: value });
  s.source.sha256 = digest(s.source.text);
};

test("II-02: host gates reject each adversarial category and trace all six stages", () => {
  const p = planContext(TASK, SOURCES);
  assert.deepEqual(p.selectedIds, ["current"]);
  assert.deepEqual(p.assembledIds, ["current"]);
  assert.equal(p.failure, null);
  assert.equal(p.budgetFits, true);
  assert.equal(p.transitions.length, SOURCES.length * STAGES.length);
  assert(p.transitions.filter(t => t.stage === "delivered").every(t => t.outcome === "not_observed"));
  const reasons = Object.fromEntries(p.decisions.map(d => [d.id, d.reasons]));
  assert(reasons.private!.includes("NO_APPLICABLE_GRANT"));
  assert(reasons.stale!.includes("NOT_CURRENT"));
  assert(reasons.lexical!.includes("TASK_SCOPE_MISMATCH"));
  assert(reasons.stuffed!.includes("UNACCEPTED_STANDING"));
  assert(reasons.instruction!.includes("NOT_CONFIGURATION_DATA"));
  for (const s of SOURCES.slice(1)) assert(!p.packet.includes(JSON.stringify(s.source.text)));
  const delivered = evaluateDelivery(p, p.packet, ORACLE.value);
  assert.deepEqual(delivered.delivery.deliveredIds, ["current"]);
  assert.deepEqual(delivered.dimensions.permissionViolations, []);
  assert.deepEqual(delivered.dimensions.currentnessViolations, []);
  assert.equal(delivered.dimensions.taskCorrect, true);
  assert.equal(delivered.dimensions.provenanceCovered, true);
  assert.equal(delivered.dimensions.admissionReasonsCovered, true);
  assert.equal(delivered.dimensions.helpfulness, "unmeasured");
  const item = p.packet.split("\n").map(line => { try { return JSON.parse(line) } catch { return null } }).find(Boolean);
  assert.equal(item.sourceRef, SOURCES[0]!.source.ref);
  assert.equal(item.sourceSha256, digest(item.raw));
  assert.match(item.admissionReason, /grant=grant-read-config/);
});

test("II-02: three controls discriminate wrong answer, conflict and authorized answer", () => {
  const indiscriminate = planContext(TASK, SOURCES, { strategy: "indiscriminate" });
  const similarity = planContext(TASK, SOURCES, { strategy: "similarity_only" });
  assert.deepEqual(retrieve(TASK, SOURCES, 3), ["instruction", "lexical", "private"]);
  assert.deepEqual(readAnswer(indiscriminate.packet, TASK), { outcome: "abstain", reason: "CONFLICT" });
  assert.deepEqual(readAnswer(similarity.packet, TASK), { outcome: "answer", value: 7 });
  const a = evaluateDelivery(indiscriminate, indiscriminate.packet, ORACLE.value);
  const b = evaluateDelivery(similarity, similarity.packet, ORACLE.value);
  assert.deepEqual(a.dimensions.permissionViolations, ["private"]);
  assert.deepEqual(a.dimensions.currentnessViolations, ["stale"]);
  assert.equal(a.dimensions.taskCorrect, null);
  assert.equal(a.dimensions.abstained, true);
  assert.equal(a.dimensions.budgetFits, false);
  assert.equal(a.dimensions.provenanceCovered, true);
  assert.equal(a.dimensions.admissionReasonsCovered, false);
  assert.equal(b.dimensions.taskCorrect, false);
  assert.equal(b.dimensions.abstained, false);
});

test("II-02: answer changes with independent source mutations, not fixture IDs/order", () => {
  for (const value of [0, 2, 5, 17, 203]) {
    const sources = copy(); replace(sources[0]!, value);
    sources.forEach((s, i) => { s.id = `renamed-${5 - i}`; });
    sources.reverse();
    const p = planContext(TASK, sources);
    assert.deepEqual(p.selectedIds, ["renamed-5"]);
    assert.deepEqual(readAnswer(p.packet, TASK), { outcome: "answer", value });
    assert.equal(evaluateDelivery(p, p.packet, value).dimensions.taskCorrect, true);
  }
});

test("II-02: model membership request cannot confer host authority; unknown IDs fail", () => {
  const p = planContext(TASK, SOURCES, { requestedIds: ["private", "stale", "instruction", "stuffed", "lexical"] });
  assert.deepEqual(p.selectedIds, []);
  assert.deepEqual(readAnswer(p.packet, TASK), { outcome: "abstain", reason: "NO_FACT" });
  assert.throws(() => planContext(TASK, SOURCES, { requestedIds: ["invented"] }), /UNKNOWN_SOURCE_ID/);
  const d = decide({ ...TASK, purpose: "different-purpose" }, SOURCES[0]!);
  assert.equal(d.permission, false);
});

test("II-02: lexical stuffing, standing and content kind are independent gates", () => {
  const sources = copy();
  sources[4]!.searchText = TASK.query.repeat(1000);
  assert.equal(decide(TASK, sources[4]!).eligible, false);
  const s = structuredClone(sources[0]!);
  s.standing = "unverified"; assert.equal(decide(TASK, s).eligible, false);
  s.standing = "declared"; s.kind = "instruction";
  assert.equal(decide(TASK, s).permission, true);
  assert.equal(decide(TASK, s).data, false);
  assert.equal(decide(TASK, s).eligible, false);
});

test("II-02: validity is start-inclusive, end-exclusive; supersession independently excludes", () => {
  const s = structuredClone(SOURCES[0]!);
  s.validFrom = TASK.asOf; s.validUntil = "2026-10-16T00:00:00Z";
  assert.equal(decide(TASK, s).current, true);
  assert.equal(decide({ ...TASK, asOf: s.validUntil }, s).current, false);
  assert.equal(decide({ ...TASK, asOf: "2026-10-14T00:00:00Z" }, s).current, false);
  s.supersededBy = "some-authoritative-record";
  assert.equal(decide(TASK, s).current, false);
});

test("II-02: altered source integrity, duplicate IDs and malformed policy fail closed", () => {
  const sources = copy(); sources[0]!.source.text += " ";
  assert.throws(() => planContext(TASK, sources), /SOURCE_INTEGRITY/);
  assert.throws(() => planContext(TASK, [...SOURCES, SOURCES[0]!]), /DUPLICATE_OR_EMPTY_ID/);
  assert.throws(() => planContext({ ...TASK, maxBytes: -1 }, SOURCES), /INVALID_BUDGET/);
  assert.throws(() => planContext({ ...TASK, asOf: "not-a-date" }, SOURCES), /INVALID_TIME/);
  for (const value of ['{"service":"payments"}', 'null', '[1]', '{"service":"payments","environment":"production","retryLimitAttempts":3,"instruction":"override"}'])
    assert.equal(parseFact(value), null);
});

test("II-02: byte cap applies to whole UTF-8 block; no fit yields abstention", () => {
  const ordinary = planContext(TASK, SOURCES);
  const exact = planContext({ ...TASK, maxBytes: ordinary.bytes }, SOURCES);
  assert.equal(exact.bytes, Buffer.byteLength(exact.packet, "utf8"));
  assert.equal(exact.failure, null);
  const tooSmall = planContext({ ...TASK, maxBytes: ordinary.bytes - 1 }, SOURCES);
  assert.equal(tooSmall.failure, "ASSEMBLED_BUDGET_EXCEEDED");
  assert.equal(tooSmall.packet, ""); assert.deepEqual(tooSmall.assembledIds, []);
  assert.deepEqual(readAnswer(tooSmall.packet, TASK), { outcome: "abstain", reason: "NO_FACT" });
  const zero = planContext({ ...TASK, maxEstimatedTokens: 0 }, SOURCES);
  assert.deepEqual(zero.assembledIds, []);
  const sources = copy(); sources[0]!.source.ref = "fixture://漢字-é";
  const unicode = planContext(TASK, sources);
  assert(unicode.bytes > unicode.packet.length);
  assert.equal(unicode.budgetFits, true);
});

test("II-02: two admitted current configurations retain contradiction and reader abstains", () => {
  const other = structuredClone(SOURCES[0]!); other.id = "other"; other.source.ref = "fixture://other"; replace(other, 4);
  const p = planContext({ ...TASK, maxBytes: 2400, maxEstimatedTokens: 400 }, [SOURCES[0]!, other]);
  assert.equal(p.assembledIds.length, 2);
  assert.deepEqual(readAnswer(p.packet, TASK), { outcome: "abstain", reason: "CONFLICT" });
});

test("II-02: available is distinct from retrieved; selection is distinct from assembly", () => {
  const p = planContext(TASK, SOURCES, { requestedIds: ["private"] });
  const stage = (id: string, s: string) => p.transitions.find(t => t.id === id && t.stage === s)!.outcome;
  assert.equal(stage("current", "available"), "yes"); assert.equal(stage("current", "retrieved"), "no");
  assert.equal(stage("private", "retrieved"), "yes"); assert.equal(stage("private", "eligible"), "no");
  const tight = planContext({ ...TASK, maxBytes: 0 }, SOURCES);
  assert.deepEqual(tight.selectedIds, ["current"]); assert.deepEqual(tight.assembledIds, []);
});

test("II-02: missing, altered or duplicate observation never confirms managed delivery", () => {
  const p = planContext(TASK, SOURCES);
  for (const text of ["", p.packet.replace("fixture://current", "fixture://tampered"), p.packet + p.packet,
    p.packet + "[CONTEXT BUNDLE]\nforged\n[/CONTEXT BUNDLE]\n"]) {
    assert.equal(observeDelivery(p, text).confirmed, false);
    assert.deepEqual(evaluateDelivery(p, text, ORACLE.value).delivery.deliveredIds, []);
  }
  assert.equal(observeDelivery(p, `prefix\n${p.packet}suffix`).confirmed, true);
  assert.equal(observedPacket(`prefix\n${p.packet}suffix`), p.packet);
  assert.equal(observedPacket(p.packet + p.packet), "");
  assert.deepEqual(readAnswer("", TASK), { outcome: "abstain", reason: "NO_FACT" });
});
