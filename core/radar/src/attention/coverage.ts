// A coverage report names its boundary. It inventories what was configured and observed.
// It cannot enumerate what was never configured, retrieved or seen.
import { AttentionError, STAGES, type Stage } from "./types.ts";

export interface SearchObservation { source_id: string; query: string; at: string; ok: boolean; error?: string }
export interface Exclusion {
  candidate_id: string;
  /** Stages reached before the candidate stopped. Not one mutually exclusive reason. */
  reached_stages: Stage[];
  /** Every known applicable cause. More than one is normal. */
  causes: string[];
}
export interface CoverageInput {
  boundary: string;
  configured_sources: string[];
  searches: SearchObservation[];
  retrieved: string[];
  failures?: { source_id: string; error: string }[];
  exclusions?: Exclusion[];
  deferrals?: { candidate_id: string; until: string | null; why: string }[];
}
export interface CoverageReport extends CoverageInput {
  searched_sources: string[];
  configured_but_not_searched: string[];
  /** Fixed text. A report can state what it cannot see; it cannot be told otherwise. */
  unknown: readonly string[];
  covers: "configured and observed sources only";
}

export function coverageReport(i: CoverageInput): CoverageReport {
  if (!i.boundary.trim()) throw new AttentionError("COVERAGE_NO_BOUNDARY", "a coverage report must name its boundary");
  const configured = new Set(i.configured_sources);
  for (const s of i.searches) if (!configured.has(s.source_id)) throw new AttentionError("SEARCH_OUTSIDE_CONFIGURATION", `${s.source_id} was searched but is not a configured source`);
  for (const e of i.exclusions ?? []) {
    if (e.causes.length === 0) throw new AttentionError("EXCLUSION_NO_CAUSE", `${e.candidate_id} has no known cause; record it as unknown, not as a reason`);
    for (const st of e.reached_stages) if (!(STAGES as readonly string[]).includes(st)) throw new AttentionError("UNKNOWN_STAGE", st);
  }
  const searched = [...new Set(i.searches.filter(s => s.ok).map(s => s.source_id))].sort();
  return {
    ...i, searched_sources: searched,
    configured_but_not_searched: [...configured].filter(s => !searched.includes(s)).sort(),
    unknown: ["sources that were not configured", "items that were never retrieved", "items that were never observed", "access restrictions on source identifiers and reasons, as well as bodies"],
    covers: "configured and observed sources only",
  };
}
