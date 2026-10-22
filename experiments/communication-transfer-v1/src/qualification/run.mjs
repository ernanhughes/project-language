import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeSession} from '../../../../harness/session.ts';
import {fauxAssistantMessage,fauxText} from '@earendil-works/pi-ai';
import {PROMPTS,POLICY,MODELS,Reservations,hash,parseOutput} from './contracts.mjs';
import {loadCorpus,makePacket,hostAssessment} from './corpus.mjs';
import {qualifyCall,makeLock} from './transport.mjs';
import {viewer} from './viewer.mjs';
import {verifyQualificationLock} from './lock.mjs';
export const VARIANTS=Object.freeze([{arm:'SOURCE',ablation:'none'},{arm:'PLAIN',ablation:'none'},{arm:'LINKED',ablation:'none'},...['relevant','irrelevant','conflicting','expired','unavailable'].map(ablation=>({arm:'CONTEXT',ablation}))]);
export function scriptedReceiver(task){return {answers:task.reference.map(r=>({id:r.question_id,decision:r.supported_decisions[0],explanation:'Authored test double: '+r.rationale,quotes:[]}))};}
const judge={supported:true,unsupported_claims:[],valid_abstention:true,rationale:'Scripted advice, not independent review.'};
export async function piCall(role,packet,response,budget,id){
 const h=await makeSession({extensions:[],tools:[],resourceOptions:{systemPrompt:PROMPTS[role]}});let visible,attempts=0,providerFailure;const start=performance.now();
 h.faux.appendResponses([ctx=>{attempts++;visible=structuredClone(ctx);try{const units=Buffer.byteLength(JSON.stringify(ctx))+1024;budget.reserve(id,units,POLICY.maxOutputTokens,0);return fauxAssistantMessage([fauxText(JSON.stringify(response))]);}catch(e){providerFailure=e;throw e;}}]);
 let timer;try{
  await Promise.race([h.session.prompt(JSON.stringify(packet)),new Promise((_,reject)=>{timer=setTimeout(()=>{h.session.abort();reject(Error('TIMED_OUT'));},POLICY.timeoutMs);})]);
  if(providerFailure)throw providerFailure;
  if(attempts!==1)throw Error('ATTEMPT_COUNT');
  const text=h.session.messages.filter(x=>x.role==='assistant').at(-1)?.content.filter(x=>x.type==='text').map(x=>x.text).join('')??'';
  return {role,provider:'faux',standing:'SCRIPTED_PI_NOT_MODEL_RESULT',session_id:h.session.sessionId,storage_hash:hash(h.agentDir),visible,visible_hash:hash(visible),active_tools:h.session.getActiveToolNames(),output:parseOutput(role,text,role==='B'?packet.questions.map(x=>x.id):undefined),output_bytes:Buffer.byteLength(text),elapsed_ms:performance.now()-start,attempts};
 }catch(e){e.safe_receipt={role,status:e.message,attempts,request:visible??null,output_disclosed:false};throw e;}
 finally{clearTimeout(timer);h.dispose();}
}
export async function runQualification(){
 const corpus=loadCorpus(),budget=new Reservations(),traces=[],transport=[],failure_controls=[];
 for(const task of corpus)for(const {arm,ablation}of VARIANTS){
  const root=task.id+'/'+arm+'/'+ablation;
  const a=await piCall('A',{source_hash:task.source_hash,source:task.source,questions:task.questions,format:arm==='PLAIN'?'ordinary message':'source-linked',max_channel_bytes:POLICY.maxWireBytes},{message:task.plain_message,claims:task.claims},budget,root+'/A');
  const channel=makePacket(task,arm,a.output,ablation);
  const b=await piCall('B',channel.packet,scriptedReceiver(task),budget,root+'/B');
  const c=await piCall('C',{source:task.source,questions:task.questions,anonymous_response:b.output},judge,budget,root+'/C');
  const body={schema:'transfer-01b-trace/1',standing:'SCRIPTED_NOT_AI_RESULT',task_id:task.id,source_hash:task.source_hash,source:task.source,questions:task.questions,arm,ablation,a,channel,b,c,assessment:hostAssessment(task,b.output,c.output),claim_diagnostics:task.claims.map(x=>({id:x.id,quotation_delivered:channel.packet.claims?.some(y=>y.id===x.id)??arm==='SOURCE',semantic_preservation:'NOT_ADJUDICATED'})),resources:{source_bytes:Buffer.byteLength(task.source),channel_bytes:channel.bytes,model_tokens:null,token_status:'UNKNOWN_FAUX',latency_ms:[a,b,c].reduce((n,x)=>n+x.elapsed_ms,0),correction_cost:0,actual_model_spend_usd:0}};
  traces.push({...body,receipt_hash:hash(body)});
 }
 const t=corpus[0];const samples={A:{message:t.plain_message,claims:t.claims},B:scriptedReceiver(t),C:judge};
 const transportBudget=new Reservations({...POLICY,maxCalls:40});
 for(const role of ['A','B','C']){
  const packet={source_hash:t.source_hash,questions:t.questions,...(role==='A'?{source:t.source}:role==='B'?makePacket(t,'LINKED',samples.A).packet:{source:t.source,anonymous_response:samples.B})};
  const preview=await qualifyCall({role,packet,response:samples[role],callId:role+'-preview',budget:transportBudget});
  transport.push(preview);
  transport.push(await qualifyCall({role,packet,response:samples[role],callId:role+'-matched',expectedRequestHash:preview.capture.request_hash,budget:transportBudget}));
  for(const kind of ['http429','http500','length','truncated','timeout'])failure_controls.push(await qualifyCall({role,packet,response:samples[role],kind,callId:role+'-'+kind,timeoutMs:kind==='timeout'?20:1000,budget:transportBudget}));
 }
 const wrong=scriptedReceiver(t);wrong.answers[0]={...wrong.answers[0],decision:'YES',explanation:'Fluent but unsupported: emergency overrides the prohibition.',quotes:['Emergency overrides the prohibition.']};
 const falseEndorsement=hostAssessment(t,wrong,judge),missedRefusal=hostAssessment(t,scriptedReceiver(t),{...judge,valid_abstention:false});
 return {schema:'transfer-01b-run/1',status:'OFFLINE_ONLY',live_authorized:false,corpus_approval:'PROPOSED_UNADJUDICATED',traces,transport,failure_controls,judge_controls:{standing:'AUTHORED_NOT_ADJUDICATED',false_endorsement:falseEndorsement,missed_valid_refusal:missedRefusal},reservations:budget.snapshot(),transport_reservations:transportBudget.snapshot(),blocked:['INDEPENDENT_HUMAN_ADJUDICATION_PENDING','CURRENT_DOC_ENDPOINT_DIFFERS_FROM_INSTALLED_ROUTE','QWEN_INSTALLED_AUTH_HEADER_DIFFERS_FROM_CURRENT_BEARER_GUIDANCE','REAL_TOKENIZER_AND_PROVIDER_BILLING_NOT_QUALIFIED','LIVE_PILOT_NOT_AUTHORIZED','HALUEVAL_IMPORT_DISABLED'],hallucination_energy:'NOT_COMPUTED',taint:'NOT_COMPUTED / NOT_TRANSMITTED'};
}
export function saveQualification(result,out){
 mkdirSync(out,{recursive:false});
 writeQualification(result,out);
}
function writeQualification(result,out){
 const files={'receipts.json':JSON.stringify(result,null,2),'viewer.html':viewer(result)};
 for(const [name,text]of Object.entries(files))writeFileSync(join(out,name),text,{flag:'wx'});
 writeFileSync(join(out,'manifest.json'),JSON.stringify(Object.fromEntries(Object.entries(files).map(([name,text])=>[name,hash(text)])),null,2),{flag:'wx'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [out,lockPath,expectedLockHash]=process.argv.slice(2);if(!out||!lockPath||!expectedLockHash)throw Error('Usage: run.mjs NEW_DIRECTORY QUALIFICATION_LOCK EXPECTED_LOCK_SHA256. Offline only.');
 if(process.argv.some(x=>x==='--execute'||x==='--live'))throw Error('LIVE_DISPATCH_ABSENT');
 mkdirSync(resolve(out),{recursive:false});
 try{verifyQualificationLock(resolve(lockPath),expectedLockHash);const result=await runQualification();result.qualification_lock_sha256=expectedLockHash;writeQualification(result,resolve(out));console.log(JSON.stringify({status:'OFFLINE_ONLY',traces:result.traces.length,faux_calls:result.reservations.planned_calls,external_requests:0,output:resolve(out)}));}
 catch(error){const safe={status:'BLOCKED_OFFLINE',traces:[],failure:error.safe_receipt??{status:'QUALIFICATION_FAILED',details_hash:hash(String(error.message))},live_authorized:false};writeFileSync(join(resolve(out),'failure.json'),JSON.stringify(safe,null,2),{flag:'wx'});console.error(JSON.stringify({status:safe.status,output:resolve(out)}));process.exitCode=1;}
}
