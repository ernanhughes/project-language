// Pi host adapter for the ladder core: moving intent toward forms a machine can check.
//
// Placement in Pi:
//   - The host holds the decisions (the words whose reading is open), the requirements
//     that depend on them, and the trace they are checked against.
//   - The model's two doors: `interpretation_propose` (it may suggest a reading) and
//     `check_requirement` (it may ask for a check). It cannot settle a reading, and a
//     check on an unsettled reading comes back INCONCLUSIVE, never as a pass.
//   - A person settles, defers and confirms through /interpretation. Resolutions are
//     session entries; the latest in force wins and the earlier ones stay in the record.
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionFactory } from "@earendil-works/pi-coding-agent";
import {
	LadderError,
	RUNGS,
	check,
	confirmIntent,
	defer,
	explainBack,
	inForce,
	propose,
	settle,
	translation,
	type Actor,
	type Decision,
	type Requirement,
	type Resolution,
	type Translation,
} from "../core/ladder/src/index.ts";

export interface LadderOptions<Trace> {
	decisions: Decision[];
	requirements: Requirement<Trace>[];
	trace: Trace;
}

const RESOLUTION = "ladder-resolution";
const INTENT = "ladder-intent";
const person: Actor = { type: "human", id: "reader" };

type EntryLike = { type: string; customType?: string; data?: unknown };
type Ctx = { sessionManager: { getEntries(): readonly unknown[] } };

export function ladder<Trace>(options: LadderOptions<Trace>): ExtensionFactory {
	return (pi: ExtensionAPI) => {
		const entries = (ctx: Ctx) => ctx.sessionManager.getEntries() as EntryLike[];
		const history = (ctx: Ctx) => entries(ctx).filter((e) => e.type === "custom" && e.customType === RESOLUTION).map((e) => e.data as Resolution);
		const intent = (ctx: Ctx) => entries(ctx).filter((e) => e.type === "custom" && e.customType === INTENT).map((e) => e.data as Translation["intent"]).at(-1);

		const currentTranslation = (ctx: Ctx): Translation => {
			const t = translation({ id: "prose-to-structured", from: RUNGS[0], to: RUNGS[2], claimed: "narrows", decisions: options.decisions, history: history(ctx) });
			const i = intent(ctx);
			return i ? { ...t, intent: i } : t;
		};

		pi.registerTool(
			defineTool({
				name: "interpretation_propose",
				label: "Propose a reading",
				description:
					"Suggest which reading of an ambiguous word is meant. This is only a proposal: a person settles it, and nothing is checked under it until they do. " +
					"Give the reason, in terms of the words of the original request.",
				parameters: Type.Object({ decision_id: Type.String(), option_id: Type.String(), reason: Type.String() }),
				async execute(_id, params) {
					const d = options.decisions.find((x) => x.id === params.decision_id);
					const o = d?.options.find((x) => x.id === params.option_id);
					if (!d || !o) return { content: [{ type: "text", text: `No such decision or option: ${params.decision_id}/${params.option_id}` }], details: { recorded: false } };
					const r = propose(d, o.id, { type: "model", id: "model" }, params.reason);
					pi.appendEntry(RESOLUTION, r);
					return { content: [{ type: "text", text: `Recorded as a proposal, not a decision: "${d.term}" read as ${o.label}. A person has to settle it before any requirement is checked under it.` }], details: { recorded: true } };
				},
			}),
		);

		pi.registerTool(
			defineTool({
				name: "check_requirement",
				label: "Check a requirement",
				description: "Check a requirement against the recorded trace. If it depends on a reading nobody has settled, the answer is INCONCLUSIVE and says which; that is not a pass.",
				parameters: Type.Object({ requirement_id: Type.String() }),
				async execute(_id, params, _signal, _onUpdate, ctx) {
					const req = options.requirements.find((r) => r.id === params.requirement_id);
					if (!req) return { content: [{ type: "text", text: `No such requirement: ${params.requirement_id}` }], details: { verdict: null as string | null } };
					const result = check(req, options.trace, options.decisions, history(ctx));
					const readings = Object.entries(result.readings).map(([d, o]) => `${d}=${o}`).join(", ");
					const text = `${result.requirement}: ${result.verdict}${readings ? ` (readings: ${readings})` : ""}\n${result.detail}`;
					return { content: [{ type: "text", text }], details: { verdict: result.verdict as string | null } };
				},
			}),
		);

		pi.registerCommand("interpretation", {
			description: "Open readings. /interpretation | settle <decision> <option> <reason> | defer <decision> <reason> | explain | confirm yes|no <note>",
			handler: async (args, ctx) => {
				const say = (text: string) => (ctx.hasUI ? ctx.ui.notify(text, "info") : console.log(text));
				const [sub, a, b, ...rest] = args.trim().split(/\s+/).filter(Boolean);
				const decisionOf = (id?: string) => options.decisions.find((d) => d.id === id);
				try {
					if (sub === "settle") {
						const d = decisionOf(a);
						if (!d || !b) return say("usage: /interpretation settle <decision> <option> <reason>");
						pi.appendEntry(RESOLUTION, settle(d, b, person, rest.join(" ")));
						return say(`Settled: "${d.term}" read as ${d.options.find((o) => o.id === b)?.label}.`);
					}
					if (sub === "defer") {
						const d = decisionOf(a);
						if (!d) return say("usage: /interpretation defer <decision> <reason>");
						pi.appendEntry(RESOLUTION, defer(d, person, [b, ...rest].filter(Boolean).join(" ")));
						return say(`Left open: "${d.term}".`);
					}
					if (sub === "confirm") {
						if (a !== "yes" && a !== "no") return say("usage: /interpretation confirm yes|no <note>");
						const t = confirmIntent(currentTranslation(ctx), person, a === "yes", [b, ...rest].filter(Boolean).join(" "));
						pi.appendEntry(INTENT, t.intent);
						return say(`Recorded: the more explicit version ${a === "yes" ? "still says what you meant" : "does NOT say what you meant"}.`);
					}
					if (sub === "explain") {
						const t = currentTranslation(ctx);
						return say(`${explainBack(options.decisions, history(ctx))}\n\nprose → structured: ${t.relation}; readings set aside: ${t.interpretations_removed}; still open: ${t.unsettled.join(", ") || "none"}; your confirmation: ${t.intent.status}`);
					}
				} catch (error) {
					if (error instanceof LadderError) return say(`Not done: ${error.message}`);
					throw error;
				}
				const lines = options.decisions.map((d) => {
					const { resolution, stale } = inForce(d, history(ctx));
					const state = stale ? "STALE: the options changed after this was settled" : !resolution ? "open" : resolution.status === "settled" ? `settled: ${resolution.option_id}` : resolution.status === "deferred" ? "deferred" : `proposed by ${resolution.by.type}: ${resolution.option_id} (not settled)`;
					return `${d.id}  "${d.term}"  [${state}]\n${d.options.map((o) => `    ${o.id.padEnd(10)} ${o.definition}`).join("\n")}`;
				});
				say(lines.join("\n"));
			},
		});
	};
}
