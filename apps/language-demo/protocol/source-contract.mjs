// The source-relative contract is deliberately small and additive. It does not
// grant action authority, and it does not turn heuristic interpretation into
// source truth. Its purpose is to stop provenance metadata from being mistaken
// for a reason to abstain from a question about what the supplied source says.
export const CONTRACT_VERSION = 'lc02-r1/source-relative/1';

export const ANSWER_SCOPES = Object.freeze([
  'SOURCE_RELATIVE',
  'EXTERNAL_FACTUAL_VERIFICATION',
  'ACTION_AUTHORITY'
]);

export function sourceContract(scope = 'SOURCE_RELATIVE') {
  if (!ANSWER_SCOPES.includes(scope)) throw Error('UNKNOWN_ANSWER_SCOPE');
  return {
    contract_version: CONTRACT_VERSION,
    answer_scope: scope,
    source_truth: 'UNVERIFIED',
    source_truth_scope: 'EXTERNAL_FACTUAL_VERIFICATION_ONLY',
    interpretation_standing: 'FALLIBLE_AID_NOT_SOURCE',
    action_authority: false
  };
}

export const SOURCE_RELATIVE_RULES = [
  'Three scopes are distinct. (a) SOURCE_RELATIVE: what the supplied document or hypothetical scenario states or entails. (b) EXTERNAL_FACTUAL_VERIFICATION: whether that document accurately describes the real world. (c) ACTION_AUTHORITY: whether an actual actor or system is permitted to execute an operation now.',
  'source_truth: UNVERIFIED means only that the document has not been independently checked against the external world. It does not prevent a source-relative answer. Do not cite it as a reason to answer UNKNOWN about what the document itself states or entails.',
  'The interpretation is a fallible aid, not the source. A doubt, unknown, qualification or inference added by an interpreter is not a gap in the source unless the exact source text leaves the question-relevant condition unresolved.',
  'Do not add a condition that the source does not contain. Do not treat a later sentence as adding a new condition merely because it does not repeat an earlier one. If the source explicitly resolves a question-relevant condition, it is resolved even when an interpretation lists it as open.',
  'This packet grants no action authority and no external verification.'
].join(' ');

export const DECISION_LABEL_RULES = [
  'For a SOURCE_RELATIVE question, use the labels as follows.',
  'YES: the source states or entails the proposition asked about.',
  'NO: the source states its negation, expressly prohibits it, or does not establish the requested permission/condition; explain which of these applies. NO is not automatically a universal prohibition.',
  'UNKNOWN: the source leaves a question-relevant fact, condition or authority unresolved, or contains a genuine ambiguity that the text does not settle. UNKNOWN is not a synonym for lack of external verification.',
  'SOURCE_CONFLICT: the source contains unresolved contradictory provisions or statements of equal standing and supplies no precedence rule. Do not use SOURCE_CONFLICT for ordinary missing information.'
].join(' ');
