import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {Studio} from '../engine/studio.mjs';import {Runtime} from '../models/runtime.mjs';import {Log} from '../storage/log.mjs';
import {loadSettings,applySettings} from '../server/settings.mjs';import {reportHTML} from '../server/app.mjs';import {hash} from '../protocol/state.mjs';
const [stage,directory,digest]=process.argv.slice(2);if(!['start','accept'].includes(stage)||!directory)throw Error('Use start NEW_DIRECTORY or accept EXISTING_DIRECTORY EXACT_DIGEST');
if(!process.env.OPENCODE_API_KEY?.trim())throw Error('OPENCODE_API_KEY_UNAVAILABLE');
const out=resolve(directory);if(stage==='start')mkdirSync(out,{recursive:false});else if(!existsSync(join(out,'events.jsonl')))throw Error('RUN_NOT_FOUND');
const runtime=new Runtime({mode:'opencode',remoteEnabled:true,directExecution:true}),studio=new Studio({runtime,log:new Log(join(out,'events.jsonl'))});
if(stage==='start'){
 const profile=loadSettings(resolve('apps/language-demo/.settings/studio-v2.json'));profile.limits.max_requests=Math.min(3,profile.limits.max_requests);applySettings(studio,profile,{record:true});
 studio.record('LIVE_TEST_AUTHORIZATION',{source:'User requested live calls to test the source-anchor repair',maximum_requests:3,automatic_retries:0,acceptance:'Separate inspection and explicit digest required; delegated test acceptance only; no action authority'});
}
let error=null;
try{if(stage==='start')await studio.act('comparison-start',{mode:'opencode',case_ids:['lc02-d1']});else{
 const v=studio.comparison.pending().exchange.versions.at(-1);if(v.digest!==digest)throw Error('REVIEW_DIGEST_MISMATCH');
 studio.record('DELEGATED_TEST_REVIEW',{digest,reviewer:'Codex acting under user live-test instruction',standing:'AI_REVIEW_NOT_INDEPENDENT_HUMAN_ADJUDICATION',scope:'communication test only'});
 await studio.act('comparison-accept',{digest,reviewed:true});
}}catch(e){error=e.message;}
const data=studio.export(),file=stage==='start'?'after-interpreter.json':'after-recipients.json';writeFileSync(join(out,file),JSON.stringify(data,null,2)+'\n');writeFileSync(join(out,stage+'-report.html'),reportHTML(data));
const files=['events.jsonl',file,stage+'-report.html'];writeFileSync(join(out,stage+'-manifest.json'),JSON.stringify({stage,error,requests:runtime.requests,files:Object.fromEntries(files.map(f=>[f,hash(readFileSync(join(out,f),'utf8'))]))},null,2)+'\n');
console.log(JSON.stringify({stage,phase:studio.comparison.state?.phase,error,requests:runtime.requests,out,digest:studio.comparison.state?.trials.at(-1)?.exchange.versions.at(-1)?.digest}));if(error)process.exitCode=1;
