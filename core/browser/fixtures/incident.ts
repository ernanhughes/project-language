// A constructed incident report, standing in for the chapter's twenty-page document.
// Every name, number and service here is invented for illustration.
import type { DocumentRecord } from "../src/index.ts";

export const SOURCE_ID = "incident-2026-03-17";

export const SOURCE = [
	"INCIDENT REPORT 2026-03-17: primary database outage (constructed for illustration)",
	"Timeline. 09:02 the primary database stopped accepting writes. 09:07 failover to replica B began. 09:19 failover completed. The services checkout-api and ledger were degraded throughout.",
	"Candidate causes. H1 disk full on the primary: the volume was at 98 percent at 08:50. H2 runaway migration: a schema migration started at 08:58 and held locks. H3 stale replica promoted: the failover promoted a replica that was behind. H4 network partition between zones: packet loss was reported between 09:00 and 09:04. H5 operator error during maintenance: a maintenance command was run at 08:55.",
	"Evidence. The migration lock logs support H2. The volume graph supports H1. The partition report contradicts H4 because loss ended before writes stopped. H3 is ruled out only if replication lag was under one second, and the lag data has a gap from 09:00 to 09:06.",
	"Conclusion. Ana holds that H2 is the root cause. Ben holds that H1 is the root cause. The conclusion is disputed.",
	"Remediation. To recover, run the failover script. Then confirm the writer is healthy. Then re-enable the nightly job, unless the migration is still running, in which case wait for it to finish.",
	"Proposed fix. Ben proposes adding a disk alert at 85 percent, because the volume reached 98 percent before any migration lock was taken.",
].join("\n");

export const COMPONENTS = ["checkout-api", "ledger"];

export const RECORD: DocumentRecord = {
	source_id: SOURCE_ID,
	claims: [
		{ id: "fail", kind: "fact", label: "primary stopped accepting writes at 09:02", passage: "09:02 the primary database stopped accepting writes", standing: "stated" },
		{ id: "H1", kind: "hypothesis", label: "H1 disk full", passage: "H1 disk full on the primary: the volume was at 98 percent at 08:50", standing: "disputed" },
		{ id: "H2", kind: "hypothesis", label: "H2 runaway migration", passage: "H2 runaway migration: a schema migration started at 08:58 and held locks", standing: "disputed" },
		{ id: "H3", kind: "hypothesis", label: "H3 stale replica promoted", passage: "H3 stale replica promoted: the failover promoted a replica that was behind", standing: "uncertain" },
		{ id: "H4", kind: "hypothesis", label: "H4 network partition", passage: "H4 network partition between zones: packet loss was reported between 09:00 and 09:04", standing: "stated" },
		{ id: "H5", kind: "hypothesis", label: "H5 operator error", passage: "H5 operator error during maintenance: a maintenance command was run at 08:55", standing: "stated" },
		{ id: "e-lock", kind: "evidence", label: "migration lock logs", passage: "The migration lock logs support H2", standing: "stated" },
		{ id: "e-volume", kind: "evidence", label: "volume graph", passage: "The volume graph supports H1", standing: "stated" },
		{ id: "e-partition", kind: "evidence", label: "partition report", passage: "The partition report contradicts H4 because loss ended before writes stopped", standing: "stated" },
		{ id: "ana", kind: "conclusion", label: "H2 is the root cause", passage: "Ana holds that H2 is the root cause", standing: "disputed", holder: "Ana" },
		{ id: "ben", kind: "conclusion", label: "H1 is the root cause", passage: "Ben holds that H1 is the root cause", standing: "disputed", holder: "Ben" },
		{ id: "fix", kind: "proposal", label: "add a disk alert at 85 percent", passage: "Ben proposes adding a disk alert at 85 percent, because the volume reached 98 percent before any migration lock was taken", standing: "stated", holder: "Ben" },
	],
	relations: [
		{ id: "r1", from: "e-lock", to: "H2", type: "SUPPORTS", passage: "The migration lock logs support H2" },
		{ id: "r2", from: "e-volume", to: "H1", type: "SUPPORTS", passage: "The volume graph supports H1" },
		{ id: "r3", from: "e-partition", to: "H4", type: "CONTRADICTS", passage: "The partition report contradicts H4 because loss ended before writes stopped" },
	],
	qualifiers: [
		{
			id: "q1",
			applies_to: "H3",
			condition: "replication lag was under one second",
			effect: "H3 is ruled out only if this holds",
			status: "unknown",
			gap: "the lag data has a gap from 09:00 to 09:06",
			passage: "H3 is ruled out only if replication lag was under one second, and the lag data has a gap from 09:00 to 09:06",
		},
	],
};

/** Another document the system can retrieve from: a different incident, on a different system. */
export const EARLIER = {
	id: "postmortem-2023-08",
	scope: "the 2023 incident on the MySQL 5.7 cluster",
	content:
		"The runaway migration did not cause the 2023 outage. The migration locks were released within seconds. The cause was an expired certificate on the load balancer.",
};
export const EARLIER_EXCERPT = "The runaway migration did not cause the 2023 outage.";
export const THIS_SCOPE = "the 2026 incident on the Postgres 15 cluster";
