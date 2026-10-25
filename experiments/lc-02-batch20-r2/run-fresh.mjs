import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadSettings} from '../../apps/language-demo/server/settings.mjs';
import {UnderstandingCompiler,interpretationProfile} from '../../core/understanding/adapter.mjs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {orderedArms} from '../lc-02-batch20/protocol.mjs';
import {executeArm} from '../lc-02-batch20/engine.mjs';
import {writeFreshReports} from './fresh-report.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){const key=args[i];if(['--dry-run'].includes(key))opts[key]=true;else if(['--design','--out','--seed'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);}
const designPath=resolve(opts['--design']??'experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json');
const out=resolve(opts['--out']??'');if(!opts['--out'])throw Error('OUTPUT_REQUIRED');
const seed=opts['--seed']??'lc02-r2-dry-v1';
const design=JSON.parse(readFileSync(designPath,'utf8'));

function validateDesign(value){
 if(value.schema!=='language-fresh-evaluation-design/1.0')throw Error('FRESH_DESIGN_SCHEMA');
 if(value.execution_status!=='NOT_RUN')throw Error('FRESH_DESIGN_ALREADY_RUN');
 if(value.frozen_before_execution!==true)throw Error('FRESH_DESIGN_NOT_FROZEN');
 if(value.cases.length!==16||new Set(value.cases.map(c=>c.id)).size!==16)throw Error('FRESH_DESIGN_CASE_COUNT');
 const labels=new Set(['YES','NO','UNKNOWN','SOURCE_CONFLICT']),scopes=new Set(['SOURCE_RELATIVE','EXTERNAL_FACTUAL_VERIFICATION','ACTION_AUTHORITY']);
 for(const c of value.cases){
  if(!labels.has(c.expected_decision)||!scopes.has(c.scope))throw Error('FRESH_DESIGN_LABEL_OR_SCOPE '+c.id);
  if(!c.source?.trim()||!c.question?.trim())throw Error('FRESH_DESIGN_EMPTY '+c.id);
  for(const q of c.source_evidence_quotes??[])if(!c.source.includes(q))throw Error('FRESH_DESIGN_QUOTE '+c.id);
 }
 const body={...value,freeze:{...value.freeze,design_sha256:null}};
 if(value.freeze.design_sha256!==hash(body))throw Error('FRESH_DESIGN_HASH_MISMATCH');
 return value;
}
const frozen=validateDesign(design);
const cases=frozen.cases.map(c=>({...c,split:'fresh_evaluation',source_id:c.id+'-source-v1',question_id:c.id+'-question-v1',question_scope:c.scope,profile:c.profile,domain:c.domain,stressors:[c.case_class]}));
const profile=loadSettings(resolve('apps/language-demo/.settings/studio-v2.json'));
const compiler=new UnderstandingCompiler({python:profile.understanding?.python_executable||undefined,timeout_ms:profile.understanding?.timeout_ms??15000});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const metadata={schema:'lc02-r2-fresh-dry-run/0.1',mode:'offline',standing:'SCRIPTED_ENGINEERING_ONLY_NOT_MODEL_EVIDENCE',design_path:relative(root,designPath),design_sha256:frozen.freeze.design_sha256,seed,cases:cases.length,arms:['A_SOURCE_ONLY','B_AI_MEDIATED','C_UNDERSTANDING_ENHANCED'],planned_hosted_calls:80,scripted_calls_per_case:5,expected_scripted_calls:80,absolute_request_ceiling:100,hosted_requests:0,profiles:Object.fromEntries(['general','technical-policy'].map(p=>[p,interpretationProfile(p)])),compiler:compiler.identity(),roles:profile.roles,limits:profile.limits,contract_version:'lc02-r1/source-relative/1'};
if(existsSync(out))throw Error('OUTPUT_ALREADY_EXISTS');
mkdirSync(dirname(out),{recursive:true});mkdirSync(out,{recursive:false});
const records=[];
for(const c of cases){
 const row={id:c.id,case_class:c.case_class,scope:c.scope,expected:c.expected_decision,arms:{},order:orderedArms(c.id,seed)};
 for(const arm of row.order){
  const armProfile=structuredClone(profile);armProfile.understanding={...armProfile.understanding,profile:c.profile};
  mkdirSync(join(out,'cases',c.id),{recursive:true});
  const result=await executeArm({c,arm,profile:armProfile,out:join(out,'cases',c.id,arm),live:false,charge:()=>{},env:{},scriptedAnswer:(cc,aa)=>scriptedAnswer(cc,aa)});
  row.arms[arm]=result;
  console.log(JSON.stringify({case:c.id,arm,status:result.status,decision:result.output?.decision??null}));
 }
 records.push(row);
}
const scriptedRequests=records.reduce((n,row)=>n+Object.keys(row.arms).reduce((m,arm)=>m+recordEvents(row.id,arm).filter(e=>e.type==='SCRIPTED_REQUEST').length,0),0);
metadata.actual_scripted_requests=scriptedRequests;
metadata.case_count=records.length;
const report=writeFreshReports({out,frozen,cases,records,metadata,root});
writeFileSync(join(out,'manifest.json'),JSON.stringify({...metadata,mechanical:report.checks},null,2)+'\n');
const hashes={};const walk=p=>{for(const e of readdirSync(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())walk(f);else if(e.name!=='artifact-hashes.json')hashes[relative(out,f).replaceAll('\\','/')]=sha(readFileSync(f));}};walk(out);writeFileSync(join(out,'artifact-hashes.json'),JSON.stringify({schema:'lc02-r2-fresh-artifacts/0.1',files:hashes},null,2)+'\n');
console.log(JSON.stringify({status:'DRY_RUN_COMPLETE',cases:records.length,scripted_requests:scriptedRequests,hosted_requests:0,out,failures:report.checks.filter(c=>c.status==='FAIL').length}));

function scriptedAnswer(c,arm){
 const first=c.source.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()??c.source;
 const citations=c.id==='R1E-01'&&arm==='A_SOURCE_ONLY'?[{origin:'ORIGINAL_SOURCE',source_id:c.source_id,source_hash:'',start:0,end:first.length,text:first}]:[];
 return {decision:'UNKNOWN',explanation:'Scripted dry-run control; not a semantic answer or oracle prediction.',citations};
}
function recordEvents(cid,arm){
 const p=join(out,'cases',cid,arm,'events.jsonl');if(!existsSync(p))return [];
 return readFileSync(p,'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));
}
