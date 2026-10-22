export function mechanicalDiagnostic(f,receiver) {
  const content=(receiver.explanation ?? '').toLowerCase();
  const ids=f.obligations.map(x=>x.id);
  const candidates={
    scope:/non.idempotent/i.test(content),
    attempts:/three total attempts|three attempts in total|at most three total/i.test(content),
    other_path:/idempotent.*separate/i.test(content),
    timeout:/timeout.*unresolved|unresolved.*timeout/i.test(content),
    authority:/d-17/i.test(content)
  };
  const hits=ids.filter(x=>candidates[x]);
  return {
    name:'LEXICAL_DIAGNOSTIC_NOT_SEMANTIC_JUDGE',hits,missing:ids.filter(x=>!candidates[x]),
    answer_matches_fixture:receiver.answer===f.reference_answer,
    hallucination_energy:{status:'NOT_COMPUTED',reason:'A real, frozen calibrated energy implementation must be imported as observational data; lexical coverage is not Hallucination Energy.'},
    reader_benefit:'NOT_MEASURED',human_semantic_fidelity:'NOT_ADJUDICATED'
  };
}
