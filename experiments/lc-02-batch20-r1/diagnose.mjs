import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const root=resolve(new URL('../..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const batch=join(root,'experiments/lc-02-batch20');
const frozen=join(batch,'.runs/COMBINED-001');
const out=join(root,'experiments/lc-02-batch20-r1');
const suite=JSON.parse(readFileSync(join(batch,'fixtures/lc02-20-tests.json'),'utf8'));
const oracle=JSON.parse(readFileSync(join(batch,'fixtures/lc02-20-oracle.json'),'utf8'));
const adjudication=JSON.parse(readFileSync(join(out,'fixtures/adjudication.json'),'utf8'));
const results=JSON.parse(readFileSync(join(frozen,'results.json'),'utf8'));
const arms=['A_SOURCE_ONLY','B_AI_MEDIATED','C_UNDERSTANDING_ENHANCED'];
const labels=['A','B','C'];
const byId=new Map(adjudication.cases.map(c=>[c.id,c]));
const oracleById=new Map(oracle.references.map(r=>[r.id,r]));
const resultById=new Map(results.rows.map(r=>[r.id,r]));

function span(quote,source,id){const start=source.indexOf(quote);if(start<0)throw Error('ADJUDICATION_SPAN_NOT_FOUND '+id+' '+quote);return {quote,start,end:start+quote.length};}
function record(cid,arm){return JSON.parse(readFileSync(join(frozen,'cases',cid,arm,'record.json'),'utf8'));}
function compact(s,n=280){return String(s??'').replace(/\s+/g,' ').trim().slice(0,n);}

const rows=[];
for(const c of suite.cases){
 const a=byId.get(c.id);if(!a)throw Error('ADJUDICATION_MISSING '+c.id);
 const r=resultById.get(c.id);if(!r)throw Error('RESULT_MISSING '+c.id);
 const recs=Object.fromEntries(arms.map((arm,i)=>[labels[i],record(c.id,arm)]));
 const inv=recs.C.understanding?.source?.inventory;
 const proposals=Object.fromEntries(['B','C'].map(k=>[k,recs[k].packet?.state?.proposal??null]));
 const provenance=Object.fromEntries(labels.map((l,i)=>{
  const rec=recs[l],result=rec.result;
  if(result.status!=='VALID')return [l,result.error??result.status];
  const binding=result.mechanical?.source_binding??'PASS';
  const repairs=(result.mechanical?.citation_resolution??[]).filter(x=>x!=='EXACT').length;
  return [l,(binding==='PASS'&&repairs===0?'EXACT_CITATIONS':'CITATION_ISSUE')+' / '+(rec.packet?.action_authority===false?'NO_ACTION_AUTHORITY':'CHECK_AUTHORITY')];
 }));
 const spans=a.key_spans.map(q=>span(q,c.source,c.id));
 rows.push({id:c.id,split:c.split,domain:c.domain,topic:c.topic,source:c.source,question:c.question,question_id:c.question_id,reference:oracleById.get(c.id).expected_decision,adjudication:a,frozen:r,spans,provenance,
  inventory:inv?{engine:inv.engine,segments:inv.segments.length,units:inv.meaning_units.length,relations:inv.relations.length,units_sample:inv.meaning_units.map(u=>({id:u.id,quote:u.source_quote,kind:u.classification.kind,force:u.classification.normative_force}))}:null,
  proposals:{B:proposals.B?{commitments:proposals.B.commitments.length,unknowns:proposals.B.unknowns.length,relations:proposals.B.relations.length,interpretation:proposals.B.interpretation}:null,
             C:proposals.C?{commitments:proposals.C.commitments.length,unknowns:proposals.C.unknowns.length,relations:proposals.C.relations.length,interpretation:proposals.C.interpretation}:null}});
}

const counts=(field,arm)=>{const out={};for(const row of rows){const v=row.adjudication.provisional_correctness[arm];out[v]=(out[v]||0)+1;}return out;};
const armSummary=Object.fromEntries(labels.map(l=>[l,counts('provisional',l)]));
const oracleMatches=Object.fromEntries(labels.map((l,i)=>[l,rows.filter(row=>row.frozen.arms[arms[i]].status==='VALID'&&row.frozen.arms[arms[i]].correct).length]));
const mechanical=rows.filter(row=>row.adjudication.provisional_correctness.A==='CORRECT_BUT_MECHANICALLY_REJECTED'||row.adjudication.provisional_correctness.C==='MECHANICAL_FAILURE').map(row=>row.id);
const clearRegressions=rows.filter(row=>['CLEAR','CLEAR_WITH_MINOR_WORDING'].includes(row.adjudication.source_relative_standing)&&['B','C'].some(l=>['OVERCAUTIOUS','OVERCONFIDENT'].includes(row.adjudication.provisional_correctness[l]))&&['A'].every(l=>['CORRECT','ACCEPTABLE_ALTERNATIVE'].includes(row.adjudication.provisional_correctness[l]))).map(row=>row.id);
const disputed=rows.filter(row=>['QUESTIONABLE','LABEL_CONVENTION_ISSUE'].includes(row.adjudication.oracle_assessment)).map(row=>row.id);
const mechanicalUndercount=rows.filter(row=>row.adjudication.oracle_assessment==='MECHANICAL_UNDERCOUNT').map(row=>row.id);
const cVsB=rows.map(row=>({id:row.id,A:row.adjudication.provisional_correctness.A,B:row.adjudication.provisional_correctness.B,C:row.adjudication.provisional_correctness.C})).filter(row=>row.B!==row.C);

const diagnosis={schema:'lc02-r1-diagnosis/0.1',standing:'IMPLEMENTATION_TEAM_PROVISIONAL_NOT_INDEPENDENT_ADJUDICATION',frozen_run:'experiments/lc-02-batch20/.runs/COMBINED-001',frozen_hashes:{results:hash(readFileSync(join(frozen,'results.json'),'utf8')),suite:hash(readFileSync(join(batch,'fixtures/lc02-20-tests.json'),'utf8')),oracle:hash(readFileSync(join(batch,'fixtures/lc02-20-oracle.json'),'utf8'))},oracle_matches_preserved:oracleMatches,provisional_source_relative_counts:armSummary,mechanical_failures:mechanical,clear_mediation_regressions:clearRegressions,oracle_non_consistent_cases:disputed,mechanical_undercount_cases:mechanicalUndercount,c_vs_b_label_differences:cVsB,rows};
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'DIAGNOSIS.json'),JSON.stringify(diagnosis,null,2)+'\n');
writeFileSync(join(out,'ADJUDICATION-WORKSHEET.md'),worksheet(rows,{armSummary,oracleMatches,mechanical,clearRegressions,disputed,mechanicalUndercount,cVsB}));
console.log(JSON.stringify({status:'DIAGNOSIS_COMPLETE',cases:rows.length,out,oracleMatches,armSummary,clearRegressions,mechanical,oracleNonConsistent:disputed,mechanicalUndercount,cVsB},null,2));

function worksheet(rows,summary){
 const cell=v=>v??'';const lines=[];
 lines.push('# LC-02-BATCH20-R1 provisional semantic-adjudication worksheet','');
 lines.push('**Standing:** implementation-team provisional judgment, not independent human adjudication. The frozen oracle and retrospective scores are unchanged. Source and question are shown before arm identities and model answers.','');
 lines.push('## Summary of frozen scores (unchanged)','');
 lines.push('| Arm | Exact matches to frozen oracle |','|---|---|');
 for(const l of labels)lines.push(`| ${l} | ${summary.oracleMatches[l]} / 20 |`);
 lines.push('','These are the same unadjusted reference matches reported in `COMBINED-001`. They are not semantic-understanding scores.','');
 lines.push('## Source-first case blocks','');
 lines.push('Read the source and question first. The arm ledger follows after these blocks.','');
 for(const row of rows){
  lines.push(`### ${row.id} — ${row.topic}`,'');
  lines.push(`**Source:** ${row.source}`,'');
  lines.push(`**Question:** ${row.question}`,'');
  lines.push(`**Frozen reference:** ${row.reference} (unadjudicated) · **Provisional source-relative reading:** ${row.adjudication.source_relative_expected} (${row.adjudication.source_relative_standing})`,'');
  lines.push('**Key exact spans:**');
  for(const s of row.spans)lines.push(`- \`${s.start}..${s.end}\` — “${s.quote}”`);
  lines.push('');
 }
 lines.push('## Provisional source-relative status','');
 lines.push('| Arm | Correct | Acceptable alternative | Overcautious | Overconfident | Mechanical |','|---|---:|---:|---:|---:|---:|');
 for(const l of labels){const c=summary.armSummary[l];lines.push(`| ${l} | ${c.CORRECT??0} | ${c.ACCEPTABLE_ALTERNATIVE??0} | ${c.OVERCAUTIOUS??0} | ${c.OVERCONFIDENT??0} | ${(c.MECHANICAL_FAILURE??0)+(c.CORRECT_BUT_MECHANICALLY_REJECTED??0)} |`);}
 lines.push('');
 lines.push('## Case-level arm ledger','');
 lines.push('| Case | Source-relative expectation | Oracle | A | B | C | Status | Oracle assessment |','|---|---|---|---|---|---|---|---|');
 for(const row of rows){const p=row.adjudication.provisional_correctness;lines.push(`| ${row.id} | ${row.adjudication.source_relative_expected} (${row.adjudication.source_relative_standing}) | ${row.reference} | ${p.A} | ${p.B} | ${p.C} | ${row.frozen.arms.A_SOURCE_ONLY.status}/${row.frozen.arms.B_AI_MEDIATED.status}/${row.frozen.arms.C_UNDERSTANDING_ENHANCED.status} | ${row.adjudication.oracle_assessment} |`);}
 lines.push('');
 lines.push('## Semantic faithfulness and provenance','');
 lines.push('| Case | A semantics | B semantics | C semantics | A provenance/authority | B provenance/authority | C provenance/authority |','|---|---|---|---|---|---|---|');
 for(const row of rows){const s=row.adjudication.arm_semantics;const p=row.provenance;lines.push(`| ${row.id} | ${s.A} | ${s.B} | ${s.C} | ${p.A} | ${p.B} | ${p.C} |`);}
 lines.push('');
 lines.push('## Uncertainty traces (B/C differed from A)','');
 lines.push('| Case | Arm | Observed | Attribution | Exact source spans | Model evidence |','|---|---|---|---|---|---|');
 for(const row of rows)for(const u of row.adjudication.uncertainty)lines.push(`| ${row.id} | ${u.arm} | ${u.observed} | ${u.attributions.join(', ')} | ${u.spans.map(s=>`“${s}”`).join('<br>')} | ${String(u.evidence).replaceAll('|','\\|')} |`);
 lines.push('');
 lines.push('## Interpreter and compiler deltas','');
 lines.push('| Case | Interpreter delta | Understanding inventory | B commitments/unknowns/relations | C commitments/unknowns/relations | Contribution |','|---|---|---|---|---|---|');
 for(const row of rows){const i=row.inventory?`${row.inventory.engine.id}; ${row.inventory.segments} segments; ${row.inventory.units} units; ${row.inventory.relations} relations`:'not available';const b=row.proposals.B?`${row.proposals.B.commitments}/${row.proposals.B.unknowns}/${row.proposals.B.relations}`:'—';const c=row.proposals.C?`${row.proposals.C.commitments}/${row.proposals.C.unknowns}/${row.proposals.C.relations}`:'—';lines.push(`| ${row.id} | ${String(row.adjudication.interpreter_delta).replaceAll('|','\\|')} | ${i} | ${b} | ${c} | ${row.adjudication.understanding_contribution} |`);}
 lines.push('');
 return lines.join('\n')+'\n';
}
