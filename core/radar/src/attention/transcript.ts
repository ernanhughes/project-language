// Chapter 14: from an hour of speech to units smaller than the source.
//
// Input is the timestamped-line format the youtube-transcript skill prints: `[m:ss] caption text`
// (or `[h:mm:ss]`). The transcript becomes a hash-pinned source; a unit is one or more exact spans of it.
//
// A proposer (a model, in practice) may suggest WHICH lines form a unit, what role it has and what it
// depends on. It cannot supply the unit's text: that is always the text at the spans. So a proposal can be
// wrong about structure and cannot invent content, and every unit walks back to timestamps.
import { AttentionError, type SourceVersion, type Unit } from "./types.ts";
import { sha256, validateUnits, type UnitProblem } from "./units.ts";

export interface TranscriptLine {
  /** 1-based line number. */
  n: number;
  seconds: number;
  /** The stamp as written, e.g. "4:02". */
  stamp: string;
  text: string;
  /** Character offsets of `text` in the source. */
  start: number;
  end: number;
}
export interface ParsedTranscript {
  source: SourceVersion;
  lines: TranscriptLine[];
  /** Things that are well-formed but implausible. The text is still usable; its timestamps may not be. */
  warnings: string[];
}

const LINE = /^\[(?:(\d+):)?(\d{1,2}):(\d{2})\]\s+(.+)$/;

export function parseTranscript(raw: string, id: string, version = "v1"): ParsedTranscript {
  const rows = raw.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim().length > 0);
  if (rows.length === 0) throw new AttentionError("TRANSCRIPT_EMPTY", "no lines");
  const text = rows.join("\n");
  const lines: TranscriptLine[] = []; let offset = 0; let last = -1;
  rows.forEach((row, k) => {
    const m = LINE.exec(row);
    if (!m) throw new AttentionError("TRANSCRIPT_LINE_MALFORMED", `line ${k + 1} is not "[m:ss] text": ${JSON.stringify(row.slice(0, 60))}`);
    const [, h, mm, ss, body] = m;
    if (Number(ss) > 59 || (h !== undefined && Number(mm) > 59)) throw new AttentionError("TRANSCRIPT_TIME_INVALID", `line ${k + 1}: ${row.slice(0, 12)}`);
    const seconds = (h ? Number(h) * 3600 : 0) + Number(mm) * 60 + Number(ss);
    if (seconds < last) throw new AttentionError("TRANSCRIPT_TIME_BACKWARDS", `line ${k + 1} is earlier than the line before it`);
    last = seconds;
    const stamp = row.slice(1, row.indexOf("]"));
    const start = offset + row.length - body!.length;
    lines.push({ n: k + 1, seconds, stamp, text: body!, start, end: start + body!.length });
    offset += row.length + 1;
  });
  const warnings: string[] = [];
  const span = lines[lines.length - 1]!.seconds - lines[0]!.seconds;
  // A real caption track averages a second or more per line. Hundreds of lines inside a couple of seconds means the
  // times are in the wrong unit (the published youtube-transcript skill divided seconds by 1000), so units cannot walk back to moments.
  if (lines.length >= 20 && span < lines.length * 0.25) warnings.push(`TIMESTAMPS_IMPLAUSIBLE: ${lines.length} lines span only ${span} seconds; the times are probably in the wrong unit`);
  return { source: { id, version, text, sha256: sha256(text) }, lines, warnings };
}

export interface UnitProposal {
  id: string;
  role: Unit["role"];
  /** 1-based line numbers. Adjacent lines become one span; separated lines become separate spans. */
  lines: number[];
  dependsOn: string[];
}
export type Proposer = (lines: readonly TranscriptLine[]) => UnitProposal[];

export interface Decomposition { units: Unit[]; refused: { id: string; code: string; detail: string }[] }

/**
 * Turn proposals into units. Text is derived from the spans, never taken from the proposer. A proposal that
 * names a line that does not exist, no line, a duplicate id, or a dependency that is not itself an accepted unit
 * is refused with its reason; the rest stand.
 */
export function decompose(parsed: ParsedTranscript, propose: Proposer): Decomposition {
  const proposals = propose(parsed.lines);
  const byLine = new Map(parsed.lines.map(l => [l.n, l]));
  const units: Unit[] = []; const refused: Decomposition["refused"] = [];
  const seen = new Set<string>();
  for (const p of proposals) {
    if (seen.has(p.id)) { refused.push({ id: p.id, code: "DUPLICATE_ID", detail: p.id }); continue; }
    seen.add(p.id);
    const ns = [...new Set(p.lines)].sort((a, b) => a - b);
    if (ns.length === 0) { refused.push({ id: p.id, code: "NO_LINES", detail: "a unit needs at least one line" }); continue; }
    const missing = ns.filter(n => !byLine.has(n));
    if (missing.length) { refused.push({ id: p.id, code: "UNKNOWN_LINE", detail: `no such line: ${missing.join(",")}` }); continue; }
    const spans: { start: number; end: number }[] = []; let prev = -2;
    for (const n of ns) {
      const l = byLine.get(n)!;
      if (n === prev + 1) spans[spans.length - 1]!.end = l.end; else spans.push({ start: l.start, end: l.end });
      prev = n;
    }
    // adjacent lines are separated by "\n" + "[stamp] " in the source, so a merged span carries that framing; the unit
    // text is the span's text exactly, which is what validateUnits checks.
    const text = spans.map(s => parsed.source.text.slice(s.start, s.end)).join(" ");
    units.push({ id: p.id, source_id: parsed.source.id, source_version: parsed.source.version, spans, text, role: p.role, dependsOn: [...p.dependsOn] });
  }
  // dependencies must be accepted units
  let changed = true;
  while (changed) {
    changed = false;
    const ids = new Set(units.map(u => u.id));
    for (let k = units.length - 1; k >= 0; k--) {
      const u = units[k]!; const bad = u.dependsOn.filter(d => !ids.has(d));
      if (bad.length) { refused.push({ id: u.id, code: "DEPENDENCY_NOT_ACCEPTED", detail: bad.join(",") }); units.splice(k, 1); changed = true; }
    }
  }
  const problems: UnitProblem[] = validateUnits(units, parsed.source);
  if (problems.length) throw new AttentionError("DECOMPOSITION_INVALID", problems.map(p => `${p.unit}:${p.code}`).join(","));
  return { units, refused };
}

/** The timestamps a unit walks back to: one per span, start of the first line to the end of the last. */
export function timesOf(unit: Pick<Unit, "spans">, parsed: ParsedTranscript): string[] {
  return unit.spans.map(s => {
    const inside = parsed.lines.filter(l => l.start >= s.start && l.end <= s.end);
    if (inside.length === 0) return "?";
    return inside.length === 1 ? `[${inside[0]!.stamp}]` : `[${inside[0]!.stamp}-${inside[inside.length - 1]!.stamp}]`;
  });
}

// ─── the failure the chapter describes: judging pieces one at a time ────────────────────────────────
export interface WindowPick { window: number; stamps: string; text: string; score: number; kept: boolean }
/**
 * A baseline, deliberately naive: cut the transcript into fixed windows and keep the k whose own words overlap the
 * purpose's terms most. It has no structure and no dependencies, so a qualifier that does not look relevant on its own
 * is dropped. This is a constructed contrast, not a claim about any system that exists.
 */
export function selectWindowsLocally(parsed: ParsedTranscript, size: number, terms: readonly string[], k: number): WindowPick[] {
  const wanted = new Set(terms.map(t => t.toLowerCase()));
  const picks: WindowPick[] = [];
  for (let i = 0; i < parsed.lines.length; i += size) {
    const chunk = parsed.lines.slice(i, i + size);
    const words = chunk.map(l => l.text).join(" ").toLowerCase().match(/[a-z']+/g) ?? [];
    picks.push({ window: picks.length, stamps: `[${chunk[0]!.stamp}-${chunk[chunk.length - 1]!.stamp}]`, text: chunk.map(l => l.text).join(" "), score: words.filter(w => wanted.has(w)).length, kept: false });
  }
  [...picks].sort((a, b) => b.score - a.score || a.window - b.window).slice(0, k).filter(p => p.score > 0).forEach(p => { p.kept = true; });
  return picks;
}
