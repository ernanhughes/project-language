// The Pi seam for the human-side Radar slice (Part II). Pi is only the interface here.
//
// What this adapter observes: that it CALLED the interface to present a message. It cannot observe
// that the person saw it. The receipt it writes says `interface_call` and leaves noticed / used /
// helpful as "unknown". The model's own context is a different path (core/admission) with a
// different receipt.
//
// Nothing is pushed to the person except NOW items. QUEUE and DIGEST items wait for their time;
// AVAILABLE items wait until the person asks (`/radar open <id>`).
import type { ExtensionFactory } from "@earendil-works/pi-coding-agent";
import {
  attend, coverageReport, current, humanReceipt, markDelivered, presentationText, reevaluate, reopen, validateHistory, withObservation,
  type AttendInput, type AttentionResult, type Circumstance, type ContextFact, type HumanPresentationReceipt, type Revision, type Standing,
} from "../core/radar/src/attention/index.ts";

export const REVISION_ENTRY = "radar-revision";
export const RECEIPT_ENTRY = "radar-presentation-receipt";
export const STAGES_ENTRY = "radar-stages";
export const INTERFACE_NAME = "pi-ui-notify";

export interface RadarOptions {
  /** One attend() input per candidate, built by the host from its configured sources. */
  inputs: AttendInput[];
  /** Context at a later time, keyed by the circumstance that changed it. Declared or observed only. */
  contextAfter: (c: Circumstance) => readonly ContextFact[];
  /** What is still true of a candidate when circumstances change. Defaults to everything holding. */
  standing?: (itemId: string) => Standing;
  /** The candidate as it is now, for reopening. Defaults to the input as first given. */
  refresh?: (input: AttendInput) => AttendInput;
  /** Configured source ids, for the coverage report. */
  configured_sources: string[];
  boundary: string;
  /** The host clock. Injected so tests are deterministic. */
  now: () => string;
}

/** The exact text handed to the interface. The receipt hashes this; the stage ledger reconnects through it. */
export const presentedMessage = presentationText;

export function radar(options: RadarOptions): ExtensionFactory {
  return pi => {
    const results = new Map<string, AttentionResult>();
    const histories = new Map<string, Revision[]>();
    const receipts: HumanPresentationReceipt[] = [];
    const ok: Standing = { permission: true, current: true, scope: true, standing: true };

    const record = (rev: Revision) => pi.appendEntry(REVISION_ENTRY, rev);
    /** Decisions are keyed by candidate id; `attn:<id>` (the decision id) is accepted too. */
    const idOf = (arg: string | undefined) => { const k = arg?.replace(/^attn:/, ""); return k && histories.has(k) ? k : undefined; };
    const republish = (id: string) => {
      const r = results.get(id)!; const h = histories.get(id)!;
      pi.appendEntry(STAGES_ENTRY, { item_id: id, stages: withObservation(r, h, receipts, []) });
    };

    pi.registerCommand("radar", {
      description: "Human-side attention. /radar run | present | open <id> | circumstance <kind> | reopen <id> | status | why <id> | coverage",
      handler: async (args, ctx) => {
        const say = (t: string) => (ctx.hasUI ? ctx.ui.notify(t, "info") : console.log(t));
        const [sub, arg] = args.trim().split(/\s+/);

        /** Hand one pending decision to the interface, if there is one, and record exactly that. */
        const presentOne = (id: string): string => {
          const h = histories.get(id)!; const last = current(h); const r = results.get(id)!;
          if (last.status !== "PENDING" || !r.content) return `${id}: nothing pending to present`;
          if (!ctx.hasUI) return `${id}: no interface bound; not presented`;
          const message = presentationText(last, r.content);
          ctx.ui.notify(message, "warning");
          const receipt = humanReceipt({ decision_id: last.decision_id, revision: last.revision, interface: INTERFACE_NAME, content: message, resolution: last.resolution!, mode: last.mode!, presented_at: options.now() });
          receipts.push(receipt); pi.appendEntry(RECEIPT_ENTRY, receipt);
          const delivered = markDelivered(h, receipt); h.push(delivered); record(delivered);
          republish(id);
          return `${id}: presented at ${last.resolution} (an interface call, recorded; not shown to have been noticed)`;
        };
        const presentDue = (): string[] => [...histories].filter(([, h]) => current(h).status === "PENDING" && current(h).mode === "NOW").map(([id]) => presentOne(id));

        if (sub === "run") {
          for (const input of options.inputs) {
            const r = attend(input);
            results.set(r.item_id, r); histories.set(r.item_id, [...r.history]);
            pi.appendEntry(STAGES_ENTRY, { item_id: r.item_id, stages: r.stages });
            for (const rev of r.history) record(rev);
          }
          const lines = [...histories].map(([id, h]) => { const l = current(h); return `${id}  ${l.status}  ${l.resolution ?? "-"}  ${l.mode ?? "-"}`; });
          return say(lines.join("\n") + "\n" + presentDue().join("\n"));
        }
        if (sub === "present") return say(presentDue().join("\n") || "nothing is pending for NOW");
        if (sub === "open") {
          const id = idOf(arg);
          if (!id) return say(`no decision for ${arg ?? "(none given)"}`);
          const last = current(histories.get(id)!);
          if (last.status !== "PENDING" || last.mode !== "AVAILABLE") return say(`${id} is ${last.status}${last.mode ? "/" + last.mode : ""}; /radar open is for items kept available`);
          return say(presentOne(id));
        }
        if (sub === "circumstance") {
          const nowIso = options.now();
          const c = { kind: arg, at: nowIso, ...(arg === "permission_revoked" || arg === "evidence_stale" ? { detail: "declared by the person" } : {}), ...(arg === "superseded" ? { by: "newer-result" } : {}) } as Circumstance;
          const lines: string[] = [];
          for (const [id, h] of histories) {
            const last = current(h);
            if (last.status !== "PENDING") continue;
            const input = options.inputs.find(i => i.item.id === id)!;
            const next = reevaluate({
              history: h, circumstance: c, timing: { now: nowIso, acts_by: input.timing.acts_by, context: options.contextAfter(c), ...(input.timing.non_interruptive ? { non_interruptive: true } : {}) },
              standing: options.standing?.(id) ?? ok, acts_by: input.timing.acts_by,
            });
            h.push(next); record(next);
            lines.push(`${id}: r${next.revision} ${next.status} ${next.resolution ?? "-"} ${next.mode ?? "-"}`);
          }
          return say(lines.join("\n") + "\n" + presentDue().join("\n"));
        }
        if (sub === "reopen") {
          const id = idOf(arg);
          if (!id) return say(`no decision for ${arg ?? "(none given)"}`);
          const h = histories.get(id)!;
          const input = options.inputs.find(i => i.item.id === id)!;
          let out;
          try { out = reopen(h, options.refresh?.(input) ?? input, options.now()); }
          catch (e) { return say(`cannot be reopened: ${(e as Error).message}`); }
          if (!out.ok) return say(`cannot be reopened: ${out.refused!.join("; ")}`);
          results.set(id, out.result); h.push(out.revision!); record(out.revision!);
          return say(`reopened: r${out.revision!.revision} ${out.revision!.mode} at ${out.revision!.resolution}; /radar open ${arg} to read it`);
        }
        if (sub === "status") {
          return say([...histories].map(([id, h]) => `${id}: ${h.map(r => `r${r.revision} ${r.status}/${r.resolution ?? "-"}/${r.mode ?? "-"}`).join(" → ")}${validateHistory(h).length ? "  [INVALID CHAIN]" : ""}`).join("\n") || "nothing run yet");
        }
        if (sub === "why") {
          const id = idOf(arg);
          if (!id) return say(`no decision for ${arg ?? "(none given)"}`);
          return say(current(histories.get(id)!).reasons.map(r => `[${r.dimension} · ${r.origin} · ${r.ref}] ${r.text}`).join("\n"));
        }
        if (sub === "coverage") {
          const searches = options.configured_sources.slice(0, 1).map(s => ({ source_id: s, query: options.inputs[0]?.query ?? "", at: options.inputs[0]?.timing.now ?? "", ok: true }));
          const rep = coverageReport({
            boundary: options.boundary, configured_sources: options.configured_sources, searches,
            retrieved: options.inputs.filter(i => results.get(i.item.id)?.stages.find(s => s.stage === "retrieved")?.outcome === "yes").map(i => i.item.id),
            exclusions: [...results.values()].filter(r => r.history[0]!.status === "WITHDRAWN" && r.causes.length).map(r => ({ candidate_id: r.item_id, reached_stages: r.stages.filter(s => s.outcome === "yes").map(s => s.stage), causes: r.causes })),
          });
          return say(`${rep.covers}\nboundary: ${rep.boundary}\nunknown: ${rep.unknown.join("; ")}\nexclusions: ${(rep.exclusions ?? []).map(e => `${e.candidate_id} reached [${e.reached_stages.join(",")}] causes [${e.causes.join(",")}]`).join(" | ")}`);
        }
        return say("usage: /radar run | present | open <id> | circumstance <kind> | reopen <id> | status | why <id> | coverage");
      },
    });
  };
}
