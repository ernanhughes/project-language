import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {checkTransformation,checkLexicalBaseline,policyDecision} from '../../apps/language-demo/evaluation/semantic-checker.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){const key=args[i];if(['--split','--out'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);}
const split=opts['--split']??'development';if(!['development','evaluation'].includes(split))throw Error('SPLIT');
const out=resolve(opts['--out']??`experiments/lc-02-r4/.runs/${split.toUpperCase()}-001`);
const base='experiments/lc-02-r4/fixtures';
const freeze=JSON.parse(readFileSync(`${base}/FREEZE.json`,'utf8'));
for(const [file,expected] of Object.entries(freeze.files)){const actual=hash(readFileSync(`${base}/${file}`,'utf8'));if(actual!==expected)throw Error('FROZEN_CORPUS_DRIFT '+file);}
const cases=JSON.parse(readFileSync(`${base}/${split}-cases.json`,'utf8')).cases;
const refs=JSON.parse(readFileSync(`${base}/${split}-references.json`,'utf8')).cases;

function matchFinding(expected,actual){return actual.some(f=>f.type===expected.type&&f.distinction===expected.distinction&&f.source_spans.some(s=>s.text.includes(expected.source_quote)||expected.source_quote.includes(s.text)));}
function material(f){return ['MISSING_CANDIDATE','CHANGED_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE'].includes(f.type)&&f.severity==='MATERIAL';}
async function runOne(c,method){
 const input={source:{id:`${c.id}-source`,text:c.source,hash:hash(c.source)},transformation:{id:`${c.id}-transformation`,text:c.transformation,hash:hash(c.transformation)},context:{purpose:c.purpose},obligations:c.obligations,profile:c.profile,method:method==='baseline'?'LEXICAL_BASELINE':'HEURISTIC_SOURCE_ALIGNMENT'};
 const start=performance.now();const output=method==='baseline'?await checkLexicalBaseline(input):await checkTransformation(input);const latency=performance.now()-start;
 const ref=refs.find(r=>r.id===c.id);
 const matched=ref.expected_findings.map(e=>({expected:e,matched:matchFinding(e,output.findings)}));
 const detected=matched.every(x=>x.matched);
 const policy=policyDecision(output);
 const materialFindings=output.findings.filter(material);
 return {id:c.id,faithful:c.faithful,corruption_class:c.corruption_class,expected_policy:ref.expected_policy,actual_policy:policy,policy_correct:policy===ref.expected_policy,detected,matched,material_findings:materialFindings.map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans.map(s=>s.text),reason:f.reason})),findings:output.findings.map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans.map(s=>s.text),transformation_spans:f.transformation_spans.map(s=>s.text),reason:f.reason,confidence:f.confidence})),latency_ms:latency,output};
}
function metrics(rows){
 const corr=rows.filter(r=>!r.faithful),faith=rows.filter(r=>r.faithful);
 return {cases:rows.length,corruption_cases:corr.length,detected_corruptions:corr.filter(r=>r.detected).length,missed_corruptions:corr.filter(r=>!r.detected).map(r=>r.id),detection_rate:corr.length?corr.filter(r=>r.detected).length/corr.length:null,faithful_cases:faith.length,false_rejections:faith.filter(r=>r.actual_policy==='PRESERVE_SOURCE').length,false_alarm_rate:faith.length?faith.filter(r=>r.actual_policy==='PRESERVE_SOURCE').length/faith.length:null,faithful_accepted:faith.filter(r=>r.actual_policy==='USE_TRANSFORMATION').length,policy_correct:rows.filter(r=>r.policy_correct).length,policy_accuracy:rows.length?rows.filter(r=>r.policy_correct).length/rows.length:null,abstentions:rows.filter(r=>r.actual_policy==='REQUEST_CLARIFICATION').map(r=>r.id),latency_ms:{avg:rows.reduce((n,r)=>n+r.latency_ms,0)/rows.length,max:Math.max(...rows.map(r=>r.latency_ms))}};
}
const newRows=[],baseRows=[];
for(const c of cases){newRows.push(await runOne(c,'new'));baseRows.push(await runOne(c,'baseline'));}
const result={schema:'language-semantic-checker-results/0.1',standing:'OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES',split,corpus_freeze:freeze.files,new_checker:{metrics:metrics(newRows),rows:newRows.map(({output,...r})=>r)},lexical_baseline:{metrics:metrics(baseRows),rows:baseRows.map(({output,...r})=>r)}};
mkdirSync(out,{recursive:true});
writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');
writeFileSync(`${out}/results.md`,render(result));
console.log(JSON.stringify({status:'CHECKER_RUN_COMPLETE',split,out,new:result.new_checker.metrics,baseline:result.lexical_baseline.metrics},null,2));

function render(result){const lines=[`# Semantic checker — ${result.split}`,'',`**Standing:** ${result.standing}. References are author-constructed provisional, not independent human adjudication.`,'','## New checker','',metricTable(result.new_checker.metrics),'','## Lexical baseline','',metricTable(result.lexical_baseline.metrics),'','## Cases','','| Case | Faithful | Expected policy | New policy | Detected | Expected findings | Material findings |','|---|---|---|---|---|---|---|'];for(const r of result.new_checker.rows)lines.push(`| ${r.id} | ${r.faithful} | ${r.expected_policy} | ${r.actual_policy} | ${r.detected} | ${r.matched.map(m=>(m.matched?'✓':'✗')+' '+m.expected.type+'/'+m.expected.distinction).join('<br>')} | ${r.material_findings.map(f=>f.type+'/'+f.distinction).join('<br>')||'none'} |`);lines.push('','## Misses and false alarms','','### Missed corruptions','');const missed=result.new_checker.rows.filter(r=>!r.faithful&&!r.detected);if(!missed.length)lines.push('None.');else for(const r of missed)lines.push(`- **${r.id}** (${r.corruption_class}): expected ${r.expected_policy}, new ${r.actual_policy}.`);lines.push('','### False rejections of faithful controls','');const fr=result.new_checker.rows.filter(r=>r.faithful&&r.actual_policy==='PRESERVE_SOURCE');if(!fr.length)lines.push('None.');else for(const r of fr)lines.push(`- **${r.id}**: ${r.material_findings.map(f=>f.type+'/'+f.distinction).join(', ')}`);return lines.join('\n')+'\n';}
function metricTable(m){return `| Metric | Value |\n|---|---|\n| Cases | ${m.cases} |\n| Corruption detection | ${m.detected_corruptions}/${m.corruption_cases} (${m.detection_rate==null?'n/a':(m.detection_rate*100).toFixed(1)+'%'}) |\n| Faithful accepted | ${m.faithful_accepted}/${m.faithful_cases} |\n| False rejections | ${m.false_rejections}/${m.faithful_cases} (${m.false_alarm_rate==null?'n/a':(m.false_alarm_rate*100).toFixed(1)+'%'}) |\n| Policy accuracy | ${m.policy_correct}/${m.cases} (${m.policy_accuracy==null?'n/a':(m.policy_accuracy*100).toFixed(1)+'%'}) |\n| Latency avg / max | ${m.latency_ms.avg.toFixed(0)} ms / ${m.latency_ms.max.toFixed(0)} ms |`;}
