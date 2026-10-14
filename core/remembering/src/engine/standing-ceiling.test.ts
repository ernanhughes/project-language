import { describe, expect, test } from "../../../../harness/bun-test.ts";

import {
  attachRecordCeilings,
  ceilingRank,
  resolveRoute,
  runPipelineStages,
} from "./context.ts";
import { builtinTrustPolicy } from "./trust/policy.ts";
import { resolveStanding } from "./trust/standing.ts";
import type { TrustPolicy } from "./trust/model.ts";

const S1_POLICY = builtinTrustPolicy();
const FULL_POLICY: TrustPolicy = {
  ...S1_POLICY,
  defaultLevel: "FULL",
  grants: [{ id: "explicit", sourcePattern: "*", level: "FULL", role: "test" }],
};

function candidate(id: string, text: string, sourceId: string, standingCeiling?: string) {
  return {
    candidateId: id, sourceId, text, section: null, score: 1,
    provenance: "retrieval:fused", lexicalRank: 1, denseRank: 1,
    ...(standingCeiling === undefined ? {} : { standingCeiling }),
  };
}

const TEXT = "The production deployment checklist requires a staged rollout with monitoring.";
const MEM = "memory://rec-ceiling-1";

const BASE = {
  standpoint: { mode: "current" as const },
  frame: { applied: false, reason: "no frame", excluded: [] },
  standing: resolveStanding([]),
  budget: { maxChars: 5000, maxResults: 5 },
};

describe("record ceiling enforcement", () => {
  test("S3 ceiling + FULL grant + required FULL denies influence and names the ceiling", () => {
    const out = runPipelineStages(
      [candidate("c1", TEXT, MEM, "S3")],
      { ...BASE, query: "deploy now", route: resolveRoute("deploy now", "influence"), trustPolicy: FULL_POLICY, requiredLevel: "FULL", selectionMode: "decisive" },
    );
    expect(out.denied).toHaveLength(1);
    expect(out.denied[0]!.reason).toMatch(/ceiling S3/i);
    expect(out.selection.selected).toHaveLength(0);
    expect(out.stageMap["c1"]!.stages["ceiling"]).toMatchObject({ admitted: false });
  });

  test("same S3 record is recalled as history with the cap annotated", () => {
    const out = runPipelineStages(
      [candidate("c1", TEXT, MEM, "S3")],
      { ...BASE, query: "what was decided?", route: resolveRoute("what was decided?", "recall"), trustPolicy: FULL_POLICY, requiredLevel: "FULL", selectionMode: "decisive" },
    );
    expect(out.selection.selected).toHaveLength(1);
    expect(out.stageMap["c1"]!.stages["ceiling"]!.reason).toMatch(/recalled as history/i);
  });

  test("FULL ceiling + FULL grant admits and selects", () => {
    const out = runPipelineStages(
      [candidate("c1", TEXT, MEM, "FULL")],
      { ...BASE, query: "deploy now", route: resolveRoute("deploy now", "influence"), trustPolicy: FULL_POLICY, requiredLevel: "FULL", selectionMode: "decisive" },
    );
    expect(out.selection.selected).toHaveLength(1);
  });

  test("builtin S1 trust still denies FULL influence independently of the ceiling", () => {
    const out = runPipelineStages(
      [candidate("c1", TEXT, MEM, "FULL")],
      { ...BASE, query: "deploy now", route: resolveRoute("deploy now", "influence"), trustPolicy: S1_POLICY, requiredLevel: "FULL", selectionMode: "decisive" },
    );
    expect(out.denied).toHaveLength(1);
    expect(out.denied[0]!.reason).not.toMatch(/ceiling S3/i);
  });

  test("unknown ceiling string fails closed on influence", () => {
    const out = runPipelineStages(
      [candidate("c1", TEXT, MEM, "BOGUS")],
      { ...BASE, query: "deploy now", route: resolveRoute("deploy now", "influence"), trustPolicy: FULL_POLICY, requiredLevel: "FULL", selectionMode: "decisive" },
    );
    expect(out.denied).toHaveLength(1);
    expect(out.denied[0]!.reason).toMatch(/unknown ceiling/i);
  });

  test("missing ceiling on a memory source fails closed on influence, admits on recall", () => {
    const influence = runPipelineStages(
      [candidate("c1", TEXT, MEM)],
      { ...BASE, query: "deploy now", route: resolveRoute("deploy now", "influence"), trustPolicy: FULL_POLICY, requiredLevel: "FULL", selectionMode: "decisive" },
    );
    expect(influence.denied).toHaveLength(1);
    const recall = runPipelineStages(
      [candidate("c1", TEXT, MEM)],
      { ...BASE, query: "what was decided?", route: resolveRoute("what was decided?", "recall"), trustPolicy: FULL_POLICY, requiredLevel: "FULL", selectionMode: "decisive" },
    );
    expect(recall.selection.selected).toHaveLength(1);
  });

  test("non-memory candidates without a ceiling are unaffected", () => {
    const out = runPipelineStages(
      [candidate("c1", TEXT, "docs/deploy.md")],
      { ...BASE, query: "deploy now", route: resolveRoute("deploy now", "influence"), trustPolicy: FULL_POLICY, requiredLevel: "FULL", selectionMode: "decisive" },
    );
    expect(out.selection.selected).toHaveLength(1);
    expect(out.stageMap["c1"]!.stages["ceiling"]!.admitted).toBe(true);
  });

  test("selection cannot elevate: an S3 candidate selected under S3 keeps its ceiling", () => {
    const out = runPipelineStages(
      [candidate("c1", TEXT, MEM, "S3")],
      { ...BASE, query: "deploy now", route: resolveRoute("deploy now", "influence"), trustPolicy: FULL_POLICY, requiredLevel: "S3", selectionMode: "decisive" },
    );
    expect(out.selection.selected).toHaveLength(1);
    expect(out.selection.selected[0]!.standingCeiling).toBe("S3");
  });

  test("ceilingRank maps known levels and rejects unknown ones", () => {
    expect(ceilingRank("FULL", MEM)).toMatchObject({ rank: 4, applicable: true });
    expect(ceilingRank("S3", MEM)).toMatchObject({ rank: 3, applicable: true });
    expect(ceilingRank("BOGUS", MEM).rank).toBe(-1);
    expect(ceilingRank(undefined, MEM).rank).toBe(-1);
    expect(ceilingRank(undefined, "docs/x.md")).toMatchObject({ rank: 4, applicable: false });
  });
});

describe("attachRecordCeilings", () => {
  test("resolves memory ceilings, skips the rest, preserves failures as unset", async () => {
    const cands = [
      candidate("c1", TEXT, "memory://rec-1"),
      candidate("c2", TEXT, "docs/ext.md"),
      candidate("c3", TEXT, "memory://rec-9", "FULL"),
      candidate("c4", TEXT, "memory://gone"),
    ];
    await attachRecordCeilings(cands, async (recordId) => {
      if (recordId === "rec-1") return { standingCeiling: "S3" };
      if (recordId === "gone") throw new Error("store unreachable");
      return null;
    });
    expect(cands[0]!.standingCeiling).toBe("S3");
    expect(cands[1]!.standingCeiling).toBeUndefined();
    expect(cands[2]!.standingCeiling).toBe("FULL");
    expect(cands[3]!.standingCeiling).toBeUndefined();
  });
});
