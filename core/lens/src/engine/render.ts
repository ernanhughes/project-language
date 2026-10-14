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

function survival(kept: number, total: number): Survival {
  if (total === 0) return "unknown";
  if (kept >= total) return "preserved";
  if (kept === 0) return "lost";
  return "partial";
}

export function preservationReport(source: string, representation: string, mode: LensMode): PreservationReport {
  const sourceSentences = splitSentences(source);
  const repTokens = tokenSet(representation);
  const sourceTokens = tokenSet(source);
  const keptSentences = sourceSentences.filter((s) => {
    const tokens = tokenSet(s);
    if (tokens.size === 0) return false;
    let overlap = 0;
    for (const t of tokens) if (repTokens.has(t)) overlap++;
    return overlap / tokens.size >= 0.5;
  });
  const sourceNumbers = new Set(source.match(NUMBER_RE) ?? []);
  const repNumbers = new Set(representation.match(NUMBER_RE) ?? []);
  const keptNumbers = [...sourceNumbers].filter((n) => repNumbers.has(n)).length;
  const sourceQualified = sourceSentences.filter((s) => HEDGE_WORDS.test(s));
  const keptQualified = sourceQualified.filter((s) => {
    const tokens = tokenSet(s);
    let overlap = 0;
    for (const t of tokens) if (repTokens.has(t)) overlap++;
    return tokens.size > 0 && overlap / tokens.size >= 0.5;
  }).length;
  const unsupported = [...repNumbers].filter((n) => !sourceNumbers.has(n));
  const notes = [
    "method:heuristic-extractive-v0 — overlap-based survival is a cheap proxy, not a semantic verdict.",
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
