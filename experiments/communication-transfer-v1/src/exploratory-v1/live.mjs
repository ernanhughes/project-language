import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pathToFileURL} from 'node:url';
import {task,context} from './task.mjs';
import {
 PROMPTS,LIMITS,PROFILES,ARMS,SENDER_ARMS,
 Budget,hash,parseRoleOutput
} from './contracts.mjs';
import {senderInput,sealSender,receiverPacket,evaluatorInput,hostCitationChecks} from './channel.mjs';
import {loadExperiment,matrix,preflight,expectedRoute,observedRouteMatches,modelRoute} from './providers.mjs';
import {html} from './viewer.mjs';

export const LIVE_SCHEMA='transfer-01d-live/1';
export const MANIFEST_SCHEMA='transfer-01d-live-manifest/1';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const CODE_FILES=[
 'config/models.json',
 'package.json',
 'src/exploratory-v1/contracts.mjs',
 'src/exploratory-v1/task.mjs',
 'src/exploratory-v1/channel.mjs',
 'src/exploratory-v1/providers.mjs',
 'src/exploratory-v1/live.mjs',
 'src/exploratory-v1/viewer.mjs',
 'tests/exploratory.test.mjs',
 'tests/live.test.mjs'
];
const CALL_PLAN=Object.freeze([
 {id:'CANARY-C',role:'C',arm:'CANARY',model:PROFILES.primary.C,max_output_tokens:LIMITS.output_tokens.C},
 {id:'A-PLAIN',role:'A',arm:'PLAIN',model:PROFILES.primary.A,max_output_tokens:LIMITS.output_tokens.A},
 {id:'A-LINKED',role:'A',arm:'LINKED',model:PROFILES.primary.A,max_output_tokens:LIMITS.output_tokens.A},
 ...ARMS.map(arm=>({id:'B-'+arm,role:'B',arm,model:PROFILES.primary.B,max_output_tokens:LIMITS.output_tokens.B})),
 ...ARMS.map(arm=>({id:'C-'+arm,role:'C',arm,model:PROFILES.primary.C,max_output_tokens:LIMITS.output_tokens.C}))
].map(x=>({...x,timeout_ms:LIMITS.timeout_ms,sdk_retries:0})));
export const BASE_CALLS=CALL_PLAN.length;
export const MAX_CALLS=LIMITS.max_actual_requests;

function codeHashes(){
 const files={};
 for(const file of CODE_FILES){
  try{files[file]=hash(readFileSync(join(ROOT,file),'utf8'));}catch{files[file]=null;}
 }
 return files;
}
function conservativeRates(model){
 const base=model.cost??{input:0,output:0};
 const tiers=base.tiers??[];
 const maxInput=Math.max(base.input??0,...tiers.map(x=>x.input??0));
 const maxOutput=Math.max(base.output??0,...tiers.map(x=>x.output??0));
 if(model.id==='deepseek-v4.1-flash')return {input:0.30,output:1.20,basis:'documented DeepSeek peak rates, higher than pinned catalogue'};
 if(model.id==='claude-haiku-5-5')return {input:0.50,output:2.50,basis:'documented >100K-token Haiku tier, conservative for a short request'};
 return {input:maxInput,output:maxOutput,basis:'maximum of pinned catalogue base and tier rates'};
}
function estimateUsd(model,inputBytes,outputTokens){
 const rates=conservativeRates(model);
 const inputUnits=inputBytes+1024;
 return (inputUnits*rates.input+outputTokens*rates.output)/1e6;
}
export async function buildManifest({experiment,createdAt='2026-10-22T00:00:00Z'}={}){
 experiment??=await loadExperiment();
 const rows=await matrix(experiment);
 const models=Object.fromEntries(rows.map(row=>{
  const model=experiment.runtime.getModel('opencode-go',row.id);
  return [row.id,{
   provider:'opencode-go',id:row.id,installed:row.installed,registration:row.registration,api:row.api,base_url:row.base_url,
   route:model?modelRoute(model):null,context_window:row.context,max_output_tokens:row.max_output,
   catalogue_price:row.catalogue_price,budget_rates:model?conservativeRates(model):null,
   immutable_vendor_revision:'UNKNOWN',live_availability:'NOT_PROBED'
  }];
 }));
 const callPlan=CALL_PLAN.map(call=>{
  const model=experiment.runtime.getModel('opencode-go',call.model);
  return {...call,api:model?.api??null,route:model?modelRoute(model):null,retry_of:null};
 });
 const canaryRetry={id:'CANARY-C-RETRY-1',role:'C',arm:'CANARY',model:PROFILES.primary.C,max_output_tokens:LIMITS.output_tokens.C,timeout_ms:LIMITS.timeout_ms,sdk_retries:0,retry_of:'CANARY-C',retry_allowed:false};
 const cRetries=ARMS.map(arm=>({id:'C-'+arm+'-RETRY-1',role:'C',arm,model:PROFILES.primary.C,max_output_tokens:LIMITS.output_tokens.C,timeout_ms:LIMITS.timeout_ms,sdk_retries:0,retry_of:'C-'+arm,retry_allowed:true}));
 return {
  schema:MANIFEST_SCHEMA,
  status:'PROSPECTIVE_NOT_AUTHORIZED',
  created_at:createdAt,
  repository_head:process.env.GIT_HEAD??'e73c005',
  source:{id:task.id,source_hash:task.source_hash,questions_hash:hash(task.questions),reference_hash:hash(task.reference),source_text_included:false},
  prompt_hashes:Object.fromEntries(Object.entries(PROMPTS).map(([role,prompt])=>[role,hash(prompt)])),
  code_hashes:codeHashes(),
  models,
  arms:ARMS.map(arm=>({
   arm,
   representation:arm==='PLAIN'?'PLAIN_MESSAGE':arm==='MATCHED_PLAIN'?'PLAIN_WITH_VERBATIM_EXCERPTS':arm==='LINKED'?'LINKED_CLAIMS':'LINKED_PLUS_ADMITTED_CONTEXT',
   sender_call:arm==='PLAIN'?'A-PLAIN':'A-LINKED',
   sender_reused:arm!=='PLAIN',
   recipient_call:'B-'+arm,
   evaluator_call:'C-'+arm
  })),
  call_plan:callPlan,
  retry_plan:{allowed_role:'C',max_global_retries:LIMITS.max_global_evaluator_retries,canary_retry:canaryRetry,candidates:cRetries,rule:'A/B failures stop the run. Only one C retry globally, and only if the canary and every prior call succeeded.'},
  budget:{
   estimated_usd:LIMITS.estimated_usd,
   max_actual_requests:LIMITS.max_actual_requests,
   base_calls:BASE_CALLS,
   canary_included:true,
   max_input_units:LIMITS.max_input_units,
   max_total_input_units:LIMITS.max_total_input_units,
   max_total_output_tokens:LIMITS.max_total_output_tokens,
   output_tokens_per_role:LIMITS.output_tokens,
   rate_basis:'full conservative input+output reservation before each dispatch',
   rates:Object.fromEntries(Object.entries(models).map(([id,model])=>[id,model.budget_rates])),
   billing:'UNKNOWN; reservations are estimates, not invoice guarantees'
  },
  settings:{maxRetries:0,sdk_retries:0,timeout_ms:LIMITS.timeout_ms,deadline_ms:LIMITS.deadline_ms,cacheRetention:'none',fallback:false,reasoning:'OMITTED',transport:'sse',max_stream_bytes:LIMITS.max_stream_bytes,max_response_bytes:LIMITS.max_response_bytes},
  source_information_match:{
   reference_arm:'LINKED',
   matched_arm:'MATCHED_PLAIN',
   shared_sealed_sender:true,
   shared_sender_call:'A-LINKED',
   separate_baseline_sender_call:'A-PLAIN',
   matched_content:['sender message','verbatim source excerpts','preservation obligations','uncertainties'],
   representation_difference:'MATCHED_PLAIN renders those items as ordinary text; LINKED carries structured claim metadata (origin, identity, hash, span).',
   limitation:'This controls for source-information quantity between MATCHED_PLAIN and LINKED. It does not make wire bytes identical or eliminate stylistic differences.'
  },
  authorization:{
   live_authorized:false,
   required_flags:['--execute','--exploratory-unadjudicated','--accept-model-routes','--accept-haiku-local-registration','--output NEW_DIRECTORY','--budget-usd CEILING'],
   required_env:'OPENCODE_API_KEY supplied by the operator in the process environment',
   credential_files_read:false,
   service_use:'PENDING_HUMAN_CONFIRMATION',
   human_adjudication:'PENDING',
   publication:'NOT_AUTHORIZED'
  },
  confounds:[
   'One synthetic task and three proposed reference answers; no independent human adjudication.',
   'The advisory evaluator is another model and may share training data or biases with sender or recipient.',
   'The sender is run twice (PLAIN and LINKED); LINKED, MATCHED_PLAIN and CONTEXT share one sealed sender output.',
   'A and B remain on installed legacy /zen/go routes while Haiku uses the documented /inference/go/anthropic route; remote auth compatibility is unprobed.',
   'Wire bytes and tokenization differ across arms; dollar reservations are estimates, not invoices.',
   'Prompted JSON is not native structured output; valid JSON does not establish semantic support.',
   'Model weight revisions, provider routing and hidden system behavior are unknown.'
  ]
 };
}
export function canaryInput(){
 const text='Synthetic canary message. No action authority.';
 return {
  source:task.source,
  source_identity:task.id,
  source_hash:task.source_hash,
  questions:task.questions,
  transmitted_message:{identity:'canary-message',text,hash:hash(text)},
  historical_context:[],
  anonymous_recipient:{answers:task.questions.map((q,i)=>({id:q.id,decision:['NO','YES','UNKNOWN'][i],explanation:'Transport canary only; not an experimental result.',citations:[]}))}
 };
}
function writeJsonOnce(out,name,value){writeFileSync(join(out,name),JSON.stringify(value,null,2),{flag:'wx'});}
function redactHeaders(headers){
 const copy={...headers},modes=[];
 for(const key of Object.keys(copy)){
  if(/^authorization$/i.test(key))modes.push('Authorization');
  if(/^x-api-key$/i.test(key))modes.push('x-api-key');
  if(/authorization|api-key|cookie/i.test(key))copy[key]='[REDACTED]';
 }
 return {headers:copy,auth_modes:[...new Set(modes)]};
}
export async function callModel({experiment,callId,role,arm,model,maxOutputTokens,input,credential,budget,outputDir,fetchImpl=globalThis.fetch,timeoutMs=LIMITS.timeout_ms}){
 const modelEntry=experiment.runtime.getModel('opencode-go',model);
 if(!modelEntry)throw Error('MODEL_MISSING');
 const route=modelRoute(modelEntry);
 const controller=new AbortController();
 let attempts=0,terminalSeen=false,usageSeen=false,capture=null,refusal=null,timedOut=false,httpStatus=null,finalUsage=null,providerStopReason=null;
 let wireBytes=0,wireChunks=0,providerEvents=0,completionBytes=0,reservation=null;
 const started=performance.now(),timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 const guardedFetch=async(inputRequest,init={})=>{
  attempts++;if(attempts>1)throw Error('SECOND_ATTEMPT_REFUSED');
  const request=new Request(inputRequest,init),body=await request.clone().text();
  let payload;try{payload=JSON.parse(body);}catch{refusal='REQUEST_BODY_NOT_JSON';throw Error(refusal);}
  const cap=payload.max_tokens??payload.max_completion_tokens??payload.max_output_tokens;
  const routeMatch=observedRouteMatches(modelEntry,request.url);
  const redacted=redactHeaders(Object.fromEntries(request.headers));
  const bodyBytes=Buffer.byteLength(body);
  capture={url:request.url,method:request.method,headers:redacted.headers,auth_modes:redacted.auth_modes,body,body_hash:hash(body),request_hash:hash({url:request.url,method:request.method,headers:redacted.headers,body}),body_bytes:bodyBytes,model_observed:payload.model??null,route_match:routeMatch};
  if(payload.model!==modelEntry.id||!routeMatch){refusal='ROUTE_OR_MODEL_CHANGED';throw Error(refusal);}
  if(!Number.isInteger(cap)||cap<1||cap!==maxOutputTokens){refusal='OUTPUT_CAP_INVALID';throw Error(refusal);}
  const inputUnits=bodyBytes+1024;
  if(inputUnits>LIMITS.max_input_units){refusal='INPUT_BOUND';throw Error(refusal);}
  try{reservation=budget.reserveCall({id:callId,role,inputUnits,outputTokens:maxOutputTokens,estimatedUsd:estimateUsd(modelEntry,bodyBytes,maxOutputTokens)});}
  catch(error){refusal=error.message;throw error;}
  const response=await fetchImpl(request);
  httpStatus=response.status;
  if(!response.ok){await response.body?.cancel();refusal='HTTP_'+response.status;throw Error(refusal);}
  const reader=response.body?.getReader();
  if(!reader){refusal='EMPTY_HTTP_BODY';throw Error(refusal);}
  let received=0;
  const bounded=new ReadableStream({
   async pull(out){
    try{
     const next=await reader.read();
     if(next.done){out.close();return;}
     received+=next.value.byteLength;wireBytes=received;wireChunks++;
     if(received>LIMITS.max_stream_bytes){refusal='RESPONSE_STREAM_LIMIT';controller.abort();await reader.cancel();out.error(Error(refusal));return;}
     out.enqueue(next.value);
    }catch{out.error(Error('STREAM_READ_FAILED'));}
   },
   cancel:()=>reader.cancel()
  });
  return new Response(bounded,{status:response.status,headers:response.headers});
 };
 try{
  const stream=experiment.runtime.streamSimple(modelEntry,{messages:[{role:'system',content:PROMPTS[role],timestamp:0},{role:'user',content:[{type:'text',text:JSON.stringify(input)}],timestamp:0}]},{
   apiKey:credential,env:{OPENCODE_API_KEY:credential},maxTokens:maxOutputTokens,maxRetries:0,cacheRetention:'none',timeoutMs,transport:'sse',signal:controller.signal,sessionId:'transfer-01d-'+callId,fetch:guardedFetch,
   onProviderStreamEvent:event=>{
    providerEvents++;
    if(event.usage||event.message?.usage||event.response?.usage)usageSeen=true;
    if(event.choices?.some(x=>x.finish_reason)||event.type==='message_stop'||event.type==='response.completed'||event.type==='response.incomplete')terminalSeen=true;
   }
  });
  const result=await stream.result();
  providerStopReason=result.stopReason;finalUsage=usageSeen?result.usage:null;
  const text=result.content.filter(x=>x.type==='text').map(x=>x.text).join('');
  completionBytes=Buffer.byteLength(text);
  let status=refusal??(timedOut?'TIMEOUT':controller.signal.aborted?'CANCELLED':result.stopReason==='length'?'TRUNCATED':result.stopReason!=='stop'?'PROVIDER_FAILED':!terminalSeen?'INCOMPLETE_STREAM':'COMPLETED');
  if(status==='COMPLETED'&&completionBytes>LIMITS.max_response_bytes)status='OUTPUT_BYTES';
  if(status==='COMPLETED'&&credential&&text.includes(credential))status='SENSITIVE_OUTPUT';
  if(status==='COMPLETED'&&usageSeen&&result.usage&&(result.usage.output>maxOutputTokens||result.usage.input>LIMITS.max_input_units))status='REPORTED_USAGE_EXCEEDED';
  let output=null;
  if(status==='COMPLETED'){
   try{output=parseRoleOutput(role,text,role==='A'?undefined:task.questions.map(x=>x.id));}catch(error){status=error.message;}
  }
  const receipt={
   schema:'transfer-01d-call/1',standing:'REAL_MODEL_OUTPUT_UNADJUDICATED',call_id:callId,role,arm,model:'opencode-go/'+modelEntry.id,api:modelEntry.api,route_expected:route.expected_url,route_observed:capture?.url??null,route_match:capture?.route_match??false,
   status,attempts,capture,transport:{wire_bytes:wireBytes,wire_chunks:wireChunks,provider_events:providerEvents,http_status:httpStatus,terminal_seen:terminalSeen,usage_seen:usageSeen,completion_bytes:completionBytes,max_stream_bytes:LIMITS.max_stream_bytes,provider_stop_reason:providerStopReason},
   output,usage:{provider_reported:usageSeen?finalUsage:null,catalog_estimate:usageSeen?finalUsage?.cost:null,actual_invoice_usd:null,billing:'UNVERIFIED'},reservation,elapsed_ms:performance.now()-started
  };
  if(status!=='COMPLETED')receipt.error_hash=hash(String(refusal??status));
  receipt.receipt_hash=hash(receipt);
  writeJsonOnce(outputDir,callId+'.json',receipt);
  return receipt;
 }catch(error){
  const safe=['SECOND_ATTEMPT_REFUSED','REQUEST_BODY_NOT_JSON','ROUTE_OR_MODEL_CHANGED','OUTPUT_CAP_INVALID','INPUT_BOUND','BUDGET_EXHAUSTED','REQUEST_LIMIT','INPUT_TOTAL_EXHAUSTED','OUTPUT_TOTAL_EXHAUSTED','CALL_ALREADY_PLANNED','ROLE_OUTPUT_CAP','RESPONSE_STREAM_LIMIT','EMPTY_HTTP_BODY','STREAM_READ_FAILED'];
  const code=refusal??(timedOut?'TIMEOUT':controller.signal.aborted?'CANCELLED':safe.includes(error.message)?error.message:'REQUEST_OR_RESPONSE_REFUSED');
  const receipt={
   schema:'transfer-01d-call/1',standing:'REAL_MODEL_OUTPUT_UNADJUDICATED',call_id:callId,role,arm,model:'opencode-go/'+modelEntry.id,api:modelEntry.api,route_expected:route.expected_url,route_observed:capture?.url??null,route_match:capture?.route_match??false,
   status:'FAILED',failure_code:code,attempts,capture,transport:{wire_bytes:wireBytes,wire_chunks:wireChunks,provider_events:providerEvents,http_status:httpStatus,terminal_seen:terminalSeen,usage_seen:usageSeen,completion_bytes:completionBytes,max_stream_bytes:LIMITS.max_stream_bytes,provider_stop_reason:providerStopReason},
   output:null,usage:{provider_reported:usageSeen?finalUsage:null,catalog_estimate:usageSeen?finalUsage?.cost:null,actual_invoice_usd:null,billing:'UNVERIFIED'},reservation,elapsed_ms:performance.now()-started,raw_error_disclosed:false,error_hash:hash(String(error?.message??error))
  };
  receipt.receipt_hash=hash(receipt);
  writeJsonOnce(outputDir,callId+'.json',receipt);
  return receipt;
 }finally{clearTimeout(timer);}
}
export async function runLive({outputDir,credential,budgetUsd=LIMITS.estimated_usd,experiment,fetchImpl=globalThis.fetch,createdAt=new Date().toISOString()}={}){
 if(!outputDir)throw Error('OUTPUT_REQUIRED');
 if(!credential)throw Error('CREDENTIAL_REQUIRED');
 if(!Number.isFinite(budgetUsd)||budgetUsd<=0||budgetUsd>LIMITS.estimated_usd)throw Error('BUDGET_CEILING');
 if(typeof fetchImpl!=='function')throw Error('FETCH_REQUIRED');
 experiment??=await loadExperiment();
 const pre=await preflight(experiment);
 if(pre.status.startsWith('BLOCK'))throw Error(pre.status);
 const manifest=await buildManifest({experiment,createdAt});
 const manifestHash=hash(manifest);
 const out=resolve(outputDir);
 mkdirSync(out,{recursive:false});
 writeJsonOnce(out,'manifest.json',{...manifest,manifest_hash:manifestHash});
 const budget=new Budget({...LIMITS,estimated_usd:budgetUsd});
 const calls=[],traces=[],failures=[];
 let status='RUNNING',retryUsed=false;
 const runCall=async(call,input)=>{
  const receipt=await callModel({experiment,callId:call.id,role:call.role,arm:call.arm,model:call.model,maxOutputTokens:call.max_output_tokens,input,credential,budget,outputDir:out,fetchImpl,timeoutMs:call.timeout_ms});
  calls.push(receipt);if(receipt.status!=='COMPLETED')failures.push({call_id:receipt.call_id,status:receipt.status,failure_code:receipt.failure_code??null,arm:receipt.arm,role:receipt.role});
  return receipt;
 };
 const canary=await runCall(CALL_PLAN[0],canaryInput());
 if(canary.status!=='COMPLETED')status='STOPPED_CANARY';
 const senders={};
 if(status==='RUNNING'){
  for(const arm of SENDER_ARMS){
   const call=CALL_PLAN.find(x=>x.id==='A-'+arm);
   const receipt=await runCall(call,senderInput(arm));
   if(receipt.status!=='COMPLETED'){status='STOPPED_SENDER_'+arm;break;}
   try{senders[arm]={receipt,sealed:sealSender(receipt.output)};}
   catch{status='STOPPED_SENDER_PROVENANCE_'+arm;break;}
  }
 }
 if(status==='RUNNING'){
  for(const arm of ARMS){
   const senderArm=arm==='PLAIN'?'PLAIN':'LINKED',{receipt:aReceipt,sealed}=senders[senderArm];
   let delivery;
   try{delivery=receiverPacket(arm,sealed);}catch{status='STOPPED_CHANNEL_'+arm;break;}
   const bCall=CALL_PLAN.find(x=>x.id==='B-'+arm);
   const b=await runCall(bCall,delivery.packet);
   if(b.status!=='COMPLETED'){status='STOPPED_RECIPIENT_'+arm;break;}
   const cInput=evaluatorInput(delivery,b.output);
   const cCall=CALL_PLAN.find(x=>x.id==='C-'+arm);
   let c=await runCall(cCall,cInput);
   if(c.status!=='COMPLETED'&&!retryUsed&&budget.remaining().calls>0){
    retryUsed=true;
    const retry={...cCall,id:'C-'+arm+'-RETRY-1',retry_of:cCall.id};
    const retryReceipt=await runCall(retry,cInput);
    if(retryReceipt.status==='COMPLETED')c=retryReceipt;else status='STOPPED_EVALUATOR_'+arm;
   }else if(c.status!=='COMPLETED')status='STOPPED_EVALUATOR_'+arm;
   if(status!=='RUNNING')break;
   const body={
    arm,standing:'REAL_MODEL_EXPLORATORY_UNADJUDICATED',source:task.source,source_hash:task.source_hash,
    sender_reuse:{reused:arm!=='PLAIN',from:senderArm,receipt_hash:aReceipt.receipt_hash},
    sender_receipt:aReceipt,sealed,delivery,b,c,
    receipts:{sender:aReceipt,recipient:b,evaluator:c},
    host_assessment:{reference:task.reference,status:'PROPOSED_UNADJUDICATED',primary:'NOT_ADJUDICATED',mechanical_citations:hostCitationChecks(delivery,b.output)},
    resources:{calls_in_arm:3,sender_call_reused:arm!=='PLAIN',channel_bytes:delivery.bytes,source_anchor_bytes:delivery.source_anchor_bytes,retry_used:c.call_id.endsWith('RETRY-1')}
   };
   const trace={...body,receipt_hash:hash(body)};
   traces.push(trace);writeJsonOnce(out,'trace-'+arm+'.json',trace);
  }
 }
 if(status==='RUNNING')status='COMPLETED_UNADJUDICATED';
 const result={
  schema:LIVE_SCHEMA,status,standing:'EXPLORATORY_UNADJUDICATED',primary_assessment:'NOT_ADJUDICATED',
  manifest_hash:manifestHash,preflight:pre,model_matrix:await matrix(experiment),manifest,
  canary,calls,traces,failures,retry_used:retryUsed,budget:budget.snapshot(),real_requests:calls.filter(x=>x.attempts>0).length,
  source:task.source,questions:task.questions,reference:task.reference,
  source_information_match:manifest.source_information_match,
  limits:LIMITS,billing:'UNKNOWN',human_adjudication:'PENDING',publication:'NOT_AUTHORIZED'
 };
 writeJsonOnce(out,'results.json',result);
 writeFileSync(join(out,'viewer.html'),html(result),{flag:'wx'});
 const files=readdirSync(out).filter(x=>x!=='hashes.json').sort();
 writeJsonOnce(out,'hashes.json',Object.fromEntries(files.map(file=>[file,hash(readFileSync(join(out,file),'utf8'))])));
 return result;
}
function argValue(args,name){
 const index=args.indexOf(name);if(index<0)return undefined;
 const value=args[index+1];if(!value||value.startsWith('--'))throw Error('MISSING_VALUE_'+name);
 return value;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),execute=args.includes('--execute');
 if(!execute){
  const experiment=await loadExperiment();
  const preview=await preflight(experiment);
  const manifest=await buildManifest({experiment});
  console.log(JSON.stringify({status:'PREVIEW_ONLY',preflight:preview.status,live_authorized:false,manifest_hash:hash(manifest),base_calls:BASE_CALLS,max_calls:MAX_CALLS,arms:ARMS,models:Object.fromEntries(Object.entries(manifest.models).map(([id,m])=>[id,{api:m.api,route:m.route?.expected_url,registration:m.registration}])),required_flags:manifest.authorization.required_flags,required_env:manifest.authorization.required_env,note:'No credential was read and no request was sent.'},null,2));
 }else{
  for(const flag of ['--exploratory-unadjudicated','--accept-model-routes','--accept-haiku-local-registration'])if(!args.includes(flag))throw Error('Explicit '+flag+' required.');
  const out=argValue(args,'--output'),ceiling=Number(argValue(args,'--budget-usd'));
  if(!Number.isFinite(ceiling)||ceiling<=0||ceiling>1)throw Error('Specify --budget-usd CEILING (maximum 1).');
  const credential=process.env.OPENCODE_API_KEY;
  if(!credential)throw Error('Set OPENCODE_API_KEY in this process first. No .env, saved credential or global configuration is read.');
  const result=await runLive({outputDir:out,credential,budgetUsd:ceiling,createdAt:new Date().toISOString()});
  console.log(JSON.stringify({status:result.status,requests:result.real_requests,calls:result.calls.length,output:resolve(out),viewer:join(resolve(out),'viewer.html')},null,2));
  if(result.status!=='COMPLETED_UNADJUDICATED')process.exitCode=1;
 }
}
