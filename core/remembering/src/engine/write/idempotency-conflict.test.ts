import { describe, expect, test } from "../../../../../harness/bun-test.ts";

import { canonicalWriteFingerprint } from "./service.ts";
import { builtinWritePolicy } from "./policy.ts";
import { WriteService } from "./service.ts";
import { MemoryWriteStore } from "./store.ts";

const FIXED_NOW = "2026-10-02T12:00:00.000Z";

function service(store = new MemoryWriteStore()) {
  return { store, svc: new WriteService(store, builtinWritePolicy(), () => FIXED_NOW) };
}

describe("idempotency conflict contract", () => {
  test("same key + same request returns the original duplicate without a code", async () => {
    const { svc } = service();
    const first = await svc.execute({ content: "Same fact.", idempotencyKey: "k-same" });
    const second = await svc.execute({ content: "Same fact.", idempotencyKey: "k-same" });
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.actionId).toBe(first.actionId);
    expect(second.code).toBeUndefined();
  });

  test("same key + materially different content is a conflict, original retained", async () => {
    const { store, svc } = service();
    const first = await svc.execute({ content: "Deploy checklist version Alpha.", idempotencyKey: "k-conflict" });
    const second = await svc.execute({ content: "Deploy checklist version Beta, materially different.", idempotencyKey: "k-conflict" });
    expect(second.ok).toBe(false);
    expect(second.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(second.duplicate).toBe(false);
    expect(second.actionId).toBe(first.actionId);
    expect(second.reason).toMatch(/content/);
    const stored = await store.getRecord(first.recordId as string);
    expect(stored?.content).toBe("Deploy checklist version Alpha.");
    expect((await store.counts()).records).toBe(1);
  });

  test("same key + different role is a conflict", async () => {
    const { svc } = service();
    await svc.execute({ content: "A finding.", role: "ordinary", idempotencyKey: "k-role" });
    const second = await svc.execute({ content: "A finding.", role: "decision", idempotencyKey: "k-role" });
    expect(second.ok).toBe(false);
    expect(second.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(second.reason).toMatch(/role/);
  });

  test("same request with different explicit timestamps stays a duplicate", async () => {
    const { svc } = service();
    const first = await svc.execute({ content: "Timed fact.", idempotencyKey: "k-time", eventTime: "2026-10-02T10:00:00.000Z" });
    const second = await svc.execute({ content: "Timed fact.", idempotencyKey: "k-time", eventTime: "2026-10-02T11:00:00.000Z" });
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.actionId).toBe(first.actionId);
  });

  test("whitespace-only content difference canonicalizes to a duplicate", async () => {
    const { svc } = service();
    await svc.execute({ content: "Padded fact.", idempotencyKey: "k-ws" });
    const second = await svc.execute({ content: "  Padded fact.  ", idempotencyKey: "k-ws" });
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);
  });

  test("retract then remember under one key is a conflict, not a retry", async () => {
    const { svc } = service();
    const created = await svc.execute({ content: "To retract.", idempotencyKey: "k-new" });
    const retracted = await svc.execute({ action: "retract", targetRecordId: created.recordId as string, reason: "wrong", idempotencyKey: "k-retract" });
    expect(retracted.ok).toBe(true);
    const conflict = await svc.execute({ content: "Something else.", idempotencyKey: "k-retract" });
    expect(conflict.ok).toBe(false);
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  test("canonical fingerprint excludes clock values and trims content", () => {
    const a = canonicalWriteFingerprint({ action: "remember", content: "  x  ", role: "ordinary", evidenceRefs: ["b", "a"], callerScope: "s", origin: "cli" });
    const b = canonicalWriteFingerprint({ action: "remember", content: "x", role: "ordinary", evidenceRefs: ["a", "b"], callerScope: "s", origin: "cli" });
    expect(a).toBe(b);
  });
});
