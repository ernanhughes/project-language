// Pi host adapter for the language core: SOURCE → SEMANTIC RECORD → RENDERING.
//
// The core (core/language) keeps a semantic record of a conversation: items
// (decisions, constraints, definitions, ambiguities) each with an actor, a
// standing and source references, in a Git-backed store with a verified chain.
// It knows nothing about Pi. This file does one job: render the verified record
// as a projection block and hand it to the model, once per turn, read-only.
//
// Seam: `before_agent_start`, which may replace the system prompt for the turn.
// The adapter never writes the record, never calls a model, and never injects
// state it could not verify. A projection is a rendering of the record; it is
// not the record and not the source conversation.
import type { ExtensionAPI, ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import {
	LanguageError,
	RENDER_MARK_START,
	parseState,
	renderProjection,
	resolveStorePaths,
	serializeState,
	sha256Of,
	stateSha256,
	verifyThread,
} from "../core/language/src/index.ts";

export interface LanguageProjectionOptions {
	storeRoot: string;
	projectPath: string;
	threadId: string;
	/** Called with every outcome, including refusals. */
	onOutcome?: (outcome: ProjectionOutcome) => void;
}

export type ProjectionFailure =
	| "LANG_STATE_MISSING" // no such thread
	| "LANG_STATE_INVALID" // torn or corrupt; not verifiable
	| "LANG_HUMAN_EDIT_PENDING" // an unaccepted human edit is waiting
	| "LANG_RENDER_REFUSED"; // the record contains reserved renderer delimiters

export type Projection =
	| { ok: true; block: string; revision: string; project_id: string; state_sha256: string; block_sha256: string }
	| { ok: false; code: ProjectionFailure; detail: string };

/**
 * Verify the thread and render it. No host involved: this is the whole
 * "record → rendering" step, and it is what the chapter example calls directly.
 * It never returns a block for state that did not verify.
 */
export async function loadProjection(storeRoot: string, projectPath: string, threadId: string): Promise<Projection> {
	let verification: Awaited<ReturnType<typeof verifyThread>>;
	try {
		verification = await verifyThread(storeRoot, projectPath, threadId);
	} catch (error) {
		if (error instanceof LanguageError && error.code === "THREAD_NOT_FOUND") {
			return { ok: false, code: "LANG_STATE_MISSING", detail: `no such thread: ${threadId}` };
		}
		if (error instanceof LanguageError && (error.code === "TORN_STATE" || error.code === "CORRUPT_HISTORY")) {
			return { ok: false, code: "LANG_STATE_INVALID", detail: error.code };
		}
		throw error;
	}
	if (verification.status === "human-edit-pending") {
		return { ok: false, code: "LANG_HUMAN_EDIT_PENDING", detail: "an unaccepted human edit is pending" };
	}
	if (verification.status !== "ok" || verification.revision === undefined) {
		return { ok: false, code: "LANG_STATE_INVALID", detail: `status=${verification.status}` };
	}
	const paths = resolveStorePaths(storeRoot, projectPath, threadId);
	const canonical = serializeState(parseState(readFileSync(paths.state_path, "utf8")));
	const state_sha256 = stateSha256(canonical);
	let block: string;
	try {
		block = renderProjection({
			projectId: verification.project_id,
			threadId,
			revision: verification.revision,
			stateSha256: state_sha256,
			stateText: canonical,
		});
	} catch (error) {
		if (error instanceof LanguageError) return { ok: false, code: "LANG_RENDER_REFUSED", detail: error.message };
		throw error;
	}
	return { ok: true, block, revision: verification.revision, project_id: verification.project_id, state_sha256, block_sha256: sha256Of(block) };
}

export type ProjectionOutcome =
	| { outcome: "INJECTED"; revision: string; block_sha256: string; state_sha256: string }
	| { outcome: "ALREADY_PRESENT"; revision: string; block_sha256: string; state_sha256: string }
	| { outcome: "NOT_INJECTED"; code: ProjectionFailure | "LANG_CONFLICTING_PROJECTION"; detail: string };

/**
 * Add the block to a system prompt, or say why not. A prompt that already holds
 * a different owned block is a conflict and is left untouched: replacing text we
 * cannot isolate risks deleting the rest of the prompt.
 */
export function injectIntoSystemPrompt(systemPrompt: string, projection: Extract<Projection, { ok: true }>): { systemPrompt: string; outcome: ProjectionOutcome } {
	const { block, revision, block_sha256, state_sha256 } = projection;
	const markers = systemPrompt.split(RENDER_MARK_START).length - 1;
	if (markers === 0) {
		const joined = systemPrompt.length === 0 ? block : `${systemPrompt}\n\n${block}`;
		return { systemPrompt: joined, outcome: { outcome: "INJECTED", revision, block_sha256, state_sha256 } };
	}
	if (markers === 1 && systemPrompt.includes(block)) {
		return { systemPrompt, outcome: { outcome: "ALREADY_PRESENT", revision, block_sha256, state_sha256 } };
	}
	return {
		systemPrompt,
		outcome: { outcome: "NOT_INJECTED", code: "LANG_CONFLICTING_PROJECTION", detail: `system prompt already holds ${markers} owned block(s) that differ from this revision` },
	};
}

export function languageProjection(options: LanguageProjectionOptions): ExtensionFactory {
	return (pi: ExtensionAPI) => {
		pi.on("before_agent_start", async (event) => {
			const projection = await loadProjection(options.storeRoot, options.projectPath, options.threadId);
			let outcome: ProjectionOutcome;
			let systemPrompt: string | undefined;
			if (!projection.ok) {
				outcome = { outcome: "NOT_INJECTED", code: projection.code, detail: projection.detail };
			} else {
				const injected = injectIntoSystemPrompt(event.systemPrompt, projection);
				outcome = injected.outcome;
				if (outcome.outcome === "INJECTED") systemPrompt = injected.systemPrompt;
			}
			options.onOutcome?.(outcome);
			// The durable entry records what was done and, for an injection, the hash of
			// the exact bytes handed to the model. It does not copy the block.
			pi.appendEntry("language-projection", outcome);
			return systemPrompt === undefined ? undefined : { systemPrompt };
		});
	};
}
