"""Linguistic baseline for Language Understanding, NOT semantic certification.

spaCy: sentence offsets (and optional trained pipeline annotations).
NLTK: token features. Rule cues: candidate force labels. Every row is marked
HEURISTIC_UNVERIFIED; no semantic completeness or authority is asserted.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any
from functools import lru_cache

import nltk
import spacy

PROFILE_SCHEMA = "language-understanding-profile/0.1"
RESULT_SCHEMA = "language-understanding-inventory/0.1"


@lru_cache(maxsize=1)
def _nlp() -> tuple[Any, str]:
    try:
        return spacy.load("en_core_web_sm"), "spacy/en_core_web_sm"
    except OSError:
        # A real dependency parse or NER is unavailable in this fallback.
        pipeline = spacy.blank("en")
        pipeline.add_pipe("sentencizer")
        return pipeline, "spacy/blank-en+sentencizer"


def _load_profile(profile: dict[str, Any] | str | Path) -> dict[str, Any]:
    if not isinstance(profile, dict):
        with open(profile, encoding="utf-8") as f:
            profile = json.load(f)
    if profile.get("schema") != PROFILE_SCHEMA or not profile.get("id") or not profile.get("version"):
        raise ValueError("Invalid interpretation profile identity/schema")
    if profile.get("language") != "en":
        raise ValueError("Step 1 supports English only; refusing silent language fallback")
    return profile


def _split_candidate_spans(sentence_text: str, sentence_offset: int, profile: dict[str, Any]):
    """Narrow, exact-span splitting, deliberately not a general clause parser.

    Semicolon splitting is enabled only by a profile that asks for it. The
    existing "and not permission" cue is retained for compatibility.
    """
    base: list[tuple[int, int]] = [(0, len(sentence_text))]
    if "semicolon" in profile.get("segment_by", []):
        base = []
        cursor = 0
        for match in re.finditer(r";", sentence_text):
            base.append((cursor, match.start()))
            cursor = match.end()
        base.append((cursor, len(sentence_text)))
    result = []
    for base_start, base_end in base:
        fragment = sentence_text[base_start:base_end]
        parts: list[tuple[int, int]] = [(0, len(fragment))]
        if "clause" in profile.get("segment_by", []):
            # 'not permission' means source does NOT provide permission, NOT global prohibition.
            m = re.search(r"\s+and\s+(?=not\s+permission\b)", fragment, re.I)
            if m:
                parts = [(0, m.start()), (m.end(), len(fragment))]
        for start, end in parts:
            piece = fragment[start:end]
            left = len(piece) - len(piece.lstrip())
            right = len(piece.rstrip())
            a, b = base_start + start + left, base_start + start + right
            if a < b:
                result.append((sentence_offset + a, sentence_offset + b))
    return result


def _condition_clause(text: str) -> str | None:
    """Return the text after an explicit condition cue, without inventing one."""
    match = re.search(
        r"(?is)\b(?:only\s+if|if|when|once|provided\s+that|unless)\b\s+(.+?)(?:[.;]|$)",
        text,
    )
    return match.group(1).strip() if match else None


def _looks_like_clause(text: str) -> bool:
    return len(text.split()) >= 3 and bool(
        re.search(
            r"\b(is|are|was|were|has|have|had|remains?|stays?|must|may|can|will|shall|does|do|did|requires?|needs?|passes?|opens?|closes?|accepted|verified|intact)\b",
            text,
            re.I,
        )
    )


def _prerequisites(text: str, enabled: bool) -> list[str]:
    """Candidate, exact-text prerequisites; never a semantic completeness claim."""
    if not enabled:
        return []
    clause = _condition_clause(text)
    if not clause:
        return []
    parts = re.split(
        r"\s+and\s+(?=(?:the|a|an|its|their|all|no|each|any)\b)", clause, flags=re.I
    )
    if len(parts) > 1 and all(_looks_like_clause(part.strip()) for part in parts):
        return [part.strip() for part in parts]
    return [clause]


def _speaker(text: str, enabled: bool) -> str:
    if not enabled:
        return ""
    match = re.match(r"^([A-Z][A-Za-z .'\-]{0,40}):\s+", text)
    return match.group(1).strip() if match else ""


def _classify(text: str, profile: dict[str, Any] | None = None) -> dict[str, Any]:
    profile = profile or {}
    t = text.lower()
    tokens = nltk.wordpunct_tokenize(t)
    # Ordered rules. They are heuristic PROPOSALS; never permission to act.
    if re.search(r"\b(unknown|unresolved|not\s+(?:established|determined)|has\s+not\s+yet\s+decided|has\s+not\s+yet\s+been\s+decided|not\s+yet\s+been\s+decided)\b", t):
        kind, force = "unknown", "UNRESOLVED"
    elif re.search(r"\bmay\s+(?:indicate|suggest|reflect|result\s+from|be\s+caused|be\s+due|have\s+been)\b", t):
        # Epistemic possibility, not a permission (e.g. "may indicate staleness").
        kind, force = "statement", "ASSERTED_IN_SOURCE"
    elif re.search(r"\b(not\s+permission|never\s+permits?|does\s+not\s+authori[sz]e|does\s+not\s+allow|does\s+not\s+grant[^.]*\bpermission)\b", t):
        kind, force = "authority_limit", "DOES_NOT_CONFER_PERMISSION"
    elif re.search(r"\b(neither\b.+\bmay\b|must\s+not|shall\s+not|may\s+not|cannot|can\s+not|forbidden|prohibited)\b", t):
        kind, force = "prohibition", "PROHIBITED"
    elif re.search(r"\b(requires?|must|shall)\b", t):
        kind, force = "requirement", "REQUIRED"
    elif re.search(r"\b(may|can\s+be|permitted|allowed|entitled)\b", t):
        kind, force = "conditional_permission" if re.search(r"\b(only|if|when|once|provided|unless)\b", t) else "permission", "PERMITTED_IN_SOURCE"
    elif re.search(r"\b(should|recommended|advisable)\b", t):
        kind, force = "recommendation", "RECOMMENDED"
    elif "?" in t:
        kind, force = "question", "ASKED"
    elif re.search(r"\b(warn|warning|caution|risk)\b", t):
        kind, force = "warning", "CAUTION"
    else:
        kind, force = "statement", "ASSERTED_IN_SOURCE"
    temporal_cues = [w for w in ("before", "after", "same-day", "within", "during", "until") if w in tokens or w in t]
    condition_cues = [w for w in ("only", "if", "when", "provided", "unless", "with", "once") if w in tokens]
    if re.search(r"\bonly\s+if\b", t):
        condition_cues.append("only if")
    return {
        "kind": kind,
        "normative_force": force,
        "condition_cues": condition_cues,
        "temporal_cues": temporal_cues,
        "possible_unresolved_reference": bool(re.match(r"(?i)^(this|that|it|they|these|those|such|its|their|which)\b", text.strip())),
        "speaker": _speaker(text, bool(profile.get("attribute_speakers"))),
        "prerequisites": _prerequisites(text, bool(profile.get("extract_prerequisites"))),
        "method": "LEXICAL_RULE_HEURISTIC",
        "review": "HEURISTIC_UNVERIFIED",
    }


def analyse(source: str, *, source_id: str, profile: dict[str, Any] | str | Path) -> dict[str, Any]:
    """Return source-anchored candidate inventory. No provider calls or embedding use."""
    if not source.strip():
        raise ValueError("Source cannot be empty")
    p = _load_profile(profile)
    nlp, implementation = _nlp()
    doc = nlp(source)
    segments: list[dict[str, Any]] = []
    units: list[dict[str, Any]] = []
    for sent in doc.sents:
        if not sent.text.strip():
            continue  # Some spaCy pipelines emit a trailing whitespace-only Span.
        sid = f"s{len(segments)+1}"
        segments.append({"id": sid, "start": sent.start_char, "end": sent.end_char, "text": sent.text})
        for start, end in _split_candidate_spans(sent.text, sent.start_char, p):
            snippet = source[start:end]
            # Classifier operates only on exactly the quoted evidence span.
            features = _classify(snippet, p)
            units.append({
                "id": f"m{len(units)+1}", "source_segments": [sid],
                "start": start, "end": end, "source_quote": snippet,
                "proposed_meaning": snippet,  # intentionally extractive, NOT an LLM paraphrase
                "classification": features,
                "provenance": "EXACT_SOURCE_SPAN",
            })
    return {
        "schema": RESULT_SCHEMA,
        "offset_unit": "UNICODE_CODE_POINTS",
        "standing": "HEURISTIC_UNVERIFIED",
        "source": {"id": source_id, "sha256": hashlib.sha256(source.encode("utf-8")).hexdigest(), "text": source},
        "profile": {"id": p["id"], "version": p["version"], "schema": p["schema"], "sha256": hashlib.sha256(json.dumps(p, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()},
        "engine": {"id": implementation, "version": "0.2.0", "nltk_version": nltk.__version__, "spacy_version": spacy.__version__,
                   "trained_syntax_available": implementation == "spacy/en_core_web_sm",
                   "trained_model_requested": "en_core_web_sm",
                   "fallback_reason": "" if implementation == "spacy/en_core_web_sm" else "SPACY_MODEL_NOT_INSTALLED"},
        "segments": segments, "meaning_units": units, "relations": [],
        "coverage": {"standing": "NOT_EVALUATED", "source_supportedness": "NOT_EVALUATED",
                     "semantic_completeness": "NOT_ESTABLISHED"},
        "warnings": ["Labels are lexical heuristics, not verified meaning or permissions.",
                     "No cross-sentence relation, coreference, or semantic completeness checker is implemented.",
                     "Semicolon splitting, prerequisite hints and speaker labels are rule-based candidates, not semantic analysis."],
    }


def analyse_file(path: str | Path, *, source_id: str, profile: dict[str, Any] | str | Path) -> dict[str, Any]:
    with open(path, encoding="utf-8", newline="") as handle:
        return analyse(handle.read(), source_id=source_id, profile=profile)


def render_table(result: dict[str, Any]) -> str:
    headers = ["Source", "Unit", "Candidate type", "Force", "Exact source meaning (extractive)"]
    rows = [headers]
    for m in result["meaning_units"]:
        c = m["classification"]
        rows.append([m["source_segments"][0], m["id"], c["kind"], c["normative_force"], m["source_quote"].replace("\n", " ")])
    widths = [max(len(str(row[i])) for row in rows) for i in range(len(headers))]
    return "\n".join(" | ".join(str(v).ljust(widths[i]) for i, v in enumerate(row)) for row in rows)
