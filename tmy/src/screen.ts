// The first screen: title and description only. The transcript is not read here, and every decision says so.
//
// Outcomes are not a score. LOOK goes in the daily digest, AVAILABLE is listed but not pushed, WITHHOLD is not listed and
// keeps its reason so it can be brought back. The terms and the avoid list are the person's own declared words.
import type { FeedEntry } from "./feed.ts";
import type { Interest } from "./interest.ts";
import type { Reason } from "../../core/radar/src/attention/index.ts";

export const SCREEN_POLICY = "tmy-screen-v2";
/** Only the start of a description is read: the rest is usually links, sponsors and boilerplate that mention every fashionable word. */
export const DESCRIPTION_WINDOW = 500;
export type Verdict = "LOOK" | "AVAILABLE" | "WITHHOLD";
export type Cause = "already_seen" | "avoid_term" | "no_interest_term" | "known_topics_only";

export interface Decision {
  entry: FeedEntry;
  verdict: Verdict;
  matched: string[];
  cause: Cause | null;
  reasons: Reason[];
  /** Always "metadata" in this slice. A later stage may read the transcript; this one never does. */
  basis: "metadata";
  policy: string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, term: string): boolean => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(term)}($|[^\\p{L}\\p{N}])`, "iu").test(text);
const R = (dimension: Reason["dimension"], ref: string, text: string, origin: Reason["origin"] = "declared_policy"): Reason => ({ dimension, origin, ref, text });

export function screen(entry: FeedEntry, interest: Interest): Decision {
  const base = { entry, basis: "metadata" as const, policy: SCREEN_POLICY };
  const title = entry.title; const all = `${entry.title}\n${entry.description.slice(0, DESCRIPTION_WINDOW)}`;
  const avoided = interest.avoid.filter(a => has(title, a));
  if (avoided.length) return { ...base, verdict: "WITHHOLD", matched: [], cause: "avoid_term", reasons: [R("relevance", `avoid:${avoided[0]}`, `the title contains "${avoided[0]}", which you asked to avoid`)] };
  const matched = interest.terms.filter(t => has(all, t));
  const inTitle = matched.filter(t => has(title, t));
  if (matched.length === 0) return { ...base, verdict: "WITHHOLD", matched, cause: "no_interest_term", reasons: [R("relevance", "terms", "none of your terms appears in the title or description; the transcript was not read, so this can miss a video that matters", "computed_rule")] };
  if (matched.every(t => interest.known.includes(t))) return { ...base, verdict: "AVAILABLE", matched, cause: "known_topics_only", reasons: [R("novelty", `known:${matched.join("+")}`, `only about topics you said you know (${matched.join(", ")}); listed, not pushed`)] };
  // One term alone is weak evidence: a cooking channel can say "context". Two distinct terms are needed to be pushed, and
  // at least one of them in the title, unless four or more appear in the part of the description that is read.
  const strong = matched.length >= 2 && (inTitle.length >= 1 || matched.length >= 4);
  return {
    ...base, verdict: strong ? "LOOK" : "AVAILABLE", matched, cause: null,
    reasons: [R("relevance", `terms:${matched.join("+")}`, `${matched.length} of your terms ${matched.length === 1 ? "appears" : "appear"} (${matched.join(", ")})${inTitle.length ? `; in the title: ${inTitle.join(", ")}` : `; in the first ${DESCRIPTION_WINDOW} characters of the description only`}`)],
  };
}
