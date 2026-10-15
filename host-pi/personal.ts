// The Pi seam for Part III (Chapters 21-28): personal mediation. Pi is only the interface here.
//
// Who may do what:
//   - A TYPED COMMAND (`/personal ...`) is the person's own act. It is how a declaration, a correction, an override, a boundary
//     application or a revocation reaches the state.
//   - A MODEL TOOL CALL (`personal_propose`) is never the person's act. It can add an inference that starts as a proposal and
//     cannot authorise anything. What a model SAYS in a message is not recorded at all.
//   - All state is rebuilt from the session's own entries (plus the durable store for standing records) on every call. Nothing
//     is held in a closure. An entry that is malformed, or that does not carry this adapter's gate and checksum, is reported
//     and has no influence. The checksum catches accidental damage and casual forgery; it is not a security boundary.
import { createHash } from "node:crypto";
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionFactory } from "@earendil-works/pi-coding-agent";
import {
  applyBoundary, blockRederivation, compile, compileGeneric, correctBelief, forgetBelief, invalidateDependents, decideFriction, dependents, endOverlay, explainWithout, fitControl,
  gateProposal, inspectBeliefs, planIsCurrent, proposeEscalation, recordOverride, reduce, revokeBoundary, subtract, validateEvent, validateRecord,
  verifyBoundary, assess, PersonalError,
  type BoundaryReceipt, type CompileInput, type DurablePort, type PersonalEvent, type PersonalRecord, type PersonalState, type PortableBoundary,
  type Proposal, type ServicePort, type SourceBlock, type Verifier, type ObservedInteraction, type SessionOverlay, type FrictionContract,
} from "../core/personal/src/index.ts";
import type { AuthorityPolicy } from "../core/authority/src/engine/types.ts";

export const EVENT_ENTRY = "personal-event";
export const PROPOSAL_ENTRY = "personal-proposal";
export const PLAN_ENTRY = "personal-plan-receipt";
export const BOUNDARY_ENTRY = "personal-boundary-receipt";
export const FRICTION_ENTRY = "personal-friction-receipt";
export const GATE = "personal-adapter-v1";
export const CHAPTERS = ["ch21", "ch22", "ch23", "ch24", "ch25", "ch26", "ch27", "ch28"] as const;
export type Chapter = (typeof CHAPTERS)[number];

export interface Scenario {
  scope: string; use_scope: string; session: string; purpose: string;
  source: { id: string; blocks: SourceBlock[] };
  task: CompileInput["task"];
  instruction: CompileInput["current_instruction"];
  preservation: CompileInput["preservation"];
  /** The person's standing declarations: kept in durable memory so they outlive the session. */
  standing: PersonalRecord[];
  observation: ObservedInteraction;
  overlay: SessionOverlay;
  friction: FrictionContract;
  friction_action: string;
  boundary: PortableBoundary;
  /** When the session's temporary things end. */
  ends_at: string;
}

export interface PersonalOptions {
  scenario: Scenario;
  durable: DurablePort;
  services: Record<string, ServicePort>;
  verifier: Verifier;
  policy: AuthorityPolicy;
  /** The host clock and id source. Injected so a run is deterministic. */
  now: () => string;
  ids: (prefix: string) => string;
  /** Who the person is, for commands they type. */
  person: { ref: string };
}

type EntryLike = { type: string; customType?: string; data?: unknown };
type Ctx = { hasUI: boolean; ui: { notify(m: string, t?: "info" | "warning" | "error"): void }; sessionManager: { getEntries(): readonly unknown[] } };
const sum = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

interface Loaded { state: PersonalState; proposals: Proposal[]; problems: string[]; events: PersonalEvent[]; skipped_durable: number }

export function personal(options: PersonalOptions): ExtensionFactory {
  const sc = options.scenario;
  const personRef = options.person.ref;
  return (pi: ExtensionAPI) => {
    const append = (events: PersonalEvent[]) => { for (const event of events) pi.appendEntry(EVENT_ENTRY, { gate: GATE, event, sum: sum(event) }); };

    /** Rebuild everything from the entries. A damaged or foreign entry is reported and counts for nothing. */
    async function load(ctx: Pick<Ctx, "sessionManager">): Promise<Loaded> {
      const problems: string[] = []; const events: PersonalEvent[] = []; const proposals: Proposal[] = [];
      const durable = await options.durable.events();
      events.push(...durable.events);
      for (const s of durable.skipped) problems.push(`durable ${s.durable_id}: skipped (${s.reason})`);
      let n = 0;
      for (const e of ctx.sessionManager.getEntries() as EntryLike[]) {
        if (e.type !== "custom" || (e.customType !== EVENT_ENTRY && e.customType !== PROPOSAL_ENTRY)) continue;
        n++;
        const d = e.data as { gate?: string; sum?: string; event?: unknown; proposal?: unknown } | undefined;
        const body = e.customType === EVENT_ENTRY ? d?.event : d?.proposal;
        if (!d || d.gate !== GATE || typeof d.sum !== "string" || d.sum !== sum(body)) { problems.push(`entry ${n} (${e.customType}): not written by this adapter, or altered; ignored`); continue; }
        if (e.customType === PROPOSAL_ENTRY) {
          const p = body as Proposal;
          if (typeof p?.belief_id === "string" && Array.isArray(p.fold)) proposals.push({ belief_id: p.belief_id, fold: p.fold.map(String) });
          else problems.push(`entry ${n} (proposal): malformed; ignored`);
          continue;
        }
        try { events.push(validateEvent(body)); } catch (err) { problems.push(`entry ${n} (event): refused (${(err as { code?: string }).code ?? "invalid"}); ignored`); }
      }
      return { state: reduce(events), proposals, problems, events, skipped_durable: durable.skipped.length };
    }

    const input = (l: Loaded, over: Partial<CompileInput> = {}): CompileInput => ({
      plan_id: options.ids("plan"), now: options.now(), scope: sc.use_scope, session: sc.session, source: sc.source, task: sc.task,
      current_instruction: sc.instruction, preservation: sc.preservation, state: l.state, authority: { policy: options.policy, purpose: sc.purpose },
      proposals: l.proposals, conditioning: "full", ...over,
    });
    const planText = (p: ReturnType<typeof compile>["plan"]) => [
      `plan ${p.id}: ${p.outcome} / ${p.mode}${p.optional_conditioning_used ? " / optional conditioning used" : ""}`,
      ...p.blocks.map(b => `  ${b.block_id.padEnd(20)} ${b.treatment.padEnd(7)} by ${b.decided_by}`),
      ...p.inputs.filter(i => i.status !== "considered").map(i => `  input ${i.input_id}: ${i.status}${i.status === "refused" ? " — " + i.reasons[0] : ""}`),
      ...p.conflicts.map(c => `  CONFLICT ${c.code}: ${c.detail}`),
    ].join("\n");
    const recordPlan = (p: ReturnType<typeof compile>["plan"]) => pi.appendEntry(PLAN_ENTRY, { plan_id: p.id, mode: p.mode, outcome: p.outcome, used: p.inputs.filter(i => i.status === "used").map(i => i.input_id), refused: p.inputs.filter(i => i.status === "refused").map(i => i.input_id), receipt: p.receipt });

    // ─── the one model-facing surface ────────────────────────────────────────────────────────────────────────
    pi.registerTool(defineTool({
      name: "personal_propose",
      label: "Propose a belief about the person's preferences, for them to see",
      description: "Propose something you infer about how this person wants material presented. It is recorded as a PROPOSAL from you, visible to them and correctable. It authorises nothing, it is checked against scope, consequence and what they declared, and it can be refused. You cannot record a declaration, confirm a belief, or change a standing preference.",
      parameters: Type.Object({
        belief_kind: Type.String({ description: "preference | knowledge | task_condition" }),
        proposition: Type.String(), evidence_refs: Type.Array(Type.String(), { description: "ids of observed interactions this rests on" }),
        supported_scope: Type.String(), applied_scope: Type.String(),
        consequence: Type.String({ description: "low | medium | high: what a mistake would do to the reader" }),
        confidence: Type.String({ description: "low | moderate | high: how sure you are. This is not authority." }),
        fold: Type.Array(Type.String(), { description: "block ids you would fold if this is accepted" }),
      }),
      async execute(_id, params, _signal, _onUpdate, ctx) {
        const l = await load(ctx as unknown as Ctx);
        const id = options.ids("inf");
        try {
          const refs = params.evidence_refs;
          const missing = refs.filter(r => l.state.entries.get(r)?.record.kind !== "observed_interaction");
          if (refs.length === 0 || missing.length) throw new PersonalError("UNKNOWN_EVIDENCE", `no observed interaction named ${missing.join(", ") || "(none given)"}`);
          const rec = validateRecord({
            id, kind: "inferred_belief", origin: "inferred", key: `belief:${params.proposition.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`, scope: sc.scope,
            valid: { from: options.now(), until: null }, recorded_at: options.now(), source: { by: "model", ref: "scripted-model" }, authority_ref: null,
            belief_kind: params.belief_kind, proposition: params.proposition, evidence_refs: refs, supported_scope: params.supported_scope, applied_scope: params.applied_scope,
            standing: "proposed", confidence: params.confidence, consequence: params.consequence, depends_on: refs,
          });
          const g = gateProposal(l.state, rec as never);
          if (!g.accepted) throw new PersonalError("REDERIVATION_BLOCKED", g.why);
          append([{ type: "added", at: options.now(), record: rec }]);
          pi.appendEntry(PROPOSAL_ENTRY, { gate: GATE, sum: sum({ belief_id: id, fold: params.fold }), proposal: { belief_id: id, fold: params.fold } });
          return { content: [{ type: "text", text: `Recorded ${id} as a proposal from the model. It is visible to the person and authorises nothing.` }], details: { recorded: id as string | null, code: null as string | null } };
        } catch (e) {
          const code = (e as { code?: string }).code ?? "REFUSED";
          return { content: [{ type: "text", text: `Refused (${code}): ${(e as Error).message}. Nothing was recorded.` }], details: { recorded: null as string | null, code: code as string | null } };
        }
      },
    }));

    // ─── chapter steps ──────────────────────────────────────────────────────────────────────────────────────
    const steps: Record<Chapter, (ctx: Ctx) => Promise<string>> = {
      ch21: async ctx => {
        const l = await load(ctx);
        const lines: string[] = ["Chapter 21: what Priya declared, kept apart from what was observed or inferred"];
        for (const r of sc.standing) {
          if (!l.state.entries.has(r.id)) { await options.durable.add(r); }
          const a = assess((await load(ctx)).state, r.id, { now: options.now(), scope: sc.use_scope, session: sc.session });
          lines.push(`  ${r.kind.padEnd(26)} ${r.id.padEnd(18)} scope ${r.scope.padEnd(22)} ${a.applicable ? "applies here" : "does not apply here: " + a.reasons[0]}`);
        }
        lines.push("  (standing records are kept in durable memory through core/remembering; none came from the model)");
        return lines.join("\n");
      },
      ch22: async ctx => {
        const l = await load(ctx);
        if (!l.state.entries.has(sc.observation.id)) append([{ type: "added", at: options.now(), record: sc.observation }]);
        const lines = ["Chapter 22: an observation is evidence of an interaction, not a trait; an inference only proposes",
          `  observed ${sc.observation.id}: ${sc.observation.behaviour} (evidence ${sc.observation.evidence_id})`];
        const props = (await load(ctx)).proposals;
        lines.push(props.length ? `  proposals from the model so far: ${props.map(p => p.belief_id).join(", ")} (standing: proposed; authority: none)` : "  no proposals yet. The model may call personal_propose; nothing here is inferred by this command.");
        return lines.join("\n");
      },
      ch23: async ctx => {
        const l = await load(ctx);
        if (!l.state.entries.has(sc.overlay.id)) append([{ type: "added", at: options.now(), record: sc.overlay }]);
        const l2 = await load(ctx);
        const out = compile(input(l2)); append(out.events); recordPlan(out.plan);
        return ["Chapter 23: one plan from the source's obligations, the current request, declared state and any authorised inference", planText(out.plan)].join("\n");
      },
      ch24: async ctx => {
        const l = await load(ctx);
        const ov = l.state.entries.get(sc.overlay.id);
        if (!ov) append([{ type: "added", at: options.now(), record: sc.overlay }]);
        const out = compile(input(await load(ctx), { plan_id: options.ids("plan") })); append(out.events); recordPlan(out.plan);
        return ["Chapter 24: this session's overlay (ten minutes) applies in this scope and session, and ends with them. It is not a trait.",
          `  overlay ${sc.overlay.id}: ${out.plan.inputs.find(i => i.input_id === sc.overlay.id)?.status}; ends ${sc.overlay.ends.when ?? sc.overlay.ends.at}`, `  decisions: ${sc.overlay.decisions.join(", ")}`].join("\n");
      },
      ch25: async ctx => {
        const l = await load(ctx);
        if (!l.state.entries.has(sc.friction.id)) append([{ type: "added", at: options.now(), record: sc.friction }]);
        const d = decideFriction((await load(ctx)).state, sc.friction_action, { now: options.now(), scope: sc.use_scope, session: sc.session });
        pi.appendEntry(FRICTION_ENTRY, { action: sc.friction_action, intervention: d.intervention, contract: d.contract, receipt: d.receipt });
        const esc = proposeEscalation(sc.friction, "confirmation");
        return ["Chapter 25: friction is a contract Priya wrote. The goal is hers; the form of help is only what she authorised",
          `  action "${sc.friction_action}": ${d.intervention}${d.message ? ` — "${d.message}"` : ""}`, `  override: ${d.override ?? "-"}`, `  stronger form: ${esc.reason}`].join("\n");
      },
      ch26: async ctx => {
        const l = await load(ctx);
        if (!l.state.entries.has(sc.boundary.id)) append([{ type: "added", at: options.now(), record: sc.boundary }]);
        const lines = ["Chapter 26: the boundary travels without its history, and each service reports six separate stages"];
        for (const id of sc.boundary.destinations) lines.push(await transmit(ctx, "apply", sc.boundary.id, id));
        return lines.join("\n");
      },
      ch27: async ctx => {
        const l = await load(ctx);
        const views = inspectBeliefs(l.state, { now: options.now(), scope: sc.use_scope, session: sc.session }, { policy: options.policy, purpose: sc.purpose });
        const lines = ["Chapter 27: what the system believes about her, as inspectable facts (visible is not valid is not authorised)"];
        for (const v of views) lines.push(`  ${v.id}: "${v.proposition}" | by ${v.provenance.by.by} | supports ${v.supported_scope}, applied to ${v.applied_scope}${v.scope_expanded ? " (EXPANDED)" : ""} | confidence ${v.confidence} | valid ${v.valid.ok} | authority ${v.authority.allowed ? "granted" : "refused"} | affects ${[...v.consequences.direct, ...v.consequences.transitive].join(", ") || "nothing"}`);
        if (!views.length) lines.push("  no inferred beliefs exist");
        return lines.join("\n");
      },
      ch28: async ctx => {
        const lines = ["Chapter 28: the session ends. Temporary things end with it; nothing is promoted; standing declarations remain"];
        lines.push(await endSession(ctx));
        return lines.join("\n");
      },
    };

    async function transmit(ctx: Ctx, op: "apply" | "revoke", boundaryId: string, serviceId: string): Promise<string> {
      const l = await load(ctx);
      const e = l.state.entries.get(boundaryId); const svc = options.services[serviceId];
      if (!e || e.record.kind !== "portable_boundary") return `  ${serviceId}: no boundary ${boundaryId}`;
      if (!svc) return `  ${serviceId}: no such service`;
      const prior = (ctx.sessionManager.getEntries() as EntryLike[]).filter(x => x.customType === BOUNDARY_ENTRY).map(x => x.data as BoundaryReceipt)
        .filter(r => r.boundary_id === boundaryId && r.service === serviceId && r.operation === "apply" && r.setting_ref).at(-1);
      const fn = op === "apply" ? applyBoundary : revokeBoundary;
      const r = await fn(e.record, svc, { now: options.now(), ids: options.ids, state: l.state, scope: sc.use_scope, session: sc.session, priorSettingRef: prior?.setting_ref ?? null });
      pi.appendEntry(BOUNDARY_ENTRY, r);
      const st = Object.entries(r.stages).map(([k, v]) => `${k}:${v}`).join(" ");
      return `  ${op} ${serviceId}: ${r.status}${r.fit ? ` (fit ${r.fit})` : ""}\n    ${st}${r.reformulation ? "\n    " + r.reformulation : ""}`;
    }

    async function endSession(ctx: Ctx): Promise<string> {
      const l = await load(ctx); const now = options.now(); const out: string[] = [];
      const events: PersonalEvent[] = [];
      for (const id of [sc.overlay.id]) if (l.state.entries.get(id)?.status === "active") { const e = endOverlay(l.state, id, now, "the review ended"); events.push(...e.events); out.push(`  overlay ${id} ended; invalidated ${e.invalidated.join(", ") || "nothing"}`); }
      if (l.state.entries.get(sc.friction.id)?.status === "active") { events.push({ type: "expired", at: now, id: sc.friction.id }); out.push(`  friction contract ${sc.friction.id} expired`); }
      if (l.state.entries.get(sc.boundary.id)?.status === "active") { events.push({ type: "expired", at: now, id: sc.boundary.id }); out.push(`  boundary ${sc.boundary.id} expired (its removal at each service is a separate act: /personal revoke)`); }
      append(events);
      const after = await load(ctx);
      const standing = sc.standing.map(r => `${r.id}:${after.state.entries.get(r.id)?.status}`).join(", ");
      out.push(`  standing records unchanged: ${standing}`, "  promoted to a durable trait: nothing (promotion is a separate, human act)");
      return out.join("\n");
    }

    pi.registerCommand("personal", {
      description: "Personal mediation. /personal run [ch21..ch28|all] | state | why [id] | generic | correct <belief-id> <wrong|forget> <reason> | override <friction-id> | apply|revoke|verify <boundary-id> <service-id> | end | receipts",
      handler: async (args, c) => {
        const ctx = c as unknown as Ctx;
        const say = (t: string) => (ctx.hasUI ? ctx.ui.notify(t, "info") : console.log(t));
        const [sub, a1, a2, ...rest] = args.trim().split(/\s+/);
        try {
          if (sub === "run") {
            const sel = a1 ?? "all";
            const chapters = sel === "all" ? [...CHAPTERS] : (CHAPTERS as readonly string[]).includes(sel) ? [sel as Chapter] : [];
            if (!chapters.length) return say(`unknown chapter ${sel}; use ${CHAPTERS.join(", ")} or all`);
            for (const ch of chapters) say(await steps[ch](ctx));
            return;
          }
          if (sub === "state") {
            const l = await load(ctx);
            const kinds = new Map<string, string[]>();
            for (const [id, e] of l.state.entries) kinds.set(e.record.kind, [...(kinds.get(e.record.kind) ?? []), `${id}(${e.status})`]);
            const lines = [...kinds].map(([k, v]) => `${k.padEnd(26)} ${v.join(", ")}`);
            lines.push(`plans: ${[...l.state.artifacts].map(([id, a]) => `${id}${a.valid ? "" : " [invalidated: " + a.because + "]"}`).join(", ") || "none"}`);
            lines.push(l.problems.length ? `IGNORED ENTRIES (${l.problems.length}):\n  ${l.problems.join("\n  ")}` : "no malformed or foreign entries");
            return say(lines.join("\n"));
          }
          if (sub === "generic") {
            const l = await load(ctx);
            const s = subtract(input(l)); const g = compileGeneric(input(l, { plan_id: options.ids("plan") }));
            recordPlan(g.plan);
            return say([`generic path: no optional observation or inference conditions the view (declared standing state, preservation and accessibility still apply):`, planText(g.plan), "difference from the personalised plan:",
              ...(s.difference.length ? s.difference.map(d => `  ${d.block_id}: ${d.with_state} with state, ${d.generic} generic`) : ["  none"]), `  ${s.label}`].join("\n"));
          }
          if (sub === "why") {
            const l = await load(ctx);
            if (a1 && l.state.entries.has(a1)) {
              const e = l.state.entries.get(a1)!; const as = assess(l.state, a1, { now: options.now(), scope: sc.use_scope, session: sc.session });
              const lines = [`${a1}: ${e.record.kind}, origin ${e.record.origin}, status ${e.status}`, `  applicable now: ${as.applicable} — ${as.reasons.join("; ")}`, `  affects: ${[...dependents(l.state, a1).direct, ...dependents(l.state, a1).transitive].join(", ") || "nothing"}`];
              if (e.record.kind === "inferred_belief") { const w = explainWithout(input(l), a1); lines.push(...w.difference.map(d => `  without it: ${d.block_id} would be ${d.without}, not ${d.with}`)); }
              return say(lines.join("\n"));
            }
            const out = compile(input(l, { plan_id: "inspection" }));
            return say(["why this view:", ...out.plan.explanation.map(x => "  " + x), "  (an inspection of the current inputs; it is not recorded as a plan)"].join("\n"));
          }
          if (sub === "correct") {
            const l = await load(ctx);
            const op = a2; const reason = rest.join(" ").trim();
            const choices = "operations: wrong (the belief is false: it is rejected, history kept) | forget (retract the retained item) | narrowing its scope, stopping one use, and revising a standing policy are different operations and are not offered here; blocking re-derivation is /personal block";
            if (!a1 || (op !== "wrong" && op !== "forget") || !reason) return say(`usage: /personal correct <belief-id> <wrong|forget> <reason>
  ${choices}`);
            const b = l.state.entries.get(a1);
            if (!b || b.record.kind !== "inferred_belief") return say(`${a1} is not a belief`);
            const by = { by: "person" as const, ref: personRef };
            let events: PersonalEvent[];
            if (op === "wrong") events = correctBelief(l.state, { id: a1, now: options.now(), by, reason }).events;
            else events = [...forgetBelief(l.state, a1, options.now(), by, reason).events, ...invalidateDependents(l.state, a1, options.now(), `belief ${a1} forgotten: ${reason}`).events];
            append(events);
            const inv = events.filter(e => e.type === "artifact_invalidated").map(e => (e as { id: string }).id);
            return say([`${op === "wrong" ? "corrected" : "forgotten"} ${a1}. Operation: ${op === "wrong" ? "belief rejected as incorrect" : "retained item retracted"}; your reason is recorded with it and is not interpreted.`,
              `  stopped being used: yes`, `  dependants invalidated: ${inv.join(", ") || "nothing"} (recomputed only when something recomputes it)`,
              `  NOT done: scope narrowed, one use stopped, standing policy revised, re-derivation blocked${op === "forget" ? "" : ", item forgotten"}`, `  already shown or acted on: not reversed`].join("\n"));
          }
          if (sub === "override") {
            const l = await load(ctx);
            if (!a1) return say("usage: /personal override <friction-id>");
            const r = recordOverride(l.state, a1, sc.friction_action, options.now());
            append([r.event]);
            return say([`override recorded for "${sc.friction_action}" only. goal changed: ${r.goal_changed}; contract revoked: ${r.contract_revoked}; intervention changed: ${r.intervention_changed}`, `  overrides so far: ${r.override_count}`, r.reconsideration.suggested ? `  ${r.reconsideration.question}` : "  (no question asked yet)"].join("\n"));
          }
          if (sub === "apply" || sub === "revoke") { if (!a1 || !a2) return say(`usage: /personal ${sub} <boundary-id> <service-id>`); return say(await transmit(ctx, sub, a1, a2)); }
          if (sub === "verify") {
            if (!a1 || !a2) return say("usage: /personal verify <boundary-id> <service-id>");
            const r = (ctx.sessionManager.getEntries() as EntryLike[]).filter(x => x.customType === BOUNDARY_ENTRY).map(x => x.data as BoundaryReceipt).filter(x => x.boundary_id === a1 && x.service === a2 && x.setting_ref).at(-1);
            const svc = options.services[a2];
            if (!r || !svc) return say("nothing applied there to verify");
            const v = await verifyBoundary(r, svc, options.verifier, options.now());
            pi.appendEntry(BOUNDARY_ENTRY, v);
            return say(`verify ${a2}: ${v.stages.verified} — ${v.check_basis}`);
          }
          if (sub === "end") return say(await endSession(ctx));
          if (sub === "block") { const l = await load(ctx); if (!a1) return say("usage: /personal block <belief-id>"); const b = l.state.entries.get(a1); if (!b) return say(`no ${a1}`); append(blockRederivation(l.state, b.record.key, b.record.scope, options.now(), { by: "person", ref: personRef })); return say(`future derivation of "${b.record.key}" is blocked in ${b.record.scope}; this is separate from forgetting the record`); }
          if (sub === "receipts") {
            const es = (ctx.sessionManager.getEntries() as EntryLike[]).filter(e => e.customType === PLAN_ENTRY || e.customType === BOUNDARY_ENTRY || e.customType === FRICTION_ENTRY);
            const lines = es.map(e => {
              const d = e.data as Record<string, any>;
              if (e.customType === PLAN_ENTRY) return `plan ${d.plan_id}: ${d.outcome}/${d.mode}; used [${d.used.join(", ")}] refused [${d.refused.join(", ")}] — proves: ${d.receipt.proves}; does not prove: ${d.receipt.does_not_prove}`;
              if (e.customType === FRICTION_ENTRY) return `friction "${d.action}": ${d.intervention} — proves: ${d.receipt.proves}; does not prove: ${d.receipt.does_not_prove}`;
              return `boundary ${d.operation} ${d.service}: ${d.status} (${Object.entries(d.stages).map(([k, v]) => `${k}:${v}`).join(" ")}) — ${d.check_basis ?? "nothing read back"}`;
            });
            return say(lines.join("\n") || "no receipts yet");
          }
          return say("usage: /personal run [ch21..ch28|all] | state | why [id] | generic | correct <belief-id> <wrong|forget> <reason> | override <friction-id> | apply|revoke|verify <boundary-id> <service-id> | block <belief-id> | end | receipts");
        } catch (e) {
          return say(`refused (${(e as { code?: string }).code ?? "error"}): ${(e as Error).message}`);
        }
      },
    });
    void fitControl; void planIsCurrent;
  };
}
