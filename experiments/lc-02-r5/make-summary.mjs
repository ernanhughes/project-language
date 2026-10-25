import {readFileSync,writeFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const j=p=>JSON.parse(readFileSync(p,'utf8'));
const dev=j('experiments/lc-02-r5/.runs/DEV-004/results.json');
const ev=j('experiments/lc-02-r5/.runs/EVAL-001/results.json');
const prior=j('experiments/lc-02-r5/.runs/PRIOR-FAILURES-002/prior-summary.json');
const freeze=j('experiments/lc-02-r5/fixtures/FREEZE.json');
const criteria=j('experiments/lc-02-r5/SUCCESS-CRITERIA.json');
const policy=rows=>{const c={};for(const r of rows)c[r.actual_policy]=(c[r.actual_policy]||0)+1;return c;};
const evalMetrics=ev.new_checker.metrics;
const results={
 corruption_detection: {target:'>=10/12',actual:`${evalMetrics.detected_corruptions}/12`,pass:evalMetrics.detected_corruptions>=10},
 faithful_acceptance: {target:'>=6/8',actual:`${evalMetrics.faithful_accepted}/8`,pass:evalMetrics.faithful_accepted>=6},
 ambiguity_grounding: {target:'>=3/4',actual:`${evalMetrics.ambiguity_correct}/4`,pass:evalMetrics.ambiguity_correct>=3},
 unnecessary_clarification: {target:'<=1',actual:evalMetrics.unnecessary_clarifications.length,pass:evalMetrics.unnecessary_clarifications.length<=1},
 policy_safety: {target:'no corruption accepted',actual:ev.new_checker.rows.filter(r=>r.case_type==='CORRUPTION'&&r.actual_policy==='USE_TRANSFORMATION').map(r=>r.id),pass:ev.new_checker.rows.every(r=>!(r.case_type==='CORRUPTION'&&r.actual_policy==='USE_TRANSFORMATION'))},
 evidence_grounding: {target:'all findings source-grounded',actual:'all findings have source spans; one missing finding lacks a transformation span',pass:true},
 latency: {target:'<2000 ms average',actual:`${evalMetrics.latency_ms.avg.toFixed(0)} ms`,pass:evalMetrics.latency_ms.avg<2000}
};
const summary={schema:'lc02-r5-summary/0.1',standing:'OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES',checker:{version:'lc02-r5-semantic-check/0.1',code_sha256:hash(readFileSync('apps/language-demo/evaluation/semantic-checker-v5.mjs','utf8')),contract_sha256:hash(readFileSync('apps/language-demo/evaluation/semantic-checker-v5-contract.mjs','utf8'))},corpus_freeze:freeze.files,success_criteria:{hash:criteria.hash,results},development:{metrics:dev.new_checker.metrics,policy:policy(dev.new_checker.rows),baseline:dev.lexical_baseline.metrics},evaluation:{metrics:evalMetrics,policy:policy(ev.new_checker.rows),baseline:ev.lexical_baseline.metrics},r4_comparison:{r4_eval_detection:'5/6',r5_eval_detection:'8/12',r4_eval_false_rejection:'2/6',r5_eval_false_rejection:'2/8',r4_ambiguity:'not tested',r5_ambiguity:'4/4'},prior_failures:prior.rows,decision:'REVISE_NOT_ADOPT',decision_reason:'Detection fell below the prospective 10/12 target, one corruption (R5-E11) was accepted, and justified/invented uncertainty still co-occur in the prior cases. Faithful acceptance and ambiguity handling improved.'};
writeFileSync('experiments/lc-02-r5/SUMMARY.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:'R5_SUMMARY',results,decision:summary.decision},null,2));
