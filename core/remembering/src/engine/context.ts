import type { FrameResult } from "./frame/model.ts";
import { selectCandidates, type Budget, type SelectionCandidate, type SelectionMode } from "./selection/service.ts";
import { screenInstructions } from "./trust/standing.ts";
import { TRUST_RANK, type StandingState, type TrustLevel, type TrustPolicy } from "./trust/model.ts";
import { decideTrust } from "./trust/standing.ts";
import type { TemporalStandpoint } from "./temporal/model.ts";

export type MemoryRoute = "recall" | "influence";
export type RouteRequest = "auto" | MemoryRoute;

export type RouteBlock = {
  route: MemoryRoute;
  routeSource: "explicit" | "deterministic";
  routeReason: string;
  routeAmbiguous: boolean;
};

const INFLUENCE_CUES = /\b(should|must|do|implement|fix|change|update|deploy|run|execute|decide|choose|recommend|proceed|apply)\b/i;
const RECALL_CUES = /\b(what|why|when|where|who|history|decided|was|were|previously|before|recorded|happened)\b/i;

/** Deterministic route resolution. Auto never hides ambiguity. */
export function resolveRoute(query: string, requested: RouteRequest = "auto"): RouteBlock {
  if (requested === "recall" || requested === "influence") {
    return {
      route: requested,
      routeSource: "explicit",
      routeReason: `caller requested '${requested}'.`,
      routeAmbiguous: false,
    };
  }
  const influence = INFLUENCE_CUES.test(query);
  const recall = RECALL_CUES.test(query);
  if (influence && !recall) {
    return { route: "influence", routeSource: "deterministic", routeReason: "query carries present-action cues.", routeAmbiguous: false };
  }
  if (recall && !influence) {
    return { route: "recall", routeSource: "deterministic", routeReason: "query carries historical-recall cues.", routeAmbiguous: false };
  }
  return {
    route: "recall",
    routeSource: "deterministic",
    routeReason: influence && recall
      ? "query carries both recall and influence cues; defaulting to recall and reporting ambiguity."
      : "no decisive route cues; defaulting to recall and reporting ambiguity.",
    routeAmbiguous: true,
  };
}

export type PipelineCandidate = SelectionCandidate & {
  section: string | null;
  score: number;
  lexicalRank: number | null;
  denseRank: number | null;
};

export type PipelineOptions = {
  query: string;
  route: RouteBlock;
  standpoint: TemporalStandpoint;
  frame: FrameResult;
  trustPolicy: TrustPolicy;
  standing: StandingState;
  requiredLevel: TrustLevel;
  selectionMode: SelectionMode;
  budget: Budget;
};

/**
 * Record-ceiling evaluation for one candidate.
 *
 * The record ceiling is the per-record maximum standing assigned at write
 * time (`production_state` -> "S3", otherwise "FULL"). Trust grants and
 * standing restrictions can only lower effective standing, never raise it
 * above this ceiling. Returns the ceiling rank on the TRUST_RANK scale, or
 * -1 when the ceiling is unknown — unknown fails closed on influence.
 */
export function ceilingRank(standingCeiling: string | undefined, sourceId: string): { rank: number; label: string; applicable: boolean } {
  if (standingCeiling === undefined) {
    if (sourceId.startsWith("memory://")) {
      return { rank: -1, label: "unknown (record ceiling unavailable)", applicable: true };
    }
    return { rank: TRUST_RANK.FULL, label: "not applicable (non-memory source)", applicable: false };
  }
  const rank = (TRUST_RANK as Record<string, number>)[standingCeiling];
  if (rank === undefined) {
    return { rank: -1, label: `unknown ceiling ${JSON.stringify(standingCeiling)}`, applicable: true };
  }
  return { rank, label: standingCeiling, applicable: true };
}

/**
 * Attach record ceilings to candidates built from retrieval chunks.
 * Only `memory://` candidates have stored records; others are left alone.
 * Lookup failures leave the ceiling unset so enforcement fails closed.
 */
export async function attachRecordCeilings<C extends { sourceId: string; standingCeiling?: string }>(
  candidates: C[],
  lookup: (recordId: string) => Promise<{ standingCeiling?: unknown } | null>,
): Promise<void> {
  for (const c of candidates) {
    if (!c.sourceId.startsWith("memory://") || c.standingCeiling !== undefined) continue;
    const recordId = c.sourceId.slice("memory://".length);
    if (!recordId) continue;
    try {
      const record = await lookup(recordId);
      if (record && typeof record.standingCeiling === "string") c.standingCeiling = record.standingCeiling;
    } catch {
      // Unavailable: enforcement below fails closed on influence.
    }
  }
}

export type PipelineResult = {
  content: string;
  chars: number;
  admitted: PipelineCandidate[];
  denied: Array<{ candidateId: string; reason: string }>;
  quarantined: Array<{ candidateId: string; reason: string }>;
  trustSummary: { mode: string; level: string; admitted: number; denied: number; quarantined: number };
  selection: ReturnType<typeof selectCandidates>;
  admissionNote: string;
  stageMap: Record<string, { terminalStage: string; stages: Record<string, { admitted: boolean; reason: string }> }>;
};

/**
 * Pure pipeline core: trust -> instruction screen -> selection -> render.
 * Recall admits revoked history with annotation; influence denies it.
 */
export function runPipelineStages(candidates: PipelineCandidate[], options: PipelineOptions): PipelineResult {
  const stageMap: PipelineResult["stageMap"] = {};
  const admitted: PipelineCandidate[] = [];
  const denied: Array<{ candidateId: string; reason: string }> = [];
  const quarantined: Array<{ candidateId: string; reason: string }> = [];

  for (const c of candidates) {
    const stages: Record<string, { admitted: boolean; reason: string }> = {
      retrieved: { admitted: true, reason: "returned by hybrid retrieval." },
      temporal: { admitted: true, reason: `temporal standpoint ${options.standpoint.mode} recorded; no suppression at baseline.` },
      frame: { admitted: true, reason: options.frame.applied ? "frame applied without candidate exclusion." : "no frame applied." },
    };
    const decision = decideTrust(options.trustPolicy, options.standing, c.sourceId, options.requiredLevel);
    const screen = screenInstructions(c.text);
    if (!screen.clean && options.route.route === "influence") {
      stages["trust"] = { admitted: false, reason: `quarantined: instruction-like content (${screen.flags.join(", ")}).` };
      quarantined.push({ candidateId: c.candidateId, reason: stages["trust"].reason });
      stageMap[c.candidateId] = { terminalStage: "quarantined", stages };
      continue;
    }
    if (decision.verdict === "deny" && options.route.route === "influence") {
      stages["trust"] = { admitted: false, reason: decision.reason };
      denied.push({ candidateId: c.candidateId, reason: decision.reason });
      stageMap[c.candidateId] = { terminalStage: "denied", stages };
      continue;
    }
    // Record ceiling: effective standing can never exceed it, regardless of
    // grants or standing state. Trust denial above takes precedence; the
    // ceiling binds only when it constrains strictly below the trust level.
    const ceiling = ceilingRank(c.standingCeiling, c.sourceId);
    const decisionRank = TRUST_RANK[decision.effectiveLevel];
    const effectiveRank = Math.min(decisionRank, ceiling.rank);
    const ceilingBinds = ceiling.applicable && ceiling.rank < decisionRank;
    const ceilingSatisfied = effectiveRank >= TRUST_RANK[options.requiredLevel];
    stages["ceiling"] = {
      admitted: ceilingSatisfied,
      reason: !ceiling.applicable
        ? `record ceiling ${ceiling.label}.`
        : ceilingBinds
          ? `record ceiling ${ceiling.label} caps influence below required ${options.requiredLevel}; trust allowed ${decision.effectiveLevel}.`
          : `record ceiling ${ceiling.label} does not constrain required ${options.requiredLevel}.`,
    };
    if (!ceilingSatisfied && options.route.route === "influence") {
      denied.push({ candidateId: c.candidateId, reason: stages["ceiling"].reason });
      stageMap[c.candidateId] = { terminalStage: "denied", stages };
      continue;
    }
    stages["trust"] = {
      admitted: true,
      reason: options.route.route === "recall" && decision.verdict === "deny"
        ? `recalled despite ${decision.reason} recall preserves history.`
        : decision.reason,
    };
    if (options.route.route === "recall" && ceilingBinds && !ceilingSatisfied) {
      stages["ceiling"].reason += " recalled as history; influence remains capped.";
    }
    admitted.push(c);
    stageMap[c.candidateId] = { terminalStage: "admitted", stages };
  }

  const selection = selectCandidates(admitted, options.selectionMode, options.budget);
  const selectedIds = new Set(selection.selected.map((s) => s.candidateId));
  for (const c of admitted) {
    const entry = stageMap[c.candidateId];
    if (!entry) continue;
    if (selectedIds.has(c.candidateId)) {
      entry.stages["selected"] = { admitted: true, reason: "selected within budget." };
      entry.terminalStage = "selected";
    } else {
      const drop = selection.dropped.find((d) => d.candidateId === c.candidateId);
      entry.stages["selected"] = { admitted: false, reason: drop?.reason ?? "not selected." };
      entry.terminalStage = "dropped";
    }
  }

  const parts = selection.selected.map((s) => {
    return `[source:${s.sourceId} chunk:${s.candidateId}]\n${s.text}`;
  });
  const content = parts.join("\n\n---\n\n");
  const admissionNote = options.route.route === "recall"
    ? `recall: ${admitted.length} admitted (history preserved), ${quarantined.length} quarantined from influence only.`
    : `influence: ${selection.selected.length} selected of ${candidates.length} retrieved; ${denied.length} denied, ${quarantined.length} quarantined.`;
  return {
    content,
    chars: content.length,
    admitted,
    denied,
    quarantined,
    trustSummary: {
      mode: options.route.route,
      level: options.requiredLevel,
      admitted: admitted.length,
      denied: denied.length,
      quarantined: quarantined.length,
    },
    selection,
    admissionNote,
    stageMap,
  };
}
