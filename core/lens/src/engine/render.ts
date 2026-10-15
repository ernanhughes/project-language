import { createHash } from "node:crypto";
import {
  LensError,
  type LensMode,
  type PreservationReport,
  type RepresentationArtifact,
  type SourceInput,
  type Survival,
} from "./types.ts";

export const LENS_VERSION = "0.1.0";
export const SUPPORTED_MODES: readonly LensMode[] = ["SOURCE", "BRIEF", "STRUCTURED"];

const HEDGE_WORDS =
  /\b(may|might|could|possibly|probably|likely|unlikely|suggests?|appears?|seems?|uncertain|unknown|except|unless|only if|however|although|but)\b/i;
const NUMBER_RE = /[0-9][0-9_,.]*/g;
const IDENTIFIER_RE = /\b[a-zA-Z][a-zA-Z0-9_]*(?:_[a-zA-Z0-9_]+)+\b/g;

export function stableId(parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 16);
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function scoreSentence(sentence: string, position: number): number {
  let score = position === 0 ? 2 : 0;
  const numbers = sentence.match(NUMBER_RE) ?? [];
  const identifiers = sentence.match(IDENTIFIER_RE) ?? [];
  score += Math.min(numbers.length, 4);
  score += Math.min(identifiers.length, 4);
  if (HEDGE_WORDS.test(sentence)) score += 2;
  return score;
}

function renderBrief(content: string, maxSentences = 3): string {
  const sentences = splitSentences(content);
  if (sentences.length <= maxSentences) return sentences.join(" ");
  const ranked = sentences
    .map((sentence, index) => ({ sentence, index, score: scoreSentence(sentence, index) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index);
  return ranked.map((r) => r.sentence).join(" ");
}

function extractStructured(content: string): string {
  const sentences = splitSentences(content);
  const claims = sentences;
  const qualified = sentences.filter((s) => HEDGE_WORDS.test(s));
  const numbers = [...new Set(content.match(NUMBER_RE) ?? [])];
  const identifiers = [...new Set(content.match(IDENTIFIER_RE) ?? [])];
  const lines = [
    `claims (${claims.length}):`,
    ...claims.map((c, i) => `  [${i + 1}] ${c}`),
    `qualified_or_uncertain (${qualified.length}):`,
    ...qualified.map((c) => `  - ${c}`),
    `numbers: ${numbers.length > 0 ? numbers.join(", ") : "(none found)"}`,
    `identifiers: ${identifiers.length > 0 ? identifiers.join(", ") : "(none found)"}`,
  ];
  return lines.join("\n");
}

function tokenSet(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z0-9_]+/g) ?? []);
}

// ─── Preservation report ──────────────────────────────────────────────────
//
// Changed in project-language. The upstream report measured token overlap only, so it could not tell
// "Acme acquired Beta" from "Beta acquired Acme", or "may reduce" from "does reduce": the chapter's own
// instrument test (core/preservation, probeMeasure) showed both go unnoticed. This version is still a
// heuristic proxy and says so. What it adds, and no more:
//   - order: a source sentence counts as kept only if its adjacent word pairs largely survive in ONE
//     representation sentence, which catches a reversed relation;
//   - negation: the matching sentence must negate (or not) exactly as the source sentence does;
//   - hedges: a qualified source sentence keeps its qualifier only if its matching sentence still carries
//     the same hedge words, which catches a hedge turned into a certainty.
// What it still cannot see: a one-word substitution inside a long sentence (an antonym, a changed
// quantifier) leaves most word pairs intact. That blind spot is pinned by a test.

const NEGATION_WORDS = /\b(not|no|never|none|cannot|can't|won't|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|without|neither|nor)\b/gi;
const HEDGE_TOKEN = /\b(may|might|could|possibly|probably|likely|unlikely|suggests?|appears?|seems?|uncertain|unknown|except|unless|however|although|but)\b/gi;

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
}

function bigramsOf(text: string): Set<string> {
  const w = wordsOf(text);
  const out = new Set<string>();
  for (let i = 0; i + 1 < w.length; i++) out.add(`${w[i]} ${w[i + 1]}`);
  return out;
}

function unigramOverlap(sourceSentence: string, candidate: string): number {
  const a = tokenSet(sourceSentence);
  const b = tokenSet(candidate);
  if (a.size === 0) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / a.size;
}

function bigramOverlap(sourceSentence: string, candidate: string): number {
  const a = bigramsOf(sourceSentence);
  const b = bigramsOf(candidate);
  if (a.size === 0) return 1; // a one-word sentence has no order to lose
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / a.size;
}

const matchesOf = (text: string, re: RegExp): string[] => (text.toLowerCase().match(re) ?? []).sort();

/** The representation sentence that best covers a source sentence, by word overlap. */
function bestMatch(sourceSentence: string, candidates: readonly string[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = unigramOverlap(sourceSentence, c);
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

function survival(kept: number, total: number): Survival {
  if (total === 0) return "unknown";
  if (kept >= total) return "preserved";
  if (kept === 0) return "lost";
  return "partial";
}

export function preservationReport(source: string, representation: string, mode: LensMode): PreservationReport {
  const sourceSentences = splitSentences(source);
  const repSentences = splitSentences(representation);

  const keptSentences = sourceSentences.filter((sentence) => {
    const match = bestMatch(sentence, repSentences);
    if (match === null) return false;
    if (bigramOverlap(sentence, match) < 0.5) return false; // word order largely changed
    return matchesOf(sentence, NEGATION_WORDS).join() === matchesOf(match, NEGATION_WORDS).join(); // polarity differs
  });

  const sourceNumbers = new Set(source.match(NUMBER_RE) ?? []);
  const repNumbers = new Set(representation.match(NUMBER_RE) ?? []);
  const keptNumbers = [...sourceNumbers].filter((n) => repNumbers.has(n)).length;

  const sourceQualified = sourceSentences.filter((s) => HEDGE_WORDS.test(s));
  const keptQualified = sourceQualified.filter((sentence) => {
    const match = bestMatch(sentence, repSentences);
    if (match === null) return false;
    const hedges = matchesOf(sentence, HEDGE_TOKEN);
    const kept = new Set(matchesOf(match, HEDGE_TOKEN));
    return hedges.every((h) => kept.has(h)); // every hedge the source sentence carried is still there
  }).length;

  const unsupported = [...repNumbers].filter((n) => !sourceNumbers.has(n));
  const notes = [
    "method:heuristic-extractive-v1 — word-overlap survival made order-, negation- and hedge-aware. Still a cheap proxy, not a semantic verdict.",
    "blind spot: a one-word substitution inside a long sentence (an antonym, a changed quantifier) leaves most word pairs intact and goes unnoticed.",
    "false alarm: the report is for extractive output. A faithful paraphrase changes the word order and will read as lost.",
    mode === "SOURCE"
      ? "mode:SOURCE — representation is the source verbatim; no transformation applied."
      : "mode:" + mode + " — extractive derivation only; no generative rewriting performed.",
  ];
  return {
    claim_survival: survival(keptSentences.length, sourceSentences.length),
    qualifier_survival: survival(keptQualified, sourceQualified.length),
    numerical_survival: survival(keptNumbers, sourceNumbers.size),
    uncertainty_survival: sourceQualified.length > 0 ? survival(keptQualified, sourceQualified.length) : "unknown",
    provenance_survival: "preserved",
    unsupported_additions: unsupported,
    notes,
  };
}

export interface RenderOptions {
  model?: string;
  maxBriefSentences?: number;
}

export function render(source: SourceInput, purpose: string, mode: string, options: RenderOptions = {}): RepresentationArtifact {
  if (!source || typeof source.content !== "string" || source.content.trim().length === 0) {
    throw new LensError("SOURCE_UNAVAILABLE", "source.content must be a non-empty string");
  }
  if (typeof purpose !== "string" || purpose.trim().length === 0) {
    throw new LensError("CONFIG_INVALID", "purpose must be a non-empty string");
  }
  if (mode !== "SOURCE" && mode !== "BRIEF" && mode !== "STRUCTURED") {
    throw new LensError("MODE_UNSUPPORTED", `unsupported mode: ${mode}`);
  }
  const sourceId = source.id && source.id.trim().length > 0 ? source.id : stableId(["source", source.content]);
  const representation =
    mode === "SOURCE" ? source.content : mode === "BRIEF" ? renderBrief(source.content, options.maxBriefSentences ?? 3) : extractStructured(source.content);
  if (representation.trim().length === 0) {
    throw new LensError("TRANSFORMATION_FAILED", "rendering produced empty output; source retained unchanged");
  }
  const { content: _dropped, ...sourceRef } = source;
  void _dropped;
  return {
    artifact_id: stableId(["lens", LENS_VERSION, sourceId, purpose, mode, representation]),
    source: { ...sourceRef, id: sourceId },
    purpose,
    mode,
    representation,
    derived_from: [sourceId],
    producer: { plugin: "opencode-lens", version: LENS_VERSION, ...(options.model ? { model: options.model } : {}) },
    preservation: preservationReport(source.content, representation, mode),
  };
}
