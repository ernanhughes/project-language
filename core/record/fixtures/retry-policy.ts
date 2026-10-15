// The chapter's payments retry policy, constructed for illustration.
import type { DocumentRecord } from "../src/index.ts";

export const SOURCE_ID = "payments-retry-policy";

export const SOURCE =
	"Payments retry policy (constructed for illustration). A failed payment is retried up to three times, after 1 minute, 5 minutes and 30 minutes. " +
	"If the failure is a network partition, the payment is not retried and is sent to the dead-letter queue. " +
	"A payment marked idempotent may be retried a fourth time. " +
	"The third retry is final unless the partition exception applies. " +
	"The policy follows ADR-17. " +
	"Retries cause queue backlogs during outages.";

export const RECORD: DocumentRecord = {
	source_id: SOURCE_ID,
	claims: [
		{ id: "limit", kind: "rule", label: "up to three retries", cues: ["three retries", "3 retries", "three times", "up to 3"], passage: "A failed payment is retried up to three times", standing: "stated" },
		{ id: "r1", kind: "rule", label: "retry 1 after 1 minute", cues: ["1 minute"], passage: "after 1 minute, 5 minutes and 30 minutes", standing: "stated", order: 1 },
		{ id: "r2", kind: "rule", label: "retry 2 after 5 minutes", cues: ["5 minutes"], passage: "after 1 minute, 5 minutes and 30 minutes", standing: "stated", order: 2 },
		{ id: "r3", kind: "rule", label: "retry 3 after 30 minutes", cues: ["30 minutes"], passage: "after 1 minute, 5 minutes and 30 minutes", standing: "stated", order: 3 },
		{ id: "partition", kind: "rule", label: "partition exception", cues: ["partition", "dead-letter"], passage: "If the failure is a network partition, the payment is not retried and is sent to the dead-letter queue", standing: "stated" },
		{ id: "idempotent", kind: "rule", label: "idempotent fourth retry", cues: ["idempotent", "fourth"], passage: "A payment marked idempotent may be retried a fourth time", standing: "stated" },
		{ id: "final", kind: "rule", label: "third retry is final", cues: ["final"], passage: "The third retry is final unless the partition exception applies", standing: "stated" },
		{ id: "adr", kind: "provenance", label: "follows ADR-17", cues: ["adr-17"], passage: "The policy follows ADR-17", standing: "stated" },
		{ id: "backlog", kind: "fact", label: "retries cause queue backlogs", cues: ["backlog"], passage: "Retries cause queue backlogs during outages", standing: "stated" },
	],
	relations: [
		{ id: "x1", from: "partition", to: "limit", type: "EXCEPTION_TO", passage: "If the failure is a network partition, the payment is not retried" },
		{ id: "x2", from: "idempotent", to: "limit", type: "EXCEPTION_TO", passage: "A payment marked idempotent may be retried a fourth time" },
		{ id: "x3", from: "partition", to: "final", type: "EXCEPTION_TO", passage: "unless the partition exception applies" },
	],
	qualifiers: [],
};

/**
 * Three renderings of the same passage made independently. CONSTRUCTED to show the drift the chapter
 * describes: each is plausible alone; together they describe three slightly different systems.
 * They are not output from any model.
 */
export const DIRECT = [
	{
		name: "Monday: diagram",
		text: "[payment fails] -> retry (up to three retries) -> [done]\n[payment fails: network partition] -> dead-letter queue (partition exception)\n[payment marked idempotent] -> may retry a fourth time",
	},
	{
		name: "Wednesday: timeline",
		text: "0:00 payment fails\n1 minute: retry 1\n5 minutes: retry 2\n30 minutes: retry 3 (final)\nthree retries in all",
	},
	{
		name: "Friday: table",
		text: "| attempt | wait |\n|---|---|\n| retry 1 | 1 minute |\n| retry 2 | 5 minutes |\n| retry 3 | 30 minutes |\n| idempotent: fourth retry allowed | 30 minutes |",
	},
];
