// Advisory diagnostics only. Never modifies a proposal or creates acceptance.
export function decompositionReview(proposal){
 const findings=[];
 const add=(dimension,text,ids=[])=>findings.push({dimension,text,unit_ids:ids,verdict:'NEEDS_REVIEW'});
 for(const c of proposal.commitments){
  if(!c.evidence.length)add('support',`${c.id}: no supporting source span is supplied.`,[c.id]);
  if(/\b(and|but|while|whereas)\b/i.test(c.text))add('atomicity',`${c.id}: this entry may combine independent meanings. Check whether separate entries are needed.`,[c.id]);
  if(c.kind==='unknown'&&!proposal.unknowns.length)add('uncertainty',`${c.id}: check whether the unresolved reading should also be explained in Unknowns.`,[c.id]);
 }
 if(!proposal.relations.length&&proposal.commitments.length>1)add('relationships','No relationships were proposed. Check whether conditions, exceptions or support connect these meanings.');
 add('coverage','Check each source clause, including qualifications and cross-sentence references. The automated checks do not establish coverage.');
 return {schema:'language-decomposition-diagnostics/0.1',standing:'STRUCTURAL_ADVISORY_NOT_SEMANTIC_VERDICT',findings,semantic_support:'UNKNOWN',classification_correctness:'UNKNOWN',complete_understanding:'NOT_ESTABLISHED'};
}
