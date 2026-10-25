import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {checkTransformation,policyDecision} from '../../apps/language-demo/evaluation/semantic-checker-v5.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const base='experiments/lc-02-batch20/.runs/COMBINED-001/cases';
const out='experiments/lc-02-r5/.runs/PRIOR-FAILURES-002';mkdirSync(out,{recursive:true});
const specs={
 'LC20-07':{expect:'UNSUPPORTED_UNCERTAINTY',obligations:['security review and release-management review have both been accepted','The security review of candidate K8 is accepted','Release management recorded acceptance of K8 yesterday']},
 'LC20-10':{expect:'UNSUPPORTED_UNCERTAINTY',obligations:['The incident desk may page the on-call database engineer when replication lag stays above twenty seconds for at least five continuous minutes','The dashboard shows lag above twenty seconds for the last seven uninterrupted minutes','Paging is permitted']},
 'LC20-02':{expect:'UNRESOLVED',obligations:['only if a signed known-good image is used','the image signature was verified']},
 'LC20-19':{expect:'UNRESOLVED',obligations:['Requests timestamped after the closing time are outside the exception','The system recorded the proposed request at 18:00 UTC on 16 October 2026']}
};
const rows=[];
for(const [id,spec] of Object.entries(specs)){
 for(const arm of ['B_AI_MEDIATED','C_UNDERSTANDING_ENHANCED']){
  const rec=JSON.parse(readFileSync(join(base,id,arm,'record.json'),'utf8'));
  const p=rec.packet?.state?.proposal;if(!p)continue;
  const transformation=[p.interpretation,p.outcome,...p.commitments.map(c=>c.text),...p.unknowns.map(u=>'Unknown: '+u)].join('\n');
  const input={source:{id:rec.source.id,text:rec.source.text,hash:rec.source.hash},transformation:{id:id+'-'+arm+'-proposal',text:transformation,hash:hash(transformation)},context:{purpose:'Communicate the source faithfully to a fresh recipient.'},obligations:spec.obligations.map((q,i)=>({id:'o'+(i+1),source_quote:q})),profile:rec.packet?.state?.proposal?.profile??'technical-policy'};
  const check=await checkTransformation(input);
  const types=check.findings.map(f=>f.type+'/'+f.distinction);
  const matched=types.some(t=>t.includes(spec.expect));
  rows.push({case:id,arm,expected_candidate:spec.expect,matched,policy:policyDecision(check),findings:check.findings.map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans.map(s=>s.text),reason:f.reason}))});
 }
}
writeFileSync(join(out,'prior-failures.json'),JSON.stringify({schema:'lc02-r4-prior-failures/0.1',standing:'DISCLOSED_DEVELOPMENT_NOT_HELD_OUT',rows},null,2)+'\n');
const lines=['# Prior failure study','','**Disclosed development cases, not held-out evidence.**','','| Case | Arm | Expected candidate | Matched | Policy | Material findings |','|---|---|---|---|---|---|'];for(const r of rows)lines.push(`| ${r.case} | ${r.arm} | ${r.expected_candidate} | ${r.matched} | ${r.policy} | ${r.findings.filter(f=>f.severity==='MATERIAL').map(f=>f.type+'/'+f.distinction).join('<br>')||'none'} |`);lines.push('');writeFileSync(join(out,'prior-failures.md'),lines.join('\n'));
console.log(JSON.stringify({status:'PRIOR_STUDY_COMPLETE',rows:rows.map(r=>({case:r.case,arm:r.arm,expected:r.expected_candidate,matched:r.matched,policy:r.policy,findings:r.findings.filter(f=>f.severity==='MATERIAL').map(f=>f.type+'/'+f.distinction)}))},null,2));


