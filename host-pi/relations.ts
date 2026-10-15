// Pi host adapter for the relations core: what is being claimed when one item is put beside another.
//
// Placement in Pi:
//   - The host holds the subject (what the reader is reading) and a corpus. The model
//     can ask for candidates and ask for a candidate to be labelled. It cannot set a
//     standing and it has no tool that adjudicates.
//   - A person adjudicates through the /relations command, which is the person's door.
//   - Records are durable session entries. A correction is a new record; the latest
//     record for a pair is the one in force, and the earlier ones stay in the history.
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionCommandContext, type ExtensionFactory } from "@earendil-works/pi-coding-agent";
import {
	RelationError,
	adjudicate,
	classifyRelation,
	findCandidates,
	shownAs,
	worthShowing,
	type Item,
	type Relation,
	type RelationRecord,
	type Task,
} from "../core/relations/src/index.ts";

export interface RelationsOptions {
	/** What the reader is reading. */
	subject: Item;
	corpus: Item[];
}

const RECORD = "relation-record";
const TASKS: readonly Task[] = ["check_a_claim", "understand", "stay_current", "build"];
const RELATIONS: readonly Relation[] = ["SUPPORTS", "CONTRADICTS", "UPDATES", "IMPLEMENTS", "RELATED", "UNKNOWN"];

type EntryLike = { type: string; customType?: string; data?: unknown };

/** The record in force for each pair: the latest one. Earlier records remain in the session. */
function inForce(entries: readonly EntryLike[]): RelationRecord[] {
	const byPair = new Map<string, RelationRecord>();
	for (const e of entries) {
		if (e.type === "custom" && e.customType === RECORD) {
			const r = e.data as RelationRecord;
			byPair.set(`${r.a.id}|${r.b.id}`, r);
		}
	}
	return [...byPair.values()];
}

export function relations(options: RelationsOptions): ExtensionFactory {
	return (pi: ExtensionAPI) => {
		const current = (ctx: { sessionManager: { getEntries(): readonly unknown[] } }) => inForce(ctx.sessionManager.getEntries() as EntryLike[]);
		const byId = new Map(options.corpus.map((c) => [c.id, c]));

		pi.registerTool(
			defineTool({
				name: "relations_find",
				label: "Relations: find candidates",
				description: "Find items in the reference corpus that are textually close to what the reader is reading. Closeness is not a relationship: the results are unlabelled candidates, and you must ask for a label separately.",
				parameters: Type.Object({ k: Type.Optional(Type.Integer({ minimum: 1, maximum: 10 })) }),
				async execute(_id, params) {
					const found = findCandidates(options.subject, options.corpus, params.k ?? 5);
					const text = found.map((c) => `${c.item.id}  similarity ${c.similarity.toFixed(2)}  (unlabelled)`).join("\n") || "No candidates.";
					return { content: [{ type: "text", text }], details: { candidates: found.map((c) => ({ id: c.item.id, similarity: c.similarity })) } };
				},
			}),
		);

		pi.registerTool(
			defineTool({
				name: "relations_label",
				label: "Relations: label a candidate",
				description:
					"Ask the relation classifier how a candidate relates to what the reader is reading. The result is recorded as a proposal from an uncalibrated classifier. " +
					"You cannot confirm it; only the reader can. Unknown is a normal answer.",
				parameters: Type.Object({ candidate_id: Type.String() }),
				async execute(_id, params) {
					const candidate = byId.get(params.candidate_id);
					if (!candidate) return { content: [{ type: "text", text: `No such candidate: ${params.candidate_id}` }], details: { id: null, relation: null, standing: null, caveats: [] as string[] } };
					const record = classifyRelation(options.subject, candidate);
					pi.appendEntry(RECORD, record);
					return {
						content: [{ type: "text", text: `${candidate.id}: ${shownAs(record)}` }],
						details: { id: record.id as string | null, relation: record.relation as string | null, standing: record.standing as string | null, caveats: record.caveats as string[] },
					};
				},
			}),
		);

		const say = (ctx: ExtensionCommandContext, text: string) => (ctx.hasUI ? ctx.ui.notify(text, "info") : console.log(text));

		pi.registerCommand("relations", {
			description: "Show labelled relations. /relations [task] | adjudicate <candidate_id> <RELATION|keep> <reason>",
			handler: async (args, ctx) => {
				const [first, ...rest] = args.trim().split(/\s+/).filter(Boolean);
				if (first === "adjudicate") {
					const [candidateId, relation, ...reason] = rest;
					const prior = current(ctx).find((r) => r.b.id === candidateId);
					if (!candidateId || !relation || !prior) return say(ctx, "usage: /relations adjudicate <candidate_id> <RELATION|keep> <reason>  (the candidate must have been labelled first)");
					if (relation !== "keep" && !RELATIONS.includes(relation as Relation)) return say(ctx, `relation must be one of ${RELATIONS.join(", ")} or keep`);
					try {
						const next = adjudicate(prior, { type: "human", id: "reader" }, { ...(relation === "keep" ? {} : { relation: relation as Relation }), reason: reason.join(" ") });
						pi.appendEntry(RECORD, next);
						return say(ctx, `${candidateId}: ${shownAs(next)}`);
					} catch (error) {
						if (error instanceof RelationError) return say(ctx, `Not adjudicated: ${error.message}`);
						throw error;
					}
				}
				const task = TASKS.find((t) => t === first);
				const records = current(ctx);
				if (records.length === 0) return say(ctx, "No relations have been labelled. Nothing is claimed about how anything else relates to what you are reading.");
				const lines = records.map((r) => {
					const show = task ? (worthShowing(r, task) ? "show" : "hold back") : "";
					return `${r.b.id.padEnd(14)} ${shownAs(r)}   [${r.route}${show ? `; ${show} for ${task}` : ""}]`;
				});
				say(ctx, `Relations to ${options.subject.id}${task ? ` (task: ${task})` : ""}\n${lines.join("\n")}`);
			},
		});
	};
}
