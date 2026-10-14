import { EngineError } from "../errors.ts";
import {
  memorySourceId,
  newActionId,
  newRecordId,
  validateWriteInput,
  type MemoryActionRecord,
  type MemoryRecord,
  type RememberAction,
  type RememberRole,
} from "./model.ts";
import { authorizeWrite, type WritePolicy } from "./policy.ts";
import type { WriteStore } from "./store.ts";

export type WriteInput = {
  action?: RememberAction;
  content?: string;
  targetRecordId?: string;
  role?: RememberRole;
  reason?: string;
  evidenceRefs?: string[];
  callerScope?: string;
  origin?: "opencode" | "cli";
  eventTime?: string;
  effectiveFrom?: string;
  idempotencyKey?: string;
};

export type WriteOutput = {
  ok: boolean;
  code?: string;
  reason?: string;
  actionId?: string;
  action?: string;
  recordId?: string | null;
  targetRecordId?: string | null;
  duplicate?: boolean;
  authorization?: {
    verdict: string;
    reason: string;
    policyVersion: string;
    policyDigest: string;
    matchedGrantId: string | null;
  };
  record?: { role: string; standingCeiling: string; sourceId: string; lineageRoot: string } | null;
  relation?: { type: string; targetRecordId: string } | null;
};

/**
 * Canonical identity of a write request for idempotency comparison.
 *
 * Compares only the fields that define the write outcome. Generated and
 * clock values (record/action ids, createdAt/eventTime/effectiveFrom) are
 * excluded so a true retry — same request, new attempt — stays idempotent.
 * Whitespace-only content differences are canonicalized away; material
 * differences are conflicts, never silent duplicates.
 */
export function canonicalWriteFingerprint(parts: {
  action: string;
  content?: string;
  targetRecordId?: string | null;
  role?: string;
  reason?: string;
  evidenceRefs?: string[];
  callerScope?: string;
  origin?: string;
}): string {
  return JSON.stringify({
    action: parts.action,
    content: (parts.content ?? "").trim(),
    targetRecordId: parts.targetRecordId ?? null,
    role: parts.role ?? null,
    reason: (parts.reason ?? "").trim(),
    evidenceRefs: [...(parts.evidenceRefs ?? [])].sort(),
    callerScope: parts.callerScope ?? null,
    origin: parts.origin ?? null,
  });
}

function fingerprintDiffFields(a: string, b: string): string[] {
  try {
    const left = JSON.parse(a) as Record<string, unknown>;
    const right = JSON.parse(b) as Record<string, unknown>;
    return Object.keys(left).filter((k) => JSON.stringify(left[k]) !== JSON.stringify(right[k]));
  } catch {
    return ["request"];
  }
}

/** Explicit attributed writes over an append-only record/action history. */
export class WriteService {  constructor(
    private readonly store: WriteStore,
    private readonly policy: WritePolicy,
    private readonly now: () => string = () => new Date().toISOString(),
    /** Index hook wires explicit records into retrieval (engine supplies PG indexing). */
    private readonly indexRecord?: (record: MemoryRecord) => Promise<void>,
  ) {}

  async execute(input: WriteInput): Promise<WriteOutput> {
    const action = input.action ?? "remember";
    const role = input.role ?? "ordinary";
    const callerScope = input.callerScope ?? "default";
    const origin = input.origin ?? "opencode";
    validateWriteInput({
      action, content: input.content, target_record_id: input.targetRecordId,
      role, reason: input.reason, evidence_refs: input.evidenceRefs, caller_scope: callerScope,
    });
    if (input.idempotencyKey) {
      const prior = await this.store.getActionByIdempotency(input.idempotencyKey);
      if (prior) {
        const record = prior.recordId ? await this.store.getRecord(prior.recordId) : null;
        const recordSummary = record ? { role: record.role, standingCeiling: record.standingCeiling, sourceId: record.sourceId, lineageRoot: record.lineageRoot } : null;
        const priorFingerprint = canonicalWriteFingerprint({
          action: prior.action, content: record?.content, targetRecordId: prior.targetRecordId,
          role: record?.role, reason: prior.reason, evidenceRefs: record?.evidenceRefs,
          callerScope: prior.callerScope, origin: prior.origin,
        });
        const requestFingerprint = canonicalWriteFingerprint({
          action, content: input.content, targetRecordId: input.targetRecordId, role,
          reason: input.reason, evidenceRefs: input.evidenceRefs, callerScope, origin,
        });
        if (priorFingerprint === requestFingerprint) {
          return {
            ok: true, actionId: prior.actionId, action: prior.action,
            recordId: prior.recordId, targetRecordId: prior.targetRecordId, duplicate: true,
            record: recordSummary,
            relation: prior.relation,
          };
        }
        // Same key, materially different request: a conflict, never a
        // silent duplicate and never an overwrite. The original is retained.
        const differing = fingerprintDiffFields(priorFingerprint, requestFingerprint);
        return {
          ok: false, code: "IDEMPOTENCY_CONFLICT",
          reason: `idempotency key ${JSON.stringify(input.idempotencyKey)} was already used for a different request (differing: ${differing.join(", ")}). Original action ${prior.actionId} retained; no new write performed.`,
          actionId: prior.actionId, action: prior.action,
          recordId: prior.recordId, targetRecordId: prior.targetRecordId, duplicate: false,
          record: recordSummary,
          relation: prior.relation,
        };
      }
    }
    const auth = authorizeWrite(this.policy, { role, evidenceRefs: input.evidenceRefs ?? [], callerScope, origin });
    if (auth.verdict === "deny") {
      return {
        ok: false, code: "MEMORY_WRITE_DENIED", reason: auth.reason,
        authorization: { verdict: auth.verdict, reason: auth.reason, policyVersion: auth.policyVersion, policyDigest: auth.policyDigest, matchedGrantId: auth.matchedGrantId },
      };
    }
    const createdAt = this.now();
    const eventTime = input.eventTime ?? createdAt;
    const effectiveFrom = input.effectiveFrom ?? eventTime;

    if (action === "remember") {
      const recordId = newRecordId();
      const record: MemoryRecord = {
        recordId, content: (input.content as string).trim(), role,
        sourceId: memorySourceId(recordId), lineageRoot: recordId,
        standingCeiling: role === "production_state" ? "S3" : "FULL",
        state: "active", callerScope, origin,
        evidenceRefs: input.evidenceRefs ?? [],
        eventTime, effectiveFrom, createdAt,
      };
      await this.store.putRecord(record);
      const actionRecord: MemoryActionRecord = {
        actionId: newActionId(), action, recordId, targetRecordId: null,
        reason: input.reason ?? "", callerScope, origin,
        idempotencyKey: input.idempotencyKey ?? null, relation: null, createdAt,
      };
      await this.store.putAction(actionRecord);
      if (this.indexRecord) await this.indexRecord(record);
      return {
        ok: true, actionId: actionRecord.actionId, action, recordId, targetRecordId: null,
        authorization: authz(auth),
        record: { role: record.role, standingCeiling: record.standingCeiling, sourceId: record.sourceId, lineageRoot: record.lineageRoot },
        relation: null,
      };
    }

    const targetId = input.targetRecordId as string;
    const target = await this.store.getRecord(targetId);
    if (!target) {
      return { ok: false, code: "MEMORY_TARGET_NOT_FOUND", reason: `no memory record ${JSON.stringify(targetId)}.`, authorization: authz(auth) };
    }
    if (action === "retract") {
      if (target.state === "retracted") {
        return { ok: false, code: "MEMORY_WRITE_DENIED", reason: "record is already retracted.", authorization: authz(auth) };
      }
      await this.store.updateRecordState(targetId, "retracted");
      const actionRecord: MemoryActionRecord = {
        actionId: newActionId(), action, recordId: null, targetRecordId: targetId,
        reason: input.reason ?? "", callerScope, origin,
        idempotencyKey: input.idempotencyKey ?? null,
        relation: { type: "retracts", targetRecordId: targetId }, createdAt,
      };
      await this.store.putAction(actionRecord);
      return {
        ok: true, actionId: actionRecord.actionId, action, recordId: null, targetRecordId: targetId,
        authorization: authz(auth), record: null,
        relation: { type: "retracts", targetRecordId: targetId },
      };
    }

    // correct | supersede: new record preserves lineage; original stays in history.
    if (target.state === "retracted") {
      return { ok: false, code: "MEMORY_WRITE_DENIED", reason: "cannot correct a retracted record; remember anew instead.", authorization: authz(auth) };
    }
    if (!input.content?.trim()) {
      throw new EngineError("MEMORY_WRITE_DENIED", `action '${action}' requires non-empty content.`);
    }
    const recordId = newRecordId();
    const record: MemoryRecord = {
      recordId, content: (input.content as string).trim(), role,
      sourceId: memorySourceId(recordId), lineageRoot: target.lineageRoot,
      standingCeiling: target.standingCeiling, state: "active",
      callerScope, origin, evidenceRefs: input.evidenceRefs ?? [],
      eventTime, effectiveFrom, createdAt,
    };
    await this.store.putRecord(record);
    await this.store.updateRecordState(targetId, action === "correct" ? "corrected" : "superseded");
    const actionRecord: MemoryActionRecord = {
      actionId: newActionId(), action, recordId, targetRecordId: targetId,
      reason: input.reason ?? "", callerScope, origin,
      idempotencyKey: input.idempotencyKey ?? null,
      relation: { type: action === "correct" ? "corrects" : "supersedes", targetRecordId: targetId },
      createdAt,
    };
    await this.store.putAction(actionRecord);
    if (this.indexRecord) await this.indexRecord(record);
    return {
      ok: true, actionId: actionRecord.actionId, action, recordId, targetRecordId: targetId,
      authorization: authz(auth),
      record: { role: record.role, standingCeiling: record.standingCeiling, sourceId: record.sourceId, lineageRoot: record.lineageRoot },
      relation: { type: action === "correct" ? "corrects" : "supersedes", targetRecordId: targetId },
    };
  }
}

function authz(auth: { verdict: string; reason: string; policyVersion: string; policyDigest: string; matchedGrantId: string | null }) {
  return { verdict: auth.verdict, reason: auth.reason, policyVersion: auth.policyVersion, policyDigest: auth.policyDigest, matchedGrantId: auth.matchedGrantId };
}
