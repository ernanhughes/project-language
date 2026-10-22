// Installed Pi adapter qualification only. There is intentionally no caller-supplied fetch or real dispatch path.
import {opencodeGoProvider} from '@earendil-works/pi-ai/providers/opencode-go';
import {hash,POLICY,MODELS,PROMPTS,parseOutput,checkLock} from './contracts.mjs';
const SYNTHETIC_KEY='synthetic-transfer-01b-not-a-credential';
export function modelFor(role){const p=opencodeGoProvider();const model=p.getModels().find(x=>x.id===MODELS[role]);if(!model)throw Error('EXACT_MODEL_MISSING');return {p,model};}
// Direct SimpleStreamOptions.reasoning excludes "off". Omission disables thinking here.
export const SETTINGS=Object.freeze({maxTokens:POLICY.maxOutputTokens,maxRetries:0,cacheRetention:'none'});
export function contextFor(role,packet){return {messages:[{role:'system',content:PROMPTS[role],timestamp:0},{role:'user',content:[{type:'text',text:JSON.stringify(packet)}],timestamp:0}]};}
export function makeLock(role,packet){const {model}=modelFor(role);return {schema:'transfer-01b-lock/1',live_authorized:false,source_hash:packet.source_hash,prompt_hash:hash(PROMPTS[role]),role,model:model.id,api:model.api,base_url:model.baseUrl,settings_hash:hash(SETTINGS)};}
function frames(api,text,kind){
 if(api==='openai-completions'){
  const chunks=[{id:'fixture',object:'chat.completion.chunk',choices:[{index:0,delta:{role:'assistant',content:text},finish_reason:null}]}];
  if(kind!=='truncated')chunks.push({id:'fixture',choices:[{index:0,delta:{},finish_reason:kind==='length'?'length':'stop'}],...(kind==='missing-usage'?{}:{usage:{prompt_tokens:100,completion_tokens:kind==='usage-excess'?9999:40,total_tokens:kind==='usage-excess'?10099:140}})});
  return chunks.map(x=>'data: '+JSON.stringify(x)+'\n\n').join('')+(kind==='truncated'?'':'data: [DONE]\n\n');
 }
 const events=[['message_start',{type:'message_start',message:{id:'fixture',type:'message',role:'assistant',model:MODELS.B,content:[],usage:{input_tokens:100,output_tokens:0},stop_reason:null}}],['content_block_start',{type:'content_block_start',index:0,content_block:{type:'text',text:''}}],['content_block_delta',{type:'content_block_delta',index:0,delta:{type:'text_delta',text}}],['content_block_stop',{type:'content_block_stop',index:0}]];
 if(kind!=='truncated')events.push(['message_delta',{type:'message_delta',delta:{stop_reason:kind==='length'?'max_tokens':'end_turn',stop_sequence:null},usage:{output_tokens:kind==='usage-excess'?9999:40}}],['message_stop',{type:'message_stop'}]);
 return events.map(([event,data])=>'event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n').join('');
}
export async function qualifyCall({role,packet,response,kind='ok',lock=makeLock(role,packet),expectedRequestHash,budget,callId='call-1',timeoutMs=POLICY.timeoutMs,signal}){
 const {p,model}=modelFor(role);checkLock(lock,makeLock(role,packet));
 const text=typeof response==='string'?response:JSON.stringify(response);
 const controller=new AbortController();let timedOut=false,attempts=0,capture=null,terminalSeen=false,refusal=null,usageSeen=false;
 const started=performance.now();
 const abort=()=>controller.abort();if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 const fixtureFetch=async(input,init={})=>{
  attempts++;if(attempts>1)throw Error('SECOND_HTTP_ATTEMPT_REFUSED');
  const request=new Request(input,init);const body=await request.text();const headers=Object.fromEntries(request.headers);
  const auth=request.headers.get('authorization'),xkey=request.headers.get('x-api-key');
  const authMode=auth===`Bearer ${SYNTHETIC_KEY}`?'BEARER':xkey===SYNTHETIC_KEY?'X_API_KEY':null;
  if(!authMode)throw Error('SYNTHETIC_AUTH_NOT_ROUTED');
  for(const k of Object.keys(headers))if(/authorization|api-key|cookie/i.test(k))headers[k]='[REDACTED_SYNTHETIC_AUTH]';
  capture={url:request.url,method:request.method,headers,auth_mode:authMode,body,body_hash:hash(body),request_hash:hash({url:request.url,method:request.method,headers,auth_mode:authMode,body}),body_bytes:Buffer.byteLength(body)};
  const requestBody=JSON.parse(body),cap=requestBody.max_tokens??requestBody.max_completion_tokens;
  if(!Number.isInteger(cap)||cap<1||cap>POLICY.maxOutputTokens){refusal='REQUEST_TOKEN_CAP_INVALID';throw Error(refusal);}
  if(requestBody.model!==model.id||requestBody.stream!==true||!Array.isArray(requestBody.messages)){refusal='REQUEST_SHAPE_INVALID';throw Error(refusal);}
  if(expectedRequestHash&&capture.request_hash!==expectedRequestHash){refusal='REQUEST_PREVIEW_MISMATCH';throw Error(refusal);}
  const inputUnits=capture.body_bytes+1024; // Explicit engineering allowance; remote hidden tokenization remains unqualified.
  const rate=model.cost;const estimated=(inputUnits*rate.input+POLICY.maxOutputTokens*rate.output)/1e6;
  try{budget?.reserve(callId,inputUnits,POLICY.maxOutputTokens,estimated);if(inputUnits>POLICY.maxInputUnits)throw Error('INPUT_BOUND');}catch(e){refusal=e.message;throw e;}
  if(kind==='timeout'||kind==='cancel')return await new Promise((_,reject)=>{const s=init.signal??request.signal;const rejectAbort=()=>reject(new DOMException('Aborted','AbortError'));if(s?.aborted)rejectAbort();else s?.addEventListener('abort',rejectAbort,{once:true});});
  if(kind==='http429'||kind==='http500')return new Response('unsafe-provider-error-'+SYNTHETIC_KEY,{status:kind==='http429'?429:500,headers:{'content-type':'text/plain'}});
  const wire=frames(model.api,text,kind);
  if(Buffer.byteLength(wire)>24000){refusal='RESPONSE_STREAM_BYTES';throw Error(refusal);}
  return new Response(wire,{status:200,headers:{'content-type':'text/event-stream'}});
 };
 try{
  if(controller.signal.aborted)return {status:'CANCELLED_BEFORE_DISPATCH',attempts:0,role,model:model.id,raw_response_disclosed:false};
  const stream=p.streamSimple(model,contextFor(role,packet),{...SETTINGS,apiKey:SYNTHETIC_KEY,sessionId:'transfer-01b-'+role+'-'+hash(packet).slice(0,16),fetch:fixtureFetch,env:{},signal:controller.signal,timeoutMs,
   onProviderStreamEvent:event=>{if(event.usage||event.message?.usage)usageSeen=true;if(model.api==='openai-completions'&&event.choices?.some(x=>x.finish_reason))terminalSeen=true;if(model.api==='anthropic-messages'&&event.type==='message_stop')terminalSeen=true;}});
  const result=await stream.result();
  let status=refusal??(timedOut?'TIMED_OUT':controller.signal.aborted?'CANCELLED':result.stopReason==='length'?'TRUNCATED':result.stopReason!=='stop'?'PROVIDER_FAILED':!terminalSeen?'INCOMPLETE_STREAM':'COMPLETED');
  if(status==='COMPLETED'&&usageSeen&&(result.usage.output>POLICY.maxOutputTokens||result.usage.input>POLICY.maxInputUnits))status='REPORTED_USAGE_EXCEEDED';
  let output=null;
  const actual=result.content.filter(x=>x.type==='text').map(x=>x.text).join('');
  if(status==='COMPLETED'){try{output=parseOutput(role,actual,role==='B'?packet.questions?.map(x=>x.id):undefined);}catch(e){status=e.message;}}
  return {schema:'transfer-transport-receipt/1',standing:'INJECTED_HTTP_NOT_MODEL_RESULT',role,model:model.id,api:model.api,lock,capture,status,attempts,terminal_seen:terminalSeen,output,elapsed_ms:performance.now()-started,usage:{reported:usageSeen?result.usage:null,origin:usageSeen?'INJECTED_FIXTURE_NOT_PROVIDER_MEASUREMENT':'NOT_REPORTED',catalog_cost_estimate:usageSeen?result.usage.cost:null,actual_provider_cost_usd:null,billing:'UNKNOWN'},raw_response_disclosed:false,failed_response:status==='COMPLETED'?null:{sha256:hash(actual),bytes:Buffer.byteLength(actual)}};
 }catch(error){return {schema:'transfer-transport-receipt/1',standing:'INJECTED_HTTP_NOT_MODEL_RESULT',role,model:model.id,api:model.api,lock,capture,status:refusal??(timedOut?'TIMED_OUT':controller.signal.aborted?'CANCELLED':'ADAPTER_FAILED'),attempts,output:null,raw_response_disclosed:false,error_hash:hash(String(error?.message??error)),elapsed_ms:performance.now()-started};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
