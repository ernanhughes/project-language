// Pi host adapter for the document record: SOURCE → SEMANTIC RECORD → RENDERING.
//
// Placement in Pi:
//   - The host holds the source and the record. The model asks for renderings drawn from the
//     record and asks where an element came from. It has no tool that writes the record: the
//     record is a fallible reading that a person or a maintainer owns, not something a
//     rendering step may amend on the way past.
//   - Nothing is injected into the model's context and nothing notifies. The reader pulls a
//     summary with /record.
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { evidenceStatus, locate, renderRecordDiagram, renderRecordTable, renderRecordTimeline, validateRecord, type DocumentRecord, type Source } from "../core/record/src/index.ts";

export interface RecordOptions {
	source: Source;
	record: DocumentRecord;
}

const VIEWS = ["diagram", "table", "timeline"] as const;

export function documentRecord(options: RecordOptions): ExtensionFactory {
	return (pi: ExtensionAPI) => {
		pi.registerTool(
			defineTool({
				name: "render_from_record",
				label: "Render from the record",
				description:
					"Render the document as a diagram, table or timeline, drawn from the semantic record and not from the raw text. Every line names the record entry it came from. " +
					"The record is a reading of the source, not the source and not the truth.",
				parameters: Type.Object({ view: Type.String({ description: "diagram | table | timeline" }) }),
				async execute(_id, params) {
					// A record that does not trace to its source is not rendered: a view of it would look as consistent as a faithful one.
					const problems = validateRecord(options.source, options.record);
					if (problems.length > 0) {
						return { content: [{ type: "text", text: "Not rendered: the record does not trace to its source (" + problems.map((p) => p.problem + ":" + p.id).join(", ") + ")." }], details: { view: null as string | null } };
					}
					const view = VIEWS.find((v) => v === params.view);
					if (!view) return { content: [{ type: "text", text: `No such view: ${params.view}. Choose one of ${VIEWS.join(", ")}.` }], details: { view: null as string | null } };
					const text = view === "diagram" ? renderRecordDiagram(options.record) : view === "table" ? renderRecordTable(options.record) : renderRecordTimeline(options.record);
					return { content: [{ type: "text", text }], details: { view: view as string | null } };
				},
			}),
		);

		pi.registerTool(
			defineTool({
				name: "locate_in_source",
				label: "Locate in the source",
				description: "Given the id of a record entry (a claim, relation or qualifier), return the exact words of the source it came from and where they are.",
				parameters: Type.Object({ id: Type.String() }),
				async execute(_id, params) {
					const where = locate(options.record, options.source, params.id);
					if (!where) return { content: [{ type: "text", text: `No record entry ${params.id} can be traced to the source.` }], details: { found: false } };
					return { content: [{ type: "text", text: `${where.id}: characters ${where.start}-${where.end}: "${where.passage}"` }], details: { found: true } };
				},
			}),
		);

		pi.registerCommand("record", {
			description: "Summarise the semantic record. /record | /record check",
			handler: async (args, ctx) => {
				const say = (text: string) => (ctx.hasUI ? ctx.ui.notify(text, "info") : console.log(text));
				if (args.trim() === "check") {
					const problems = validateRecord(options.source, options.record);
					return say(problems.length === 0 ? "Every entry cites a passage of the source. That shows the record is traceable, not that it is right." : problems.map((p) => `${p.problem}: ${p.id}`).join("\n"));
				}
				const r = options.record;
				// Only factual assertions about the world are listed. Rules, entities and provenance statements are not claims the source owes evidence for.
				const unsupported = r.claims.filter((c) => c.kind === "fact" && evidenceStatus(r, c.id) === "none_cited").map((c) => c.label);
				say(
					[
						`Semantic record of ${options.source.id}: ${r.claims.length} claims, ${r.relations.length} relations, ${r.qualifiers.length} qualifiers, each citing the source.`,
						unsupported.length ? `The source cites no evidence for: ${unsupported.join("; ")}. (Recorded as stated; not judged.)` : "",
						"This is the system's reading of the source. It is not the source and not the truth.",
					].filter(Boolean).join("\n"),
				);
			},
		});
	};
}
