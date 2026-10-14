// Pi host adapter for the sidecar core: material beside a source, never inside it.
//
// Placement in Pi:
//   - Items are durable session entries (`sidecar-item`, `sidecar-event`), so they
//     follow the session and its branches. Nothing is held in closure state.
//   - The reader pulls the view with /sidecar. Nothing here calls notify, injects
//     into the model's context, or otherwise interrupts: available, not intrusive.
//   - The layer of an item is decided by which door it came through, never by the
//     producer. The model can only reach `sidecar_propose`, which always yields a
//     MODEL_GENERATION candidate. Retrieval and derivation run in the host.
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionCommandContext, type ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { render as lensRender, splitSentences } from "../core/lens/src/engine/index.ts";
import {
	SidecarError,
	derivedItem,
	generatedItem,
	ledgerColumns,
	renderSidecar,
	retrievedItem,
	validateItem,
	type SidecarEvent,
	type SidecarItem,
	type TextDoc,
} from "../core/sidecar/src/index.ts";

export interface SidecarOptions {
	/** The source the reader is looking at. Derived items are anchored to it. */
	source: TextDoc;
	/** Other material the host may retrieve from. */
	corpus?: TextDoc[];
}

const ITEM = "sidecar-item";
const EVENT = "sidecar-event";

type EntryLike = { type: string; customType?: string; data?: unknown };

function load(entries: readonly EntryLike[], options: SidecarOptions) {
	const sources = new Map<string, TextDoc>([[options.source.id, options.source]]);
	const items: SidecarItem[] = [];
	const events: SidecarEvent[] = [];
	const rejected: { id: string; problems: string[] }[] = [];
	for (const e of entries) {
		if (e.type !== "custom") continue;
		if (e.customType === ITEM) {
			const item = e.data as SidecarItem;
			const problems = validateItem(item, sources);
			if (problems.length === 0) items.push(item);
			else rejected.push({ id: item?.id ?? "(no id)", problems });
		} else if (e.customType === EVENT) events.push(e.data as SidecarEvent);
	}
	const dismissed = new Set(events.filter((x) => x.event === "dismissed").map((x) => x.item_id));
	return { items, events, rejected, visible: items.filter((i) => !dismissed.has(i.id)) };
}

const terms = (query: string) => query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);

export function sidecar(options: SidecarOptions): ExtensionFactory {
	return (pi: ExtensionAPI) => {
		const current = (ctx: { sessionManager: { getEntries(): readonly unknown[] } }) => load(ctx.sessionManager.getEntries() as EntryLike[], options);
		const addItem = (item: SidecarItem) => {
			pi.appendEntry(ITEM, item);
		};
		const addEvent = (event: SidecarEvent) => {
			pi.appendEntry(EVENT, event);
		};

		// The model's door. It supplies content and limits; the layer is not a parameter.
		pi.registerTool(
			defineTool({
				name: "sidecar_propose",
				label: "Sidecar: propose",
				description:
					"Place a candidate beside the source for the reader to inspect later. It is shown as a model answer, labelled as unverified, and is not added to the source. " +
					"State plainly what it cannot be trusted for. Use only when it would help; saying nothing is fine.",
				parameters: Type.Object({
					content: Type.String({ description: "What you want to put beside the source." }),
					limits: Type.String({ description: "What this cannot be trusted for." }),
					drew_on: Type.Optional(Type.Array(Type.String(), { description: "Ids of sidecar items or documents this drew on." })),
				}),
				async execute(_id, params, _signal, _onUpdate, ctx) {
					try {
						const item = generatedItem({
							content: params.content,
							limits: params.limits,
							...(params.drew_on ? { drew_on: params.drew_on } : {}),
							producer: ctx.model?.id ?? "model",
						});
						addItem(item);
						return { content: [{ type: "text", text: `Placed beside the source as a ${item.layer} candidate: ${item.id}` }], details: { id: item.id, layer: item.layer } };
					} catch (error) {
						if (error instanceof SidecarError) {
							return { content: [{ type: "text", text: `Not placed: ${error.problems.join(", ")}` }], details: { problems: error.problems } };
						}
						throw error;
					}
				},
			}),
		);

		// Retrieval runs in the host, over a corpus the host holds. The model asks; the host decides the layer.
		pi.registerTool(
			defineTool({
				name: "sidecar_search",
				label: "Sidecar: search",
				description: "Look for passages in the available reference material that match a query, and place any matches beside the source as unverified candidates. Returns nothing if nothing matches.",
				parameters: Type.Object({ query: Type.String() }),
				async execute(_id, params) {
					const wanted = terms(params.query);
					const placed: SidecarItem[] = [];
					for (const doc of options.corpus ?? []) {
						const hit = splitSentences(doc.content).find((s) => wanted.some((t) => s.toLowerCase().includes(t)));
						if (!hit) continue;
						try {
							const item = retrievedItem(doc, hit);
							addItem(item);
							placed.push(item);
						} catch (error) {
							if (!(error instanceof SidecarError)) throw error;
						}
					}
					const text = placed.length === 0 ? "Nothing matched. Nothing was placed." : `Placed ${placed.length} candidate(s) from elsewhere: ${placed.map((p) => p.id).join(", ")}`;
					return { content: [{ type: "text", text }], details: { placed: placed.map((p) => p.id) } };
				},
			}),
		);

		const say = (ctx: ExtensionCommandContext, text: string) => (ctx.hasUI ? ctx.ui.notify(text, "info") : console.log(text));

		// The reader's door. Pull-based: nothing appears unless this is invoked.
		pi.registerCommand("sidecar", {
			description: "Show what is beside the source. Subcommands: derive, dismiss <id>, used <id>, ledger",
			handler: async (args, ctx) => {
				const [sub, id] = args.trim().split(/\s+/);
				if (sub === "derive") {
					// Derived items are re-presentations of the source, produced here, anchored by quotation.
					const brief = lensRender({ ...options.source, kind: "text" }, "reading", "BRIEF");
					const have = new Set(current(ctx).items.filter((i) => i.anchor).map((i) => i.anchor!.quote));
					let n = 0;
					for (const sentence of splitSentences(brief.representation)) {
						if (have.has(sentence) || !options.source.content.includes(sentence)) continue;
						addItem(derivedItem(options.source, sentence, sentence, `lens@${brief.producer.version}`));
						n += 1;
					}
					return say(ctx, n === 0 ? "Nothing new to derive." : `Derived ${n} passage(s) from the source.`);
				}
				if (sub === "dismiss" || sub === "used") {
					if (!id) return say(ctx, `usage: /sidecar ${sub} <id>`);
					if (!current(ctx).items.some((i) => i.id === id)) return say(ctx, `No such item: ${id}`);
					addEvent({ item_id: id, event: sub === "dismiss" ? "dismissed" : "used" });
					return say(ctx, sub === "dismiss" ? `Dismissed ${id}. It stays in the record and out of the view.` : `Marked ${id} as used.`);
				}
				if (sub === "ledger") {
					return say(ctx, JSON.stringify(ledgerColumns(current(ctx).events), null, 2));
				}
				const { visible, rejected } = current(ctx);
				for (const item of visible) addEvent({ item_id: item.id, event: "shown" });
				const hidden = rejected.length ? `\n\n(${rejected.length} item(s) failed validation and are hidden: ${rejected.map((r) => `${r.id} ${r.problems.join("/")}`).join("; ")})` : "";
				say(ctx, renderSidecar(visible) + hidden);
			},
		});
	};
}
