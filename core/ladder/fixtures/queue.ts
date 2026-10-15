// The chapter's job queue: "a job must never be executed twice" and "a job that fails for a
// transient reason should be retried up to three times". The word that carries the
// weight is "executed".
import { decision, type Decision, type Requirement } from "../src/index.ts";

export interface QueueEvent {
	job: string;
	attempt: number;
	status: "failed_transient" | "completed";
	/** The attempt had an effect outside the queue: an email sent, a card charged. */
	external_effect: boolean;
}
export type QueueTrace = readonly QueueEvent[];

export const REQUEST = "A job must never be executed twice, but a job that fails for a transient reason should be retried up to three times.";

export const EXECUTED: Decision = decision({
	id: "executed",
	term: "executed",
	passage: REQUEST,
	options: [
		{ id: "attempt", label: "attempt", definition: "any time the code runs for the job" },
		{ id: "completed", label: "completed job", definition: "a run that finished and counted" },
		{ id: "effect", label: "external effect", definition: "a committed effect outside the queue, such as a charge or an email" },
	],
});

function executions(trace: QueueTrace, job: string, reading: string): number {
	const mine = trace.filter((e) => e.job === job);
	if (reading === "attempt") return mine.length;
	if (reading === "completed") return mine.filter((e) => e.status === "completed").length;
	return mine.filter((e) => e.external_effect).length;
}

/** R1: each job is executed at most once. Its meaning depends on the reading of "executed". */
export const AT_MOST_ONCE: Requirement<QueueTrace> = {
	id: "R1",
	text: "each job is executed at most once",
	depends_on: ["executed"],
	holds: (trace, chosen) => {
		const reading = chosen["executed"]!;
		const offenders = [...new Set(trace.map((e) => e.job))].filter((j) => executions(trace, j, reading) > 1);
		return offenders.length === 0
			? { ok: true, detail: `every job executed at most once, reading "executed" as ${reading}` }
			: { ok: false, detail: `executed more than once, reading "executed" as ${reading}: ${offenders.map((j) => `${j} (${executions(trace, j, reading)})`).join(", ")}` };
	},
};

/**
 * R2: no job is retried after a transient failure more than three times. Needs no decision.
 * A retry is an attempt after the first, so a job may have up to four attempts. Attempts must be numbered 1..n in order;
 * a trace that is not is refused as malformed, not counted.
 */
export const RETRY_LIMIT: Requirement<QueueTrace> = {
	id: "R2",
	text: "a job that fails for a transient reason is retried at most 3 times",
	depends_on: [],
	holds: (trace) => {
		const jobs = [...new Set(trace.map((e) => e.job))];
		const malformed = jobs.filter((j) => !trace.filter((e) => e.job === j).every((e, i) => e.attempt === i + 1));
		if (malformed.length > 0) return { ok: false, detail: "attempts are not numbered 1..n in order for: " + malformed.join(", ") };
		const offenders = jobs.filter((j) => trace.filter((e) => e.job === j).length - 1 > 3);
		return offenders.length === 0 ? { ok: true, detail: "no job was retried more than 3 times" } : { ok: false, detail: "retried too often: " + offenders.join(", ") };
	},
};

/** J1 retried after a failed attempt that had already charged the card. */
export const TRACE: QueueTrace = [
	{ job: "J1", attempt: 1, status: "failed_transient", external_effect: true },
	{ job: "J1", attempt: 2, status: "completed", external_effect: true },
	{ job: "J2", attempt: 1, status: "completed", external_effect: true },
	{ job: "J3", attempt: 1, status: "failed_transient", external_effect: false },
	{ job: "J3", attempt: 2, status: "completed", external_effect: true },
];
