import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const arms=['A_SOURCE_ONLY','B_AI_MEDIATED','C_UNDERSTANDING_ENHANCED'];
const labels={A_SOURCE_ONLY:'A',B_AI_MEDIATED:'B',C_UNDERSTANDING_ENHANCED:'C'};
const forbidden=['expected_decision','acceptable_alternatives','required_reasoning','source_evidence_quotes','why_one_label','case_class','c_difference_probe','reference_standing'];
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function readRecord(out,id,arm){return JSON.parse(readFileSync(join(out,'cases',id,arm,'record.json'),'utf8'));}
function readEvents(out,id,arm){const p=join(out,'cases',id,arm,'events.jsonl');return existsSync(p)?readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x)):[];}
function pair(a,b){if(a.status!=='VALID'||b.status!=='VALID')return 'UNASSESSABLE';if(a.correct&&b.correct)return 'TIE_BOTH_CORRECT';if(!a.correct&&!b.correct)return 'TIE_BOTH_WRONG';return b.correct?'IMPROVED':'WORSENED';}
function compactArm(x){return {arm:x.arm,status:x.status,decision:x.output?.decision??null,correct:x.correct??null,explanation:x.output?.explanation??null,citations:x.output?.citations??[],mechanical:x.mechanical??null,error:x.error??null,packet_bytes:x.packet_bytes??null,model:x.model??null};}

export function writeFreshReports({out,frozen,cases,records,metadata}){
 const live=metadata.mode==='live';const requestType=live?'MODEL_REQUEST':'SCRIPTED_REQUEST';
 const rows=records.map(row=>{
  const c=cases.find(x=>x.id===row.id);
  const armResults={};
  for(const arm of arms){
   const rec=readRecord(out,row.id,arm);
   const events=readEvents(out,row.id,arm);
   const recipient=events.find(e=>e.type===requestType&&e.data.role==='recipient');
   const interpreter=events.find(e=>e.type===requestType&&e.data.role==='interpreter');
   const x=row.arms[arm];
   armResults[arm]={...x,cases_id:row.id,correct:x.status==='VALID'&&x.output?.decision===row.expected,events,recipient_request:recipient?.data??null,interpreter_request:interpreter?.data??null,packet:rec.packet,record:rec};
  }
  const paired={B_vs_A:pair(armResults.B_AI_MEDIATED,armResults.A_SOURCE_ONLY),C_vs_B:pair(armResults.C_UNDERSTANDING_ENHANCED,armResults.B_AI_MEDIATED),C_vs_A:pair(armResults.C_UNDERSTANDING_ENHANCED,armResults.A_SOURCE_ONLY)};
  return {id:row.id,case_class:c.case_class,scope:c.scope,expected:row.expected,source:c.source,question:c.question,arms:armResults,paired};
 });
 const checks=[];
 const add=(check,status,detail)=>checks.push({check,status,detail});
 add('case-count',rows.length===16?'PASS':'FAIL',{cases:rows.length});
 add('three-arms',rows.every(r=>arms.every(a=>r.arms[a]))?'PASS':'FAIL',{arms:arms.length});
 add('all-arms-complete',rows.every(r=>arms.every(a=>['VALID','FAILED'].includes(r.arms[a].status)))?'PASS':'FAIL',{valid:rows.flatMap(r=>arms.map(a=>r.arms[a].status)).filter(x=>x==='VALID').length,failed:rows.flatMap(r=>arms.map(a=>r.arms[a].status)).filter(x=>x==='FAILED').length});
 const sourceMismatch=rows.flatMap(r=>arms.filter(a=>r.arms[a].status==='VALID').map(a=>({id:r.id,arm:a,packet:r.arms[a].packet}))).filter(x=>!x.packet?.source||x.packet.source.text!==rows.find(r=>r.id===x.id).source||x.packet.source.hash!==hash(rows.find(r=>r.id===x.id).source));
 add('identical-source-across-arms',sourceMismatch.length===0?'PASS':'FAIL',{mismatches:sourceMismatch.map(x=>[x.id,x.arm]),note:'Failed arms are excluded and reported separately.'});
 const questionMismatch=rows.filter(r=>{const valid=arms.filter(a=>r.arms[a].status==='VALID');if(valid.length<2)return false;const texts=valid.map(a=>r.arms[a].recipient_request?.input?.question?.text);return !texts.every(t=>t===r.question);});
 add('identical-question-across-arms',questionMismatch.length===0?'PASS':'FAIL',{mismatches:questionMismatch.map(r=>r.id),note:'Failed arms are excluded and reported separately.'});
 const hintErrors=rows.flatMap(r=>{
  const out=[];
  for(const a of arms){if(r.arms[a].status!=='VALID')continue;
   if(a==='A_SOURCE_ONLY'&&r.arms[a].interpreter_request)out.push([r.id,'A','unexpected-interpreter']);
   if(a==='B_AI_MEDIATED'){if(!r.arms[a].interpreter_request)out.push([r.id,'B','missing-interpreter']);if(r.arms[a].interpreter_request?.input?.understanding_inventory)out.push([r.id,'B','unexpected-inventory']);}
   if(a==='C_UNDERSTANDING_ENHANCED'){if(!r.arms[a].interpreter_request)out.push([r.id,'C','missing-interpreter']);if(!r.arms[a].interpreter_request?.input?.understanding_inventory)out.push([r.id,'C','missing-inventory']);}
  }
  return out;
 });
 add('compiler-hints-only-to-c',hintErrors.length===0?'PASS':'FAIL',{errors:hintErrors,note:'Failed arms are excluded and reported separately.'});
 const allSessions=rows.flatMap(r=>arms.flatMap(a=>r.arms[a].events.filter(e=>e.type===requestType).map(e=>e.data.session_id)));
 add('fresh-sessions',new Set(allSessions).size===allSessions.length?'PASS':'FAIL',{requests:allSessions.length,unique:new Set(allSessions).size});
 const leaks=rows.flatMap(r=>arms.flatMap(a=>{
  const req=r.arms[a].recipient_request??r.arms[a].interpreter_request;const text=JSON.stringify(req?.input??{});
  return forbidden.filter(k=>text.includes('"'+k+'"')||text.includes(k)).map(k=>[r.id,labels[a],k]);
 }));
 add('frozen-references-excluded',leaks.length===0?'PASS':'FAIL',{leaks});
 const contractErrors=rows.flatMap(r=>arms.filter(a=>r.arms[a].status==='VALID').flatMap(a=>{
  const p=r.arms[a].packet;const e=[];
  if(!p)return [[r.id,labels[a],'missing-packet']];
  if(p.contract_version!=='lc02-r1/source-relative/1')e.push([r.id,labels[a],'contract-version']);
  if(p.source_truth!=='UNVERIFIED')e.push([r.id,labels[a],'source_truth']);
  if(p.source_truth_scope!=='EXTERNAL_FACTUAL_VERIFICATION_ONLY')e.push([r.id,labels[a],'source_truth_scope']);
  if(p.answer_scope!==r.scope)e.push([r.id,labels[a],'answer_scope']);
  if(p.interpretation_standing!=='FALLIBLE_AID_NOT_SOURCE')e.push([r.id,labels[a],'interpretation_standing']);
  if(p.action_authority!==false)e.push([r.id,labels[a],'action_authority']);
  return e;
 }));
 add('source-relative-contract',contractErrors.length===0?'PASS':'FAIL',{errors:contractErrors,note:'Failed arms are excluded and reported separately.'});
 const control=rows.find(r=>r.id==='R1E-01')?.arms.A_SOURCE_ONLY;
 const resolutions=control?.mechanical?.citation_resolution??[];
 const controlCitation=control?.output?.citations?.[0];
 if(live){
  const citationErrors=rows.flatMap(r=>arms.flatMap(a=>{
   const x=r.arms[a];if(x.status!=='VALID')return [];
   const res=x.mechanical?.citation_resolution;
   if(!Array.isArray(res))return [[r.id,labels[a],'NO_CITATION_RESOLUTION_RECORD']];
   return res.filter(v=>!['EXACT','HOST_RESOLVED_HASH'].includes(v)).map(v=>[r.id,labels[a],v]);
  }));
  const hostResolved=rows.flatMap(r=>arms.flatMap(a=>(r.arms[a].mechanical?.citation_resolution??[]).filter(v=>v==='HOST_RESOLVED_HASH').map(()=>[r.id,labels[a]])));
  add('citation-validation',citationErrors.length===0?'PASS':'FAIL',{errors:citationErrors,host_resolved:hostResolved.length,note:'Exact spans remain mandatory; host resolution is recorded separately.'});
 }else{
  add('host-resolved-citation-control',resolutions.includes('HOST_RESOLVED_HASH')&&controlCitation?.source_hash===hash(rows.find(r=>r.id==='R1E-01').source)?'PASS':'FAIL',{resolutions,citation_hash:controlCitation?.source_hash??null,span_ok:controlCitation?controlCitation.text===rows.find(r=>r.id==='R1E-01').source.slice(controlCitation.start,controlCitation.end):false});
 }
 const failed=rows.flatMap(r=>arms.filter(a=>r.arms[a].status!=='VALID').map(a=>[r.id,labels[a],r.arms[a].error??r.arms[a].status]));
 if(live)add('mechanical-failure-accounting',failed.every(f=>typeof f[2]==='string'&&f[2].length>0)?'PASS':'FAIL',{failed,note:'Failed arms are preserved and excluded from semantic ties; they are not repaired.'});
 else add('mechanical-failure-accounting',failed.length===0?'PASS':'FAIL',{failed,note:'Main dry run is expected to have no failures; failure control is separate.'});
 add('no-implicit-authority',rows.every(r=>arms.filter(a=>r.arms[a].packet).every(a=>r.arms[a].packet.action_authority===false))?'PASS':'FAIL',{note:'Packets grant no action authority; failed arms without packets are reported separately.'});
 const requestCount=rows.reduce((n,r)=>n+arms.reduce((m,a)=>m+r.arms[a].events.filter(e=>e.type===requestType).length,0),0);
 if(live)add('request-count',requestCount>0&&requestCount<=Number(metadata.maximum_requests??80)&&requestCount<=100?'PASS':'FAIL',{requests:requestCount,maximum:Number(metadata.maximum_requests??80),ceiling:100,hosted:requestCount,scripted:0});
 else add('scripted-request-count',requestCount===80?'PASS':'FAIL',{scripted:requestCount,expected:80,hosted:0});
 const totals=Object.fromEntries(arms.map(a=>[a,{valid:rows.filter(r=>r.arms[a].status==='VALID').length,correct:rows.filter(r=>r.arms[a].correct).length,failed:rows.filter(r=>r.arms[a].status==='FAILED').length}]));
 const pairedCounts=k=>Object.fromEntries(['IMPROVED','WORSENED','TIE_BOTH_CORRECT','TIE_BOTH_WRONG','UNASSESSABLE'].map(v=>[v,rows.filter(r=>r.paired[k]===v).length]));
 const paired={B_vs_A:pairedCounts('B_vs_A'),C_vs_B:pairedCounts('C_vs_B'),C_vs_A:pairedCounts('C_vs_A')};
 const data={schema:'lc02-r2-fresh-results/0.1',standing:metadata.standing??(live?'EXPLORATORY_LIVE_UNADJUDICATED':'SCRIPTED_ENGINEERING_ONLY_NOT_MODEL_EVIDENCE'),metadata,checks,totals,paired,rows:rows.map(r=>({...r,arms:Object.fromEntries(arms.map(a=>[a,{...compactArm(r.arms[a]),packet:r.arms[a].packet,interpreter_request:r.arms[a].interpreter_request,recipient_request:r.arms[a].recipient_request}]))}))};
 writeFileSync(join(out,'results.json'),JSON.stringify(data,null,2)+'\n');
 const cell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
 writeFileSync(join(out,'results.csv'),['id,case_class,scope,expected,A,B,C,B_vs_A,C_vs_B,C_vs_A',...rows.map(r=>[r.id,r.case_class,r.scope,r.expected,...arms.map(a=>r.arms[a].status==='VALID'?r.arms[a].output.decision:r.arms[a].status),...Object.values(r.paired)].map(cell).join(','))].join('\n')+'\n');
 const table=['| Case | Class | Scope | Reference | A | B | C | B vs A | C vs B | C vs A |','|---|---|---|---|---|---|---|---|---|---|',...rows.map(r=>'| '+[r.id,r.case_class,r.scope,r.expected,...arms.map(a=>r.arms[a].status==='VALID'?r.arms[a].output.decision+' ✓/✗':r.arms[a].status),...Object.values(r.paired)].join(' | ')+' |')].join('\n');
 const reportName=live?'LIVE-REPORT.md':'DRY-RUN-REPORT.md';
 const standing=metadata.standing??(live?'EXPLORATORY_LIVE_UNADJUDICATED':'SCRIPTED_ENGINEERING_ONLY_NOT_MODEL_EVIDENCE');
 writeFileSync(join(out,'COMPARISON.md'),`# LC-02-BATCH20-R2 ${live?'exploratory live run':'scripted dry run'}\n\n${standing}. ${live?'Decisions are real model outputs against frozen provisional references; semantic fidelity is not independently adjudicated.':'The scripted recipient returns UNKNOWN for every arm except one citation-resolution control. These decisions are not semantic results and must not be interpreted as model performance.'}\n\n${table}\n\n## Paired counts\n\n\`\`\`json\n${JSON.stringify(paired,null,2)}\n\`\`\`\n\n## Mechanical checks\n\n| Check | Status |\n|---|---|\n${checks.map(c=>`| ${c.check} | ${c.status} |`).join('\n')}\n`);
 writeFileSync(join(out,'FAILURES.md'),'# Failures\n\n'+(failed.length?failed.map(f=>`- ${f[0]} ${f[1]}: ${f[2]}`).join('\n'):'No mechanical failures recorded.')+'\n\n'+(live?'Failed arms are preserved; they are not counted as ties or repaired. This is a live exploratory run against provisional references.':'No hosted model was called. Every arm is scripted. The failure control is stored separately.')+'\n');
 writeFileSync(join(out,'mechanical-checks.json'),JSON.stringify({schema:'lc02-r2-mechanical-checks/0.1',standing,checks},null,2)+'\n');
 let html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>LC-02-BATCH20-R2 ${live?'live run':'dry run'}</title><style>body{font:16px system-ui;margin:2rem;max-width:1400px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:.5rem;vertical-align:top}pre{white-space:pre-wrap;overflow-wrap:anywhere}details{margin:1rem 0}article{border-top:2px solid #789;padding-top:1rem}.scroll{overflow-x:auto}</style><h1>Fresh evaluation · ${live?'exploratory live run':'scripted dry run'}</h1><p>${esc(standing)} · ${live?`${requestCount} hosted requests`:'zero hosted requests'} · ${rows.length} cases · ${rows.length*3} arms.</p>`;
 html+='<h2>Mechanical checks</h2><div class="scroll"><table><tr><th>Check</th><th>Status</th></tr>'+checks.map(c=>`<tr><td>${esc(c.check)}</td><td>${esc(c.status)}</td></tr>`).join('')+'</table></div>';
 html+='<div class="scroll"><table><tr><th>Case</th><th>Class</th><th>Scope</th><th>Reference</th><th>A</th><th>B</th><th>C</th><th>C vs B</th></tr>';
 for(const r of rows)html+='<tr>'+['<a href="#'+r.id+'">'+r.id+'</a>',r.case_class,r.scope,r.expected,...arms.map(a=>r.arms[a].status==='VALID'?r.arms[a].output.decision:r.arms[a].status),r.paired.C_vs_B].map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>';
 html+='</table></div>';
 for(const r of rows){html+='<article id="'+r.id+'"><h2>'+esc(r.id+' · '+r.case_class)+'</h2><p>'+esc(r.source)+'</p><h3>Question</h3><p>'+esc(r.question)+'</p><p>Reference: '+esc(r.expected)+' · Scope: '+esc(r.scope)+'</p>';for(const a of arms){const x=r.arms[a];html+='<h3>'+esc(labels[a])+' · '+esc(a)+'</h3><p>Status: '+esc(x.status)+' · Decision: '+esc(x.output?.decision??'—')+'</p><p>'+esc(x.output?.explanation??x.error??'No answer')+'</p><details><summary>Packet and captured record</summary><pre>'+esc(JSON.stringify({packet:x.packet,mechanical:x.mechanical,interpreter:x.interpreter_request,recipient:x.recipient_request},null,2))+'</pre></details>';}html+='</article>';}
 html+='</html>';writeFileSync(join(out,'viewer.html'),html);
 const summary=`# LC-02-BATCH20-R2 ${live?'exploratory live run':'scripted dry run'}\n\n`+`Cases: ${rows.length}. Arms: ${rows.length*3}. ${live?`Hosted requests: ${requestCount}.`:'Scripted requests: 80. Hosted requests: 0.'}`+'\n\n'+checks.map(c=>`- ${c.status} — ${c.check}`).join('\n')+'\n\n'+(live?'This is an exploratory live result against provisional references. A label match is not semantic adjudication. See `COMPARISON.md`, `results.json`, `mechanical-checks.json`, `FAILURES.md` and `viewer.html`.':'All decisions are scripted controls, not model evidence. See `COMPARISON.md`, `results.json`, `mechanical-checks.json`, and `viewer.html`.')+'\n';
 writeFileSync(join(out,reportName),summary);
 return {rows,checks,totals,paired,requests:requestCount,live};
}

