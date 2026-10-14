// Pi host adapter for the authority core.
//
// The core (core/authority) answers "may this operation proceed for this
// purpose?" and knows nothing about Pi. This file is the only place that
// translates a Pi `tool_call` into an AuthorityProposal and a verdict back into
// Pi's `{ block, reason }`. Swapping the host means rewriting this file.
//
// Seam: `tool_call` is the one point that can refuse before the effect. A
// handler that throws also blocks (fail-safe), but we return an explicit reason
// so the model can act on it. Capability is not authority: a tool being
// registered says nothing about whether this policy permits it.
import type { ExtensionAPI, ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { evaluate } from "../core/authority/src/engine/index.ts";
import { AuthorityError, type AuthorityPolicy, type AuthorityProposal, type AuthorityReceipt } from "../core/authority/src/engine/types.ts";

export interface AuthorityGateOptions {
	policy: AuthorityPolicy;
	/** The stated purpose of this session. Grants are purpose-bound. */
	purpose: string;
	/** Override the clock (tests). */
	now?: () => string;
	/** Called with every receipt, including denials. */
	onReceipt?: (receipt: AuthorityReceipt, toolName: string) => void;
}

/** Action scope for a Pi tool: `tool:<name>`. Policies grant `tool:read`, `tool:*`, and so on. */
export function toolAction(toolName: string): string {
	return `tool:${toolName}`;
}

function targetOf(input: unknown): string | undefined {
	if (input === null || typeof input !== "object") return undefined;
	const record = input as Record<string, unknown>;
	for (const key of ["path", "file_path", "command"]) {
		if (typeof record[key] === "string") return record[key] as string;
	}
	return undefined;
}

export function proposalForToolCall(purpose: string, toolName: string, toolCallId: string, input: unknown): AuthorityProposal {
	const target = targetOf(input);
	return {
		proposal_id: `pi:${toolCallId}`,
		purpose,
		external_operation: { kind: "ACT", action: toolAction(toolName), ...(target ? { target } : {}) },
		data_uses: [],
	};
}

export function authorityGate(options: AuthorityGateOptions): ExtensionFactory {
	return (pi: ExtensionAPI) => {
		pi.on("tool_call", async (event, ctx) => {
			let receipt: AuthorityReceipt;
			try {
				const proposal = proposalForToolCall(options.purpose, event.toolName, event.toolCallId, event.input);
				receipt = evaluate(proposal, options.policy, options.now ? { now: options.now() } : {});
			} catch (error) {
				// Fail closed: an engine or policy fault is never a grant.
				const code = error instanceof AuthorityError ? error.code : "ENGINE_FAULT";
				return { block: true, reason: `Authority fail-closed: ${code}` };
			}

			options.onReceipt?.(receipt, event.toolName);
			pi.appendEntry("authority-receipt", { tool: event.toolName, receipt });

			switch (receipt.verdict) {
				case "ALLOW":
					return;
				case "REQUIRE_APPROVAL": {
					if (!ctx.hasUI) {
						return { block: true, reason: `Authority: approval required for ${event.toolName}, and there is no way to ask` };
					}
					const ok = await ctx.ui.confirm("Authority: approval required", `${event.toolName} ${targetOf(event.input) ?? ""}`.trim());
					return ok ? undefined : { block: true, reason: "Authority: approval declined" };
				}
				case "REFORMULATE":
					return { block: true, reason: `Authority: ${receipt.reformulation ?? "reformulate the request"}` };
				case "DENY":
					return { block: true, reason: `Authority: denied (${receipt.action_result?.code ?? "no grant"}) for ${event.toolName}` };
			}
		});
	};
}
