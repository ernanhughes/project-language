import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync,openSync,closeSync,unlinkSync} from 'node:fs';import {resolve,join,relative,dirname} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Runtime} from '../../apps/language-demo/models/runtime.mjs';import {loadSettings} from '../../apps/language-demo/server/settings.mjs';import {Log} from '../../apps/language-demo/storage/log.mjs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';import {UnderstandingCompiler,interpretationProfile} from '../../core/understanding/adapter.mjs';
import {validateSuite,validateOracle,orderedArms,readJSON,arms} from './protocol.mjs';import {executeArm} from './engine.mjs';import {writeReports} from './report.mjs';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){const key=args[i];if(['--dry-run'].includes(key))opts[key]=true;else if(['--suite','--oracle','--mode','--split','--out','--seed','--max-remote-requests','--freeze','--freeze-out','--concurrency'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);}
const mode=opts['--mode']??'offline',split=opts['--split']??'development',out=resolve(opts['--out']??'');if(!opts['--out']||!['offline','live'].includes(mode)||!['all','development','evaluation'].includes(split))throw Error('MODE_SPLIT_OUTPUT_REQUIRED');
const max=Number(opts['--max-remote-requests']??100);if(!Number.isInteger(max)||max<1||max>120)throw Error('REQUEST_CAP_1_TO_120');
const seed=opts['--seed']??'lc02-batch20-v1';const concurrency=Number(opts['--concurrency']??2);if(!Number.isInteger(concurrency)||concurrency<1||concurrency>2)throw Error('CONCURRENCY_1_OR_2');
const suitePath=resolve(opts['--suite']??'experiments/lc-02-batch20/fixtures/lc02-20-tests.json'),oraclePath=resolve(opts['--oracle']??'experiments/lc-02-batch20/fixtures/lc02-20-oracle.json');
const suite=validateSuite(readJSON(suitePath)),oracle=readJSON(oraclePath),referenceCounts=validateOracle(suite,oracle),selected=suite.cases.filter(c=>split==='all'||c.split===split);
if(mode==='live'&&!opts['--dry-run']&&split==='all')throw Error('LIVE_DEVELOPMENT_THEN_SEPARATE_FROZEN_EVALUATION_REQUIRED');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function sourceHashes(){const dirs=['experiments/lc-02-batch20','apps/language-demo/models','apps/language-demo/evaluation','core/evidence/src','apps/language-demo/engine','apps/language-demo/protocol','apps/language-demo/storage','apps/language-demo/understanding','apps/language-demo/config','core/understanding'];const files={};const walk=p=>{for(const e of readdirSync(p,{withFileTypes:true})){if(['.runs','__pycache__','.pytest_cache','tests','evidence','qualification'].includes(e.name))continue;const f=join(p,e.name);if(e.isDirectory())walk(f);else if(/\.(mjs|js|py|json|toml|ts)$/.test(e.name))files[relative(root,f).replaceAll('\\','/')]=sha(readFileSync(f));}};dirs.forEach(d=>walk(resolve(d)));for(const p of ['apps/language-demo/server/settings.mjs','package.json','package-lock.json'])if(existsSync(p))files[p]=sha(readFileSync(p));return files;}
const profile=loadSettings(resolve('apps/language-demo/.settings/studio-v2.json'));
const compiler=new UnderstandingCompiler({python:profile.understanding?.python_executable||undefined,timeout_ms:profile.understanding?.timeout_ms??15000});
const runtime=new Runtime({env:{},directExecution:true,settings:profile.limits});runtime.configure(profile.roles);await runtime.discover();
const identity={schema:'lc02-batch20-prospective-freeze/0.1',suite_sha256:sha(readFileSync(suitePath)),oracle_sha256:sha(readFileSync(oraclePath)),source_hashes:sourceHashes(),profile,profiles:Object.fromEntries(['general','technical-policy'].map(p=>[p,interpretationProfile(p)])),compiler:compiler.identity(),seed,models:runtime.models.filter(m=>Object.values(profile.roles).includes(m.id)),grading:'exact decision agreement against UNADJUDICATED_REFERENCE; semantic fields NOT_ASSESSED; paired invalid outputs UNASSESSABLE',failure_policy:'No automatic retries/fallback/normalization; failed arm preserved; other arms continue; no resume calls',maximum_experiment_requests:120,per_case_requests:5,concurrency,maximum_run_requests:max};
// The per-invocation cap is an execution limit, not a change of scientific condition.
const condition={...identity};delete condition.maximum_run_requests;
if(mode==='live'&&split==='evaluation'){if(!opts['--freeze'])throw Error('EVALUATION_FREEZE_REQUIRED');const frozen=readJSON(resolve(opts['--freeze']));if(frozen.condition_hash!==hash(condition))throw Error('FROZEN_CONFIGURATION_MISMATCH');}
mkdirSync(dirname(out),{recursive:true});mkdirSync(out,{recursive:false});const records=[];const git={branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty_paths:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n')};
const metadata={mode,split,seed,selected_ids:selected.map(c=>c.id),planned_calls:mode==='live'?selected.length*5:0,maximum_remote_requests:max,absolute_experiment_ceiling:120,reference_counts:referenceCounts,condition_hash:hash(condition),command:process.argv.slice(1),git};
writeFileSync(join(out,'manifest.json'),JSON.stringify({standing:'EXPLORATORY_UNADJUDICATED',...identity,metadata},null,2)+'\n');
const report=()=>writeReports(out,suite,oracle,records,metadata);
report();
if(opts['--dry-run']){console.log(JSON.stringify({status:'DRY_RUN_VALIDATED',...metadata,per_request_reservation_usd:runtime.plan().per_request_reservation_usd,anticipated_reservation_usd:runtime.plan().per_request_reservation_usd*selected.length*5}));process.exit(0);}
if(mode==='live'&&!process.env.OPENCODE_API_KEY?.trim())throw Error('OPENCODE_API_KEY_UNAVAILABLE');
const runRoot=resolve('experiments/lc-02-batch20/.runs');mkdirSync(runRoot,{recursive:true});const lock=join(runRoot,'execution.lock');let fd;let ledger;
if(mode==='live'){fd=openSync(lock,'wx');ledger=new Log(join(runRoot,'REQUEST-LEDGER.jsonl'));}
let invocationRequests=0,invocationReserved=0;
try{
 const processCase=async c=>{
  if(hash(condition)!==hash({...condition,source_hashes:sourceHashes(),profile:loadSettings(resolve('apps/language-demo/.settings/studio-v2.json'))}))throw Error('SOURCE_OR_SETTINGS_DRIFT');
  const caseDir=join(out,'cases',c.id);mkdirSync(caseDir,{recursive:true});writeFileSync(join(caseDir,'source.json'),JSON.stringify({id:c.id,split:c.split,source_id:c.source_id,source:c.source,question_id:c.question_id,question:c.question,profile:c.profile},null,2));
  const row={id:c.id,arms:{},order:orderedArms(c.id,seed)};records.push(row);let caseRequests=0;
  const charge=request=>{const prior=ledger?.events.filter(e=>e.type==='REQUEST_RESERVED')??[],total=prior.reduce((n,e)=>n+e.data.reservation_usd,0);if(invocationRequests>=max||prior.length>=120||caseRequests>=Math.min(5,profile.limits.max_requests))throw Error('BATCH_REQUEST_CAP');if(total+request.reservation_usd>profile.limits.budget_usd)throw Error('BATCH_RESERVATION_CAP');ledger.append('REQUEST_RESERVED',{case_id:c.id,run:relative(root,out),request_hash:request.hash,session_id:request.session_id,model:request.model,role:request.role,reservation_usd:request.reservation_usd});invocationRequests++;caseRequests++;invocationReserved+=request.reservation_usd;};
  for(const arm of row.order){const armProfile=structuredClone(profile);armProfile.understanding={...armProfile.understanding,profile:c.profile};row.arms[arm]=await executeArm({c,arm,profile:armProfile,out:join(caseDir,arm),live:mode==='live',charge});metadata.actual_requests=invocationRequests;metadata.reserved_usd=invocationReserved;report();console.log(JSON.stringify({case:c.id,arm,status:row.arms[arm].status,error:row.arms[arm].error??null,decision:row.arms[arm].output?.decision??null,requests:invocationRequests}));}
 };
 // Finish the first development case as a smoke test before dispatching the rest.
 const queue=[...selected];if(split==='development'&&queue.length)await processCase(queue.shift());
 await Promise.all(Array.from({length:concurrency},async()=>{while(queue.length)await processCase(queue.shift());}));
 if(records.length!==selected.length||records.some(r=>Object.keys(r.arms).length!==3))throw Error('INCOMPLETE_CASE_DISPATCH');
 if(opts['--freeze-out']){if(split!=='development')throw Error('FREEZE_AFTER_DEVELOPMENT_ONLY');const path=resolve(opts['--freeze-out']);if(existsSync(path))throw Error('FREEZE_ALREADY_EXISTS');writeFileSync(path,JSON.stringify({standing:'PROSPECTIVE_AFTER_DEVELOPMENT',condition_hash:hash(condition),condition,development_run:relative(root,out),development_artifact_hash:sha(readFileSync(join(out,'results.json')))},null,2)+'\n',{flag:'wx'});}
 metadata.status='COMPLETE';
}catch(e){metadata.status='STOPPED';metadata.fatal=e.message;throw e;}finally{
 report();if(fd!==undefined){closeSync(fd);unlinkSync(lock);}
 const hashes={};const walk=p=>{for(const e of readdirSync(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory())walk(f);else if(e.name!=='artifact-hashes.json')hashes[relative(out,f).replaceAll('\\','/')]=sha(readFileSync(f));}};walk(out);writeFileSync(join(out,'artifact-hashes.json'),JSON.stringify({schema:'lc02-batch-artifacts/0.1',files:hashes},null,2)+'\n');
}
console.log(JSON.stringify({status:metadata.status,requests:invocationRequests,out}));
