import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {checkTransformation,policyAssessment} from '../../apps/language-demo/evaluation/semantic-checker-v6.mjs';
import {LocalOllamaReviewer,ScriptedReviewer} from '../../apps/language-demo/evaluation/semantic-reviewer-v7.mjs';
import {mapReviewerAssessment,reconcile,reviewerPolicyFromFindings} from '../../apps/language-demo/evaluation/hybrid-checker-v7.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const args=process.argv.slice(2),opts={};
for(let i=0;i<args.length;i++){const key=args[i];if(['--split','--out','--reviewer'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);}
const split=opts['--split']??'development';if(!['development','evaluation'].includes(split))throw Error('SPLIT');
const reviewerMode=opts['--reviewer']??'local';
const out=resolve(opts['--out']??`experiments/lc-02-r7/.runs/${split.toUpperCase()}-001`);
const base='experiments/lc-02-r7/fixtures';
const freeze=JSON.parse(readFileSync(`${base}/FREEZE.json`,'utf8'));
for(const [file,expected] of Object.entries(freeze.files)){const actual=hash(readFileSync(`${base}/${file}`,'utf8'));if(actual!==expected)throw Error('FROZEN_CORPUS_DRIFT '+file);}
const cases=JSON.parse(readFileSync(`${base}/${split}-cases.json`,'utf8')).cases;
const refs=JSON.parse(readFileSync(`${base}/${split}-references.json`,'utf8')).cases;
const refFor=id=>refs.find(r=>r.id===id);

function quoteMatch(expectedQuote,spans){if(!expectedQuote)return true;return spans.some(s=>s.text.includes(expectedQuote)||expectedQuote.includes(s.text));}
function match(expected,findings){
 const candidates=findings.filter(f=>f.type===expected.type&&f.distinction===expected.distinction);
 const source=candidates.some(f=>quoteMatch(expected.source_quote,f.source_spans));
 const transformation=candidates.some(f=>quoteMatch(expected.transformation_quote,f.transformation_spans));
 return {source,transformation,matched:source&&transformation};
}
function assess(findings,ref){
 const matched=ref.expected_findings.map(e=>({expected:e,...match(e,findings)}));
 return {detected:matched.every(x=>x.matched),matched};
}
function material(f){return f.severity==='MATERIAL'&&['CHANGED_CANDIDATE','MISSING_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE'].includes(f.type);}
function classify(actual,expected){return actual===expected?'CORRECT':actual==='REQUEST_CLARIFICATION'?'UNNECESSARY_CLARIFICATION':actual==='PRESERVE_SOURCE'?'FALSE_REJECTION':actual==='USE_TRANSFORMATION'?'FALSE_ACCEPT':'OTHER';}

const reviewer=reviewerMode==='local'?new LocalOllamaReviewer({model:'qwen3.5:latest',maxRequests:80,timeoutMs:120000,numPredict:1400}):new ScriptedReviewer();
if(reviewerMode==='local')await reviewer.discover();

const rows=[];
for(const c of cases){
 const source={id:c.id+'-source',text:c.source,hash:hash(c.source)};
 const transformation={id:c.id+'-transformation',text:c.transformation,hash:hash(c.transformation)};
 const input={source,transformation,context:{purpose:c.purpose},obligations:c.obligations,profile:c.profile};
 const ref=refFor(c.id);
 const detStarted=performance.now();
 const deterministic=await checkTransformation(input);
 const detLatency=performance.now()-detStarted;
 const detPolicy=policyAssessment(deterministic);
 const detAssess=assess(deterministic.findings,ref);
 let review=null,reviewStatus='UNAVAILABLE',reviewError=null,reviewResult=null;
 const started=performance.now();
 try{
  reviewResult=await reviewer.review({source,transformation,purpose:c.purpose,obligations:c.obligations});
  review=reviewResult.output;reviewStatus=review.standing==='SCRIPTED_TEST_FIXTURE'?'SCRIPTED':'VALID';
 }catch(e){reviewError=e.message;reviewStatus=e.message.includes('QUOTE')||e.message.includes('SCHEMA')||e.message.includes('MALFORMED')?'INVALID_EVIDENCE':'UNAVAILABLE';}
 const reviewLatency=performance.now()-started;
 const mapped=review?review.assessments.map(a=>mapReviewerAssessment(a,{source,transformation})):[];
 const revPolicy=review&&reviewStatus==='VALID'?reviewerPolicyFromFindings(mapped,{valid:true}):{outcome:'REQUEST_CLARIFICATION',reason:'No valid model-assisted review.',basis:{material:[],uncertain:[],positive:false}};
 const revAssess=assess(mapped,ref);
 const hybrid=reconcile({source,transformation,deterministic,reviewer:review,reviewerStatus:reviewStatus});
 const hybAssess=assess(hybrid.combined_findings,ref);
 const hybPrimary=assess(hybrid.primary_findings,ref);
 rows.push({
  id:c.id,case_type:c.case_type,corruption_class:c.corruption_class,expected_policy:ref.expected_policy,expected_findings:ref.expected_findings,
  deterministic:{policy:detPolicy.outcome,policy_class:classify(detPolicy.outcome,ref.expected_policy),detected:detAssess.detected,matched:detAssess.matched,findings:deterministic.findings,material:deterministic.findings.filter(material),constraints:deterministic.constraints,latency_ms:detLatency},
  reviewer:{status:reviewStatus,error:reviewError,policy:revPolicy.outcome,policy_class:classify(revPolicy.outcome,ref.expected_policy),detected:revAssess.detected,matched:revAssess.matched,assessments:review?.assessments??[],abstentions:review?.abstentions??[],summary:review?.summary??null,mapped: mapped.map(f=>({type:f.type,distinction:f.distinction,severity:f.severity,source_spans:f.source_spans.map(s=>s.text),transformation_spans:f.transformation_spans.map(s=>s.text),reason:f.reason,change_kind:f.change_kind,epistemic_direction:f.epistemic_direction})),latency_ms:reviewLatency,usage:reviewResult?.usage??null},
  hybrid:{policy:hybrid.policy.outcome,policy_class:classify(hybrid.policy.outcome,ref.expected_policy),detected:hybAssess.detected,matched:hybAssess.matched,primary_detected:hybPrimary.detected,primary_matched:hybPrimary.matched,findings:hybrid.combined_findings,primary_findings:hybrid.primary_findings,disagreements:hybrid.disagreements,reviewer_status:hybrid.reviewer_status,latency_ms:detLatency+reviewLatency},
  source,transformation
 });
}
function metrics(rows,key){
 const corr=rows.filter(r=>r.case_type==='CORRUPTION'),faith=rows.filter(r=>r.case_type==='FAITHFUL'),amb=rows.filter(r=>r.case_type==='AMBIGUITY');
 const get=r=>r[key];
 const corrDet=corr.filter(r=>get(r).detected).length;
 const falseAccepts=corr.filter(r=>get(r).policy==='USE_TRANSFORMATION').map(r=>r.id);
 const falseRejects=faith.filter(r=>get(r).policy==='PRESERVE_SOURCE').map(r=>r.id);
 const justified=amb.filter(r=>r.expected_policy==='REQUEST_CLARIFICATION');
 const invented=corr.filter(r=>['INVENTED_UNCERTAINTY'].includes(r.corruption_class));
 const missing=corr.filter(r=>r.corruption_class==='MISSING_PREREQUISITE');
 const exception=corr.filter(r=>r.corruption_class==='BROADENED_EXCEPTION');
 const causal=corr.filter(r=>r.corruption_class==='UNSUPPORTED_CAUSAL');
 const epistemic=corr.filter(r=>r.corruption_class==='UNKNOWN_TO_ESTABLISHED_FACT');
 const grounded=rows.filter(r=>get(r).matched.every(m=>m.source)).length;
 const latency=rows.map(r=>get(r).latency_ms??0);
 const usage=key==='reviewer'?rows.reduce((acc,r)=>{const u=r.reviewer.usage??{};acc.input+=u.input_tokens??0;acc.output+=u.output_tokens??0;return acc;},{input:0,output:0}):null;
 return {cases:rows.length,corruption_cases:corr.length,detected_corruptions:corrDet,missed_corruptions:corr.filter(r=>!get(r).detected).map(r=>r.id),detection_rate:corr.length?corrDet/corr.length:null,false_acceptances:falseAccepts,faithful_cases:faith.length,faithful_accepted:faith.filter(r=>get(r).policy==='USE_TRANSFORMATION').length,false_rejections:falseRejects,unnecessary_clarifications:rows.filter(r=>get(r).policy==='REQUEST_CLARIFICATION'&&r.expected_policy!=='REQUEST_CLARIFICATION').map(r=>r.id),ambiguity_cases:amb.length,ambiguity_correct:amb.filter(r=>get(r).policy==='REQUEST_CLARIFICATION').length,justified_uncertainty_clean:justified.filter(r=>get(r).detected).map(r=>r.id),invented_uncertainty_clean:invented.filter(r=>get(r).detected).map(r=>r.id),missing_condition_correct:missing.filter(r=>get(r).detected).map(r=>r.id),exception_scope_correct:exception.filter(r=>get(r).detected).map(r=>r.id),causal_correct:causal.filter(r=>get(r).detected).map(r=>r.id),epistemic_correct:epistemic.filter(r=>get(r).detected).map(r=>r.id),source_grounded:grounded,policy_correct:rows.filter(r=>get(r).policy===r.expected_policy).length,policy_accuracy:rows.length?rows.filter(r=>get(r).policy===r.expected_policy).length/rows.length:null,reviewer_errors:key==='reviewer'?rows.filter(r=>r.reviewer.status!=='VALID').map(r=>r.id):undefined,disagreements:key==='hybrid'?rows.reduce((n,r)=>n+r.hybrid.disagreements.length,0):undefined,latency_ms:{avg:latency.reduce((a,b)=>a+b,0)/latency.length,max:Math.max(...latency)},usage};
}
const result={schema:'lc02-r7-three-way/0.1',standing:'OFFLINE_EXPLORATORY_PROVISIONAL_REFERENCES',split,corpus_freeze:freeze.files,reviewer_mode:reviewerMode,reviewer_model:reviewer.metadata,reviewer_prompt_version:'lc02-r7-review-prompt/0.4',deterministic_version:'lc02-r6-semantic-check/0.1',metrics:{A:metrics(rows,'deterministic'),B:metrics(rows,'reviewer'),C:metrics(rows,'hybrid')},rows,reviewer_ledger:reviewer.records};
mkdirSync(out,{recursive:true});
writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2)+'\n');
writeFileSync(`${out}/results.md`,render(result));
if(reviewerMode==='local')writeFileSync(`${out}/reviewer-ledger.json`,JSON.stringify({schema:'lc02-r7-review-ledger/0.1',model:reviewer.metadata,prompt_version:'lc02-r7-review-prompt/0.4',records:reviewer.records},null,2)+'\n');
console.log(JSON.stringify({status:'R7_THREE_WAY_COMPLETE',split,reviewer_mode:reviewerMode,out,model:reviewer.metadata,A:result.metrics.A,B:result.metrics.B,C:result.metrics.C},null,2));

function render(r){
 const lines=[`# R7 three-way comparison — ${r.split}`,'',`**Reviewer:** ${r.reviewer_mode} ${r.reviewer_model?.id??''} (${r.reviewer_model?.provider??'none'})`,'',`**Standing:** ${r.standing}.`,'','## Metrics','', '| Metric | A: R6 deterministic | B: reviewer alone | C: hybrid |','|---|---:|---:|---:|'];
 const keys=[['Corruption detection',m=>`${m.detected_corruptions}/${m.corruption_cases}`],['False acceptances',m=>m.false_acceptances.join(', ')||'none'],['Faithful accepted',m=>`${m.faithful_accepted}/${m.faithful_cases}`],['False rejections',m=>m.false_rejections.join(', ')||'none'],['Unnecessary clarifications',m=>m.unnecessary_clarifications.join(', ')||'none'],['Ambiguity clarified',m=>`${m.ambiguity_correct}/${m.ambiguity_cases}`],['Missing-condition correct',m=>m.missing_condition_correct.join(', ')||'none'],['Exception-scope correct',m=>m.exception_scope_correct.join(', ')||'none'],['Causal correct',m=>m.causal_correct.join(', ')||'none'],['Epistemic correct',m=>m.epistemic_correct.join(', ')||'none'],['Source-grounded',m=>`${m.source_grounded}/${m.cases}`],['Policy correct',m=>`${m.policy_correct}/${m.cases}`],['Latency avg / max',m=>`${Math.round(m.latency_ms.avg)} / ${Math.round(m.latency_ms.max)} ms`]];
 for(const [label,fn] of keys)lines.push(`| ${label} | ${fn(r.metrics.A)} | ${fn(r.metrics.B)} | ${fn(r.metrics.C)} |`);
 lines.push('',`**Reviewer usage:** ${r.metrics.B.usage?`${r.metrics.B.usage.input} input tokens, ${r.metrics.B.usage.output} output tokens`:'not reported'}.`);
 lines.push('','## Case comparison','','| Case | Type | Expected | A policy | B policy | C policy | A det | B det | C det | C primary | Reviewer status |','|---|---|---|---|---|---|---|---|---|---|---|');
 for(const row of r.rows)lines.push(`| ${row.id} | ${row.case_type} | ${row.expected_policy} | ${row.deterministic.policy} | ${row.reviewer.policy} | ${row.hybrid.policy} | ${row.deterministic.detected} | ${row.reviewer.detected} | ${row.hybrid.detected} | ${row.hybrid.primary_detected} | ${row.reviewer.status} |`);
 lines.push('','## Reviewer failures and disagreements','');
 const failures=r.rows.filter(x=>x.reviewer.status!=='VALID');
 if(!failures.length)lines.push('No reviewer failures.');else for(const x of failures)lines.push(`- **${x.id}**: ${x.reviewer.status} — ${x.reviewer.error}`);
 const disagreements=r.rows.flatMap(x=>x.hybrid.disagreements.map(d=>({id:x.id,...d})));
 if(!disagreements.length)lines.push('','No reconciliation disagreements.');else{lines.push('','| Case | Kind | Deterministic | Reviewer | Note |','|---|---|---|---|---|');for(const d of disagreements)lines.push(`| ${d.id} | ${d.kind} | ${d.deterministic_finding_ids.join(', ')} | ${d.reviewer_finding_ids.join(', ')} | ${d.note} |`);}
 lines.push('','## Per-case reviewer detail','');
 for(const row of r.rows){lines.push(`### ${row.id}`,'',`- Expected: ${row.expected_policy}; ${row.expected_findings.map(e=>e.type+'/'+e.distinction).join(', ')}`,`- Reviewer: ${row.reviewer.status}; policy ${row.reviewer.policy}; detected ${row.reviewer.detected}; latency ${Math.round(row.reviewer.latency_ms)} ms`,`- Hybrid: ${row.hybrid.policy}; detected ${row.hybrid.detected}; primary ${row.hybrid.primary_detected}`);if(row.reviewer.summary)lines.push(`- Summary: ${row.reviewer.summary}`);if(row.reviewer.assessments.length)lines.push(`- Assessments: ${row.reviewer.assessments.map(a=>`${a.change_kind}/${a.epistemic_direction}/${a.material}`).join('; ')}`);}
 return lines.join('\n')+'\n';
}
