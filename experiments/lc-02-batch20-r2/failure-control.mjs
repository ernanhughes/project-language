import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSettings} from '../../apps/language-demo/server/settings.mjs';
import {executeArm} from '../lc-02-batch20/engine.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){const key=args[i];if(['--design','--out'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);}
const design=JSON.parse(readFileSync(opts['--design']??'experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json','utf8'));
const out=resolve(opts['--out']??'experiments/lc-02-batch20-r2/.runs/FAILURE-CONTROL-V2-001');
if(existsSync(out))throw Error('OUTPUT_ALREADY_EXISTS');
mkdirSync(dirname(out),{recursive:true});mkdirSync(out,{recursive:false});
const profile=loadSettings(resolve('apps/language-demo/.settings/studio-v2.json'));
const cases=new Map(design.cases.map(c=>[c.id,{...c,split:'fresh_evaluation',source_id:c.id+'-source-v1',question_id:c.id+'-question-v1',question_scope:c.scope}]));
const results=[];
for(const spec of [
 {id:'R1E-01',kind:'PROVIDER_FAILURE',scriptedAnswer:()=>{throw Error('INJECTED_PROVIDER_FAILURE');}},
 {id:'R1E-02',kind:'BAD_SPAN',scriptedAnswer:(c)=>{const text=c.source.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()??c.source;return {decision:'UNKNOWN',explanation:'Injected bad-span control.',citations:[{origin:'ORIGINAL_SOURCE',source_id:c.source_id,source_hash:'',start:0,end:text.length-1,text}]};}}
]){
 const c=cases.get(spec.id);const arm='A_SOURCE_ONLY';const armProfile=structuredClone(profile);armProfile.understanding={...armProfile.understanding,profile:c.profile};
 mkdirSync(join(out,'cases',c.id),{recursive:true});
 const result=await executeArm({c,arm,profile:armProfile,out:join(out,'cases',c.id,arm),live:false,charge:()=>{},env:{},scriptedAnswer:spec.scriptedAnswer});
 const events=readFileSync(join(out,'cases',c.id,arm,'events.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));
 const failure=events.find(e=>e.type==='BATCH_ARM_FAILURE')?.data??{};
 results.push({case_id:c.id,control:spec.kind,status:result.status,error:result.error??null,recipient_response_captured:!!failure.recipient_response_captured,citation_resolution:result.mechanical?.citation_resolution??null});
}
writeFileSync(join(out,'failure-control.json'),JSON.stringify({schema:'lc02-r2-failure-control/0.1',standing:'SCRIPTED_ENGINEERING_ONLY',hosted_requests:0,results},null,2)+'\n');
console.log(JSON.stringify({status:'FAILURE_CONTROL_COMPLETE',results},null,2));
