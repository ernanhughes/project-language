import {writeFileSync,readFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {browse,choose,renderTable,renderHighlight,validateRecord,validateGate,checkRendering,gateDecision} from '../../core/browser/src/index.ts';
import {SOURCE,RECORD,SOURCE_ID,COMPONENTS} from '../../core/browser/fixtures/incident.ts';
import {checkTransformation,policyAssessment} from '../../apps/language-demo/evaluation/semantic-checker-v6.mjs';

const AT='2026-10-24T10:00:00.000Z';
const source={id:SOURCE_ID,text:SOURCE};
const dev=JSON.parse(readFileSync('experiments/lc-03-p0/fixtures/development-cases.json','utf8'));
const handoff=dev.cases.find(c=>c.id==='LC03-D01');
const lookup=dev.cases.find(c=>c.id==='LC03-D02');
const recordProblems=validateRecord(source,RECORD);

// A: original source with navigation/retrieval.
const query='replication lag was under one second';
const hit=renderHighlight(source,query);
const A={arm:'A',name:'original source + navigation',source_chars:SOURCE.length,query,found:hit.found,source_is_byte_equal:hit.text===SOURCE,source_sha256:hash(SOURCE),model_calls:0};

// B: task-specific representation composed from existing core/browser views.
const fix=browse('approve_fix',RECORD,source,AT,{components:COMPONENTS,audienceServices:['ledger']});
const procedure=browse('follow_procedure',RECORD,source,AT,{components:COMPONENTS});
const views=[...fix.views.map(v=>({task:'approve_fix',...v})),...procedure.views.map(v=>({task:'follow_procedure',...v}))];
const B={arm:'B',name:'task-specific representation',source_chars:SOURCE.length,representation_chars:views.reduce((n,v)=>n+v.shown.text.length,0),views:views.map(v=>({task:v.task,representation:v.rendering.representation,decision:v.decision.decision,why:v.decision.why,is_source:v.shown.is_source,chars:v.shown.text.length,lost:v.profile?[...new Set(v.profile.obligations.filter(o=>o.outcome==='LOST').map(o=>o.id))]:[]})),trace:[...fix.trace,...procedure.trace],model_calls:0};

// A deliberately lossy table is the negative control. The existing browser gate should catch it.
const faithfulTable=renderTable(RECORD);
const lossyTable=faithfulTable.split('\n').map(l=>l.includes('H3 stale')?'| H3 stale replica promoted | none cited |  | uncertain |':l).join('\n');
const validation=validateGate('approve_fix','table',RECORD,source,AT);
const lossyProfile=checkRendering('approve_fix','table',RECORD,source,lossyTable,AT,validation);
const lossyLost=[...new Set(lossyProfile.obligations.filter(o=>o.outcome==='LOST').map(o=>o.id))];
const lossyDecision=gateDecision(lossyProfile,1,1);

// C: B plus advisory inspection. The R6 checker is bounded and advisory only; it does not route or accept.
const h3Source='H3 is ruled out only if replication lag was under one second, and the lag data has a gap from 09:00 to 09:06.';
const h3Candidate='H3 stale replica promoted | none cited | uncertain';
const r6=await checkTransformation({source:{id:'h3-source',text:h3Source,hash:hash(h3Source)},transformation:{id:'h3-candidate',text:h3Candidate,hash:hash(h3Candidate)},context:{purpose:'Inspect the H3 row against the source condition.'},obligations:[{id:'o1',source_quote:'H3 is ruled out only if replication lag was under one second'}],profile:'technical-policy'});
const C={arm:'C',name:'representation + advisory constraint inspection',representation_chars:B.representation_chars,advisory:{browser_gate:{lossy_control_lost:lossyLost,lossy_control_decision:lossyDecision.decision,lossy_control_why:lossyDecision.why},r6:{findings:r6.findings.map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans.map(s=>s.text),transformation_spans:f.transformation_spans.map(s=>s.text),reason:f.reason})),policy:policyAssessment(r6).outcome,action_authority:false,advisory_only:true}},model_calls:0};

// Scripted scoring illustration. These answers are constructed fixtures, not model observations.
function score(def,answer){
 const req=def.reference.required_atoms;
 const conds=def.reference.conditions;
 const unc=def.reference.uncertainty;
 const atomHits=req.filter(a=>answer.atoms.includes(a.id));
 const evidenceHits=req.filter(a=>answer.evidence[a.id]===a.evidence);
 const condHits=conds.filter(c=>answer.conditions.includes(c.id));
 const uncHits=unc.filter(u=>answer.uncertainty.includes(u.id));
 const selected=answer.selected??[];
 const relevant=new Set([...req.map(x=>x.id),...conds.map(x=>x.id),...unc.map(x=>x.id)]);
 const selection=selected.length?selected.filter(id=>relevant.has(id)).length/selected.length:1;
 return {
  required_atoms:{present:atomHits.length,total:req.length},
  evidence:{exact:evidenceHits.length,total:req.length},
  conditions:{present:condHits.length,total:conds.length||1},
  uncertainty:{present:uncHits.length,total:unc.length||1},
  unsupported_additions:answer.unsupported.length,
  selection:{relevant_selected:selection===1,ratio:Number(selection.toFixed(3))},
  correctness:Number((atomHits.length/req.length).toFixed(3)),
  source_preferable:def.source_preferable
 };
}
const allIds={
 atoms:handoff.reference.required_atoms.map(a=>a.id),
 conditions:handoff.reference.conditions.map(c=>c.id),
 uncertainty:handoff.reference.uncertainty.map(u=>u.id),
 evidence:Object.fromEntries(handoff.reference.required_atoms.map(a=>[a.id,a.evidence]))
};
const answers={
 A:{atoms:allIds.atoms,conditions:allIds.conditions,uncertainty:allIds.uncertainty,evidence:allIds.evidence,selected:[...allIds.atoms,...allIds.conditions,...allIds.uncertainty],unsupported:[]},
 B:{atoms:allIds.atoms.filter(x=>x!=='h4-contradicted'),conditions:allIds.conditions.filter(x=>x!=='h3-gap'&&x!=='recovery-exception'),uncertainty:allIds.uncertainty.filter(x=>x!=='h3-uncertain'),evidence:Object.fromEntries(Object.entries(allIds.evidence).filter(([k])=>k!=='h4-contradicted')),selected:[...allIds.atoms,...allIds.conditions],unsupported:['H2 caused the outage.']},
 C:{atoms:allIds.atoms,conditions:allIds.conditions,uncertainty:allIds.uncertainty,evidence:allIds.evidence,selected:[...allIds.atoms,...allIds.conditions,...allIds.uncertainty],unsupported:[]}
};
const scores={A:score(handoff,answers.A),B:score(handoff,answers.B),C:score(handoff,answers.C)};
const lookupScore={standing:'SCRIPTED_LOOKUP_FIXTURE',source_preferable:lookup.source_preferable,A_exact_quotes:true,B_exact_quotes:false,C_exact_quotes:true,note:'The lookup case is marked source-preferable because the task requires exact quotation; a representation must not paraphrase the condition or gap.'};

const result={schema:'lc03-p0-feasibility/0.1',standing:'OFFLINE_FEASIBILITY_ONLY_SCRIPTED_ANSWERS_NOT_MODEL_OBSERVATION',created:'2026-10-24',source:{id:SOURCE_ID,chars:SOURCE.length,sha256:hash(SOURCE)},record:{claims:RECORD.claims.length,relations:RECORD.relations.length,qualifiers:RECORD.qualifiers.length,problems:recordProblems},arms:{A,B,C},negative_control:{name:'lossy H3 table row',lost_obligations:lossyLost,gate_decision:lossyDecision.decision,gate_why:lossyDecision.why,gate_would_show_source:lossyDecision.decision==='FALL_BACK_TO_SOURCE'},scoring:{case:'LC03-D01',standing:'SCRIPTED_ILLUSTRATION',answers,scores,lookupScore},cost:{A_chars:A.source_chars,B_chars:B.representation_chars,C_chars:B.representation_chars+(r6.findings.length?600:0),A_stages:1,B_stages:B.trace.length,C_stages:B.trace.length+1,model_calls:0},limitations:['The answers are scripted, not generated by a recipient model.','The B representation is deterministic core/browser output, not an AI-mediated representation.','The R6 advisory check is run on a deliberately lossy H3 row, not on a model-generated handoff.','The single incident source is exposed development material, not held-out evidence.','No benefit, superiority or production claim follows from this feasibility run.']};
writeFileSync('experiments/lc-03-p0/feasibility.json',JSON.stringify(result,null,2)+'\n');
const lines=['# LC-03-P0 feasibility run','','**Offline, scripted, no model calls. Not a benefit measurement.**','',`Source: ${SOURCE_ID}, ${SOURCE.length} chars, record ${RECORD.claims.length} claims / ${RECORD.relations.length} relations / ${RECORD.qualifiers.length} qualifiers.`,'',`Record validation: ${recordProblems.length?'FAIL':'PASS'}.`,'','## A — original source + navigation',`Query: \`${query}\`; found: ${hit.found?`${hit.found.start}-${hit.found.end}`:'not found'}; source bytes equal: ${hit.text===SOURCE}.`,'','## B — task-specific representation','',...B.views.map(v=>`- ${v.task}/${v.representation}: ${v.decision}; ${v.chars} chars; lost ${v.lost.join(',')||'none'}`),'','## Negative control — lossy H3 table row',`Lost obligations: ${lossyLost.join(', ')||'none'}.`,'','## C — advisory inspection','',`Browser gate lossy control: ${C.advisory.browser_gate.lossy_control_lost.join(', ')||'none'} (${C.advisory.browser_gate.lossy_control_decision}).`,`R6 advisory findings: ${C.advisory.r6.findings.map(f=>f.type+'/'+f.distinction).join(', ')||'none'}.`,`R6 policy: ${C.advisory.r6.policy} (advisory only).`,'','## Scripted scoring illustration','', '| Arm | Correctness | Evidence | Conditions | Uncertainty | Unsupported | Selection |','|---|---:|---:|---:|---:|---:|---|',...Object.entries(scores).map(([k,s])=>`| ${k} | ${s.correctness} | ${s.evidence.exact}/${s.evidence.total} | ${s.conditions.present}/${s.conditions.total} | ${s.uncertainty.present}/${s.uncertainty.total} | ${s.unsupported_additions} | ${s.selection.ratio} |`),'','**The scores illustrate the scoring harness only. They are not model results and must not be reported as a benefit.**'];
writeFileSync('experiments/lc-03-p0/feasibility.md',lines.join('\n')+'\n');
console.log(JSON.stringify({status:'LC03_FEASIBILITY_COMPLETE',source_chars:SOURCE.length,record_problems:recordProblems.length,A_found:!!hit.found,B_views:B.views.map(v=>v.decision),lossy_lost:lossyLost,r6_findings:C.advisory.r6.findings.map(f=>f.type+'/'+f.distinction),scores},null,2));
