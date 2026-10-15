// Unit II-02: actual Pi event/tool flow and provider-input observation.
// The provider is scripted. It demonstrates no real-model language capability.
import { fauxAssistantMessage, fauxText, fauxToolCall } from "@earendil-works/pi-ai";
import { makeSession } from "../harness/session.ts";
import { admission, providerText } from "./admission.ts";
import { evaluateDelivery, observedPacket, planContext, readAnswer,
  type Plan, type Source, type Strategy, type Task } from "../core/admission/src/index.ts";

export async function runAdmissionCondition(task: Task, sources: Source[], strategy: Strategy,
  expected: number, options: { request?: Parameters<typeof fauxToolCall>[1] } = {}) {
  let latest: Plan | undefined;
  const requests: { messages: unknown[]; text: string }[] = [];
  const initial = planContext(task, sources, { strategy });
  // Similarity baseline keeps its top-k proposal; an explicit adversarial request
  // is a separate control rather than silently changing the comparison condition.
  const request = options.request ?? { ids: initial.retrievedIds };
  let response: ReturnType<typeof readAnswer> | undefined;
  const h = await makeSession({ tools: ["context_request"], extensions: [admission({ task, sources,
    experimentStrategy: strategy, onAssembled: plan => { latest = plan; } })] });
  try {
    h.faux.setResponses([
      ctx => {
        requests.push({ messages: structuredClone(ctx.messages), text: providerText(ctx.messages) });
        return fauxAssistantMessage([fauxToolCall("context_request", request)], { stopReason: "toolUse" });
      },
      ctx => {
        const text = providerText(ctx.messages);
        requests.push({ messages: structuredClone(ctx.messages), text });
        response = readAnswer(observedPacket(text), task);
        return fauxAssistantMessage([fauxText(JSON.stringify(response))]);
      },
    ]);
    await h.session.prompt(`Report retryLimitAttempts for ${task.service}/${task.environment} as of ${task.asOf}. Request candidate IDs, then answer or abstain.`);
    if (!latest || requests.length !== 2 || !response) throw new Error("INCOMPLETE_PI_LOOP");
    const evaluation = evaluateDelivery(latest, requests[1]!.text, expected);
    if (JSON.stringify(response) !== JSON.stringify(evaluation.answer)) throw new Error("OBSERVER_READER_DISAGREEMENT");
    const toolResults = requests[1]!.messages.filter(m => (m as { role?: string }).role === "toolResult");
    if (toolResults.length !== 1) throw new Error("TOOL_LOOP_NOT_OBSERVED");
    if ((toolResults[0] as { isError?: boolean }).isError) throw new Error("ADMISSION_TOOL_FAILED");
    return { strategy, plan: latest, request, response, evaluation, providerRequests: requests, toolResults };
  } finally { h.dispose(); }
}
