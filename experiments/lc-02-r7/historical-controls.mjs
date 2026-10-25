import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {checkTransformation,policyAssessment} from '../../apps/language-demo/evaluation/semantic-checker-v6.mjs';
import {LocalOllamaReviewer} from '../../apps/language-demo/evaluation/semantic-reviewer-v7.mjs';
import {reconcile,reviewerPolicyFromFindings,mapReviewerAssessment} from '../../apps/language-demo/evaluation/hybrid-checker-v7.mjs';

const out='experiments/lc-02-r7/.runs/HISTORICAL-003';mkdirSync(out,{recursive:true});
const r6cases=JSON.parse(readFileSync('experiments/lc-02-r6/fixtures/evaluation-cases.json','utf8')).cases;
const r5cases=JSON.parse(readFileSync('experiments/lc-02-r5/fixtures/evaluation-cases.json','utf8')).cases;
const reviewer=new LocalOllamaReviewer({maxRequests:40,timeoutMs:120000,numPredict:1600});await reviewer.discover();

function findingTypes(output){return output.findings.map(f=>f.type+'/'+f.distinction);}
function hasFinding(output,expected){return findingTypes(output).some(t=>t.includes(expected));}
function policyFor(output){return policyAssessment(output).outcome;}

const rows=[];
async function runOne({id,label,expected,source,transformation,purpose,obligations}){
 const s={id:id+'-source',text:source,hash:hash(source)},t={id:id+'-transformation',text:transformation,hash:hash(transformation)};
 const deterministic=await checkTransformation({source:s,transformation:t,context:{purpose},obligations,profile:'technical-policy'});
 const detPolicy=policyFor(deterministic);
 let review=null,status='UNAVAILABLE',error=null;
 try{const result=await reviewer.review({source:s,transformation:t,purpose,obligations});review=result.output;status='VALID';}catch(e){error=e.message;status=e.message.includes('QUOTE')||e.message.includes('SCHEMA')||e.message.includes('MALFORMED')?'INVALID_EVIDENCE':'UNAVAILABLE';}
 const mapped=review?review.assessments.map(a=>mapReviewerAssessment(a,{source:s,transformation:t})):[];
 const revPolicy=review&&status==='VALID'?reviewerPolicyFromFindings(mapped,{valid:true}).outcome:'REQUEST_CLARIFICATION';
 const hybrid=reconcile({source:s,transformation:t,deterministic,reviewer:review,reviewerStatus:status});
 rows.push({id,label,expected,deterministic:{policy:detPolicy,matched:hasFinding(deterministic,expected),findings:findingTypes(deterministic)},reviewer:{status,error,policy:revPolicy,matched:mapped.some(m=>(m.type+'/'+m.distinction).includes(expected)),assessments:review?.assessments??[],summary:review?.summary??null},hybrid:{policy:hybrid.policy.outcome,matched:hybrid.combined_findings.some(f=>{const key=f.type+'/'+f.distinction;return key.includes(expected);}),findings:hybrid.combined_findings.map(f=>({origin:f.origin,type:f.type,distinction:f.distinction,status:f.status,severity:f.severity})),disagreements:hybrid.disagreements}});
}

for(const id of ['R6-E05','R6-E08','R6-E09','R6-E10','R6-E11','R6-E12']){
 const c=r6cases.find(x=>x.id===id);const expected={ 'R6-E05':'BROADENED_EXCEPTION','R6-E08':'UNKNOWN_TO_ESTABLISHED_FACT','R6-E09':'MISATTRIBUTED_QUOTATION_OR_SPEAKER','R6-E10':'WRONG_CROSS_SENTENCE_REFERENCE','R6-E11':'UNSUPPORTED_CAUSAL','R6-E12':'UNSUPPORTED_UNCERTAINTY' }[id];
 await runOne({id,label:c.corruption_class,expected,source:c.source,transformation:c.transformation,purpose:c.purpose,obligations:c.obligations});
}
for(const id of ['R5-E11','R5-E18','R5-E04','R5-E07']){
 const c=r5cases.find(x=>x.id===id);const expected=id==='R5-E11'?'SCOPE_OR_QUANTITY_CHANGE':id==='R5-E18'?'PRESERVED':id==='R5-E04'?'BROADENED_EXCEPTION':'UNKNOWN_TO_ESTABLISHED_FACT';
 const purpose=id==='R5-E18'?'Summarize the paging permission for the incident desk. The dashboard reading may be used to show that the lag condition is met, and office badges are irrelevant.':'Communicate the source faithfully to a fresh recipient.';
 await runOne({id,label:c.corruption_class??'FAITHFUL',expected,source:c.source,transformation:c.transformation,purpose,obligations:c.obligations});
}

const specs={
 'LC20-07':{expect:'UNSUPPORTED_UNCERTAINTY',obligations:['security review and release-management review have both been accepted','The security review of candidate K8 is accepted','Release management recorded acceptance of K8 yesterday']},
 'LC20-10':{expect:'UNSUPPORTED_UNCERTAINTY',obligations:['The incident desk may page the on-call database engineer when replication lag stays above twenty seconds for at least five continuous minutes','The dashboard shows lag above twenty seconds for the last seven uninterrupted minutes','Paging is permitted']},
 'LC20-02':{expect:'UNRESOLVED',obligations:['only if a signed known-good image is used','the image signature was verified']},
 'LC20-19':{expect:'UNRESOLVED',obligations:['Requests timestamped after the closing time are outside the exception','The system recorded the proposed request at 18:00 UTC on 16 October 2026']}
};
const base='experiments/lc-02-batch20/.runs/COMBINED-001/cases';
for(const [id,spec] of Object.entries(specs)){
 for(const arm of ['B_AI_MEDIATED','C_UNDERSTANDING_ENHANCED']){
  const rec=JSON.parse(readFileSync(join(base,id,arm,'record.json'),'utf8'));const p=rec.packet?.state?.proposal;if(!p)continue;
  const transformation=[p.interpretation,p.outcome,...p.commitments.map(c=>c.text),...p.unknowns.map(u=>'Unknown: '+u)].join('\n');
  await runOne({id:id+'-'+arm,label:id,expected:spec.expect,source:rec.source.text,transformation,purpose:'Communicate the source faithfully to a fresh recipient.',obligations:spec.obligations.map((q,i)=>({id:'o'+(i+1),source_quote:q}))});
 }
}
const result={schema:'lc02-r7-historical-controls/0.1',standing:'DISCLOSED_DEVELOPMENT_NOT_HELD_OUT',created:'2026-10-24',model:reviewer.metadata,prompt_version:'lc02-r7-review-prompt/0.4',rows};
writeFileSync(`${out}/historical-controls.json`,JSON.stringify(result,null,2)+'\n');
writeFileSync(`${out}/historical-controls-ledger.json`,JSON.stringify({model:reviewer.metadata,records:reviewer.records},null,2)+'\n');
const lines=['# R7 historical development controls','','**Disclosed development cases. Not held-out evidence.**','',`Model: ${reviewer.metadata.id} (${reviewer.metadata.digest})`,'','| Case | Label | Expected | A matched | B matched | C matched | A policy | B policy | C policy | B status | C disagreements |','|---|---|---|---|---|---|---|---|---|---|---|'];
for(const r of rows)lines.push(`| ${r.id} | ${r.label} | ${r.expected} | ${r.deterministic.matched} | ${r.reviewer.matched} | ${r.hybrid.matched} | ${r.deterministic.policy} | ${r.reviewer.policy} | ${r.hybrid.policy} | ${r.reviewer.status} | ${r.hybrid.disagreements.length} |`);
writeFileSync(`${out}/historical-controls.md`,lines.join('\n')+'\n');
console.log(JSON.stringify({status:'R7_HISTORICAL_COMPLETE',rows:rows.map(r=>({id:r.id,expected:r.expected,A:[r.deterministic.matched,r.deterministic.policy],B:[r.reviewer.matched,r.reviewer.policy,r.reviewer.status],C:[r.hybrid.matched,r.hybrid.policy],disagreements:r.hybrid.disagreements.length}))},null,2));
