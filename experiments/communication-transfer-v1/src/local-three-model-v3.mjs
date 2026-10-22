// Version 3: user-selected 16K per attempt and at most 3 outer retries per model. No hidden SDK retries.
export const MAX_STREAM_BYTES=16*1024*1024;
export const MAX_OUTPUT_TOKENS=16384;
export const MAX_OUTPUT_BYTES=131072;
export const RETRIES=3;
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PROMPTS,Reservations,POLICY,hash,Schemas} from './qualification/contracts.mjs';
import {modelFor,contextFor,SETTINGS} from './qualification/transport.mjs';
import {loadCorpus,makePacket} from './qualification/corpus.mjs';

export async function liveCall({role,packet,credential,budget,send=globalThis.fetch,reservationId=role+'-1',validateOutput}){
 const {p,model}=modelFor(role),controller=new AbortController();
 let attempts=0,terminal=false,usageSeen=false,capture=null,refusal=null,timedOut=false,wireBytes=0,wireChunks=0,providerEvents=0,httpStatus=null,finalUsage=null,providerStopReason=null,completionBytes=0;
 const start=performance.now(),timer=setTimeout(()=>{timedOut=true;controller.abort();},60000);
 const fetch=async(input,init={})=>{
  attempts++;if(attempts>1)throw Error('SECOND_ATTEMPT_REFUSED');
  const request=new Request(input,init),body=await request.clone().text(),value=JSON.parse(body);
  const cap=value.max_tokens??value.max_completion_tokens;
  if(!Number.isInteger(cap)||cap<1||cap>MAX_OUTPUT_TOKENS)throw Error('OUTPUT_CAP_INVALID');
  const expected=model.api==='anthropic-messages'?'https://opencode.ai/zen/go/v1/messages?beta=true':'https://opencode.ai/zen/go/v1/chat/completions';
  if(request.url!==expected||value.model!==model.id)throw Error('ROUTE_OR_MODEL_CHANGED');
  const headers=Object.fromEntries(request.headers);
  for(const key of Object.keys(headers))if(/authorization|api-key|cookie/i.test(key))headers[key]='[REDACTED]';
  capture={url:request.url,method:request.method,headers,body,body_hash:hash(body),request_hash:hash({url:request.url,method:request.method,headers,body})};
  const inputUnits=Buffer.byteLength(body)+1024;
  // Higher of pinned catalogue and documented peak DeepSeek rates; estimates, not invoice guarantees.
  const rates=model.id==='deepseek-v4.1-flash'?{input:0.30,output:1.20}:model.cost;
  try{budget.reserve(reservationId,inputUnits,MAX_OUTPUT_TOKENS,(inputUnits*rates.input+MAX_OUTPUT_TOKENS*rates.output)/1e6);}catch(error){refusal=error.message;throw error;}
  const response=await send(request);httpStatus=response.status;
  if(!response.ok){refusal='HTTP_'+response.status;await response.body?.cancel();throw Error(refusal);}
  const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_HTTP_BODY');let received=0;
  const bounded=new ReadableStream({async pull(out){try{const next=await reader.read();if(next.done){out.close();return;}received+=next.value.byteLength;wireBytes=received;wireChunks++;if(received>MAX_STREAM_BYTES){refusal='RESPONSE_STREAM_LIMIT';controller.abort();await reader.cancel();out.error(Error(refusal));return;}out.enqueue(next.value);}catch{out.error(Error('STREAM_READ_FAILED'));}},cancel:()=>reader.cancel()});
  return new Response(bounded,{status:response.status,headers:response.headers});
 };
 try{
  const result=await p.streamSimple(model,contextFor(role,packet),{...SETTINGS,maxTokens:MAX_OUTPUT_TOKENS,apiKey:credential,fetch,signal:controller.signal,timeoutMs:60000,env:{},sessionId:'transfer-smoke-'+hash(packet).slice(0,16)+'-'+role,onProviderStreamEvent:e=>{providerEvents++;if(e.usage||e.message?.usage)usageSeen=true;if(e.choices?.some(c=>c.finish_reason)||e.type==='message_stop')terminal=true;}}).result();
  providerStopReason=result.stopReason;finalUsage=usageSeen?result.usage:null;
  const raw=result.content.filter(x=>x.type==='text').map(x=>x.text).join('');completionBytes=Buffer.byteLength(raw);
  if(refusal||timedOut||result.stopReason!=='stop'||!terminal)throw Error(refusal??(timedOut?'TIMEOUT':result.stopReason==='length'?'TRUNCATED':'INCOMPLETE_OR_FAILED_RESPONSE'));
  if(usageSeen&&(result.usage.output>MAX_OUTPUT_TOKENS||result.usage.input>12000))throw Error('REPORTED_USAGE_EXCEEDED');
  if(credential&&raw.includes(credential))throw Error('CREDENTIAL_IN_OUTPUT');
  const output=parseManualOutput(role,raw,role==='B'?packet.questions.map(q=>q.id):undefined);if(validateOutput){try{validateOutput(output);}catch{throw Error('INVALID_SENDER_PACKET');}}
  return {role,model:'opencode-go/'+model.id,api:model.api,status:'COMPLETED',attempts,capture,transport:{wire_bytes:wireBytes,wire_chunks:wireChunks,provider_events:providerEvents,http_status:httpStatus,max_stream_bytes:MAX_STREAM_BYTES,completion_bytes:completionBytes},output,usage:{provider_reported:usageSeen?result.usage:null,catalog_estimate:usageSeen?result.usage.cost:null,actual_invoice_usd:null,billing:'UNVERIFIED'},elapsed_ms:performance.now()-start};
 }catch(error){
  const safeCodes=['RESERVATION_EXHAUSTED','CALL_ALREADY_PLANNED','OUTPUT_BYTES','SCHEMA_INVALID','MALFORMED_JSON','QUESTION_COVERAGE','SENSITIVE_OUTPUT','INVALID_SENDER_PACKET','REPORTED_USAGE_EXCEEDED','TRUNCATED','INCOMPLETE_OR_FAILED_RESPONSE'];
  const code=refusal??(timedOut?'TIMEOUT':safeCodes.includes(error.message)?error.message:'REQUEST_OR_RESPONSE_REFUSED');
  return {role,model:'opencode-go/'+model.id,status:'FAILED',failure_code:code,attempts,capture,transport:{wire_bytes:wireBytes,wire_chunks:wireChunks,provider_events:providerEvents,http_status:httpStatus,max_stream_bytes:MAX_STREAM_BYTES,completion_bytes:completionBytes,provider_stop_reason:providerStopReason,provider_reported_usage:finalUsage},output:null,raw_error_disclosed:false,error_hash:hash(String(error?.message??error)),elapsed_ms:performance.now()-start};
 }finally{clearTimeout(timer);}
}

export function createManualBudget(usd=1){return new Reservations({...POLICY,maxCalls:12,maxOutputTokens:MAX_OUTPUT_TOKENS,proposedUsd:usd,maxTotalInputUnits:144000,maxTotalOutputTokens:12*MAX_OUTPUT_TOKENS});}
export function parseManualOutput(role,text,ids){
 if(Buffer.byteLength(text)>MAX_OUTPUT_BYTES)throw Error('OUTPUT_BYTES');
 if(/oc_sk_|Bearer\s+\S+|sk-ant-/i.test(text))throw Error('SENSITIVE_OUTPUT');
 let data;try{data=JSON.parse(text);}catch{throw Error('MALFORMED_JSON');}
 const parsed=Schemas[role].safeParse(data);if(!parsed.success)throw Error('SCHEMA_INVALID');
 if(role==='B'&&ids){const got=parsed.data.answers.map(x=>x.id);if(new Set(got).size!==got.length||JSON.stringify([...got].sort())!==JSON.stringify([...ids].sort()))throw Error('QUESTION_COVERAGE');}
 return parsed.data;
}
export async function attemptRole({role,packet,credential,budget,send,onAttempt=()=>{},validateOutput,pause=ms=>new Promise(r=>setTimeout(r,ms))}){
 const history=[];
 for(let index=1;index<=RETRIES+1;index++){
  const receipt=await liveCall({role,packet,credential,budget,send,reservationId:role+'-'+index,validateOutput});receipt.attempt_number=index;history.push(receipt);await onAttempt(receipt,index);
  if(receipt.status==='COMPLETED'||['RESERVATION_EXHAUSTED','CALL_ALREADY_PLANNED','HTTP_401','HTTP_403','SENSITIVE_OUTPUT'].includes(receipt.failure_code))break;
  if(index<=RETRIES)await pause(1000*2**(index-1));
 }
 return {final:history.at(-1),history};
}

export function saveSmoke(out,result){
 const text=JSON.stringify(result,null,2);writeFileSync(join(out,'results.json'),text,{flag:'wx'});
 const safe=text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>Three-model exploratory smoke test</title><style>body{font:16px system-ui;max-width:1100px;margin:30px auto;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}strong{color:#8b4600}</style><h1>Three-model exploratory smoke test</h1><p><strong>Unadjudicated engineering observation. No comparative advantage or human acceptance is established.</strong></p><pre>'+safe+'</pre></html>';
 writeFileSync(join(out,'viewer.html'),html,{flag:'wx'});writeFileSync(join(out,'manifest.json'),JSON.stringify({'results.json':hash(text),'viewer.html':hash(html)},null,2),{flag:'wx'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),execute=args.includes('--execute');
 if(!execute){console.log(JSON.stringify({status:'PREVIEW_ONLY',models:['A','B','C'].map(role=>({role,model:'opencode-go/'+modelFor(role).model.id,api:modelFor(role).model.api,base_url:modelFor(role).model.baseUrl})),task:'deployment-policy-v1',arm:'PLAIN',transport_version:3,max_stream_bytes:MAX_STREAM_BYTES,max_requests:12,max_output_tokens:MAX_OUTPUT_TOKENS,deadline_seconds:60,retries:RETRIES,attempts_per_model:4,sdk_retries:0,fallback:false,required_env:'OPENCODE_API_KEY',note:'Installed legacy routes; compatibility is tested only when you explicitly execute. No automatic endpoint substitution.'},null,2));}
 else{
  if(!args.includes('--exploratory-unadjudicated')||!args.includes('--accept-installed-routes'))throw Error('Explicit --exploratory-unadjudicated and --accept-installed-routes flags required.');
  const outArg=args[args.indexOf('--output')+1],ceiling=Number(args[args.indexOf('--budget-usd')+1]);
  if(!args.includes('--output')||!outArg||outArg.startsWith('--')||!args.includes('--budget-usd')||!Number.isFinite(ceiling)||ceiling<=0||ceiling>1)throw Error('Specify --output NEW_DIRECTORY and --budget-usd CEILING (maximum 1).');
  const credential=process.env.OPENCODE_API_KEY;if(!credential)throw Error('Set OPENCODE_API_KEY in this PowerShell process first. No .env or saved credentials are read.');
  const out=resolve(outArg);mkdirSync(out,{recursive:false});
  const budget=createManualBudget(ceiling);
  const task=loadCorpus()[0],calls=[],result={schema:'transfer-three-model-smoke/3',status:'RUNNING',standing:'EXPLORATORY_UNADJUDICATED',primary_assessment:'NOT_ADJUDICATED',request_policy:{max_output_tokens:MAX_OUTPUT_TOKENS,retries_per_model:RETRIES,max_requests:12,deadline_seconds:60,sdk_retries:0},task_id:task.id,source_hash:task.source_hash,source:task.source,questions:task.questions,arm:'PLAIN',calls,billing_warning:'Reservations are estimates, not a provider-invoice guarantee.',historical_locks_modified:false};
  let packet={source_hash:task.source_hash,source:task.source,questions:task.questions,format:'ordinary message with source-selection audit',max_channel_bytes:3000};
  for(const role of ['A','B','C']){
   const outcome=await attemptRole({role,packet,credential,budget,validateOutput:role==='A'?value=>makePacket(task,'PLAIN',value):undefined,onAttempt:(call,index)=>{calls.push(call);writeFileSync(join(out,role+'-attempt-'+index+'.json'),JSON.stringify(call,null,2),{flag:'wx'});}});const call=outcome.final;
   if(call.status!=='COMPLETED'){result.status='STOPPED_ON_FAILURE';break;}
   if(role==='A'){try{const channel=makePacket(task,'PLAIN',call.output);result.channel=channel;packet=channel.packet;}catch{result.status='STOPPED_INVALID_SENDER_PACKET';break;}}
   if(role==='B')packet={source_hash:task.source_hash,source:task.source,questions:task.questions,anonymous_response:call.output};
   if(role==='C')result.status='COMPLETED';
  }
  result.reservations=budget.snapshot();saveSmoke(out,result);console.log(JSON.stringify({status:result.status,requests:calls.length,output:out,viewer:join(out,'viewer.html')},null,2));if(result.status!=='COMPLETED')process.exitCode=1;
 }
}
