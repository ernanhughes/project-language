// The only Pi-specific admission seam. Host options are not tool arguments.
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionFactory } from "@earendil-works/pi-coding-agent";
import { planContext, type Plan, type Source, type Strategy, type Task } from "../core/admission/src/index.ts";

export const ADMISSION_MESSAGE = "language-part-two-admission";
export interface AdmissionOptions {
  task: Task;
  sources: Source[];
  /** Unsafe baselines are host-owned experiment conditions over synthetic inputs only. */
  experimentStrategy?: Strategy;
  onAssembled?: (plan: Plan) => void;
}

export function admission(options: AdmissionOptions): ExtensionFactory {
  // Prevent a caller mutating an input array during a request from changing a grant.
  const task = structuredClone(options.task); const sources = structuredClone(options.sources);
  const strategy = options.experimentStrategy ?? "constrained";
  return pi => {
    let requestedIds: string[] | undefined = undefined;
    pi.registerTool(defineTool({
      name: "context_request", label: "Request context candidates",
      description: "Propose source IDs for the host to consider. Permission, currentness, scope and budget are held by the host. Rejected source bodies are never returned by this tool.",
      parameters: Type.Object({ ids: Type.Array(Type.String(), { maxItems: 32 }) }),
      async execute(_id, params) {
        try {
          const plan = planContext(task, sources, { strategy, requestedIds: params.ids });
          requestedIds = [...params.ids];
          return { content: [{ type: "text", text: JSON.stringify({ selected: plan.selectedIds, failure: plan.failure,
            rejected: plan.decisions.filter(d => params.ids.includes(d.id) && !d.eligible).map(d => ({ id: d.id, reasons: d.reasons })) }) }], details: { selected: plan.selectedIds } };
        } catch {
          // No rejected body, source text or model-supplied forged metadata in feedback.
          return { content: [{ type: "text", text: "Request refused: invalid source IDs or host inputs." }], details: { selected: [] as string[] } };
        }
      },
    }));
    pi.on("context", event => {
      const plan = planContext(task, sources, { strategy, ...(requestedIds ? { requestedIds } : {}) });
      options.onAssembled?.(structuredClone(plan));
      const messages = event.messages.filter(m => !(m.role === "custom" && m.customType === ADMISSION_MESSAGE));
      if (plan.packet) messages.push({ role: "custom", customType: ADMISSION_MESSAGE,
        content: plan.packet, display: false, timestamp: Date.parse(task.asOf) });
      return { messages };
    });
  };
}

/** Provider input observation, not session storage or an assumed hook outcome. */
export function providerText(messages: readonly unknown[]): string {
  return messages.map(m => {
    const content = (m as { content?: unknown }).content;
    if (typeof content === "string") return content;
    return Array.isArray(content) ? content.map(c => typeof c === "object" && c !== null && "text" in c ? String(c.text) : "").join("\n") : "";
  }).join("\n");
}
