// A session for Part III with every dependency injected: clock, ids, durable store, fake services, verifier, scripted model.
// Used by the tests and by examples/part-three-personal. No real service, user or model is involved.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession, UiRecorder } from "../harness/session.ts";
import { personal } from "./personal.ts";
import { RememberingDurable, engineVerifier } from "../core/personal/src/index.ts";
import { irisScenario, irisServices, policyReuseInference, T } from "../core/personal/fixtures/scenario.ts";
import { VerificationEngine } from "../core/verify/src/engine.ts";
import { MemoryWriteStore } from "../core/remembering/src/engine/write/store.ts";

export const call = (name: string, args: Parameters<typeof fauxToolCall>[1]) => fauxAssistantMessage([fauxToolCall(name, args)], { stopReason: "toolUse" });
export const done = (t = "done") => fauxAssistantMessage([fauxText(t)]);

export const PROPOSE_USEFUL = { belief_kind: "preference", proposition: "expanded derivations may be useful in similar architecture reviews", evidence_refs: ["obs-expand-derivations"], supported_scope: "architecture-review", applied_scope: "architecture-review", consequence: "low", confidence: "moderate", fold: ["library-release"] };
export const PROPOSE_FOUNDATIONS = { belief_kind: "knowledge", proposition: "consensus foundations are already known", evidence_refs: ["obs-expand-derivations", "obs-expand-derivations"], supported_scope: "architecture-review:protocol-p1", applied_scope: "architecture-review:talk-q", consequence: "high", confidence: "high", fold: ["intro-assumptions"] };

export interface StartOptions {
  ui?: boolean;
  /** Share a durable store between sessions to show standing records outliving one. */
  store?: MemoryWriteStore;
  clock?: { now: string };
}

export async function startPersonal(opts: StartOptions = {}) {
  const ui = opts.ui === false ? undefined : new UiRecorder();
  const clock = opts.clock ?? { now: T.now };
  const store = opts.store ?? new MemoryWriteStore();
  const services = irisServices();
  let n = 0;
  const ids = (p: string) => `${p}-${String(++n).padStart(3, "0")}`;
  const durable = new RememberingDurable(store as never, () => clock.now);
  const verifier = engineVerifier(new VerificationEngine(mkdtempSync(join(tmpdir(), "personal-proj-")), { store_dir: mkdtempSync(join(tmpdir(), "personal-store-")) }) as never);
  const h = await makeSession({
    ...(ui ? { ui } : {}),
    extensions: [personal({ scenario: irisScenario(), durable, services, verifier, policy: policyReuseInference, now: () => clock.now, ids, person: { ref: "iris" } })],
  });
  const entries = <D>(type: string) => h.session.sessionManager.getEntries().filter((e: any) => e.customType === type).map((e: any) => e.data as D);
  const last = () => ui?.notifications.at(-1)?.message ?? "";
  const run = async (text: string) => { await h.session.prompt(text); return last(); };
  return { h, ui, store, services, clock, entries, last, run, tick: (t: string) => { clock.now = t; } };
}
export type Started = Awaited<ReturnType<typeof startPersonal>>;
