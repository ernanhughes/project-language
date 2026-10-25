import {readFileSync,writeFileSync} from 'node:fs';

const base='experiments/lc-02-r7';
const results=JSON.parse(readFileSync(`${base}/.runs/EVAL-001/results.json`,'utf8'));
const disclosure=JSON.parse(readFileSync(`${base}/CONTAMINATION-DISCLOSURE.json`,'utf8'));
const clean=new Set(disclosure.clean_subset.ids);
const rows=results.rows.filter(r=>clean.has(r.id));
function metrics(key){
 const get=r=>r[key];
 const corr=rows.filter(r=>r.case_type==='CORRUPTION');
 const faith=rows.filter(r=>r.case_type==='FAITHFUL');
 const amb=rows.filter(r=>r.case_type==='AMBIGUITY');
 return {
  cases:rows.length,
  corruption_cases:corr.length,
  detected:corr.filter(r=>get(r).detected).length,
  missed:corr.filter(r=>!get(r).detected).map(r=>r.id),
  false_acceptances:corr.filter(r=>get(r).policy==='USE_TRANSFORMATION').map(r=>r.id),
  faithful_cases:faith.length,
  faithful_accepted:faith.filter(r=>get(r).policy==='USE_TRANSFORMATION').length,
  false_rejections:faith.filter(r=>get(r).policy==='PRESERVE_SOURCE').map(r=>r.id),
  unnecessary_clarifications:rows.filter(r=>get(r).policy==='REQUEST_CLARIFICATION'&&r.expected_policy!=='REQUEST_CLARIFICATION').map(r=>r.id),
  ambiguity_cases:amb.length,
  ambiguity_clarified:amb.filter(r=>get(r).policy==='REQUEST_CLARIFICATION').length,
  policy_correct:rows.filter(r=>get(r).policy===r.expected_policy).length
 };
}
const out={schema:'lc02-r7-clean-subset/0.1',standing:'POST_EXECUTION_CLEAN_SUBSET_ANALYSIS',source_run:'EVAL-001',method:disclosure.method,threshold:disclosure.method.threshold,clean_ids:[...clean],A:metrics('deterministic'),B:metrics('reviewer'),C:metrics('hybrid')};
writeFileSync(`${base}/.runs/EVAL-001/clean-subset.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
