// Chapter 7: Meaning Becomes the Source.
//
// Three things that are easy to run together:
//
//   SOURCE          the conversation as it happened (never changed by anything below)
//   SEMANTIC RECORD one structured interpretation of it, citing the source by hash
//   RENDERING       a projection of the record, made for one task: briefing a model
//
// Run:  npm run example:ch07
//
// No model is called. The record is written here by hand, standing in for a
// maintainer; who writes the record is a separate question from what the record is.
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyMutation, initThread, resolveStorePaths, type LanguageItem, type SourceRef } from "../../core/language/src/index.ts";
import { makeSession, systemPromptSeenByProvider } from "../../harness/session.ts";
import { languageProjection, loadProjection } from "../../host-pi/language.ts";

const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const rule = (title: string) => console.log(`\n── ${title} ${"─".repeat(Math.max(0, 66 - title.length))}`);

// 1. SOURCE ─ two messages. Nothing in this program edits them.
const source = [
	{ id: "m1", from: "Priya", text: "Let's keep the retry budget at three attempts." },
	{ id: "m2", from: "Priya", text: "Actually, make it five for the payment service only." },
] as const;
const cite = (id: (typeof source)[number]["id"]): SourceRef => ({
	session_id: "conversation-1",
	message_id: id,
	sha256: sha(source.find((m) => m.id === id)!.text),
});

rule("SOURCE: what was said");
for (const m of source) console.log(`${m.id} ${m.from}: ${m.text}\n   sha256 ${sha(m.text).slice(0, 16)}…`);

// 2. SEMANTIC RECORD ─ an interpretation, not the source. Every item cites it.
const storeRoot = mkdtempSync(join(tmpdir(), "ch07-store-"));
const projectPath = mkdtempSync(join(tmpdir(), "ch07-project-"));
mkdirSync(join(projectPath, "src"));
const threadId = "payments";
const when = (n: number) => `2026-10-15T09:00:0${n}.000Z`;

const d1: LanguageItem = { id: "d1", kind: "decision", text: "Retry budget is three attempts.", actor: "Priya", standing: "explicit", scope: "episode", sources: [cite("m1")] };
const d2: LanguageItem = { id: "d2", kind: "decision", text: "Retry budget is five attempts for the payment service only.", actor: "Priya", standing: "explicit", scope: "episode", sources: [cite("m2")] };

const init = await initThread({ storeRoot, projectPath, threadId, idempotencyKey: "init", producer: { type: "model" }, now: when(0) });
const r1 = await applyMutation(
	{ storeRoot },
	{ project_path: projectPath, thread_id: threadId, expected_parent: init.revision, idempotency_key: "r1", producer: { type: "model", id: "hand-written" }, source_event: { refs: [cite("m1")] }, operations: [{ op: "add", item: d1 }], now: when(1) },
);

rule("SEMANTIC RECORD: one interpretation, citing the source");
const paths = resolveStorePaths(storeRoot, projectPath, threadId);
console.log(readFileSync(paths.state_path, "utf8").trimEnd());
console.log(`\nrevision ${r1.revision}  (Git-backed; every change is a new revision, none is an overwrite)`);

// 3. RENDERING ─ made from the record, for one task.
const first = await loadProjection(storeRoot, projectPath, threadId);
if (!first.ok) throw new Error(`${first.code}: ${first.detail}`);
rule("RENDERING: the record, made into a briefing block for a model");
console.log(first.block.trimEnd());
console.log(`\nblock sha256 ${first.block_sha256.slice(0, 16)}…`);

// 4. The conversation moves on. The record changes; the source does not.
const r2 = await applyMutation(
	{ storeRoot },
	{ project_path: projectPath, thread_id: threadId, expected_parent: r1.revision, idempotency_key: "r2", producer: { type: "model", id: "hand-written" }, source_event: { refs: [cite("m2")] }, operations: [{ op: "add", item: d2 }, { op: "supersede", id: "d1", by: "d2" }], now: when(2) },
);
const second = await loadProjection(storeRoot, projectPath, threadId);
if (!second.ok) throw new Error(`${second.code}: ${second.detail}`);

rule("AFTER THE CONVERSATION MOVES ON");
console.log(`record     revision ${r1.revision.slice(0, 12)}… → ${r2.revision.slice(0, 12)}…   (changed)`);
console.log(`rendering  sha256   ${first.block_sha256.slice(0, 12)}… → ${second.block_sha256.slice(0, 12)}…   (changed)`);
console.log(`source     m1 ${sha(source[0].text).slice(0, 12)}…, m2 ${sha(source[1].text).slice(0, 12)}…   (unchanged: the citations still match)`);
const d1Section = second.block.split("### item d1")[1]?.split("### item")[0] ?? "";
console.log(`d1 in the new rendering (kept, not deleted):\n${d1Section.trim().replace(/^/gm, "   ")}`);

// 5. In a real Pi session, the model is handed that rendering, once, read-only.
rule("IN A PI SESSION: what the model is actually given");
const h = await makeSession({ extensions: [languageProjection({ storeRoot, projectPath, threadId })] });
const system = await systemPromptSeenByProvider(h);
console.log(`system prompt: ${system.length} characters, ${system.split("language.render/v1").length - 1} projection block`);
console.log(`contains the current rendering byte for byte: ${system.includes(second.block)}`);
console.log(`(the model is a scripted stand-in here; this shows what is handed over, not that a model uses it)`);
h.dispose();
