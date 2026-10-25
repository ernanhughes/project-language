import {readFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ModelRuntime} from '@earendil-works/pi-coding-agent';
import {hash,PROFILES,LIMITS} from './contracts.mjs';

export const DEFAULT_MODELS_PATH=fileURLToPath(new URL('../../config/models.json',import.meta.url));
export const SYNTHETIC_KEY='synthetic-01d-only';
export const ROUTES=Object.freeze({
 'anthropic-messages':{suffix:'/v1/messages',auth_header:'x-api-key',family:'Anthropic Messages'},
 'openai-completions':{suffix:'/chat/completions',auth_header:'Authorization Bearer',family:'OpenAI Chat Completions'},
 'openai-responses':{suffix:'/responses',auth_header:'Authorization Bearer',family:'OpenAI Responses'}
});

function pathOf(modelsPath){return modelsPath instanceof URL?fileURLToPath(modelsPath):resolve(modelsPath);}
function trimSlash(value){return value.replace(/\/+$/u,'');}
export function expectedRoute(model){const route=ROUTES[model.api];if(!route)throw Error('UNKNOWN_API_FAMILY');return trimSlash(model.baseUrl)+route.suffix;}
export function observedRouteMatches(model,url){
 const expected=new URL(expectedRoute(model)),observed=new URL(url);
 return expected.protocol===observed.protocol&&expected.host===observed.host&&expected.pathname===observed.pathname;
}
export function modelRoute(model){const route=ROUTES[model.api];return {api:model.api,family:route?.family??'UNKNOWN',expected_url:expectedRoute(model),auth_header:route?.auth_header??'UNKNOWN'};}

/**
 * Loads the installed Pi provider registry plus the experiment-local models.json.
 * The auth path is deliberately a non-existent file: this function never reads a
 * saved credential. A live scheduler supplies its credential explicitly at dispatch.
 */
export async function loadExperiment({modelsPath=DEFAULT_MODELS_PATH}={}){
 const resolved=pathOf(modelsPath);
 let text=null;try{text=await readFile(resolved,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 const runtime=await ModelRuntime.create({
  modelsPath:resolved,
  authPath:join(dirname(resolved),'__no_saved_credentials__.json'),
  modelsStorePath:join(dirname(resolved),'__no_models_store__.json'),
  allowModelNetwork:false,
  refreshOnCreate:false
 });
 const configError=runtime.getError()??null;
 const configStatus=text===null?'CONFIG_MISSING':configError?'CONFIG_INVALID':'CONFIG_PRESENT';
 return {runtime,modelsPath:resolved,configText:text,configHash:text===null?null:hash(text),configStatus,configError,credentialFilesRead:false};
}

export async function matrix(experiment){
 experiment??=await loadExperiment();
 const ids=[PROFILES.primary.A,PROFILES.primary.B,PROFILES.primary.C,PROFILES.challenger,PROFILES.additional,PROFILES.historical];
 const error=experiment.configError;
 return ids.map(id=>{
  const model=experiment.runtime.getModel('opencode-go',id);
  const local=id===PROFILES.primary.C;
  return {
   provider:'opencode-go',
   id,
   primary_evaluator:id===PROFILES.primary.C,
   installed:!!model,
   registration:model?(local?'EXPERIMENT_LOCAL_MODELS_JSON':'BUILTIN_CATALOGUE'):'MISSING',
   api:model?.api??null,
   base_url:model?.baseUrl??null,
   context:model?.contextWindow??null,
   max_output:model?.maxTokens??null,
   catalogue_price:model?.cost??null,
   route:model?modelRoute(model):null,
   immutable_vendor_revision:'UNKNOWN',
   live_availability:'NOT_PROBED',
   structured_output:'PROMPTED_JSON_WITH_HOST_SCHEMA_NO_NATIVE_JSON_MODE_ASSUMED',
   config_status:experiment.configStatus,
   config_hash:experiment.configHash,
   config_error:error?hash(error):null,
   qualification:model
    ?(error?'BLOCKED_CONFIG_INVALID':local?'OFFLINE_REGISTERED_CONFIG_PRESENT':'STATIC_ID_FOUND_CONFIG_PRESENT')
    :(error?'BLOCKED_CONFIG_INVALID':'BLOCKED_MISSING_INSTALLED_MODEL')
  };
 });
}

export async function preflight(experiment){
 experiment??=await loadExperiment();
 const rows=await matrix(experiment);
 const missing=rows.filter(x=>Object.values(PROFILES.primary).includes(x.id)&&!x.installed).map(x=>x.id);
 const status=experiment.configStatus==='CONFIG_MISSING'
  ?'BLOCK_CONFIG_MISSING'
  :experiment.configStatus==='CONFIG_INVALID'
   ?'BLOCK_CONFIG_INVALID'
   :missing.length
    ?'BLOCK_MISSING_PRIMARY_MODEL'
    :'OFFLINE_REGISTERED_LIVE_NOT_AUTHORIZED';
 return {
  status,
  live_authorized:false,
  config_status:experiment.configStatus,
  config_hash:experiment.configHash,
  config_error:experiment.configError?hash(experiment.configError):null,
  missing_primary_models:missing,
  credential_files_read:false,
  automatic_fallback:false,
  service_traffic_permission:'REQUIRES_HUMAN_CONFIRMATION_FOR_THIS_RESEARCH_WORKLOAD',
  live_requirements:['explicit human approval of this manifest','confirmation that this research workload is acceptable under Go terms','operator-supplied credential at dispatch time','remote auth/route availability canary'],
  models:rows
 };
}

function sse(api,text,kind){
 if(api==='openai-completions'){
  const a={choices:[{index:0,delta:{content:text},finish_reason:null}]};
  const b={choices:[{index:0,delta:{},finish_reason:kind==='length'?'length':'stop'}],usage:{prompt_tokens:100,completion_tokens:40,total_tokens:140}};
  return 'data: '+JSON.stringify(a)+'\n\n'+(kind==='truncated'?'':'data: '+JSON.stringify(b)+'\n\ndata: [DONE]\n\n');
 }
 if(api==='anthropic-messages'){
  const events=[{type:'message_start',message:{id:'f',role:'assistant',type:'message',content:[],usage:{input_tokens:100,output_tokens:0}}},{type:'content_block_start',index:0,content_block:{type:'text',text:''}},{type:'content_block_delta',index:0,delta:{type:'text_delta',text}},{type:'content_block_stop',index:0},...(kind==='truncated'?[]:[{type:'message_delta',delta:{stop_reason:kind==='length'?'max_tokens':'end_turn'},usage:{output_tokens:40}},{type:'message_stop'}])];
  return events.map(x=>'event: '+x.type+'\ndata: '+JSON.stringify(x)+'\n\n').join('');
 }
 const item={id:'m',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text,annotations:[]}]};
 const events=[{type:'response.created',response:{id:'r',object:'response',status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',content:[]}},{type:'response.content_part.added',output_index:0,content_index:0,item_id:'m',part:{type:'output_text',text:'',annotations:[]}},{type:'response.output_text.delta',output_index:0,content_index:0,item_id:'m',delta:text},{type:'response.output_item.done',output_index:0,item}];
 if(kind!=='truncated')events.push({type:kind==='length'?'response.incomplete':'response.completed',response:{id:'r',object:'response',status:kind==='length'?'incomplete':'completed',output:[item],incomplete_details:kind==='length'?{reason:'max_output_tokens'}:null,usage:{input_tokens:100,output_tokens:40,total_tokens:140,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}}});
 return events.map(x=>'event: '+x.type+'\ndata: '+JSON.stringify(x)+'\n\n').join('');
}

/**
 * Fixture-only transport qualification. There is intentionally no caller-supplied
 * fetch and no real credential path here. The captured Request is the installed
 * Pi adapter's own serialization, not a hand-built substitute client.
 */
export async function qualify(id,reply,{kind='ok',timeoutMs=1000,maxTokens=4096,experiment}={}){
 experiment??=await loadExperiment();
 if(experiment.configStatus==='CONFIG_MISSING')return {id,status:'BLOCKED_CONFIG_MISSING',attempts:0,real_requests:0,config_status:experiment.configStatus};
 if(experiment.configStatus==='CONFIG_INVALID')return {id,status:'BLOCKED_CONFIG_INVALID',attempts:0,real_requests:0,config_status:experiment.configStatus,config_error_hash:hash(experiment.configError)};
 const model=experiment.runtime.getModel('opencode-go',id);
 if(!model)return {id,status:'BLOCKED_MISSING_INSTALLED_MODEL',attempts:0,real_requests:0,config_status:experiment.configStatus};
 const route=modelRoute(model);
 let capture=null,attempts=0,terminal=false,usageSeen=false,refusal=null,httpStatus=null;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const stream=experiment.runtime.streamSimple(model,{messages:[{role:'system',content:'Return the requested JSON as an advisory fixture. No action authority.',timestamp:0},{role:'user',content:[{type:'text',text:'Synthetic API qualification only; no private data.'}],timestamp:0}]},{
   apiKey:SYNTHETIC_KEY,env:{OPENCODE_API_KEY:SYNTHETIC_KEY},maxTokens,maxRetries:0,timeoutMs,cacheRetention:'none',transport:'sse',signal:controller.signal,sessionId:'transfer-01d-offline-qualification',
   onProviderStreamEvent:event=>{
    if(event.usage||event.message?.usage||event.response?.usage)usageSeen=true;
    if(event.choices?.some(x=>x.finish_reason)||event.type==='message_stop'||event.type==='response.completed'||event.type==='response.incomplete')terminal=true;
   },
   fetch:async(input,init)=>{
    attempts++;if(attempts>1)throw Error('SECOND_ATTEMPT_REFUSED');
    const request=new Request(input,init),body=await request.text(),headers=Object.fromEntries(request.headers),payload=JSON.parse(body);
    const observedModel=payload.model,cap=payload.max_tokens??payload.max_completion_tokens??payload.max_output_tokens;
    const routeMatch=observedRouteMatches(model,request.url);
    const authModes=[];
    for(const [key,value] of Object.entries(headers)){
     if(/^authorization$/i.test(key))authModes.push('Authorization');
     if(/^x-api-key$/i.test(key))authModes.push('x-api-key');
     if(/authorization|api-key|cookie/i.test(key))headers[key]='[REDACTED_SYNTHETIC]';
    }
    capture={url:request.url,method:request.method,headers,body,body_hash:hash(body),request_hash:hash({url:request.url,method:request.method,headers,body}),body_bytes:Buffer.byteLength(body),auth_modes:authModes,model_observed:observedModel,route_match:routeMatch};
    if(observedModel!==model.id||!routeMatch){refusal='ROUTE_OR_MODEL_CHANGED';throw Error(refusal);}
    if(!Number.isInteger(cap)||cap<1||cap>maxTokens){refusal='OUTPUT_CAP_INVALID';throw Error(refusal);}
    if(kind==='timeout')return new Promise((_,reject)=>{const stop=()=>reject(Error('CANCELLED'));if(request.signal.aborted)stop();else request.signal.addEventListener('abort',stop,{once:true});});
    if(kind==='http429'){httpStatus=429;return new Response('withheld synthetic error',{status:429});}
    if(kind==='http500'){httpStatus=500;return new Response('withheld synthetic error',{status:500});}
    return new Response(sse(model.api,typeof reply==='string'?reply:JSON.stringify(reply),kind),{status:200,headers:{'content-type':'text/event-stream'}});
   }
  });
  const output=await stream.result(),text=output.content.filter(x=>x.type==='text').map(x=>x.text).join('');
  const status=refusal??(controller.signal.aborted?'TIMEOUT':output.stopReason==='length'?'TRUNCATED':output.stopReason!=='stop'||!terminal?'FAILED_OR_INCOMPLETE':'TRANSPORT_SUCCESS');
  return {
   id,api:model.api,status,attempts,http_status:httpStatus,capture,route_expected:route.expected_url,route_observed:capture?.url??null,route_match:capture?.route_match??false,
   terminal_seen:terminal,text:status==='TRANSPORT_SUCCESS'?text:null,text_hash:status==='TRANSPORT_SUCCESS'?hash(text):null,
   usage:usageSeen?output.usage:null,usage_standing:'INJECTED_NOT_MODEL_MEASUREMENT',actual_invoice_usd:null,real_requests:0,
   config_status:experiment.configStatus,config_hash:experiment.configHash,registration:'EXPERIMENT_LOCAL_MODELS_JSON'
  };
 }catch(error){
  return {
   id,api:model.api,status:refusal??(controller.signal.aborted?'TIMEOUT':'ADAPTER_FAILED'),attempts,http_status:httpStatus,capture,
   route_expected:route.expected_url,route_observed:capture?.url??null,route_match:capture?.route_match??false,
   terminal_seen:terminal,text:null,usage:usageSeen?null:null,usage_standing:'INJECTED_NOT_MODEL_MEASUREMENT',actual_invoice_usd:null,real_requests:0,
   error_hash:hash(String(error?.message??error)),config_status:experiment.configStatus,config_hash:experiment.configHash,registration:'EXPERIMENT_LOCAL_MODELS_JSON'
  };
 }finally{clearTimeout(timer);}
}
