import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {checkTransformation as checkR5,policyAssessment as policyR5} from '../../apps/language-demo/evaluation/semantic-checker-v5.mjs';
import {checkTransformation as checkR6,policyAssessment as policyR6} from '../../apps/language-demo/evaluation/semantic-checker-v6.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
process.chdir(root);

const args=process.argv.slice(2);
const opts={};
for(let i=0;i<args.length;i++){
 const key=args[i];
 if(['--split','--out'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];
 else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);
}
const split=opts['--split']??'development';
if(!['development','evaluation'].includes(split))throw Error('SPLIT');
const out=resolve(opts['--out']??`experiments/lc-02-r6/.runs/${split.toUpperCase()}-001`);
const base='experiments/lc-02-r6/fixtures';
const freeze=JSON.parse(readFileSync(`${base}/FREEZE.json`,'utf8'));
for(const [file,expected] of Object.entries(freeze.files)){
 const actual=hash(readFileSync(`${base}/${file}`,'utf8'));
 if(actual!==expected)throw Error('FROZEN_CORPUS_DRIFT '+file);
}
const cases=JSON.parse(readFileSync(`${base}/${split}-cases.json`,'utf8')).cases;
const refs=JSON.parse(readFileSync(`${base}/${split}-references.json`,'utf8')).cases;

function quoteMatch(expectedQuote,spans){
 if(!expectedQuote)return true;
 return spans.some(s=>s.text.includes(expectedQuote)||expectedQuote.includes(s.text));
}
function match(expected,actualFindings){
 const candidates=actualFindings.filter(f=>f.type===expected.type&&f.distinction===expected.distinction);
 const source=candidates.some(f=>quoteMatch(expected.source_quote,f.source_spans));
 const transformation=candidates.some(f=>quoteMatch(expected.transformation_quote,f.transformation_spans));
 return {source,transformation,matched:source&&transformation};
}
const isMaterial=f=>['MISSING_CANDIDATE','CHANGED_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE'].includes(f.type)&&f.severity==='MATERIAL';
const classify=(actual,expected)=>actual===expected?'CORRECT':actual==='REQUEST_CLARIFICATION'?'UNNECESSARY_CLARIFICATION':actual==='PRESERVE_SOURCE'?'FALSE_REJECTION':actual==='USE_TRANSFORMATION'?'FALSE_ACCEPT':'OTHER';

async function runOne(c,checker,policy){
 const input={source:{id:`${c.id}-source`,text:c.source,hash:hash(c.source)},transformation:{id:`${c.id}-transformation`,text:c.transformation,hash:hash(c.transformation)},context:{purpose:c.purpose},obligations:c.obligations,profile:c.profile};
 const start=performance.now();
 const output=await checker(input);
 const latency=performance.now()-start;
 const ref=refs.find(r=>r.id===c.id);
 const p=policy(output);
 const matched=ref.expected_findings.map(e=>({expected:e,...match(e,output.findings)}));
 const detected=matched.every(x=>x.matched);
 const types=output.findings.map(f=>f.type);
 return {
  id:c.id,case_type:c.case_type,corruption_class:c.corruption_class,
  expected_policy:ref.expected_policy,actual_policy:p.outcome,policy_correct:p.outcome===ref.expected_policy,policy_class:classify(p.outcome,ref.expected_policy),
  detected,matched,
  source_grounded:matched.every(x=>x.source),transformation_grounded:matched.every(x=>x.transformation),
  material_findings:output.findings.filter(isMaterial).map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans.map(s=>s.text),transformation_spans:f.transformation_spans.map(s=>s.text),reason:f.reason})),
  uncertainty_verdicts:{unresolved:types.includes('UNRESOLVED'),unsupported:output.findings.some(f=>f.distinction==='UNSUPPORTED_UNCERTAINTY'),dual:types.includes('UNRESOLVED')&&output.findings.some(f=>f.distinction==='UNSUPPORTED_UNCERTAINTY')},
  constraints:output.constraints,
  epistemic_judgments:output.epistemic_judgments,
  findings:output.findings.map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans.map(s=>s.text),transformation_spans:f.transformation_spans.map(s=>s.text),reason:f.reason,confidence:f.confidence})),
  latency_ms:latency,output
 };
}

function metrics(rows){
 const corr=rows.filter(r=>r.case_type==='CORRUPTION');
 const faith=rows.filter(r=>r.case_type==='FAITHFUL');
 const amb=rows.filter(r=>r.case_type==='AMBIGUITY');
 const corrDet=corr.filter(r=>r.detected).length;
 const faithfulAccepted=faith.filter(r=>r.actual_policy==='USE_TRANSFORMATION').length;
 const falseAccepts=corr.filter(r=>r.actual_policy==='USE_TRANSFORMATION').map(r=>r.id);
 const falseRejections=faith.filter(r=>r.actual_policy==='PRESERVE_SOURCE').map(r=>r.id);
 const justified=amb.filter(r=>r.expected_policy==='REQUEST_CLARIFICATION');
 const invented=corr.filter(r=>['INVENTED_UNCERTAINTY','MANUFACTURED_UNCERTAINTY'].includes(r.corruption_class));
 const justifiedClean=justified.filter(r=>r.uncertainty_verdicts.unresolved&&!r.uncertainty_verdicts.unsupported).map(r=>r.id);
 const inventedClean=invented.filter(r=>r.uncertainty_verdicts.unsupported&&!r.uncertainty_verdicts.unresolved).map(r=>r.id);
 return {
  cases:rows.length,
  corruption_cases:corr.length,
  detected_corruptions:corrDet,
  missed_corruptions:corr.filter(r=>!r.detected).map(r=>r.id),
  detection_rate:corr.length?corrDet/corr.length:null,
  false_acceptances:falseAccepts,
  faithful_cases:faith.length,
  faithful_accepted:faithfulAccepted,
  false_rejections:falseRejections,
  false_alarm_rate:faith.length?falseRejections.length/faith.length:null,
  ambiguity_cases:amb.length,
  ambiguity_correct:amb.filter(r=>r.actual_policy==='REQUEST_CLARIFICATION').length,
  ambiguity_grounded:amb.filter(r=>r.detected).length,
  justified_uncertainty_clean:justifiedClean,
  invented_uncertainty_clean:inventedClean,
  dual_primary_uncertainty:rows.filter(r=>r.uncertainty_verdicts.dual).map(r=>r.id),
  unnecessary_clarifications:rows.filter(r=>r.actual_policy==='REQUEST_CLARIFICATION'&&r.expected_policy!=='REQUEST_CLARIFICATION').map(r=>r.id),
  not_assessed:rows.filter(r=>r.findings.some(f=>f.type==='NOT_ASSESSED')).map(r=>r.id),
  source_grounded:rows.filter(r=>r.source_grounded).length,
  transformation_grounded:rows.filter(r=>r.transformation_grounded).length,
  policy_correct:rows.filter(r=>r.policy_correct).length,
  policy_accuracy:rows.length?rows.filter(r=>r.policy_correct).length/rows.length:null,
  latency_ms:{avg:rows.reduce((n,r)=>n+r.latency_ms,0)/rows.length,max:Math.max(...rows.map(r=>r.latency_ms))}
 };
}

const r5=[],r6=[];
for(const c of cases){
 r5.push(await runOne(c,checkR5,policyR5));
 r6.push(await runOne(c,checkR6,policyR6));
}
const paired=r6.map((r,i)=>{
 const old=r5[i];
 return {id:r.id,old_detected:old.detected,new_detected:r.detected,old_policy:old.policy_class,new_policy:r.policy_class,old_false_rejection:old.policy_class==='FALSE_REJECTION',new_false_rejection:r.policy_class==='FALSE_REJECTION',old_false_accept:old.policy_class==='FALSE_ACCEPT',new_false_accept:r.policy_class==='FALSE_ACCEPT',changed:old.detected!==r.detected||old.policy_class!==r.policy_class};
});
const result={schema:'lc02-r6-comparison/0.1',standing:'OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES',split,corpus_freeze:freeze.files,checker:{r5:'lc02-r5-semantic-check/0.1',r6:'lc02-r6-semantic-check/0.1'},r5:{metrics:metrics(r5),rows:r5.map(({output,...r})=>r)},r6:{metrics:metrics(r6),rows:r6.map(({output,...r})=>r)},paired};
mkdirSync(out,{recursive:true});
writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');
writeFileSync(`${out}/results.md`,render(result));
console.log(JSON.stringify({status:'R6_COMPARISON_COMPLETE',split,out,r5:result.r5.metrics,r6:result.r6.metrics},null,2));

function render(r){
 const lines=[`# R5 vs R6 — ${r.split}`,'',`**Standing:** ${r.standing}.`,'','## R5','',table(r.r5.metrics),'','## R6','',table(r.r6.metrics),'','## Case comparison','','| Case | Type | Expected | R5 policy | R6 policy | R5 detected | R6 detected | Evidence (source/transformation) | R6 constraints | R6 epistemic |','|---|---|---|---|---|---|---|---|---|---|'];
 for(const x of r.r6.rows){
  const old=r.r5.rows.find(y=>y.id===x.id);
  const evidence=x.matched.map(m=>`${m.expected.type}:${m.source?'S':'—'}/${m.transformation?'T':'—'}`).join('<br>')||'—';
  lines.push(`| ${x.id} | ${x.case_type} | ${x.expected_policy} | ${old.actual_policy} | ${x.actual_policy} | ${old.detected} | ${x.detected} | ${evidence} | ${x.constraints.comparisons.map(c=>c.result+'/'+c.distinction).join('<br>')||'—'} | ${x.epistemic_judgments.map(e=>e.primary_verdict+'/'+e.source_standing).join('<br>')||'—'} |`);
 }
 lines.push('','## R6 misses and false outcomes','');
 const misses=r.r6.rows.filter(x=>x.case_type==='CORRUPTION'&&!x.detected);
 if(!misses.length)lines.push('No missed corruptions.');
 else for(const x of misses)lines.push(`- **${x.id}** (${x.corruption_class}): ${x.actual_policy}; ${x.material_findings.map(f=>f.type+'/'+f.distinction).join(', ')||'no material finding'}`);
 const rejects=r.r6.rows.filter(x=>x.case_type==='FAITHFUL'&&x.actual_policy==='PRESERVE_SOURCE');
 if(rejects.length){lines.push('','False rejections:');for(const x of rejects)lines.push(`- **${x.id}**: ${x.material_findings.map(y=>y.type+'/'+y.distinction).join(', ')}`);}
 lines.push('','## Uncertainty separation','',`- Justified uncertainty clean: ${r.r6.metrics.justified_uncertainty_clean.join(', ')||'none'}` ,`- Invented uncertainty clean: ${r.r6.metrics.invented_uncertainty_clean.join(', ')||'none'}` ,`- Dual primary verdicts: ${r.r6.metrics.dual_primary_uncertainty.join(', ')||'none'}`);
 return lines.join('\n')+'\n';
}
function table(m){
 return `| Metric | Value |\n|---|---|\n| Cases | ${m.cases} |\n| Corruption detection | ${m.detected_corruptions}/${m.corruption_cases} (${m.detection_rate==null?'n/a':(m.detection_rate*100).toFixed(1)+'%'}) |\n| False acceptances | ${m.false_acceptances.join(', ')||'none'} |\n| Faithful accepted | ${m.faithful_accepted}/${m.faithful_cases} |\n| False rejections | ${m.false_rejections.join(', ')||'none'} |\n| Ambiguity grounded / clarified | ${m.ambiguity_grounded}/${m.ambiguity_cases} / ${m.ambiguity_correct}/${m.ambiguity_cases} |\n| Justified uncertainty clean | ${m.justified_uncertainty_clean.length} |\n| Invented uncertainty clean | ${m.invented_uncertainty_clean.length} |\n| Dual primary verdicts | ${m.dual_primary_uncertainty.join(', ')||'none'} |\n| Unnecessary clarifications | ${m.unnecessary_clarifications.join(', ')||'none'} |\n| NOT_ASSESSED cases | ${m.not_assessed.join(', ')||'none'} |\n| Source-grounded cases | ${m.source_grounded}/${m.cases} |\n| Transformation-grounded cases | ${m.transformation_grounded}/${m.cases} |\n| Policy accuracy | ${m.policy_correct}/${m.cases} (${m.policy_accuracy==null?'n/a':(m.policy_accuracy*100).toFixed(1)+'%'}) |\n| Latency avg / max | ${m.latency_ms.avg.toFixed(0)} ms / ${m.latency_ms.max.toFixed(0)} ms |`;
}
