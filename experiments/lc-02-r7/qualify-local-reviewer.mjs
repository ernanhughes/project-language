import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {LocalOllamaReviewer} from '../../apps/language-demo/evaluation/semantic-reviewer-v7.mjs';

const out='experiments/lc-02-r7/.runs/QUALIFICATION-001';mkdirSync(out,{recursive:true});
const r6=JSON.parse(readFileSync('experiments/lc-02-r6/fixtures/evaluation-cases.json','utf8')).cases;
const ids=['R6-E05','R6-E08','R6-E13'];
const reviewer=new LocalOllamaReviewer({model:'qwen3.5:latest',maxRequests:6,timeoutMs:120000,numPredict:1400});
const discovery=await reviewer.discover();
const checks=[];
for(const id of ids){
 const c=r6.find(x=>x.id===id);
 const started=performance.now();
 try{
  const result=await reviewer.review({source:{id:c.id+'-source',text:c.source,hash:hash(c.source)},transformation:{id:c.id+'-transformation',text:c.transformation,hash:hash(c.transformation)},purpose:c.purpose,obligations:c.obligations});
  checks.push({id,status:'PASS',json:'VALID',evidence:'EXACT',assessments:result.output.assessments.length,abstentions:result.output.abstentions.length,latency_ms:result.latency_ms,usage:result.usage,summary:result.output.summary});
 }catch(e){checks.push({id,status:'FAIL',error:e.message,latency_ms:performance.now()-started});}
}
const passed=checks.filter(c=>c.status==='PASS').length;
const qualification={schema:'lc02-r7-local-model-qualification/0.1',standing:'LOCAL_MODEL_OBSERVATION',created:'2026-10-24',model:discovery.metadata,prompt_version:'lc02-r7-review-prompt/0.4',reviewer_version:'lc02-r7-local-review/0.1',cases:checks.length,passed,failed:checks.length-passed,status:passed===checks.length?'QUALIFIED_FOR_BOUNDED_EXPERIMENT':'NOT_QUALIFIED',checks};
writeFileSync(`${out}/qualification.json`,JSON.stringify(qualification,null,2)+'\n');
writeFileSync(`${out}/qualification-ledger.json`,JSON.stringify({model:discovery.metadata,records:reviewer.records},null,2)+'\n');
console.log(JSON.stringify(qualification,null,2));
