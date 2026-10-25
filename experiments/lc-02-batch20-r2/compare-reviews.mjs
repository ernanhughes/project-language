import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const designPath=resolve('experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json');
const design=JSON.parse(readFileSync(designPath,'utf8'));
const paths={A:'experiments/lc-02-batch20-r2/reviews/reviewer-a.json',B:'experiments/lc-02-batch20-r2/reviews/reviewer-b.json'};
for(const p of Object.values(paths))if(!existsSync(p))throw Error('REVIEW_MISSING '+p);
const reviews=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,JSON.parse(readFileSync(p,'utf8'))]));
const labels=new Set(['YES','NO','UNKNOWN','SOURCE_CONFLICT']);
const byId=new Map(design.cases.map(c=>[c.id,c]));
const expected=new Map(design.cases.map(c=>[c.id,c.expected_decision]));
const normalize=x=>String(x??'').trim();
const validation=[];
for(const [key,review] of Object.entries(reviews)){
 if(review.schema!=='language-blind-review-response/1.0')validation.push([key,'SCHEMA']);
 if(!review.reviewer_standing?.includes('MODEL_BASED')&&!review.reviewer_standing?.includes('HUMAN'))validation.push([key,'STANDING']);
 if(review.cases?.length!==16)validation.push([key,'CASE_COUNT']);
 const ids=new Set();
 for(const c of review.cases??[]){
  if(!byId.has(c.case_id))validation.push([key,'UNKNOWN_CASE '+c.case_id]);
  if(ids.has(c.case_id))validation.push([key,'DUPLICATE_CASE '+c.case_id]);ids.add(c.case_id);
  if(!labels.has(c.decision))validation.push([key,'LABEL '+c.case_id]);
  if(!normalize(c.explanation))validation.push([key,'EXPLANATION '+c.case_id]);
  if(!Array.isArray(c.citations)||!c.citations.length)validation.push([key,'CITATIONS '+c.case_id]);
  if(!Number.isInteger(c.confidence)||c.confidence<1||c.confidence>5)validation.push([key,'CONFIDENCE '+c.case_id]);
 }
}
if(validation.length)throw Error('REVIEW_VALIDATION '+JSON.stringify(validation));
const caseRows=design.cases.map(c=>{
 const a=reviews.A.cases.find(x=>x.case_id===c.id),b=reviews.B.cases.find(x=>x.case_id===c.id);
 const agreement=a.decision===b.decision?'AGREE':'DISAGREE';
 const expectedMatchA=a.decision===c.expected_decision,expectedMatchB=b.decision===c.expected_decision;
 const flags=[];
 for(const [k,x] of [['A',a],['B',b]]){
  if(normalize(x.suspected_ambiguity))flags.push(`${k}:AMBIGUITY_REPORTED`);
  if(x.confidence<=2)flags.push(`${k}:LOW_CONFIDENCE`);
 }
 return {id:c.id,case_class:c.case_class,scope:c.scope,expected:c.expected_decision,A:a.decision,B:b.decision,agreement,expected_match:{A:expectedMatchA,B:expectedMatchB},confidence:{A:a.confidence,B:b.confidence},flags,ambiguity:{A:a.suspected_ambiguity,B:b.suspected_ambiguity},explanations:{A:a.explanation,B:b.explanation}};
});
const agreements=caseRows.filter(r=>r.agreement==='AGREE').length,disagreements=caseRows.length-agreements;
const designIssues=[];
for(const r of caseRows){
 if(r.id==='R1E-04'&&r.agreement==='AGREE'&&r.A==='SOURCE_CONFLICT'){
  designIssues.push({id:r.id,issue:'META_QUESTION_AMBIGUITY',detail:'Both reviewers chose SOURCE_CONFLICT but both noted that the word "unambiguously" permits a reasonable NO answer. Rewrite the question to ask for the status of the permission rather than whether it is unambiguous.'});
 }
 if(r.id==='R1E-16'&&r.agreement==='AGREE'&&r.A==='SOURCE_CONFLICT'){
  designIssues.push({id:r.id,issue:'META_QUESTION_AMBIGUITY',detail:'Both reviewers chose SOURCE_CONFLICT but noted that the yes/no form "May the auditor access" permits NO or UNKNOWN. Rewrite the question to ask for the status under the document.'});
 }
 if(r.id==='R1E-08'&&r.confidence.B<=4){
  designIssues.push({id:r.id,issue:'LOW_CONFIDENCE_PRESENT_TENSE',detail:'Reviewer B reads the dashboard statement as present-tense but asks whether it could be historical. The source says "shows" and the question says "now"; consider making the current-episode wording explicit before v2.'});
 }
}
const referenceComparison={A:{matches:caseRows.filter(r=>r.expected_match.A).length,total:caseRows.length},B:{matches:caseRows.filter(r=>r.expected_match.B).length,total:caseRows.length}};
const result={schema:'lc02-r2-blind-review-comparison/0.1',standing:'TWO_MODEL_BASED_PROVISIONAL_REVIEWERS_NOT_HUMAN_INDEPENDENT_ADJUDICATION',design_sha256:design.freeze.design_sha256,review_hashes:{A:hash(readFileSync(paths.A,'utf8')),B:hash(readFileSync(paths.B,'utf8'))},validation:'PASS',reviewer_standing:{A:reviews.A.reviewer_standing,B:reviews.B.reviewer_standing},agreements,disagreements,disagreement_cases:caseRows.filter(r=>r.agreement==='DISAGREE').map(r=>r.id),flagged_cases:caseRows.filter(r=>r.flags.length).map(r=>r.id),design_issues:designIssues,reference_comparison:referenceComparison,cases:caseRows,go_no_go:designIssues.length?'CONDITIONAL_NO_GO_V1_NEEDS_V2':'GO_PENDING_HUMAN_REVIEW'};
writeFileSync('experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-COMPARISON.json',JSON.stringify(result,null,2)+'\n');
const lines=['# Blind review comparison','', '**Standing:** two model-based provisional reviewers, not human independent adjudication. The design hash and both response hashes are recorded. The comparison was produced only after both reviews were complete.','', `- Design: \`${design.freeze.design_sha256}\``, `- Reviewer A: \`${result.review_hashes.A}\``, `- Reviewer B: \`${result.review_hashes.B}\``, `- Agreement: ${agreements}/16; disagreements: ${disagreements}`, `- Reference comparison (post-review, not independent validation): A ${referenceComparison.A.matches}/16, B ${referenceComparison.B.matches}/16`, '', '## Design issues',''];
 if(!designIssues.length)lines.push('None recorded.');else for(const i of designIssues)lines.push(`- **${i.id} — ${i.issue}:** ${i.detail}`);
 lines.push('','## Case comparison','','| Case | Class | Scope | Expected | A | B | Agreement | A conf. | B conf. | Flags |','|---|---|---|---|---|---|---|---:|---:|---|');
 for(const r of caseRows)lines.push(`| ${r.id} | ${r.case_class} | ${r.scope} | ${r.expected} | ${r.A} | ${r.B} | ${r.agreement} | ${r.confidence.A} | ${r.confidence.B} | ${r.flags.join(', ')||'—'} |`);
 lines.push('','## Reviewer ambiguity notes','');
 for(const r of caseRows.filter(r=>r.ambiguity.A||r.ambiguity.B)){lines.push(`### ${r.id}`,'');if(r.ambiguity.A)lines.push(`- **A:** ${r.ambiguity.A}`);if(r.ambiguity.B)lines.push(`- **B:** ${r.ambiguity.B}`);lines.push('');}
 lines.push('## Decision','',`**${result.go_no_go}.** ${designIssues.length?'The v1 design should not be run until the identified question-form ambiguities are corrected in a new version and the changed cases are re-reviewed.':'Proceed only after human independent review and the remaining preflight checks.'}`,'');
 writeFileSync('experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-COMPARISON.md',lines.join('\n'));
console.log(JSON.stringify({status:'REVIEWS_COMPARED',agreements,disagreements,design_issues:designIssues.map(x=>x.issue),reference_comparison:referenceComparison,go_no_go:result.go_no_go},null,2));
