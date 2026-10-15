// Part III, personal mediation: one invented architecture-review morning, one Pi session, a scripted model, three fake services.
//
// Run:  npm run example:personal              (the full composed scenario)
//       npm run example:personal -- ch26      (one chapter; earlier chapters run first, silently)
//       npm run example:personal -- all
//
// No real model, user or service.
import { CHAPTERS, type Chapter } from "../../host-pi/personal.ts";
import { PROPOSE_FOUNDATIONS, PROPOSE_USEFUL, call, done, startPersonal, type Started } from "../../host-pi/personal-session.ts";
import { EVIDENCE_SCOPE } from "../../core/personal/src/index.ts";
import { T } from "../../core/personal/fixtures/scenario.ts";
import { MemoryWriteStore } from "../../core/remembering/src/engine/write/store.ts";

const sel = process.argv[2] ?? "all";
if (sel !== "all" && !(CHAPTERS as readonly string[]).includes(sel)) { console.error(`usage: example:personal [${CHAPTERS.join("|")}|all]`); process.exit(2); }

const rule = (t: string) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 70 - t.length))}`);
const store = new MemoryWriteStore();
const s: Started = await startPersonal({ store });
let loud = sel === "all";
const say = async (cmd: string) => { const n = s.ui!.notifications.length; await s.h.session.prompt(cmd); const out = s.ui!.notifications.slice(n).map(x => x.message).join("\n"); if (loud) console.log(out); return out; };
const propose = async () => {
  s.h.faux.setResponses([call("personal_propose", PROPOSE_USEFUL), call("personal_propose", PROPOSE_FOUNDATIONS), done()]);
  await s.h.session.prompt("Iris's review is at 09:30. Propose anything her history supports.");
  if (loud) for (const m of s.h.session.messages.filter(m => m.role === "toolResult").map((m: any) => m.content[0].text as string)) console.log(`  model tool result: ${m}`);
};

if (sel === "all") {
  rule("Chapters 21-22: standing declarations, an observation, and what the model may propose");
  await say("/personal run ch21");
  await say("/personal run ch22");
  await propose();
  rule("Chapter 23: one plan; the decisive qualifier survives, the overbroad belief is refused");
  await say("/personal run ch23");
  rule("Chapters 24-25: the overlay, and a friction contract she wrote");
  await say("/personal run ch24");
  await say("/personal run ch25");
  await say("/personal override fr-one-paper");
  await say("/personal override fr-one-paper");
  await say("/personal override fr-one-paper");
  rule("Chapter 26: the boundary, per service, stage by stage");
  await say("/personal run ch26");
  await say("/personal verify bd-quiet-feeds video-service");
  rule("Chapter 27: what is believed about her, and a correction");
  await say("/personal run ch27");
  await say("/personal why inf-001");
  await say("/personal correct inf-001 wrong I only want derivations expanded when the decision depends on them");
  await say("/personal state");
  rule("The generic path, and the recomputed plan");
  await say("/personal generic");
  await say("/personal run ch23");
  rule("Revocation uses the same path");
  await say("/personal revoke bd-quiet-feeds video-service");
  rule("Chapter 28: the review ends");
  s.tick(T.after);
  await say("/personal run ch28");
  rule("Receipts: what ran, and what each does not prove");
  await say("/personal receipts");
  rule("A fresh interaction the next day: only the standing declarations remain");
  s.h.dispose();
  const next = await startPersonal({ store, clock: { now: "2026-10-16T09:00:00.000Z" } });
  await next.h.session.prompt("/personal state");
  console.log(next.last());
  next.h.dispose();
  rule("What this run establishes, and does not");
  console.log(JSON.stringify(EVIDENCE_SCOPE, null, 2));
} else {
  const idx = CHAPTERS.indexOf(sel as Chapter);
  for (const ch of CHAPTERS.slice(0, idx)) { await say(`/personal run ${ch}`); if (ch === "ch22") await propose(); }
  loud = true;
  if (sel === "ch21" || sel === "ch22") { /* nothing before it needs the model */ }
  await say(`/personal run ${sel}`);
  if (sel === "ch22") await propose();
  rule("Evidence scope");
  console.log(JSON.stringify(EVIDENCE_SCOPE, null, 2));
  s.h.dispose();
}
