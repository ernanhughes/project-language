import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { preservationReport, render, stableId } from "../src/engine/index.ts";
import { LensError } from "../src/engine/types.ts";

const SOURCE = {
  id: "example:test-log:1",
  kind: "text",
  scope: "example-project",
  content:
    "917 tests passed. Test migration_tenant_1847 failed with UniqueViolation on lineage_group_id deb226a9. Same failure repeated 3x in retry. The suite may need a rerun unless the constraint is fixed.",
};

void describe("render SOURCE mode", () => {
  void it("returns verbatim content with preserved provenance", () => {
    const artifact = render(SOURCE, "Identify decisive failure", "SOURCE");
    assert.equal(artifact.representation, SOURCE.content);
    assert.equal(artifact.source.id, SOURCE.id);
    assert.deepEqual(artifact.derived_from, [SOURCE.id]);
    assert.equal(artifact.producer.plugin, "opencode-lens");
    assert.equal(artifact.preservation.claim_survival, "preserved");
    assert.equal(artifact.preservation.provenance_survival, "preserved");
    assert.deepEqual(artifact.preservation.unsupported_additions, []);
  });
});

void describe("render BRIEF mode", () => {
  void it("produces a shorter representation that keeps numbers and identifiers", () => {
    const artifact = render(SOURCE, "Identify decisive failure, preserve exact identifiers", "BRIEF");
    assert.ok(artifact.representation.length < SOURCE.content.length);
    assert.ok(artifact.representation.includes("deb226a9"));
    assert.ok(artifact.representation.includes("917"));
    assert.equal(artifact.mode, "BRIEF");
    assert.ok(artifact.artifact_id.length === 16);
  });

  void it("is deterministic for identical inputs", () => {
    const a = render(SOURCE, "p", "BRIEF");
    const b = render(SOURCE, "p", "BRIEF");
    assert.equal(a.artifact_id, b.artifact_id);
    assert.equal(a.representation, b.representation);
  });
});

void describe("render STRUCTURED mode", () => {
  void it("exposes claims, qualifiers, numbers, and identifiers", () => {
    const artifact = render(SOURCE, "Audit factual content", "STRUCTURED");
    assert.ok(artifact.representation.includes("claims (4):"));
    assert.ok(artifact.representation.includes("917"));
    assert.ok(artifact.representation.includes("deb226a9"));
    assert.ok(artifact.representation.includes("unless the constraint is fixed"));
  });
});

void describe("failures", () => {
  void it("rejects empty source content", () => {
    assert.throws(() => render({ ...SOURCE, content: "  " }, "p", "BRIEF"), (e) => e instanceof LensError && e.code === "SOURCE_UNAVAILABLE");
  });
  void it("rejects unknown modes without touching the source", () => {
    assert.throws(() => render(SOURCE, "p", "TABLE"), (e) => e instanceof LensError && e.code === "MODE_UNSUPPORTED");
  });
  void it("rejects empty purpose", () => {
    assert.throws(() => render(SOURCE, "  ", "BRIEF"), (e) => e instanceof LensError && e.code === "CONFIG_INVALID");
  });
});

void describe("preservation honesty", () => {
  void it("flags numbers dropped from the representation", () => {
    const report = preservationReport("The budget is 450 euros, approved twice.", "The budget was approved.", "BRIEF");
    assert.equal(report.numerical_survival, "lost");
  });
  void it("flags numbers invented by the representation", () => {
    const report = preservationReport("The budget was approved.", "The budget of 900 euros was approved.", "BRIEF");
    assert.deepEqual(report.unsupported_additions, ["900"]);
  });
  void it("marks qualifier survival unknown when the source has no qualifiers", () => {
    const report = preservationReport("Deploy at noon.", "Deploy at noon.", "SOURCE");
    assert.equal(report.qualifier_survival, "unknown");
  });
});

void describe("stableId", () => {
  void it("is stable and input-sensitive", () => {
    assert.equal(stableId(["a", "b"]), stableId(["a", "b"]));
    assert.notEqual(stableId(["a", "b"]), stableId(["a", "c"]));
  });
});

void describe("preservation report: order, negation and hedges", () => {
  const src = "Acme acquired Beta in 2023. The effect may reduce errors by 20 percent. The test did not pass.";
  const claim = (out: string) => preservationReport(src, out, "BRIEF");

  void it("a verbatim copy is preserved on every axis", () => {
    const r = claim(src);
    assert.equal(r.claim_survival, "preserved");
    assert.equal(r.qualifier_survival, "preserved");
  });

  void it("a reversed relation is no longer read as preserved, though every word survives", () => {
    const r = claim("Beta acquired Acme in 2023. The effect may reduce errors by 20 percent. The test did not pass.");
    assert.notEqual(r.claim_survival, "preserved");
  });

  void it("a hedge turned into a certainty is caught as a lost qualifier", () => {
    const r = claim("Acme acquired Beta in 2023. The effect does reduce errors by 20 percent. The test did not pass.");
    assert.equal(r.qualifier_survival, "lost");
  });

  void it("a dropped negation is caught", () => {
    const r = claim("Acme acquired Beta in 2023. The effect may reduce errors by 20 percent. The test did pass.");
    assert.notEqual(r.claim_survival, "preserved");
  });

  void it("known blind spot: swapping one word for its opposite inside a long sentence is not noticed", () => {
    const r = claim("Acme acquired Beta in 2023. The effect may increase errors by 20 percent. The test did not pass.");
    assert.equal(r.claim_survival, "preserved", "the report cannot see that 'reduce' became 'increase'");
  });

  void it("known false alarm: a faithful paraphrase reads as lost, because the report is for extractive output", () => {
    const r = preservationReport("The effect may reduce errors by 20 percent.", "Errors may fall by 20 percent because of the effect.", "BRIEF");
    assert.notEqual(r.claim_survival, "preserved");
  });
});
