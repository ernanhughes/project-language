import {readFileSync,writeFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const base='experiments/lc-02-r7';
const criteria=JSON.parse(readFileSync(`${base}/SUCCESS-CRITERIA.json`,'utf8'));
const freeze=JSON.parse(readFileSync(`${base}/CRITERIA-FREEZE.json`,'utf8'));
const results=JSON.parse(readFileSync(`${base}/.runs/EVAL-001/results.json`,'utf8'));
const criteriaHash=hash(readFileSync(`${base}/SUCCESS-CRITERIA.json`,'utf8'));
if(criteriaHash!==freeze.criteria_sha256)throw Error('CRITERIA_DRIFT');

const rows=results.rows;
const A=results.metrics.A,B=results.metrics.B,C=results.metrics.C;
const useC=rows.filter(r=>r.hybrid.policy==='USE_TRANSFORMATION');
const integrityViolations=[];
for(const r of useC){
 const material=r.hybrid.findings.some(f=>f.severity==='MATERIAL');
 const unresolved=r.hybrid.findings.some(f=>f.type==='UNRESOLVED'||f.status==='DISPUTED');
 if(material||unresolved||!['VALID','SCRIPTED'].includes(r.hybrid.reviewer_status))integrityViolations.push({id:r.id,material,unresolved,reviewer_status:r.hybrid.reviewer_status});
}
const gainsOverA=rows.filter(r=>!r.deterministic.detected&&r.hybrid.detected).map(r=>r.id);
const lossesVsA=rows.filter(r=>r.deterministic.detected&&!r.hybrid.detected).map(r=>r.id);
const matchedExpected=rows.reduce((n,r)=>n+r.hybrid.matched.filter(m=>m.matched).length,0);
const matchedSource=rows.reduce((n,r)=>n+r.hybrid.matched.filter(m=>m.matched&&m.source).length,0);
const matchedTransformation=rows.reduce((n,r)=>n+r.hybrid.matched.filter(m=>m.matched&&m.transformation).length,0);
const reviewerValid=rows.filter(r=>r.reviewer.status==='VALID').length;
const reviewerInvalid=rows.filter(r=>r.reviewer.status!=='VALID').map(r=>({id:r.id,status:r.reviewer.status,error:r.reviewer.error}));
const gates={
 HG1:{pass:C.false_acceptances.length===0,observed:C.false_acceptances},
 HG2:{pass:C.detected_corruptions>=10&&C.detected_corruptions>=A.detected_corruptions,observed:{C:C.detected_corruptions,A:A.detected_corruptions}},
 HG3:{pass:C.false_rejections.length<=A.false_rejections.length,observed:{C:C.false_rejections,A:A.false_rejections}},
 HG4:{pass:C.justified_uncertainty_clean.length===4&&C.invented_uncertainty_clean.length===1&&C.ambiguity_correct===4,observed:{justified:C.justified_uncertainty_clean,invented:C.invented_uncertainty_clean,ambiguity:C.ambiguity_correct}},
 HG5:{pass:gainsOverA.length>0&&lossesVsA.length===0&&C.false_rejections.length<=A.false_rejections.length,observed:{gainsOverA,lossesVsA,falseRejectionDelta:C.false_rejections.length-A.false_rejections.length}},
 HG6:{pass:reviewerValid>=20,observed:{valid:reviewerValid,total:rows.length,invalid:reviewerInvalid}},
 HG7:{pass:integrityViolations.length===0,observed:{violations:integrityViolations,useCases:useC.map(r=>r.id)}},
 HG8:{pass:matchedSource===matchedExpected&&matchedExpected>0,observed:{matched_expected:matchedExpected,matched_source:matchedSource,matched_transformation:matchedTransformation,case_level_source_grounded:C.source_grounded}}
};
const secondary={
 ST1:{pass:C.faithful_accepted>=7&&C.unnecessary_clarifications.length<=1,observed:{faithful_accepted:C.faithful_accepted,unnecessary:C.unnecessary_clarifications}},
 ST2:{pass:C.policy_correct>=22,observed:C.policy_correct},
 ST3:{pass:B.detected_corruptions>=8&&B.faithful_accepted>=7,observed:{detection:B.detected_corruptions,faithful:B.faithful_accepted}},
 ST4:{pass:true,observed:{B_latency_avg_ms:B.latency_ms.avg,B_latency_max_ms:B.latency_ms.max,C_latency_avg_ms:C.latency_ms.avg,input_tokens:B.usage?.input??null,output_tokens:B.usage?.output??null}}
};
const misses=rows.filter(r=>r.case_type==='CORRUPTION'&&!r.hybrid.detected).map(r=>({id:r.id,class:r.corruption_class,policy:r.hybrid.policy,expected:r.expected_findings,deterministic:r.deterministic.findings.map(f=>({type:f.type,distinction:f.distinction,source_spans:f.source_spans.map(s=>s.text)})),reviewer:r.reviewer.assessments,hybrid:r.hybrid.findings.map(f=>({origin:f.origin,type:f.type,distinction:f.distinction,status:f.status,severity:f.severity,source_spans:f.source_spans.map(s=>s.text)}))}));
const falseRejections=rows.filter(r=>r.case_type==='FAITHFUL'&&r.hybrid.policy==='PRESERVE_SOURCE').map(r=>({id:r.id,expected:r.expected_findings,deterministic:r.deterministic.findings.map(f=>({type:f.type,distinction:f.distinction,source_spans:f.source_spans.map(s=>s.text)})),reviewer:r.reviewer.assessments,hybrid:r.hybrid.findings.map(f=>({origin:f.origin,type:f.type,distinction:f.distinction,status:f.status,severity:f.severity,source_spans:f.source_spans.map(s=>s.text)}))}));
const analysis={schema:'lc02-r7-gate-analysis/0.1',standing:'POST_EXECUTION_ANALYSIS_OF_FROZEN_RESULTS',created:'2026-10-24',criteria_sha256:criteriaHash,model:results.reviewer_model,prompt_version:results.reviewer_prompt_version,metrics:{A,B,C},gates,hard_gates_passed:Object.values(gates).every(g=>g.pass),secondary,detection_gains_over_A:gainsOverA,detection_losses_vs_A:lossesVsA,reviewer_valid:reviewerValid,reviewer_invalid:reviewerInvalid,integrity_violations:integrityViolations,matched_evidence:{matched_expected:matchedExpected,matched_source:matchedSource,matched_transformation:matchedTransformation},misses,false_rejections:falseRejections,use_cases_C:useC.map(r=>r.id)};
writeFileSync(`${base}/.runs/EVAL-001/analysis.json`,JSON.stringify(analysis,null,2)+'\n');
console.log(JSON.stringify({hard_gates_passed:analysis.hard_gates_passed,gates,secondary,gainsOverA,lossesVsA,falseRejections:falseRejections.map(x=>x.id),misses:misses.map(x=>x.id),reviewer_valid:reviewerValid,integrity_violations:integrityViolations,matched_evidence:analysis.matched_evidence},null,2));
