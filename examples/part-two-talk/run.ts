// Chapters 14 to 16: one invented talk, three readers.
//
// Run:  npm run example:talk
//
// No model and no host. The transcript is in the format the youtube-transcript skill prints; the unit structure is a
// scripted stand-in for a model's proposal; the relevance judgements and the knowledge state are written by hand.
import {
  TALK_SCOPE, decompose, omissionPlan, planForPurpose, selectWindowsLocally, timesOf, visibleState,
  type UnitProposal,
} from "../../core/radar/src/attention/index.ts";
import {
  NOW, IRIS_TERMS, conceptUses, judgements, mina, minaKnows, parsed, iris, irisKnows, scriptedProposals, tom,
} from "../../core/radar/fixtures/talk.ts";

const rule = (t: string) => console.log(`\n── ${t} ${"─".repeat(Math.max(0, 70 - t.length))}`);
const BUDGET = 140;

rule("1. The transcript, pinned, and the units cut from it");
console.log(`${parsed.lines.length} lines, ${parsed.source.text.length} characters, sha256 ${parsed.source.sha256.slice(0, 16)}…`);
const bad: UnitProposal[] = [
  { id: "x-invented-line", role: "claim", lines: [99], dependsOn: [] },
  { id: "x-needs-it", role: "claim", lines: [3], dependsOn: ["x-invented-line"] },
];
const dec = decompose(parsed, () => [...scriptedProposals, ...bad]);
for (const u of dec.units) console.log(`  ${u.id.padEnd(13)} ${u.role.padEnd(9)} ${timesOf(u, parsed).join(" + ").padEnd(16)} ${u.dependsOn.length ? "needs " + u.dependsOn.join(",") : ""}`);
console.log("refused proposals:");
for (const r of dec.refused) console.log(`  ${r.id.padEnd(16)} ${r.code}: ${r.detail}`);
console.log("\nA unit's text is the text at its spans, never what the proposer says. u-scope joins minute 4 and minute 53:");
console.log(`  "${dec.units.find(u => u.id === "u-scope")!.text}"`);
const units = dec.units;

rule("2. Why pieces cannot be judged one at a time");
console.log("Fixed windows of three lines, each scored on its own words against Iris's purpose, best two kept:");
for (const w of selectWindowsLocally(parsed, 3, IRIS_TERMS, 2).filter(w => w.kept || /fault means|bounded delays/.test(w.text))) console.log(`  ${w.kept ? "KEPT   " : "dropped"} ${w.stamps.padEnd(12)} score ${w.score}  ${w.text.slice(0, 70)}…`);
console.log("The window with the definition of 'fault' has none of her words, so a local scorer drops it, and keeps the half that mentions delay.");
console.log("(A constructed contrast, not a claim about any system that exists.)");

rule("3. One talk, three readers, one budget");
for (const p of [iris, tom, mina]) {
  const plan = planForPurpose(units, parsed.source, p, judgements[p.id]!, BUDGET);
  console.log(`\n${p.id}: "${p.text}"`);
  for (const d of plan.decisions) {
    const tag = d.disposition === "shown" ? "SHOWN   " : d.disposition === "attached" ? "ATTACHED" : "withheld";
    console.log(`  ${tag} ${d.unit_id.padEnd(13)} ${d.verdict.padEnd(12)} ${d.reason}`);
  }
}
console.log("\nTom wants only the speed. The qualification about bounded delay is not relevant to that, and it still travels with the result it limits.");

rule("4. What each reader already knows");
console.log("Iris's state, as the system would show it to her:");
for (const r of visibleState(irisKnows, NOW)) console.log(`  ${r.concept} (${r.sense}): ${r.grade} — ${r.why}`);
for (const [who, state, p] of [["Iris", irisKnows, iris], ["Mina", minaKnows, mina]] as const) {
  const plan = planForPurpose(units, parsed.source, p, judgements[p.id]!, BUDGET);
  console.log(`\n${who}: units shown, and what may be left out:`);
  for (const d of omissionPlan(units.filter(u => plan.shown.includes(u.id)), plan.shown, units, conceptUses, state, NOW).filter(d => conceptUses.some(c => c.unit_id === d.unit_id)))
    console.log(`  ${d.treatment.toUpperCase().padEnd(8)} ${d.unit_id.padEnd(13)} ${d.why}`);
}
console.log("\nThe word 'partial synchrony' is familiar to Iris, and the speaker uses it in a narrower sense, so it stays. A word is not a meaning.");

rule("5. What this run establishes, and does not");
console.log(JSON.stringify(TALK_SCOPE, null, 2));
