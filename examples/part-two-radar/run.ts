// Part II, human-side Radar slice: one invented afternoon, five candidates, one Pi session.
//
// Run:  npm run example:radar
//
// No real model. The only model-side step is the existing admission harness (scripted provider).
import { ORACLE, SOURCES, TASK } from "../../core/admission/fixtures/retry-context.ts";
import { runAdmissionCondition } from "../../host-pi/admission-harness.ts";
import { makeSession, UiRecorder } from "../../harness/session.ts";
import { RECEIPT_ENTRY, REVISION_ENTRY, STAGES_ENTRY, radar } from "../../host-pi/radar.ts";
import {
  EVIDENCE_SCOPE, attend, modelReceipt, presentationEstablished, validateReceipt,
  type HumanPresentationReceipt, type Revision, type StageRecord,
} from "../../core/radar/src/attention/index.ts";
import { T_AFTER, T_NOW, afternoonInputs, meetingOver } from "../../core/radar/fixtures/afternoon.ts";

const rule = (t: string) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 70 - t.length))}`);
let clock = T_NOW;
const ui = new UiRecorder();
const h = await makeSession({
  ui,
  extensions: [radar({ inputs: afternoonInputs(), contextAfter: () => meetingOver, configured_sources: ["feed-a", "feed-b"], boundary: "two configured feeds, one invented afternoon", now: () => clock })],
});
const entries = <T>(type: string) => h.session.sessionManager.getEntries().filter((e: any) => e.customType === type).map((e: any) => e.data as T);

rule("1. 14:40, in a design review until 15:30. Five candidates arrive.");
await h.session.prompt("/radar run");
const stageRows = entries<{ item_id: string; stages: StageRecord[] }>(STAGES_ENTRY);
const marks: Record<string, string> = { yes: "yes", no: "NO ", unknown: "?  ", not_reached: ".  ", not_applicable: "n/a" };
const cols = ["observed", "retrieved", "eligible", "selected", "assembled", "qualified", "safe_resolution", "delivery_timing", "presented", "noticed"];
console.log("candidate".padEnd(15) + ["obs", "ret", "elig", "sel", "asm", "qual", "res", "time", "pres", "noticed"].map(s => s.padEnd(8)).join(""));
for (const r of stageRows) {
  const by = Object.fromEntries(r.stages.map(s => [s.stage, marks[s.outcome]!]));
  console.log(r.item_id.padEnd(15) + cols.map(s => (by[s] ?? "").padEnd(8)).join(""));
}
console.log("\n(yes = reached and passed; NO = stopped here; ? = unknown; . = not reached; n/a = no unit decomposition)");
console.log("\nWhat each case shows:");
console.log("  preprint       A  eligible, and its standing does not satisfy 'peer-reviewed': not qualified. The subscription is as the person wrote it.");
console.log("  mechanism      B  closeness is high; no bridge; the relation to the tracked claim is UNRESOLVED, so it is kept available (not pushed) and says so.");
console.log("  contradiction  D  a person's bridge names both scopes: qualified. BRIEF is safe. A meeting is on: BRIEF + QUEUE.");
console.log("  lossy          C  names the qualifier's unit at BRIEF and says only 'safe': membership, nesting and closure hold, the wording does not. The resolution rises.");
console.log("  decoy          E  keyword-stuffed. Retrieved. No grant and the wrong domain: not eligible. It goes no further.");

rule("2. What was decided, and why (typed reasons, no score)");
for (const r of entries<Revision>(REVISION_ENTRY)) console.log(`${r.decision_id.padEnd(18)} r${r.revision} ${r.status.padEnd(9)} resolution ${String(r.resolution).padEnd(8)} mode ${r.mode}`);
await h.session.prompt("/radar why contradiction");
console.log("\nwhy contradiction:\n" + ui.notifications.at(-1)!.message);
console.log("\nThe four checks behind the lossy item's resolution (its person needs at least BRIEF):");
const lossy = attend(afternoonInputs().find(i => i.item.id === "lossy")!);
for (const a of lossy.resolution!.attempts) console.log(`  ${a.level.padEnd(8)} ${a.skipped ? "skipped: " + a.skipped : a.checks.map(c => `${c.name}=${c.ok ? "ok" : "FAIL"}`).join("  ") + (a.accepted ? (a.level === lossy.resolution!.chosen ? "   <- chosen" : "   (also passes; not needed)") : "")}`);
console.log("Naming the qualifier's unit made three of the four checks pass. Only the fourth looks at the words.");

rule("3. 15:30, the meeting ends. Same decisions, re-evaluated: new revisions, not edits");
clock = T_AFTER;
await h.session.prompt("/radar circumstance meeting_ended");
for (const id of ["attn:contradiction", "attn:lossy", "attn:mechanism"]) {
  const chain = entries<Revision>(REVISION_ENTRY).filter(r => r.decision_id === id);
  console.log(`${id.padEnd(18)} ${chain.map(r => `r${r.revision} ${r.status}/${r.resolution}/${r.mode}`).join("  ->  ")}`);
}
console.log("The BRIEF stayed a BRIEF while QUEUE became NOW. The mechanism paper stayed AVAILABLE: a calendar change does not promote an unresolved relation.");

console.log("\nThe person asks for the mechanism paper (kept AVAILABLE, never pushed): /radar open mechanism");
await h.session.prompt("/radar open mechanism");
const latest = (id: string) => entries<{ item_id: string; stages: StageRecord[] }>(STAGES_ENTRY).filter(x => x.item_id === id).at(-1)!.stages;
for (const id of ["contradiction", "mechanism", "decoy"]) console.log(`  stage ledger, ${id.padEnd(13)} presented=${latest(id).find(s => s.stage === "presented")!.outcome}  noticed=${latest(id).find(s => s.stage === "noticed")!.outcome}`);

rule("3b. Selection governs what is shown");
const tight = attend({ ...afternoonInputs().find(i => i.item.id === "contradiction")!, budgetTokens: 30 });
console.log(`with a budget of 30 the compiler selected [${tight.selection!.selected.join(", ")}] and refused [${tight.selection!.rejected.map(x => x.id).join(", ")}]`);
console.log(`the BRIEF names the refused claim, so it fails membership: ${tight.resolution!.attempts.find(a => a.level === "BRIEF")!.checks[0]!.detail}`);
console.log(`what would be presented: the source (${tight.resolution!.basis}), not an authored summary`);

rule("4. Two receipts, never one");
const shown = ui.notifications.filter(n => n.message.startsWith("[radar "));
console.log(`interface calls made by the Radar: ${shown.length}`);
const receipts = entries<HumanPresentationReceipt>(RECEIPT_ENTRY);
for (const r of receipts) console.log(`  human presentation receipt: ${r.decision_id} r${r.revision} at ${r.resolution}, via ${r.interface}; noticed=${r.noticed} used=${r.used} helpful=${r.helpful}; receipt problems: ${validateReceipt(r).length}`);
const model = await runAdmissionCondition(TASK, SOURCES, "constrained", ORACLE.value);
const m = modelReceipt(model.evaluation.delivery);
console.log(`  model delivery receipt:     ${m.confirmed ? "confirmed" : "not confirmed"} at ${m.boundary}, ${m.deliveredIds.length} source(s) in the provider-visible input (an unrelated admission task)`);
const msg = shown.find(n => n.message.includes("attn:contradiction"))!.message;
console.log(`\ncan the model receipt show that the contradiction was presented to a person?  ${presentationEstablished([m], "attn:contradiction", 2, msg)}`);
console.log(`can the human receipt show it?                                                ${presentationEstablished(receipts, "attn:contradiction", 2, msg)}   (an interface call, not a screen)`);
console.log("did the person notice it, use it, or benefit?                                 unknown. Nothing here observes any of them.");

rule("5. Coverage, with its boundary");
await h.session.prompt("/radar coverage");
console.log(ui.notifications.at(-1)!.message);

rule("6. What this run establishes, and does not");
console.log(JSON.stringify(EVIDENCE_SCOPE, null, 2));
h.dispose();
