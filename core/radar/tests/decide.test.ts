import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../src/engine/index.ts";
import { RadarError, type CandidateInput } from "../src/engine/types.ts";

const base: CandidateInput = {
  id: "t",
  kind: "test",
  task_relevance: "high",
  novelty: "NEW",
  evidential_validity: "confirmed",
  urgency: "soon",
  cost: "low",
};

void describe("gates", () => {
  void it("refuted claims skip regardless of relevance", () => {
    const d = decide({ ...base, evidential_validity: "refuted" });
    assert.equal(d.disposition, "SKIP");
    assert.equal(d.resolution, "SOURCE");
  });
  void it("expiring relevant items show with uncertainty when unconfirmed", () => {
    const d = decide({ ...base, urgency: "expiring", evidential_validity: "unconfirmed" });
    assert.equal(d.disposition, "SHOW");
    assert.equal(d.resolution, "DETAIL");
    assert.ok(d.uncertainty.length > 0);
  });
  void it("uncertain novelty sidelines instead of foregrounding", () => {
    const d = decide({ ...base, novelty: "UNCERTAIN", urgency: "routine" });
    assert.equal(d.disposition, "SIDECAR");
    assert.equal(d.resolution, "GLANCE");
  });
  void it("duplicates without urgency skip", () => {
    const d = decide({ ...base, task_relevance: "medium", novelty: "ACCESSIBLE", urgency: "routine" });
    assert.equal(d.disposition, "SKIP");
  });
  void it("high-relevance accessible items queue rather than skip", () => {
    const d = decide({ ...base, novelty: "ACCESSIBLE", urgency: "routine" });
    assert.equal(d.disposition, "QUEUE");
  });
});

void describe("safe default", () => {
  void it("all-unknown input never shows", () => {
    const d = decide({ id: "u", kind: "item", task_relevance: "medium", novelty: "UNKNOWN", evidential_validity: "unknown", urgency: "routine", cost: "low" });
    assert.notEqual(d.disposition, "SHOW");
    assert.ok(d.reasons.length > 0);
  });
  void it("every decision carries reasons and a policy version", () => {
    const d = decide(base);
    assert.ok(d.reasons.length > 0);
    assert.equal(d.policy_version, "radar-policy-v0.1");
    assert.equal(d.producer.plugin, "opencode-radar");
  });
});

void describe("validation", () => {
  void it("rejects unknown enum values", () => {
    assert.throws(() => decide({ ...base, urgency: "whenever" } as unknown as CandidateInput), (e) => e instanceof RadarError && e.code === "INVALID_CANDIDATE");
  });
  void it("rejects empty ids", () => {
    assert.throws(() => decide({ ...base, id: "" }), (e) => e instanceof RadarError && e.code === "INVALID_CANDIDATE");
  });
});
