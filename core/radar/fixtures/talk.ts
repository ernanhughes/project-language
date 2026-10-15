// An invented conference talk, in the format the youtube-transcript skill prints, and the three readers of
// Chapters 14 to 16. Every line, unit and judgement here is made up for this repository. The expected results are in
// the tests, not here.
import { parseTranscript, type Proposer, type UnitProposal } from "../src/attention/transcript.ts";
import type { Judgement } from "../src/attention/relevance.ts";
import type { ConceptUse, KnowledgeState } from "../src/attention/knowledge.ts";
import type { Purpose } from "../src/attention/types.ts";

export const TRANSCRIPT = `[0:00] Welcome, everyone, and thanks for coming to the consensus track.
[0:21] Today I will describe a protocol that commits a decision in two round trips.
[1:10] First, some background on why agreement between machines is hard.
[2:30] I will skip the history of the older protocols, you have all seen it.
[3:15] A word on the name: it came out of an argument in a hallway, and it stuck.
[4:02] For the purposes of this talk, a fault means a crash and nothing worse.
[4:30] I use partial synchrony in a narrower sense than you may be used to: the delay bound is known to the protocol.
[5:10] A quorum is a majority of the nodes.
[6:00] Each round has a leader, who proposes a value, and a quorum that acknowledges it.
[12:40] Here is the proof outline for safety, and I will go through the lemmas quickly.
[41:50] Now the demonstration. Nodes crash around the protocol while it runs.
[42:10] And it commits in two round trips, even with three of five nodes crashing in turn.
[47:30] In production my team kept the clocks on all machines synchronised.
[52:10] That is all I have, thank you. Questions?
[53:05] Audience member: what happens with clock drift?
[53:20] Good question. This result assumes bounded delays between machines. The title does not say that.
[54:30] Thank you again.
`;

export const parsed = parseTranscript(TRANSCRIPT, "talk-consensus-2026");

/** What a model proposer would suggest, scripted. Structure only: which lines, what role, what depends on what. */
export const scriptedProposals: UnitProposal[] = [
  { id: "u-intro", role: "other", lines: [1, 2], dependsOn: [] },
  { id: "u-history", role: "other", lines: [5], dependsOn: [] },
  // minute 4 and minute 53: one unit, two spans, forty-nine minutes apart
  { id: "u-scope", role: "claim", lines: [6, 16], dependsOn: [] },
  { id: "u-sync-sense", role: "qualifier", lines: [7], dependsOn: [] },
  { id: "u-quorum", role: "other", lines: [8], dependsOn: [] },
  { id: "u-round", role: "other", lines: [9], dependsOn: ["u-quorum"] },
  { id: "u-proof", role: "evidence", lines: [10], dependsOn: [] },
  { id: "u-benchmark", role: "claim", lines: [11, 12], dependsOn: ["u-scope"] },
  { id: "u-clock-sync", role: "evidence", lines: [13], dependsOn: ["u-scope"] },
];
export const scriptedProposer: Proposer = () => scriptedProposals;

const person = (id: string, text: string, need: Purpose["need"]): Purpose => ({ id, declared_by: "person", text, need });
export const iris = person("iris-safety-unbounded", "Determine whether this protocol remains safe when network delays become unbounded.", "safety_claim");
export const tom = person("tom-history", "Write the history of consensus protocols for a literature review, starting with how fast this one is.", "triage");
export const mina = person("mina-reproduce", "Reproduce the demonstration.", "implement");

const j = (purpose: Purpose, unit_id: string, verdict: Judgement["verdict"], reason: string, extra: string[] = []): Judgement =>
  ({ unit_id, purpose_id: purpose.id, verdict, reason, cites: [unit_id, ...extra], by: "person" });

export const judgements: Record<string, Judgement[]> = {
  [iris.id]: [
    j(iris, "u-scope", "decisive", "states the condition the safety result depends on, and unbounded delay violates it"),
    j(iris, "u-sync-sense", "relevant", "the sense of partial synchrony the result is stated in"),
    j(iris, "u-proof", "relevant", "the safety argument itself"),
    j(iris, "u-clock-sync", "relevant", "explains why the assumption held in practice, and so what would change if it did not"),
    j(iris, "u-quorum", "low", "a definition the safety argument uses"),
    j(iris, "u-benchmark", "low", "the headline, but it concerns speed, not safety under unbounded delay"),
    j(iris, "u-round", "not_relevant", "mechanism detail, not part of the safety argument as she is reading it"),
    j(iris, "u-history", "not_relevant", "an anecdote about the name"),
    j(iris, "u-intro", "not_relevant", "introduction"),
  ],
  [tom.id]: [
    j(tom, "u-benchmark", "relevant", "the speed claim, which is what he is writing about"),
    j(tom, "u-history", "relevant", "where the protocol's name came from belongs in a history"),
    j(tom, "u-scope", "not_relevant", "a limit on what the result covers, not on how fast it is"),
    j(tom, "u-sync-sense", "not_relevant", "bears on safety, not on speed"),
    j(tom, "u-proof", "not_relevant", "bears on safety, not on speed"),
    j(tom, "u-round", "not_relevant", "mechanism detail"),
    j(tom, "u-quorum", "not_relevant", "mechanism detail"),
    j(tom, "u-clock-sync", "not_relevant", "deployment detail"),
    j(tom, "u-intro", "not_relevant", "introduction"),
  ],
  [mina.id]: [
    j(mina, "u-benchmark", "decisive", "the demonstration she wants to reproduce"),
    j(mina, "u-clock-sync", "relevant", "the clocks were synchronised in the setup she has to match"),
    j(mina, "u-round", "relevant", "how a round works, needed to run it"),
    j(mina, "u-quorum", "relevant", "the definition the round uses"),
    j(mina, "u-scope", "not_relevant", "a limit on what is claimed, not on how to run it"),
    j(mina, "u-sync-sense", "not_relevant", "bears on the proof, not the demonstration"),
    j(mina, "u-proof", "not_relevant", "bears on the proof, not the demonstration"),
    j(mina, "u-history", "not_relevant", "an anecdote about the name"),
    j(mina, "u-intro", "not_relevant", "introduction"),
  ],
};

/** The meaning each unit gives a concept. Supplied; nothing here extracts it. */
export const conceptUses: ConceptUse[] = [
  { unit_id: "u-sync-sense", concept: "partial synchrony", sense: "the delay bound is known to the protocol" },
  { unit_id: "u-quorum", concept: "quorum", sense: "a majority of the nodes" },
];

/** What the system has evidence for, as of the talk. Iris has worked on consensus for two years; Mina is new to it. */
export const NOW = "2026-10-15T09:00:00.000Z";
export const irisKnows: KnowledgeState = [
  { concept: "partial synchrony", sense: "the delay bound exists but is unknown", evidence: [{ kind: "used_correctly", at: "2025-05-02T10:00:00.000Z", ref: "her design doc" }] },
  { concept: "quorum", sense: "a majority of the nodes", evidence: [{ kind: "stated", at: "2024-11-20T10:00:00.000Z", ref: "she said so" }] },
];
export const minaKnows: KnowledgeState = [
  { concept: "quorum", sense: "a majority of the nodes", evidence: [{ kind: "exposed", at: "2026-09-01T10:00:00.000Z", ref: "opened a page that mentions it" }] },
];

export const IRIS_TERMS = ["unbounded", "delay", "delays", "bounded", "safe", "safety"];
