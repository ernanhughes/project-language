// Pi host adapter for the preservation core: did the transformation keep what mattered?
//
// Placement in Pi:
//   - The obligations are declared by a person, before the session, and held by the host.
//     The model can see them in a result, as a specification to repair against, but it
//     has no tool that changes them. A value chosen by the party being inspected cannot
//     gate the inspection.
//   - The model's one door is `submit_transformation`. The host holds the source, observes
//     the output as evidence, evaluates each obligation, and records the profile as a
//     session entry. Failed attempts stay in the record; a repair is a new attempt.
//   - If the instrument has not been shown to notice a loss, every profile says so.
import { createHash } from "node:crypto";
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { assess, renderProfile, validateInstrument, type Declaration, type InstrumentStatus, type InstrumentValidation, type Profile } from "../core/preservation/src/index.ts";

export interface PreservationOptions {
	declaration: Declaration;
	/** What is being transformed. Held by the host, not supplied by the model. */
	source: string;
	/**
	 * A known-faithful rendering of the source. If given, the obligations are probed against it
	 * (drop a sentence, reverse a relation, turn a hedge into a certainty) before any output is
	 * accepted, and profiles carry the result.
	 */
	faithfulReference?: string;
	now?: () => string;
}

const PROFILE = "preservation-profile";

type StoredProfile = { attempt: number; output_sha256: string; profile: Profile };
type EntryLike = { type: string; customType?: string; data?: unknown };

export function preservation(options: PreservationOptions): ExtensionFactory {
	const clock = options.now ?? (() => new Date().toISOString());
	let validation: InstrumentValidation | undefined;
	let instrument: InstrumentStatus | InstrumentValidation = "not_checked";
	if (options.faithfulReference !== undefined) {
		validation = validateInstrument(options.declaration, options.source, options.faithfulReference, clock());
		instrument = validation;
	}

	return (pi: ExtensionAPI) => {
		const attempts = (ctx: { sessionManager: { getEntries(): readonly unknown[] } }) =>
			(ctx.sessionManager.getEntries() as EntryLike[]).filter((e) => e.type === "custom" && e.customType === PROFILE).map((e) => e.data as StoredProfile);

		pi.registerTool(
			defineTool({
				name: "submit_transformation",
				label: "Submit a transformation for a preservation check",
				description:
					"Submit your rewrite or summary of the source. It is checked against obligations a person declared before you began, and the profile shows which survived and which were lost, so you can repair the output and submit again. " +
					"You cannot change the obligations. A clean profile does not mean the source was right.",
				parameters: Type.Object({ output: Type.String({ description: "The full text of your rewrite or summary." }) }),
				async execute(_id, params, _signal, _onUpdate, ctx) {
					const n = attempts(ctx).length + 1;
					const profile = assess(options.declaration, { id: `attempt-${n}`, source: options.source, output: params.output, output_at: clock() }, instrument);
					const stored: StoredProfile = { attempt: n, output_sha256: createHash("sha256").update(params.output, "utf8").digest("hex"), profile };
					pi.appendEntry(PROFILE, stored);
					const lost = profile.obligations.filter((o) => o.outcome !== "SURVIVED").map((o) => o.id);
					return { content: [{ type: "text", text: renderProfile(profile) }], details: { attempt: n, lost, instrument: profile.instrument } };
				},
			}),
		);

		pi.registerCommand("preservation", {
			description: "Show the preservation record. /preservation | /preservation instrument",
			handler: async (args, ctx) => {
				const say = (text: string) => (ctx.hasUI ? ctx.ui.notify(text, "info") : console.log(text));
				if (args.trim() === "instrument") {
					if (!validation) return say("The instrument has not been checked: no faithful reference was supplied.");
					const lines = [`Instrument: ${validation.status} (faithful reference passes: ${validation.faithful_passes})`];
					for (const p of validation.probes) for (const r of p.results) lines.push(`  ${p.obligation.padEnd(12)} ${r.mutation.padEnd(40)} ${r.applied ? (r.detected ? "noticed" : "NOT NOTICED") : "not applicable"}`);
					return say(lines.join("\n"));
				}
				const all = attempts(ctx);
				if (all.length === 0) return say(`Declared ${options.declaration.declaration_id} (${options.declaration.obligations.length} obligations). Nothing has been submitted.`);
				const history = all.map((a) => `  attempt ${a.attempt}: ${a.profile.obligations.filter((o) => o.outcome === "SURVIVED").length} kept, ${a.profile.obligations.filter((o) => o.outcome === "LOST").length} lost`);
				say(`${history.join("\n")}\n\n${renderProfile(all.at(-1)!.profile)}`);
			},
		});
	};
}
