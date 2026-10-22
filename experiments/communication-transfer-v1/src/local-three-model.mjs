// Manual exploratory smoke test. Separate from all frozen qualification/pilot runs.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PROMPTS,Reservations,POLICY,hash,parseOutput} from './qualification/contracts.mjs';
import {modelFor,contextFor,SETTINGS} from './qualification/transport.mjs';
import {loadCorpus,makePacket} from './qualification/corpus.mjs';

export async function liveCall({role,packet,credential,budget,send=globalThis.fetch}){
 const {p,model}=modelFor(role),controller=new AbortController();
 let attempts=0,terminal=false,usageSeen=false,capture=null,refusal=null,timedOut=false;
 const start=performance.now(),timer=setTimeout(()=>{timedOut=true;controller.abort();},60000);
 const fetch=async(input,init={})=>{
  attempts++;if(attempts>1)throw Error('SECOND_ATTEMPT_REFUSED');
  const request=new Request(input,init),body=await request.clone().text(),value=JSON.parse(body);
  const cap=value.max_tokens??value.max_completion_tokens;
  if(!Number.isInteger(cap)||cap<1||cap>2048)throw Error('OUTPUT_CAP_INVALID');
  const expected=model.api==='anthropic-messages'?'https://opencode.ai/zen/go/v1/messages?beta=true':'https://opencode.ai/zen/go/v1/chat/completions';
  if(request.url!==expected||value.model!==model.id)throw Error('ROUTE_OR_MODEL_CHANGED');
  const headers=Object.fromEntries(request.headers);
  for(const key of Object.keys(headers))if(/authorization|api-key|cookie/i.test(key))headers[key]='[REDACTED]';
  capture={url:request.url,method:request.method,headers,body,body_hash:hash(body),request_hash:hash({url:request.url,method:request.method,headers,body})};
  const inputUnits=Buffer.byteLength(body)+1024;
  // Higher of pinned catalogue and documented peak DeepSeek rates; estimates, not invoice guarantees.
  const rates=model.id==='deepseek-v4.1-flash'?{input:0.30,output:1.20}:model.cost;
  budget.reserve(role,inputUnits,2048,(inputUnits*rates.input+2048*rates.output)/1e6);
  const response=await send(request);
  if(!response.ok){refusal='HTTP_'+response.status;await response.body?.cancel();throw Error(refusal);}
  const reader=response.body?.getReader();if(!reader)throw Error('EMPTY_HTTP_BODY');let received=0;
  const bounded=new ReadableStream({async pull(out){try{const next=await reader.read();if(next.done){out.close();return;}received+=next.value.byteLength;if(received>131072){refusal='RESPONSE_STREAM_LIMIT';controller.abort();await reader.cancel();out.error(Error(refusal));return;}out.enqueue(next.value);}catch{out.error(Error('STREAM_READ_FAILED'));}},cancel:()=>reader.cancel()});
  return new Response(bounded,{status:response.status,headers:response.headers});
 };
 try{
  const result=await p.streamSimple(model,contextFor(role,packet),{...SETTINGS,apiKey:credential,fetch,signal:controller.signal,timeoutMs:60000,env:{},sessionId:'transfer-smoke-'+hash(packet).slice(0,16)+'-'+role,onProviderStreamEvent:e=>{if(e.usage||e.message?.usage)usageSeen=true;if(e.choices?.some(c=>c.finish_reason)||e.type==='message_stop')terminal=true;}}).result();
  const raw=result.content.filter(x=>x.type==='text').map(x=>x.text).join('');
  if(refusal||timedOut||result.stopReason!=='stop'||!terminal)throw Error(refusal??(timedOut?'TIMEOUT':result.stopReason==='length'?'TRUNCATED':'INCOMPLETE_OR_FAILED_RESPONSE'));
  if(usageSeen&&(result.usage.output>2048||result.usage.input>12000))throw Error('REPORTED_USAGE_EXCEEDED');
  if(credential&&raw.includes(credential))throw Error('CREDENTIAL_IN_OUTPUT');
  const output=parseOutput(role,raw,role==='B'?packet.questions.map(q=>q.id):undefined);
  return {role,model:'opencode-go/'+model.id,api:model.api,status:'COMPLETED',attempts,capture,output,usage:{provider_reported:usageSeen?result.usage:null,catalog_estimate:usageSeen?result.usage.cost:null,actual_invoice_usd:null,billing:'UNVERIFIED'},elapsed_ms:performance.now()-start};
 }catch(error){
  const code=refusal??(timedOut?'TIMEOUT':'REQUEST_OR_RESPONSE_REFUSED');
  return {role,model:'opencode-go/'+model.id,status:'FAILED',failure_code:code,attempts,capture,output:null,raw_error_disclosed:false,error_hash:hash(String(error?.message??error)),elapsed_ms:performance.now()-start};
 }finally{clearTimeout(timer);}
}
export function saveSmoke(out,result){
 const text=JSON.stringify(result,null,2);writeFileSync(join(out,'results.json'),text,{flag:'wx'});
 const safe=text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><title>Three-model exploratory smoke test</title><style>body{font:16px system-ui;max-width:1100px;margin:30px auto;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}strong{color:#8b4600}</style><h1>Three-model exploratory smoke test</h1><p><strong>Unadjudicated engineering observation. No comparative advantage or human acceptance is established.</strong></p><pre>'+safe+'</pre></html>';
 writeFileSync(join(out,'viewer.html'),html,{flag:'wx'});writeFileSync(join(out,'manifest.json'),JSON.stringify({'results.json':hash(text),'viewer.html':hash(html)},null,2),{flag:'wx'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),execute=args.includes('--execute');
 if(!execute){console.log(JSON.stringify({status:'PREVIEW_ONLY',models:['A','B','C'].map(role=>({role,model:'opencode-go/'+modelFor(role).model.id,api:modelFor(role).model.api,base_url:modelFor(role).model.baseUrl})),task:'deployment-policy-v1',arm:'PLAIN',max_requests:3,max_output_tokens:2048,deadline_seconds:60,retries:0,fallback:false,required_env:'OPENCODE_API_KEY',note:'Installed legacy routes; compatibility is tested only when you explicitly execute. No automatic endpoint substitution.'},null,2));}
 else{
  if(!args.includes('--exploratory-unadjudicated')||!args.includes('--accept-installed-routes'))throw Error('Explicit --exploratory-unadjudicated and --accept-installed-routes flags required.');
  const outArg=args[args.indexOf('--output')+1],ceiling=Number(args[args.indexOf('--budget-usd')+1]);
  if(!args.includes('--output')||!outArg||outArg.startsWith('--')||!args.includes('--budget-usd')||!Number.isFinite(ceiling)||ceiling<=0||ceiling>1)throw Error('Specify --output NEW_DIRECTORY and --budget-usd CEILING (maximum 1).');
  const credential=process.env.OPENCODE_API_KEY;if(!credential)throw Error('Set OPENCODE_API_KEY in this PowerShell process first. No .env or saved credentials are read.');
  const out=resolve(outArg);mkdirSync(out,{recursive:false});
  const budget=new Reservations({...POLICY,maxCalls:3,proposedUsd:ceiling,maxTotalInputUnits:36000,maxTotalOutputTokens:6144});
  const task=loadCorpus()[0],calls=[],result={schema:'transfer-three-model-smoke/1',status:'RUNNING',standing:'EXPLORATORY_UNADJUDICATED',primary_assessment:'NOT_ADJUDICATED',task_id:task.id,source_hash:task.source_hash,source:task.source,questions:task.questions,arm:'PLAIN',calls,billing_warning:'Reservations are estimates, not a provider-invoice guarantee.',historical_locks_modified:false};
  let packet={source_hash:task.source_hash,source:task.source,questions:task.questions,format:'ordinary message with source-selection audit',max_channel_bytes:3000};
  for(const role of ['A','B','C']){
   const call=await liveCall({role,packet,credential,budget});calls.push(call);writeFileSync(join(out,role+'.json'),JSON.stringify(call,null,2),{flag:'wx'});
   if(call.status!=='COMPLETED'){result.status='STOPPED_ON_FAILURE';break;}
   if(role==='A'){try{const channel=makePacket(task,'PLAIN',call.output);result.channel=channel;packet=channel.packet;}catch{result.status='STOPPED_INVALID_SENDER_PACKET';break;}}
   if(role==='B')packet={source_hash:task.source_hash,source:task.source,questions:task.questions,anonymous_response:call.output};
   if(role==='C')result.status='COMPLETED';
  }
  result.reservations=budget.snapshot();saveSmoke(out,result);console.log(JSON.stringify({status:result.status,requests:calls.length,output:out,viewer:join(out,'viewer.html')},null,2));if(result.status!=='COMPLETED')process.exitCode=1;
 }
}
