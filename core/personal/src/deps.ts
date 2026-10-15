// Dependency and invalidation (Chapters 24 and 27).
//
// Ending an overlay, or correcting a belief, must reach what depended on it, directly and through other dependents.
// A small graph is derived from two things already in state: a record's `depends_on` and a cached artifact's `depends_on`.
// This is the narrow port core/vfs does not supply: vfs records provenance and causal edges, but has no notion of
// "invalidated for current use" or of traversing dependents to recompute them. A ProvenanceSink lets a host record the
// same edges in vfs without core importing a host.
import type { PersonalState } from "./state.ts";
import type { PersonalEvent } from "./types.ts";

export interface ProvenanceSink { edge(from: string, to: string, relation: "depends_on" | "invalidated_by", at: string): void }

/** Who depends on `id`, directly and transitively. Records and cached artifacts both count. */
export function dependents(state: PersonalState, id: string): { direct: string[]; transitive: string[] } {
  const reverse = new Map<string, string[]>();
  const add = (dependent: string, on: string[]) => { for (const d of on) reverse.set(d, [...(reverse.get(d) ?? []), dependent]); };
  for (const [rid, e] of state.entries) add(rid, e.record.depends_on ?? []);
  for (const [aid, a] of state.artifacts) add(aid, a.depends_on);
  const direct = [...new Set(reverse.get(id) ?? [])].sort();
  const seen = new Set<string>([id, ...direct]); const transitive: string[] = [];
  let frontier = direct;
  while (frontier.length) {
    const next: string[] = [];
    for (const f of frontier) for (const d of reverse.get(f) ?? []) if (!seen.has(d)) { seen.add(d); transitive.push(d); next.push(d); }
    frontier = next;
  }
  return { direct, transitive: transitive.sort() };
}

export interface Invalidation { events: PersonalEvent[]; direct: string[]; transitive: string[] }

/** Events that invalidate everything depending on `id`, each saying why. Already-invalid dependents are not repeated. */
export function invalidateDependents(state: PersonalState, id: string, now: string, because: string, sink?: ProvenanceSink): Invalidation {
  const { direct, transitive } = dependents(state, id);
  const events: PersonalEvent[] = [];
  for (const dep of [...direct, ...transitive]) {
    if (state.invalidated.has(dep)) continue;
    events.push({ type: "artifact_invalidated", at: now, id: dep, because });
    sink?.edge(dep, id, "invalidated_by", now);
  }
  return { events, direct, transitive };
}
