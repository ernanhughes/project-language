// What you are working on, in your own words. This is the declared purpose (Chapter 15): the person states it, and the
// tool never replaces it with an inference. It replaces the old project's "session markdown file" as the thing videos
// are measured against, but it is a statement, not a vector.
//
// File format, plain lines:
//   purpose: Advance my AI agent work: evaluation, memory, context control.
//   terms: agent, evaluation, memory, context, retrieval
//   avoid: giveaway, reaction
//   known: prompt engineering, rag basics
export interface Interest {
  /** In your words. */
  purpose: string;
  /** Words that, in a title or description, make a video worth a closer look. */
  terms: string[];
  /** Words that make it not worth one. Applied to the title only. */
  avoid: string[];
  /** Topics you already know well. A video that is only about these is collapsed, not removed. */
  known: string[];
}

export function parseInterest(text: string): Interest {
  const get = (k: string): string => text.split(/\r?\n/).map(l => l.trim()).find(l => l.toLowerCase().startsWith(k + ":"))?.slice(k.length + 1).trim() ?? "";
  const list = (s: string): string[] => [...new Set(s.split(",").map(x => x.trim().toLowerCase()).filter(Boolean))];
  const purpose = get("purpose");
  if (!purpose) throw new Error("INTEREST_NO_PURPOSE: say what you are working on, in your own words");
  const terms = list(get("terms"));
  if (terms.length === 0) throw new Error("INTEREST_NO_TERMS: give at least one term");
  return { purpose, terms, avoid: list(get("avoid")), known: list(get("known")) };
}
