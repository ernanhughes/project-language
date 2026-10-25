import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const design=JSON.parse(readFileSync('experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json','utf8'));
const paths={A2:'experiments/lc-02-batch20-r2/reviews/reviewer-a2.json',B2:'experiments/lc-02-batch20-r2/reviews/reviewer-b2.json'};
const reviews=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,JSON.parse(readFileSync(p,'utf8'))]));
const labels=new Set(['YES','NO','UNKNOWN','SOURCE_CONFLICT']);
const ids=['R1E-04','R1E-08','R1E-16'];
const expected=new Map(design.cases.map(c=>[c.id,c.expected_decision]));
const rows=ids.map(id=>{
 const a=reviews.A2.cases.find(c=>c.case_id===id),b=reviews.B2.cases.find(c=>c.case_id===id);
 if(!a||!b)throw Error('DELTA_CASE_MISSING '+id);
 for(const [k,x] of [['A2',a],['B2',b]]){
  if(!labels.has(x.decision))throw Error('DELTA_LABEL '+k+' '+id);
  if(!x.explanation?.trim()||!x.citations?.length)throw Error('DELTA_SUPPORT '+k+' '+id);
  if(!Number.isInteger(x.confidence)||x.confidence<1||x.confidence>5)throw Error('DELTA_CONFIDENCE '+k+' '+id);
 }
 return {id,expected:expected.get(id),A2:a.decision,B2:b.decision,agreement:a.decision===b.decision?'AGREE':'DISAGREE',expected_match:{A2:a.decision===expected.get(id),B2:b.decision===expected.get(id)},confidence:{A2:a.confidence,B2:b.confidence},ambiguity:{A2:a.suspected_ambiguity,B2:b.suspected_ambiguity}};
});
const result={schema:'lc02-r2-blind-delta-comparison/0.1',standing:'TWO_MODEL_BASED_PROVISIONAL_REVIEWERS_NOT_HUMAN_INDEPENDENT_ADJUDICATION',design_sha256:design.freeze.design_sha256,review_hashes:{A2:hash(readFileSync(paths.A2,'utf8')),B2:hash(readFileSync(paths.B2,'utf8'))},cases:rows,agreements:rows.filter(r=>r.agreement==='AGREE').length,disagreements:rows.filter(r=>r.agreement==='DISAGREE').length,reference_matches:{A2:rows.filter(r=>r.expected_match.A2).length,B2:rows.filter(r=>r.expected_match.B2).length,total:rows.length},residual_issue:'Both reviewers still note a modal-priority argument (discretionary may versus mandatory must not) in the two conflict cases, but both choose SOURCE_CONFLICT with high confidence and treat the no-precedence statement as controlling. Record this as a watch item, not a question-form blocker.',delta_status:'QUESTION_FORM_ISSUES_RESOLVED_WITH_RESIDUAL_MODAL_DEBATE',pre_run_approval_status:'PENDING_HUMAN_INDEPENDENT_REVIEW'};
writeFileSync('experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-V2-DELTA.json',JSON.stringify(result,null,2)+'\n');
const lines=['# Blind review — V2 delta','', '**Standing:** two model-based provisional reviewers, not human independent adjudication. Only the three cases changed in V2 were re-reviewed.','', `- V2 design: \`${design.freeze.design_sha256}\``, `- Reviewer A2: \`${result.review_hashes.A2}\``, `- Reviewer B2: \`${result.review_hashes.B2}\``, `- Agreement: ${result.agreements}/3`, `- Reference matches (post-review): A2 ${result.reference_matches.A2}/3, B2 ${result.reference_matches.B2}/3`, '', '| Case | Expected | A2 | B2 | Agreement | Confidence |','|---|---|---|---|---|---|',...rows.map(r=>`| ${r.id} | ${r.expected} | ${r.A2} | ${r.B2} | ${r.agreement} | ${r.confidence.A2}/${r.confidence.B2} |`),'','## Residual ambiguity','',result.residual_issue,'','## Status','',`**${result.delta_status}.** ${result.pre_run_approval_status}. The V1 reviews remain valid for the thirteen unchanged cases; the three changed cases were re-reviewed here.`,''];
writeFileSync('experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-V2-DELTA.md',lines.join('\n'));
console.log(JSON.stringify({status:'DELTA_COMPARED',agreements:result.agreements,disagreements:result.disagreements,reference_matches:result.reference_matches,delta_status:result.delta_status,pre_run_approval_status:result.pre_run_approval_status},null,2));
