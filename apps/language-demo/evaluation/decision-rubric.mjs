// A small, explicit rubric for source-relative decisions. It is deliberately
// not a semantic judge. It records label meaning, allowed alternative readings
// and adjudication issues separately from explanation quality.
export const DECISION_LABELS = Object.freeze(['YES', 'NO', 'UNKNOWN', 'SOURCE_CONFLICT']);

export const QUESTION_SCOPES = Object.freeze({
  SOURCE_RELATIVE: 'What does the supplied document or hypothetical scenario state or entail?',
  EXTERNAL_FACTUAL_VERIFICATION: 'Does the supplied document accurately describe the external world?',
  ACTION_AUTHORITY: 'May an actual actor or system execute the operation now?'
});

export const LABEL_MEANINGS = Object.freeze({
  YES: 'The source states or entails the proposition.',
  NO: 'The source states the negation, expressly prohibits the proposition, or does not establish the requested permission or condition. The explanation must say which reading applies.',
  UNKNOWN: 'The source leaves a question-relevant fact, condition or authority unresolved, or contains a genuine ambiguity that the text does not settle.',
  SOURCE_CONFLICT: 'The source contains unresolved contradictory provisions of equal standing and supplies no precedence rule.'
});

export function assertReference(reference) {
  if (!reference || !DECISION_LABELS.includes(reference.expected_decision)) throw Error('RUBRIC_REFERENCE_LABEL');
  if (!Array.isArray(reference.acceptable_alternatives)) throw Error('RUBRIC_ALTERNATIVES_REQUIRED');
  for (const alternative of reference.acceptable_alternatives) {
    if (!DECISION_LABELS.includes(alternative.decision)) throw Error('RUBRIC_ALTERNATIVE_LABEL');
    if (typeof alternative.reason !== 'string' || !alternative.reason.trim()) throw Error('RUBRIC_ALTERNATIVE_REASON');
  }
  return reference;
}

// A source can support more than one label when the question does not fix
// whether it asks about a documented status, an actual status or a normative
// consequence. Such a case is an adjudication issue, not a silent win for the
// reference label or for a model.
export function adjudicationIssue({ id, issue, readings, resolution = 'UNRESOLVED' }) {
  if (!id || !issue || !Array.isArray(readings) || readings.length < 2) throw Error('RUBRIC_ADJUDICATION_INPUT');
  if (!readings.every(r => DECISION_LABELS.includes(r.decision) && typeof r.reason === 'string' && r.reason.trim())) throw Error('RUBRIC_ADJUDICATION_READING');
  if (!['UNRESOLVED', 'RESOLVED_BY_QUESTION_REWRITE', 'RESOLVED_BY_NEW_SOURCE'].includes(resolution)) throw Error('RUBRIC_ADJUDICATION_RESOLUTION');
  return { schema: 'language-adjudication-issue/0.1', id, issue, readings, resolution, standing: 'IMPLEMENTATION_TEAM_PROVISIONAL_NOT_INDEPENDENT_ADJUDICATION' };
}

export function assessDecision({ decision, reference, mechanical = 'PASS' }) {
  if (mechanical !== 'PASS') return { status: 'MECHANICAL_FAILURE', counts_as_semantic_disagreement: false };
  if (!DECISION_LABELS.includes(decision)) return { status: 'INVALID_LABEL', counts_as_semantic_disagreement: false };
  const ref = assertReference(reference);
  if (decision === ref.expected_decision) return { status: 'REFERENCE_MATCH', label_meaning: LABEL_MEANINGS[decision], semantic_equivalence: 'NOT_ESTABLISHED' };
  const alternative = ref.acceptable_alternatives.find(a => a.decision === decision);
  if (alternative) return { status: 'ACCEPTABLE_ALTERNATIVE', label_meaning: LABEL_MEANINGS[decision], reason: alternative.reason, semantic_equivalence: 'NOT_ESTABLISHED' };
  if (ref.adjudication_issue) return { status: 'ADJUDICATION_ISSUE', adjudication_issue: ref.adjudication_issue, semantic_equivalence: 'NOT_ASSESSED' };
  return { status: 'REFERENCE_DISAGREEMENT', label_meaning: LABEL_MEANINGS[decision], semantic_equivalence: 'NOT_ESTABLISHED' };
}

// Explanation quality is tracked separately from the label. This function only
// enforces structure; substantive ratings remain attributed human/test-operator
// judgments and must never be inferred from a matching label.
export function explanationStanding({ explanation, citations = [], requiredReasoning = [], unsupported = [] }) {
  if (typeof explanation !== 'string' || !explanation.trim()) return { standing: 'MISSING', semantic_support: 'NOT_ASSESSED' };
  const text = explanation.toLowerCase();
  const supported = requiredReasoning.map(item => ({ item, exact_quote_present: text.includes(String(item.quote ?? item).toLowerCase()) }));
  return {
    schema: 'language-explanation-standing/0.1',
    standing: 'NEEDS_ATTRIBUTED_REVIEW',
    citation_count: citations.length,
    required_reasoning_presence: supported,
    unsupported_claims_to_check: unsupported,
    semantic_support: 'NOT_ASSESSED',
    note: 'A label match and quotation presence do not establish semantic fidelity.'
  };
}

// Small review flags, not a semantic verdict. They identify the two exact
// failure patterns observed in batch-20: treating source_truth as a barrier to
// source-relative reasoning, and deferring to an interpreter's added doubt
// instead of checking the source.
export function explanationFlags(explanation) {
  if (typeof explanation !== 'string' || !explanation.trim()) return { schema: 'language-explanation-flags/0.1', flags: ['MISSING_EXPLANATION'], standing: 'HEURISTIC_REVIEW_FLAGS_NOT_VERDICT' };
  const text = explanation.toLowerCase();
  const flags = [];
  if (/source_truth/.test(text) && /unverified/.test(text) && /(therefore|cannot|can't|not\s+definitively|abstain|unable\s+to\s+determine)/.test(text)) flags.push('PROVENANCE_SCOPE_CONFUSION');
  if (/(packet|interpretation|inventory).{0,80}(notes|lists|records|says|states).{0,80}(unknown|unresolved|ambiguous)/.test(text) && /\bunknown\b/.test(text)) flags.push('DEFERS_TO_INTERPRETER_DOUBT');
  if (/\b(source|text|document)\b.{0,80}(does not|doesn't|never)\s+(explicitly\s+)?(state|say|confirm|specify)\b/.test(text) && /\bunknown\b/.test(text)) flags.push('POSSIBLE_ADDED_CONDITION');
  return { schema: 'language-explanation-flags/0.1', flags: [...new Set(flags)], standing: 'HEURISTIC_REVIEW_FLAGS_NOT_VERDICT', note: 'Flags require source-grounded review; they are not labels or verdicts.' };
}
