import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,appendFileSync} from 'node:fs';
import {resolve,join,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadSettings} from '../../apps/language-demo/server/settings.mjs';
import {UnderstandingCompiler,interpretationProfile} from '../../core/understanding/adapter.mjs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {orderedArms} from '../lc-02-batch20/protocol.mjs';
import {executeArm} from '../lc-02-batch20/engine.mjs';
import {writeFreshReports} from '../lc-02-batch20-r2/fresh-report.mjs';
import {analyzeLive} from './analyze-live.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){const key=args[i];if(['--approval','--protocol','--out','--max-remote-requests','--seed'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);}
const approvalPath=resolve(opts['--approval']??'experiments/lc-02-batch20-r3/EXPLORATORY-APPROVAL-V2.json');
const protocolPath=resolve(opts['--protocol']??'experiments/lc-02-batch20-r3/EXPLORATORY-PROTOCOL-V2.json');
const out=resolve(opts['--out']??'experiments/lc-02-batch20-r3/.runs/LIVE-V2-001');
const max=Number(opts['--max-remote-requests']??80);const seed=opts['--seed']??'lc02-r3-live-v1';
if(!Number.isInteger(max)||max<80||max>100)throw Error('MAX_REMOTE_REQUESTS_80_TO_100');
const approval=JSON.parse(readFileSync(approvalPath,'utf8'));
const protocol=JSON.parse(readFileSync(protocolPath,'utf8'));
const designPath=resolve(protocol.design.path);const design=JSON.parse(readFileSync(designPath,'utf8'));
const r2=JSON.parse(readFileSync(protocol.r2_protocol.path,'utf8'));

function verify(obj,label){const {hash:stored,...body}=obj;if(stored!==hash(body))throw Error(label+'_HASH_MISMATCH');}
verify(approval,'APPROVAL');verify(protocol,'PROTOCOL');
const designBody={...design,freeze:{...design.freeze,design_sha256:null}};
if(design.freeze.design_sha256!==hash(designBody))throw Error('DESIGN_HASH_MISMATCH');
if(approval.design.sha256!==design.freeze.design_sha256)throw Error('APPROVAL_DESIGN_MISMATCH');
if(approval.status!=='APPROVED'||approval.exploratory_live_authorized!==true)throw Error('EXPLICIT_APPROVAL_REQUIRED');
for(const k of ['approved_by','approved_at','approval_statement'])if(!approval[k])throw Error('APPROVAL_FIELD_MISSING '+k);
if(protocol.live_execution_authorized!==true)throw Error('PROTOCOL_NOT_AUTHORIZED');
if(protocol.approval.hash!==approval.hash||protocol.approval.status!=='APPROVED')throw Error('PROTOCOL_APPROVAL_MISMATCH');
if(protocol.design.sha256!==design.freeze.design_sha256)throw Error('DESIGN_HASH_MISMATCH');
if(protocol.r2_protocol.hash!==r2.hash)throw Error('R2_PROTOCOL_MISMATCH');
if(protocol.execution.cases!==16||protocol.execution.planned_calls!==80||protocol.execution.maximum_calls!==100)throw Error('EXECUTION_SCOPE_MISMATCH');
if(design.execution_status!=='NOT_RUN')throw Error('DESIGN_ALREADY_RUN');
if(!process.env.OPENCODE_API_KEY?.trim())throw Error('OPENCODE_API_KEY_UNAVAILABLE');
if(existsSync(out))throw Error('OUTPUT_ALREADY_EXISTS');
mkdirSync(dirname(out),{recursive:true});mkdirSync(out,{recursive:false});
const settings=loadSettings(resolve('apps/language-demo/.settings/studio-v2.json'));
const compiler=new UnderstandingCompiler({python:settings.understanding?.python_executable||undefined,timeout_ms:settings.understanding?.timeout_ms??15000});
const cases=design.cases.map(c=>({...c,split:'fresh_evaluation',source_id:c.id+'-source-v1',question_id:c.id+'-question-v1',question_scope:c.scope}));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const metadata={schema:'lc02-r3-exploratory-live/0.1',mode:'live',standing:'EXPLORATORY_LIVE_UNADJUDICATED',design:{path:protocol.design.path,sha256:design.freeze.design_sha256,version:design.version},approval:{path:relative(root,approvalPath),hash:approval.hash,approved_by:approval.approved_by,approved_at:approval.approved_at},protocol:{path:relative(root,protocolPath),hash:protocol.hash},r2_protocol:{path:protocol.r2_protocol.path,hash:r2.hash},seed,cases:cases.length,planned_calls:80,maximum_requests:max,absolute_request_ceiling:100,automatic_retries:0,fallback:false,resume:false,post_result_tuning:false,models:settings.roles,compiler:compiler.identity(),profiles:Object.fromEntries(['technical-policy','general'].map(p=>[p,interpretationProfile(p)])),started_at:new Date().toISOString()};
writeFileSync(join(out,'manifest.json'),JSON.stringify({...metadata,hosted_requests:0,reserved_usd:0},null,2)+'\n');
let total=0,reserved=0,fatal=null;const caseCalls=new Map();
const chargeFor=(caseId,arm)=>request=>{
 const amount=Number(request.reservation_usd??0);
 const prior=(caseCalls.get(caseId)??0)+1;caseCalls.set(caseId,prior);
 if(total+1>max||total+1>100){fatal='REQUEST_CAP_EXCEEDED';throw Error(fatal);}
 if(prior>5){fatal='CASE_REQUEST_CAP_EXCEEDED';throw Error(fatal);}
 if(reserved+amount>Number(settings.limits.budget_usd)){fatal='BUDGET_CAP_EXCEEDED';throw Error(fatal);}
 total++;reserved+=amount;
 appendFileSync(join(out,'LIVE-REQUEST-LEDGER.jsonl'),JSON.stringify({at:new Date().toISOString(),case_id:caseId,arm,role:request.role,model:request.model,session_id:request.session_id,request_hash:request.hash??request.prompt_hash??null,reservation_usd:amount})+'\n');
};
const records=[];
try{
 for(const c of cases){
  const row={id:c.id,case_class:c.case_class,scope:c.scope,expected:c.expected_decision,arms:{},order:orderedArms(c.id,seed)};
  mkdirSync(join(out,'cases',c.id),{recursive:true});
  for(const arm of row.order){
   const armProfile=structuredClone(settings);armProfile.understanding={...armProfile.understanding,profile:c.profile};
   const result=await executeArm({c,arm,profile:armProfile,out:join(out,'cases',c.id,arm),live:true,charge:chargeFor(c.id,arm),env:process.env});
   row.arms[arm]=result;
   console.log(JSON.stringify({case:c.id,arm,status:result.status,decision:result.output?.decision??null,requests:total}));
   if(fatal)throw Error(fatal);
  }
  records.push(row);
  writeFileSync(join(out,'progress.json'),JSON.stringify({status:'RUNNING',cases_done:records.length,requests:total,reserved_usd:reserved,last_case:c.id},null,2)+'\n');
 }
 metadata.ended_at=new Date().toISOString();metadata.hosted_requests=total;metadata.reserved_usd=reserved;
 const report=writeFreshReports({out,frozen:design,cases,records,metadata});
 const analysis=analyzeLive(out);
 writeFileSync(join(out,'manifest.json'),JSON.stringify({...metadata,mechanical:report.checks,analysis_summary:{unnecessary_abstention_candidates:analysis.unnecessary_abstention_candidates.length,missing_condition_candidates:analysis.missing_condition_candidates.length,c_only_better:analysis.c_only_better.length,c_only_worse:analysis.c_only_worse.length,ties_correct:analysis.ties_correct.length,ties_wrong:analysis.ties_wrong.length,mechanical_failures:analysis.mechanical_failures.length}},null,2)+'\n');
 const hashes={};const walk=p=>{for(const e of readdirSync(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())walk(f);else if(e.name!=='artifact-hashes.json')hashes[relative(out,f).replaceAll('\\','/')]=sha(readFileSync(f));}};walk(out);writeFileSync(join(out,'artifact-hashes.json'),JSON.stringify({schema:'lc02-r3-live-artifacts/0.1',files:hashes},null,2)+'\n');
 console.log(JSON.stringify({status:'LIVE_COMPLETE',cases:records.length,hosted_requests:total,reserved_usd:reserved,out,failures:report.checks.filter(c=>c.status==='FAIL').length}));
}catch(e){
 metadata.ended_at=new Date().toISOString();metadata.hosted_requests=total;metadata.reserved_usd=reserved;metadata.status='STOPPED';metadata.fatal=e.message;
 writeFileSync(join(out,'progress.json'),JSON.stringify({status:'STOPPED',cases_done:records.length,requests:total,reserved_usd:reserved,error:e.message},null,2)+'\n');
 writeFileSync(join(out,'manifest.json'),JSON.stringify(metadata,null,2)+'\n');
 throw e;
}
