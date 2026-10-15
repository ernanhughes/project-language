// Pi host adapter for the semantic browser: the Part I pieces on one document.
//
// Placement in Pi:
//   - The host holds the source, the record and the corpus. The model writes representations
//     (a preview, a diagram, a table) and submits them through one door, `submit_rendering`.
//     It cannot declare its own obligations, see its attempt counter reset, or mark a view as shown.
//   - The same gate that checks the deterministic renderings checks the model's: validated first,
//     then each declared obligation, then show / repair / fall back to the source.
//   - The reader pulls the result with /browser. Nothing reaches the reader until it has been
//     checked, and nothing here interrupts.
import { createHash } from "node:crypto";
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { renderSidecar } from "../core/sidecar/src/index.ts";
import { shownAs } from "../core/relations/src/index.ts";
import { renderProfile } from "../core/preservation/src/index.ts";
import {
	browse,
	buildMargin,
	checkRendering,
	choose,
	gateDecision,
	gateHealth,
	validateGate,
	validateRecord,
	viewState,
	type CorpusDoc,
	type DocumentRecord,
	type GateDecision,
	type Representation,
	type Source,
	type Task,
} from "../core/browser/src/index.ts";

export interface BrowserOptions {
	source: Source;
	record: DocumentRecord;
	corpus: CorpusDoc[];
	/** Where the margin's relations are claimed. */
	thisScope: string;
	/** The claim the margin is about. */
	about: string;
	audienceServices: string[];
	components: string[];
	now?: () => string;
	maxAttempts?: number;
	/** For the look-up task: the passage to find. */
	query?: string;
}

const SUBMISSION = "browser-submission";
const RESET = "browser-reset";
const TASKS: readonly Task[] = ["decide_to_open", "approve_fix", "follow_procedure", "look_up_fact"];

interface Submission {
	task: Task;
	view: Representation;
	attempt: number;
	text: string;
	text_sha256: string;
	decision: GateDecision["decision"];
	why: string;
	lost: string[];
}
type EntryLike = { type: string; customType?: string; data?: unknown };
type Ctx = { sessionManager: { getEntries(): readonly unknown[] } };
type SubmissionEvent = Submission & { type: "submission" };
type ResetEvent = { type: "reset"; task: Task };

export function browser(options: BrowserOptions): ExtensionFactory {
	const clock = options.now ?? (() => new Date().toISOString());
	const maxAttempts = options.maxAttempts ?? 2;
	// The obligations are declared once, here, before any submission, so the late-declaration flag can mean something.
	const declaredAt = clock();
	// The host holds the record. If it does not trace to the source, nothing built from it is delivered.
	const recordProblems = validateRecord(options.source, options.record);
	const recordWhy = "the record does not trace to the source (" + recordProblems.map((p) => p.problem + ":" + p.id).join(", ") + ")";
	const validations = new Map<string, ReturnType<typeof validateGate>>();
	const gateFor = (task: Task, view: Representation) => {
		const key = `${task}/${view}`;
		if (!validations.has(key)) validations.set(key, validateGate(task, view, options.record, options.source, clock(), options));
		return validations.get(key)!;
	};

	return (pi: ExtensionAPI) => {
		const events = (ctx: Ctx): (SubmissionEvent | ResetEvent)[] =>
			(ctx.sessionManager.getEntries() as EntryLike[]).flatMap((e): (SubmissionEvent | ResetEvent)[] => {
				if (e.type !== "custom") return [];
				if (e.customType === SUBMISSION) return [{ type: "submission" as const, ...(e.data as Submission) }];
				if (e.customType === RESET) return [{ type: "reset" as const, task: (e.data as { task: Task }).task }];
				return [];
			});
		const submissions = (ctx: Ctx) => events(ctx).filter((e): e is SubmissionEvent => e.type === "submission");

		pi.registerTool(
			defineTool({
				name: "submit_rendering",
				label: "Submit a rendering for the reader",
				description:
					"Submit a preview, diagram or table you wrote for the reader. It is checked against obligations a person declared; you are told which were lost so you can repair it. " +
					"If it still loses something after the allowed attempts, the reader is shown the source instead. Once a view is accepted or handed back to the source, it is closed: you cannot change the obligations, the outcome, or reopen it.",
				parameters: Type.Object({
					task: Type.String({ description: "decide_to_open | approve_fix | follow_procedure | look_up_fact" }),
					view: Type.String({ description: "preview | diagram | table" }),
					text: Type.String(),
				}),
				async execute(_id, params, _signal, _onUpdate, ctx) {
					const task = TASKS.find((t) => t === params.task);
					const choice = task && choose(task);
					const view = choice?.representations.find((v) => v === params.view);
					if (!task || !choice || !view) return { content: [{ type: "text", text: `No such task/view: ${params.task}/${params.view}` }], details: { decision: null as string | null } };
					if (!choice.transforms_source) return { content: [{ type: "text", text: `For ${task} the source is shown as it is. Nothing to submit.` }], details: { decision: "SOURCE_UNCHANGED" as string | null } };

					const state = viewState(events(ctx), task, view);
					if (state.state !== "open") {
						const closed = state.state === "accepted" ? "accepted" : "handed back to the source";
						return { content: [{ type: "text", text: `This view is already ${closed}. Further submissions are not taken; only the reader can reopen it.` }], details: { decision: null as string | null } };
					}
					const attempt = state.attempts + 1;
					const sha = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

					if (recordProblems.length > 0) {
						const entry: Submission = { task, view, attempt, text: params.text, text_sha256: sha(params.text), decision: "FALL_BACK_TO_SOURCE", why: recordWhy, lost: [] };
						pi.appendEntry(SUBMISSION, entry);
						return { content: [{ type: "text", text: `FALL_BACK_TO_SOURCE: ${recordWhy}\nThe reader will be shown the source instead.` }], details: { decision: "FALL_BACK_TO_SOURCE" as string | null } };
					}

					const validation = gateFor(task, view);
					const profile = checkRendering(task, view, options.record, options.source, params.text, clock(), validation, options, declaredAt);
					const decision = gateDecision(profile, attempt, maxAttempts);
					const entry: Submission = { task, view, attempt, text: params.text, text_sha256: sha(params.text), decision: decision.decision, why: decision.why, lost: "lost" in decision ? decision.lost : [] };
					pi.appendEntry(SUBMISSION, entry);
					const tail = decision.decision === "SHOW" ? "The reader will be shown this." : decision.decision === "REPAIR" ? "Repair it and submit again." : "The reader will be shown the source instead.";
					return { content: [{ type: "text", text: `${decision.decision}: ${decision.why}\n${renderProfile(profile)}\n${tail}` }], details: { decision: decision.decision as string | null } };
				},
			}),
		);

		pi.registerCommand("browser", {
			description: "What the reader sees. /browser show <task> [query] | trace <task> | reset <task> | gate",
			handler: async (args, ctx) => {
				const say = (text: string) => (ctx.hasUI ? ctx.ui.notify(text, "info") : console.log(text));
				const [sub, arg, ...rest] = args.trim().split(/\s+/);
				const all = submissions(ctx);
				if (sub === "gate") {
					const h = gateHealth(all.map((s) => ({ decision: s.decision })));
					const lines = [`${h.note}`];
					for (const [key, v] of validations) lines.push(`  check for ${key}: ${v.status}`);
					return say(lines.join("\n"));
				}
				const task = TASKS.find((t) => t === arg);
				if (!task) return say("usage: /browser show <task> [query] | trace <task> | reset <task> | gate    tasks: " + TASKS.join(", "));
				if (sub === "reset") {
					pi.appendEntry(RESET, { task });
					return say(`Reopened ${task}. Earlier submissions stay in the record; the model may submit again from attempt 1.`);
				}
				if (sub === "trace") {
					const b = browse(task, options.record, options.source, clock(), options);
					return say(`${b.trace.map((t) => `${t.stage.padEnd(36)} ${t.note}`).join("\n")}\n\nThe plain page has none of these stages. This has not been measured against it; no benefit is claimed.`);
				}
				if (sub !== "show") return say("usage: /browser show <task> [query] | trace <task> | reset <task> | gate");

				// What the reader gets, view by view, from the order of events: an accepted submission, or the source if the gate handed the view back,
				// or (if nothing has been submitted) the deterministic rendering if the gate lets that through, or the source.
				const query = rest.join(" ") || options.query || "";
				const b = browse(task, options.record, options.source, clock(), { ...options, query });
				const evs = events(ctx);
				const parts = b.views.map((v) => {
					const view = v.rendering.representation;
					const st = viewState(evs, task, view);
					if (st.state === "accepted" && st.accepted) return { view, from: "the model's rendering, checked", text: (st.accepted as SubmissionEvent).text, highlight: undefined as { start: number; end: number } | null | undefined };
					if (st.state === "handed_back") return { view, from: "the SOURCE (the model's rendering was not allowed through)", text: options.source.text, highlight: undefined as { start: number; end: number } | null | undefined };
					return { view, from: v.shown.is_source ? "the source" : "built from the record, checked", text: v.shown.text, highlight: v.shown.highlight };
				});
				let out = parts
					.map((p) => {
						const where = p.highlight === undefined ? "" : p.highlight === null ? `\n(passage not found${query ? `: "${query}"` : ": no query given"})` : `\n(passage located at characters ${p.highlight.start}-${p.highlight.end}: "${options.source.text.slice(p.highlight.start, p.highlight.end)}")`;
						return `── ${p.view}: ${p.from}${where}\n${p.text}`;
					})
					.join("\n\n");
				if (task === "approve_fix" && recordProblems.length === 0) {
					const m = buildMargin(options.source, options.record, options.corpus, options.thisScope, options.about);
					out += `\n\n── beside the page (margin)\n${renderSidecar([...m.derived, ...m.retrieved])}\n${m.relations.map((r) => `  relation claimed: ${shownAs(r)} [${r.route}]`).join("\n")}`;
				}
				say(out);
			},
		});
	};
}
