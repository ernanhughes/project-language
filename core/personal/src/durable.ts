// Durable standing records live in core/remembering, which owns durable memory, lineage, supersession, correction and
// retraction. This file is the narrow adapter: it maps a PersonalRecord onto a remembering record and back, and it says
// honestly what the backend cannot do (physically erase). It adds no store of its own.
//
// Role mapping keeps the origin distinctions alive inside remembering: declarations are preference or decision records,
// observations are evidence, and an INFERENCE is a "proposal" and never a preference.
import { WriteService } from "../../remembering/src/engine/write/service.ts";
import { builtinWritePolicy } from "../../remembering/src/engine/write/policy.ts";
import type { MemoryRecord, RememberRole } from "../../remembering/src/engine/write/model.ts";
import type { WriteStorePort } from "../../remembering/src/engine/storage/ports.ts";
import { validateRecord } from "./state.ts";
import { PersonalError, type Clock, type PersonalEvent, type PersonalRecord } from "./types.ts";

export const roleFor = (r: PersonalRecord): RememberRole =>
  r.kind === "observed_interaction" ? "evidence" : r.kind === "inferred_belief" ? "proposal"
  : r.kind === "accessibility_requirement" ? "decision" : "preference";

export interface DeletionReport {
  id: string;
  requested: true;
  /** What actually happened. The backend retracts; it does not erase. */
  effect: "RETRACTED_NOT_ERASED";
  physical_deletion: "UNSUPPORTED_BY_BACKEND";
  retained: string;
}

export interface DurablePort {
  add(record: PersonalRecord): Promise<{ durable_id: string }>;
  supersede(oldId: string, record: PersonalRecord, reason: string): Promise<{ durable_id: string }>;
  retract(id: string, reason: string): Promise<void>;
  /** A person asked for deletion. The honest report, not a claim of erasure. */
  requestDeletion(id: string, reason: string): Promise<DeletionReport>;
  /** The durable history as events, in order, ready to be reduced with any session events. Malformed stored records are returned in `skipped`. */
  events(): Promise<{ events: PersonalEvent[]; skipped: { durable_id: string; reason: string }[] }>;
}

export class RememberingDurable implements DurablePort {
  private readonly svc: WriteService;
  private readonly byPersonalId = new Map<string, string>();
  constructor(private readonly store: WriteStorePort, private readonly now: Clock, private readonly callerScope = "personal") {
    this.svc = new WriteService(store as never, builtinWritePolicy(), now);
  }
  private async durableId(id: string): Promise<string> {
    const known = this.byPersonalId.get(id);
    if (known) return known;
    for (const m of (await this.store.listRecords?.()) ?? []) { try { if ((JSON.parse(m.content) as PersonalRecord).id === id) { this.byPersonalId.set(id, m.recordId); return m.recordId; } } catch { /* not ours */ } }
    throw new PersonalError("NOT_DURABLE", `no durable record for ${id}`);
  }
  async add(record: PersonalRecord): Promise<{ durable_id: string }> {
    validateRecord(record);
    const out = await this.svc.execute({
      action: "remember", content: JSON.stringify(record), role: roleFor(record), callerScope: this.callerScope, origin: "cli",
      ...(record.kind === "observed_interaction" ? { evidenceRefs: [record.evidence_id] } : {}),
      eventTime: record.valid.from, effectiveFrom: record.valid.from, idempotencyKey: `personal:${record.id}`,
    });
    if (!out.ok || !out.recordId) throw new PersonalError("DURABLE_WRITE_REFUSED", out.reason ?? out.code ?? "refused");
    this.byPersonalId.set(record.id, out.recordId);
    return { durable_id: out.recordId };
  }
  async supersede(oldId: string, record: PersonalRecord, reason: string): Promise<{ durable_id: string }> {
    validateRecord(record);
    const target = await this.durableId(oldId);
    const out = await this.svc.execute({
      action: "supersede", targetRecordId: target, content: JSON.stringify(record), role: roleFor(record), reason, callerScope: this.callerScope, origin: "cli",
      eventTime: record.valid.from, effectiveFrom: record.valid.from, idempotencyKey: `personal:${record.id}`,
    });
    if (!out.ok || !out.recordId) throw new PersonalError("DURABLE_WRITE_REFUSED", out.reason ?? out.code ?? "refused");
    this.byPersonalId.set(record.id, out.recordId);
    return { durable_id: out.recordId };
  }
  async retract(id: string, reason: string): Promise<void> {
    const out = await this.svc.execute({ action: "retract", targetRecordId: await this.durableId(id), reason, callerScope: this.callerScope, origin: "cli" });
    if (!out.ok) throw new PersonalError("DURABLE_WRITE_REFUSED", out.reason ?? out.code ?? "refused");
  }
  async requestDeletion(id: string, reason: string): Promise<DeletionReport> {
    await this.retract(id, `deletion requested: ${reason}`);
    return { id, requested: true, effect: "RETRACTED_NOT_ERASED", physical_deletion: "UNSUPPORTED_BY_BACKEND", retained: "the record body remains in the backend as a retracted tombstone with its history" };
  }
  async events(): Promise<{ events: PersonalEvent[]; skipped: { durable_id: string; reason: string }[] }> {
    const events: PersonalEvent[] = []; const skipped: { durable_id: string; reason: string }[] = [];
    const records = ((await this.store.listRecords?.()) ?? []).slice().sort((a: MemoryRecord, b: MemoryRecord) => a.createdAt.localeCompare(b.createdAt) || a.recordId.localeCompare(b.recordId));
    for (const m of records) {
      let rec: PersonalRecord;
      try { rec = validateRecord(JSON.parse(m.content)); } catch (e) { skipped.push({ durable_id: m.recordId, reason: String((e as Error).message).slice(0, 120) }); continue; }
      events.push({ type: "added", at: m.createdAt, record: rec });
      if (m.state === "retracted") events.push({ type: "retracted", at: m.createdAt, id: rec.id, reason: "retracted in durable memory", by: { by: "person", ref: "durable-memory" } });
    }
    return { events, skipped };
  }
}
