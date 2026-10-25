import {ModelRuntime} from '@earendil-works/pi-coding-agent';
import {InMemoryCredentialStore,InMemoryModelsStore} from '@earendil-works/pi-ai';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assert,hash} from '../protocol/state.mjs';

export const modelsPath=fileURLToPath(new URL('../config/models.json',import.meta.url));
export const configHash=hash(readFileSync(modelsPath,'utf8'));
export const configModels=JSON.parse(readFileSync(modelsPath,'utf8')).providers['opencode-go'].models;
export const fullId=id=>'opencode-go/'+id;
const studioConfig=JSON.parse(readFileSync(new URL('../config/studio.json',import.meta.url),'utf8'));
export const directDefaults=JSON.parse(readFileSync(new URL('../config/studio-v2.json',import.meta.url),'utf8'));
export const defaults=studioConfig.roles;
export const limits=studioConfig.limits;
export function redact(value,secret){
 if(typeof value==='string'){let s=value;if(secret)s=s.split(secret).join('[REDACTED]');return s.replace(/oc_sk_[A-Za-z0-9_-]+/g,'[REDACTED]').replace(/Bearer\s+[^\s"\\]+/gi,'[REDACTED_AUTH]');}
 if(Array.isArray(value))return value.map(v=>redact(v,secret));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/authorization|api.?key|cookie|credential|bearer.?token/i.test(k)?'[REDACTED]':redact(v,secret)]));
 return value;
}
export function route(model){const suffix={'anthropic-messages':'/v1/messages','openai-completions':'/chat/completions','openai-responses':'/responses'}[model.api];assert(suffix,'UNSUPPORTED_API_FAMILY');const value=model.baseUrl.replace(/\/$/,'')+suffix;const url=new URL(value);assert(model.provider==='opencode-go'&&url.origin==='https://opencode.ai'&&url.pathname.startsWith('/inference/go/'),'GO_ROUTE_REQUIRED_NO_FALLBACK');return value;}
export async function registry(){return ModelRuntime.create({modelsPath,credentials:new InMemoryCredentialStore(),modelsStore:new InMemoryModelsStore(),allowModelNetwork:false,refreshOnCreate:false});}
export function offlineQualification(){try{let receipt;try{receipt=JSON.parse(readFileSync(new URL('../config/lc-01s-offline-qualification.json',import.meta.url),'utf8'));}catch{receipt=JSON.parse(readFileSync(new URL('../config/offline-qualification.json',import.meta.url),'utf8'));}assert(receipt.config_hash===configHash,'STALE_QUALIFICATION');for(const [path,digest] of Object.entries(receipt.source_hashes))assert(hash(readFileSync(new URL('../'+path,import.meta.url),'utf8'))===digest,'STALE_QUALIFICATION');return 'OFFLINE_ADAPTER_VERIFIED_LIVE_NOT_PROBED';}catch{return 'OFFLINE_TEST_REQUIRED';}}
export function qualificationIdentity(){if(offlineQualification()!=='OFFLINE_ADAPTER_VERIFIED_LIVE_NOT_PROBED')return null;for(const path of ['../config/lc-01s-offline-qualification.json','../config/offline-qualification.json']){try{return hash(readFileSync(new URL(path,import.meta.url),'utf8'));}catch{}}return null;}
export function descriptor(m){return {id:fullId(m.id),provider:'opencode-go',local:false,api_family:m.api,base_url:m.baseUrl,expected_route:route({...m,provider:'opencode-go'}),context_window:m.contextWindow,output_limit:m.maxTokens,input_modalities:m.input,output_modalities:['text'],structured_output:'PROMPTED_JSON_STRICT_HOST_VALIDATION',reasoning:'Pi simple-stream default; no reasoning-token inference',price_per_million:m.cost,availability:'SCOPED_REGISTERED_NOT_LIVE_PROBED',qualification:offlineQualification(),metadata_origin:m.id==='claude-haiku-5-5'?'MANAGED_PI_1.4.0_SCOPED_REGISTRATION':'PINNED_PI_1.0.4_WITH_DOCUMENTED_ENDPOINT_OVERLAY',config_hash:configHash};}
export async function transport({runtime,model,request,fetcher,apiKey,timeoutMs,maxTokens,maxInputBytes,maxResponseBytes,record,signal}){
 const controller=new AbortController();let timedout=false,attempts=0,terminal=false,usageSeen=false,raw='',usage=null,stopReason=null,httpStatus=null,refusal=null,wireBytes=0,wireChunks=0;
 const check=(ok,message)=>{if(!ok){refusal=message;throw Error(message);}};
 const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const timer=setTimeout(()=>{timedout=true;controller.abort();},timeoutMs);
 const safeRecord=(t,d)=>record(t,redact(d,apiKey));
 try{
  const stream=runtime.streamSimple(model,{messages:[{role:'system',content:request.system,timestamp:0},{role:'user',content:[{type:'text',text:request.user}],timestamp:0}]},{apiKey,env:{OPENCODE_API_KEY:apiKey},maxTokens,maxRetries:0,timeoutMs,cacheRetention:'none',transport:'sse',sessionId:request.session_id,headers:{'User-Agent':'language-studio/0.1r'},signal:controller.signal,
   onProviderStreamEvent:e=>{if(e.usage||e.message?.usage||e.response?.usage)usageSeen=true;if(e.choices?.some(c=>c.finish_reason)||e.type==='message_stop'||e.type==='response.completed'||e.type==='response.incomplete')terminal=true;},
   fetch:async(input,init)=>{attempts++;check(attempts===1,'SDK_SECOND_ATTEMPT_REFUSED');const req=new Request(input,init),body=await req.text(),data=JSON.parse(body);const observed=new URL(req.url),expected=new URL(route(model));check(observed.origin===expected.origin&&observed.pathname===expected.pathname&&[...observed.searchParams].every(([k,v])=>k==='beta'&&v==='true')&&data.model===model.id,'ROUTE_OR_MODEL_MISMATCH');check(Buffer.byteLength(body)<=maxInputBytes,'INPUT_BYTE_LIMIT');const cap=data.max_tokens??data.max_output_tokens??data.max_completion_tokens;check(Number.isInteger(cap)&&cap>0&&cap<=maxTokens,'OUTPUT_CAP_MISMATCH');safeRecord('PROVIDER_REQUEST',{request_hash:request.hash,model:fullId(model.id),api:model.api,url:req.url,method:req.method,body,body_hash:hash(body),input_bytes:Buffer.byteLength(body),session_id:request.session_id,public_headers:{'user-agent':req.headers.get('user-agent'),'x-opencode-session':req.headers.get('x-opencode-session')},authentication:'PROCESS_ENV_ONLY_REDACTED'});
    const outgoing=new Request(req.url,{method:req.method,headers:req.headers,body,signal:req.signal,redirect:'error'});const response=await fetcher(outgoing,{redirect:'error'});httpStatus=response.status;
    // Bound the consumed stream as well as final text. No response body/error headers are logged.
    const reader=response.body?.getReader();if(!reader)return response;let bytes=0;const bounded=new ReadableStream({async pull(c){try{const {done,value}=await reader.read();if(done){c.close();return;}bytes+=value.byteLength;wireBytes=bytes;wireChunks++;if(bytes>maxResponseBytes){refusal='RESPONSE_BYTE_LIMIT';await reader.cancel();c.error(Error('RESPONSE_BYTE_LIMIT'));return;}c.enqueue(value);}catch(e){c.error(e);}},cancel(reason){return reader.cancel(reason);}});return new Response(bounded,{status:response.status,headers:response.headers});
   }});
  const result=await stream.result();raw=result.content.filter(x=>x.type==='text').map(x=>x.text).join('');usage=usageSeen?result.usage:null;stopReason=result.stopReason;
  assert(!refusal,refusal);assert(!timedout,'TIMEOUT');assert(!controller.signal.aborted,'CANCELLED');assert(stopReason!=='length','TRUNCATED');assert(stopReason==='stop'&&terminal,httpStatus>=400?'HTTP_'+httpStatus:'FAILED_OR_INCOMPLETE_STREAM');
  return {raw:redact(raw,apiKey),usage,attempts,stop_reason:stopReason,http_status:httpStatus,transport:{wire_bytes:wireBytes,wire_chunks:wireChunks,max_stream_bytes:maxResponseBytes,completion_bytes:Buffer.byteLength(raw)}};
 }catch(e){const error=timedout?'TIMEOUT':controller.signal.aborted?'CANCELLED':/^TRUNCATED|^HTTP_|^INPUT_|^OUTPUT_|^ROUTE_|^SDK_|^FAILED_|^RESPONSE_/.test(e.message)?e.message:'PROVIDER_FAILED';safeRecord('PROVIDER_FAILURE',{request_hash:request.hash,raw,usage,attempts,stop_reason:stopReason,http_status:httpStatus,transport:{wire_bytes:wireBytes,wire_chunks:wireChunks,max_stream_bytes:maxResponseBytes,completion_bytes:Buffer.byteLength(raw)},error,error_hash:hash(String(e.message))});throw Error(error);
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
