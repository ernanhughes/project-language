import {readFileSync,writeFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const base='experiments/lc-02-r6';
const criteria=JSON.parse(readFileSync(`${base}/SUCCESS-CRITERIA.json`,'utf8'));
const criteriaFreeze=JSON.parse(readFileSync(`${base}/CRITERIA-FREEZE.json`,'utf8'));
const results=JSON.parse(readFileSync(`${base}/.runs/EVAL-001/results.json`,'utf8'));

const criteriaHash=hash(readFileSync(`${base}/SUCCESS-CRITERIA.json`,'utf8'));
if(criteriaHash!==criteriaFreeze.criteria_sha256)throw Error('CRITERIA_DRIFT');

const paths={
 'evaluation-cases.json':`${base}/fixtures/evaluation-cases.json`,
 'evaluation-references.json':`${base}/fixtures/evaluation-references.json`,
 'development-cases.json':`${base}/fixtures/development-cases.json`,
 'development-references.json':`${base}/fixtures/development-references.json`,
 'FREEZE.json':`${base}/fixtures/FREEZE.json`,
 'semantic-checker-v6.mjs':'apps/language-demo/evaluation/semantic-checker-v6.mjs',
 'semantic-checker-v6-contract.mjs':'apps/language-demo/evaluation/semantic-checker-v6-contract.mjs',
 'semantic-checker-v5.mjs':'apps/language-demo/evaluation/semantic-checker-v5.mjs',
 'semantic-checker-v5-contract.mjs':'apps/language-demo/evaluation/semantic-checker-v5-contract.mjs',
 'run-compare.mjs':`${base}/run-compare.mjs`,
 'build-corpus.mjs':`${base}/build-corpus.mjs`
};
const artifactChecks={};
for(const [file,expected] of Object.entries(criteria.frozen_artifacts)){
 const actual=hash(readFileSync(paths[file],'utf8'));
 artifactChecks[file]={expected,actual,ok:actual===expected};
}

const rows=results.r6.rows;
const r5=results.r5.rows;
const material=f=>['MISSING_CANDIDATE','CHANGED_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE'].includes(f.type)&&f.severity==='MATERIAL';
const useRows=rows.filter(r=>r.actual_policy==='USE_TRANSFORMATION');
const hg5Violations=[];
for(const row of useRows){
 const hasPreserved=row.findings.some(f=>f.type==='PRESERVED_CANDIDATE');
 const hasMaterial=row.findings.some(material);
 const hasUnresolved=row.findings.some(f=>f.type==='UNRESOLVED');
 const hasNotAssessed=row.findings.some(f=>f.type==='NOT_ASSESSED');
 if(!hasPreserved||hasMaterial||hasUnresolved||hasNotAssessed)hg5Violations.push({id:row.id,hasPreserved,hasMaterial,hasUnresolved,hasNotAssessed});
}
const corruptionUse=rows.filter(r=>r.case_type==='CORRUPTION'&&r.actual_policy==='USE_TRANSFORMATION').map(r=>r.id);
const emptyUse=rows.filter(r=>r.actual_policy==='USE_TRANSFORMATION'&&r.findings.length===0).map(r=>r.id);

const gates={
 HG1:{criterion:criteria.hard_gates.find(g=>g.id==='HG1').criterion,pass:results.r6.metrics.false_acceptances.length===0,observed:results.r6.metrics.false_acceptances},
 HG2:{criterion:criteria.hard_gates.find(g=>g.id==='HG2').criterion,pass:results.r6.metrics.detected_corruptions>=10,observed:`${results.r6.metrics.detected_corruptions}/${results.r6.metrics.corruption_cases}`},
 HG3:{criterion:criteria.hard_gates.find(g=>g.id==='HG3').criterion,pass:results.r6.metrics.false_rejections.length<=results.r5.metrics.false_rejections.length,observed:{r5:results.r5.metrics.false_rejections,r6:results.r6.metrics.false_rejections}},
 HG4:{criterion:criteria.hard_gates.find(g=>g.id==='HG4').criterion,pass:results.r6.metrics.justified_uncertainty_clean.length===4&&results.r6.metrics.invented_uncertainty_clean.length===1&&results.r6.metrics.dual_primary_uncertainty.length===0,observed:{justified:results.r6.metrics.justified_uncertainty_clean,invented:results.r6.metrics.invented_uncertainty_clean,dual:results.r6.metrics.dual_primary_uncertainty}},
 HG5:{criterion:criteria.hard_gates.find(g=>g.id==='HG5').criterion,pass:hg5Violations.length===0&&corruptionUse.length===0&&emptyUse.length===0,observed:{violations:hg5Violations,corruptionUse,emptyUse,useCases:useRows.map(r=>r.id)}}
};
const secondary={
 ST1:{target:criteria.secondary_targets.find(t=>t.id==='ST1').target,pass:results.r6.metrics.faithful_accepted>=7,observed:`${results.r6.metrics.faithful_accepted}/${results.r6.metrics.faithful_cases}`},
 ST2:{target:criteria.secondary_targets.find(t=>t.id==='ST2').target,pass:results.r6.metrics.ambiguity_correct===4,observed:`${results.r6.metrics.ambiguity_correct}/${results.r6.metrics.ambiguity_cases}`},
 ST3:{target:criteria.secondary_targets.find(t=>t.id==='ST3').target,pass:results.r6.metrics.policy_correct>=22,observed:`${results.r6.metrics.policy_correct}/${results.r6.metrics.cases}`},
 ST4:{target:criteria.secondary_targets.find(t=>t.id==='ST4').target,pass:results.r6.metrics.source_grounded>=22,observed:{source:results.r6.metrics.source_grounded,transformation:results.r6.metrics.transformation_grounded,cases:results.r6.metrics.cases}}
};
const misses=rows.filter(r=>r.case_type==='CORRUPTION'&&!r.detected).map(r=>({
 id:r.id,corruption_class:r.corruption_class,policy:r.actual_policy,
 expected:r.matched[0]?.expected,
 actual_findings:r.findings.map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans,transformation_spans:f.transformation_spans,reason:f.reason})),
 epistemic:r.epistemic_judgments
}));
const falseRejections=rows.filter(r=>r.case_type==='FAITHFUL'&&r.actual_policy==='PRESERVE_SOURCE').map(r=>({id:r.id,findings:r.findings}));
const analysis={
 schema:'lc02-r6-gate-analysis/0.1',
 standing:'POST_EXECUTION_ANALYSIS_OF_FROZEN_RESULTS',
 created:'2026-10-24',
 split:results.split,
 corpus_freeze:results.corpus_freeze,
 criteria_sha256:criteriaHash,
 artifact_checks:artifactChecks,
 all_artifacts_frozen:Object.values(artifactChecks).every(x=>x.ok),
 gates,
 hard_gates_passed:Object.values(gates).every(g=>g.pass),
 secondary,
 r5_metrics:results.r5.metrics,
 r6_metrics:results.r6.metrics,
 misses,
 false_rejections:falseRejections,
 paired_changes:results.paired.filter(x=>x.changed),
 decision_inputs:{
  detection_improvement:`${results.r5.metrics.detected_corruptions} -> ${results.r6.metrics.detected_corruptions}`,
  false_acceptance_change:`${results.r5.metrics.false_acceptances.length} -> ${results.r6.metrics.false_acceptances.length}`,
  false_rejection_change:`${results.r5.metrics.false_rejections.length} -> ${results.r6.metrics.false_rejections.length}`,
  policy_accuracy_change:`${results.r5.metrics.policy_correct}/${results.r5.metrics.cases} -> ${results.r6.metrics.policy_correct}/${results.r6.metrics.cases}`,
  remaining_rule_based_misses:misses.map(m=>m.id),
  note:'All five hard gates pass. HG2 is met exactly at the pre-registered threshold. Two corruption cases remain semantically misclassified, one of which is routed conservatively to clarification and one to preservation.'
 }
};
writeFileSync(`${base}/.runs/EVAL-001/analysis.json`,JSON.stringify(analysis,null,2)+'\n');
console.log(JSON.stringify({hard_gates_passed:analysis.hard_gates_passed,gates,secondary,misses:misses.map(m=>({id:m.id,class:m.corruption_class,policy:m.policy,actual:m.actual_findings.map(f=>f.type+'/'+f.distinction)})),all_artifacts_frozen:analysis.all_artifacts_frozen},null,2));
