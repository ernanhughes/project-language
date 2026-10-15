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
import type { Direction } from "../core/relations/src/index.ts";
import {
	RelationError,
	adjudicate,
	classifyRelation,
	effectiveRecords,
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

/** The records in force. The rule (a person's adjudication is not displaced by a later non-adjudication) lives in the core. */
function inForce(entries: readonly EntryLike[]): RelationRecord[] {
	return effectiveRecords(entries.filter((e) => e.type === "custom" && e.customType === RECORD).map((e) => e.data as RelationRecord));
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
				async execute(_id, params, _signal, _onUpdate, ctx) {
					const candidate = byId.get(params.candidate_id);
					if (!candidate) return { content: [{ type: "text", text: `No such candidate: ${params.candidate_id}` }], details: { id: null, relation: null, standing: null, caveats: [] as string[] } };
					const held = current(ctx).find((r) => r.a.id === options.subject.id && r.b.id === candidate.id);
					if (held?.route === "adjudicated") {
						return { content: [{ type: "text", text: `${candidate.id}: a person has already ruled on this pair (${shownAs(held)}). Your label is not recorded and does not change it.` }], details: { id: held.id as string | null, relation: held.relation as string | null, standing: held.standing as string | null, caveats: held.caveats as string[] } };
					}
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
					const [candidateId, relation, ...afterRelation] = rest;
					// Optional flags, then the reason: `dir=left_to_right` sets the direction; `scope-confirmed` says the two items share their scope.
					let direction: Direction | undefined;
					let confirmsScope = false;
					const reason: string[] = [];
					for (const t of afterRelation) {
						if (reason.length === 0 && t === "scope-confirmed") confirmsScope = true;
						else if (reason.length === 0 && t.startsWith("dir=")) direction = t.slice(4) as Direction;
						else reason.push(t);
					}
					const prior = current(ctx).find((r) => r.b.id === candidateId);
					if (!candidateId || !relation || !prior) return say(ctx, "usage: /relations adjudicate <candidate_id> <RELATION|keep> <reason>  (the candidate must have been labelled first)");
					if (relation !== "keep" && !RELATIONS.includes(relation as Relation)) return say(ctx, `relation must be one of ${RELATIONS.join(", ")} or keep`);
					try {
						const next = adjudicate(prior, { type: "human", id: "reader" }, { ...(relation === "keep" ? {} : { relation: relation as Relation }), ...(direction ? { direction } : {}), confirms_scope: confirmsScope, reason: reason.join(" ") });
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
