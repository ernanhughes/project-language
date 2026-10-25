import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {checkTransformation as checkR5,policyAssessment as policyR5} from '../../apps/language-demo/evaluation/semantic-checker-v5.mjs';
import {checkTransformation as checkR6,policyAssessment as policyR6} from '../../apps/language-demo/evaluation/semantic-checker-v6.mjs';

const out='experiments/lc-02-r6/.runs/REPRO-R5-001';
mkdirSync(out,{recursive:true});

const r5Cases=JSON.parse(readFileSync('experiments/lc-02-r5/fixtures/evaluation-cases.json','utf8')).cases;
const r5Refs=JSON.parse(readFileSync('experiments/lc-02-r5/fixtures/evaluation-references.json','utf8')).cases;
const targetIds=['R5-E04','R5-E07','R5-E10','R5-E11','R5-E16','R5-E18'];

function summary(output,policy){
 const types=output.findings.map(f=>f.type+'/'+f.distinction);
 return {
  policy:policy(output).outcome,
  findings:types,
  unresolved:output.findings.filter(f=>f.type==='UNRESOLVED').length,
  unsupported_uncertainty:output.findings.filter(f=>f.distinction==='UNSUPPORTED_UNCERTAINTY').length,
  material:output.findings.filter(f=>['MISSING_CANDIDATE','CHANGED_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE'].includes(f.type)&&f.severity==='MATERIAL').map(f=>({type:f.type,distinction:f.distinction,source_spans:f.source_spans.map(s=>s.text),transformation_spans:f.transformation_spans.map(s=>s.text),reason:f.reason})),
  all_findings:output.findings.map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans.map(s=>s.text),transformation_spans:f.transformation_spans.map(s=>s.text),reason:f.reason}))
 };
}

const rows=[];
for(const id of targetIds){
 const c=r5Cases.find(x=>x.id===id);const ref=r5Refs.find(x=>x.id===id);
 const input={source:{id:id+'-source',text:c.source,hash:hash(c.source)},transformation:{id:id+'-transformation',text:c.transformation,hash:hash(c.transformation)},context:{purpose:c.purpose},obligations:c.obligations,profile:c.profile};
 const r5=summary(await checkR5(input),policyR5);
 const r6=summary(await checkR6(input),policyR6);
 rows.push({id,case_type:c.case_type,expected_policy:ref.expected_policy,expected_findings:ref.expected_findings,r5,r6});
}

const specs={
 'LC20-07':{expect:'UNSUPPORTED_UNCERTAINTY',obligations:['security review and release-management review have both been accepted','The security review of candidate K8 is accepted','Release management recorded acceptance of K8 yesterday']},
 'LC20-10':{expect:'UNSUPPORTED_UNCERTAINTY',obligations:['The incident desk may page the on-call database engineer when replication lag stays above twenty seconds for at least five continuous minutes','The dashboard shows lag above twenty seconds for the last seven uninterrupted minutes','Paging is permitted']},
 'LC20-02':{expect:'UNRESOLVED',obligations:['only if a signed known-good image is used','the image signature was verified']},
 'LC20-19':{expect:'UNRESOLVED',obligations:['Requests timestamped after the closing time are outside the exception','The system recorded the proposed request at 18:00 UTC on 16 October 2026']}
};
const prior=[];
const base='experiments/lc-02-batch20/.runs/COMBINED-001/cases';
for(const [id,spec] of Object.entries(specs)){
 for(const arm of ['B_AI_MEDIATED','C_UNDERSTANDING_ENHANCED']){
  const rec=JSON.parse(readFileSync(join(base,id,arm,'record.json'),'utf8'));
  const p=rec.packet?.state?.proposal;if(!p)continue;
  const transformation=[p.interpretation,p.outcome,...p.commitments.map(c=>c.text),...p.unknowns.map(u=>'Unknown: '+u)].join('\n');
  const input={source:{id:rec.source.id,text:rec.source.text,hash:rec.source.hash},transformation:{id:id+'-'+arm+'-proposal',text:transformation,hash:hash(transformation)},context:{purpose:'Communicate the source faithfully to a fresh recipient.'},obligations:spec.obligations.map((q,i)=>({id:'o'+(i+1),source_quote:q})),profile:rec.packet?.state?.proposal?.profile??'technical-policy'};
  const r5=summary(await checkR5(input),policyR5);
  const r6=summary(await checkR6(input),policyR6);
  prior.push({case:id,arm,expected_candidate:spec.expect,r5,r6,r5_matched:r5.findings.some(t=>t.includes(spec.expect)),r6_matched:r6.findings.some(t=>t.includes(spec.expect))});
 }
}

const result={schema:'lc02-r6-r5-reproduction/0.1',standing:'DEVELOPMENT_REPRODUCTION_NOT_HELD_OUT',created:'2026-10-24',note:'R5 failures reproduced with R5 and R6 on the same historical development cases. These are not held-out results.',rows,prior};
writeFileSync(`${out}/reproduction.json`,JSON.stringify(result,null,2)+'\n');
const lines=['# R5 failure reproduction','','**Development reproduction only. Not held-out evidence.**','','## R5 evaluation cases','','| Case | Type | Expected | R5 policy | R6 policy | R5 findings | R6 findings |','|---|---|---|---|---|---|---|'];
for(const r of rows)lines.push(`| ${r.id} | ${r.case_type} | ${r.expected_policy} | ${r.r5.policy} | ${r.r6.policy} | ${r.r5.findings.join('<br>')||'—'} | ${r.r6.findings.join('<br>')||'—'} |`);
lines.push('','## Prior LC20 cases','','| Case | Arm | Expected candidate | R5 matched | R6 matched | R5 policy | R6 policy | R5 unresolved / unsupported | R6 unresolved / unsupported |','|---|---|---|---|---|---|---|---|---|');
for(const r of prior)lines.push(`| ${r.case} | ${r.arm} | ${r.expected_candidate} | ${r.r5_matched} | ${r.r6_matched} | ${r.r5.policy} | ${r.r6.policy} | ${r.r5.unresolved} / ${r.r5.unsupported_uncertainty} | ${r.r6.unresolved} / ${r.r6.unsupported_uncertainty} |`);
writeFileSync(`${out}/reproduction.md`,lines.join('\n')+'\n');
console.log(JSON.stringify({status:'R6_REPRODUCTION_COMPLETE',rows:rows.map(r=>({id:r.id,r5:r.r5.policy,r6:r.r6.policy,r5_findings:r.r5.findings,r6_findings:r.r6.findings})),prior:prior.map(r=>({case:r.case,arm:r.arm,r5_matched:r.r5_matched,r6_matched:r.r6_matched,r5:r.r5.policy,r6:r.r6.policy,r5_counts:[r.r5.unresolved,r.r5.unsupported_uncertainty],r6_counts:[r.r6.unresolved,r.r6.unsupported_uncertainty]}))},null,2));
