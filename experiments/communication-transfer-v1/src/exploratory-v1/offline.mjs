import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeSession} from '../../../../harness/session.ts';
import {fauxAssistantMessage,fauxText} from '@earendil-works/pi-ai';
import {task,sourceClaims} from './task.mjs';
import {PROMPTS,Sender,Recipient,Evaluation,coverage,hash,PROFILES,LIMITS,ARMS,SENDER_ARMS,parseRoleOutput} from './contracts.mjs';
import {senderInput,sealSender,receiverPacket,evaluatorInput,hostCitationChecks} from './channel.mjs';
import {loadExperiment,matrix,preflight,qualify} from './providers.mjs';
import {html} from './viewer.mjs';

async function faux(role,input,response){
 const h=await makeSession({extensions:[],tools:[],resourceOptions:{systemPrompt:PROMPTS[role]}});
 let visible;const started=performance.now();
 h.faux.appendResponses([ctx=>{visible=structuredClone(ctx);return fauxAssistantMessage([fauxText(JSON.stringify(response))]);}]);
 try{
  await h.session.prompt(JSON.stringify(input));
  const text=h.session.messages.filter(x=>x.role==='assistant').at(-1).content.filter(x=>x.type==='text').map(x=>x.text).join('');
  const output=parseRoleOutput(role,text,role==='A'?undefined:task.questions.map(x=>x.id));
  return {role,actual_provider:'faux',planned_model:PROFILES.primary[role],standing:'SCRIPTED_NOT_REAL_MODEL_RESULT',session_id:h.session.sessionId,visible,visible_hash:hash(visible),output,latency_ms:performance.now()-started,tokens:null,actual_model_spend_usd:0,active_tools:h.session.getActiveToolNames()};
 }finally{h.dispose();}
}
export function scriptedSender(){
 return {
  message:'For the exporter, production changes require separate maintainer approval; compliance readiness is not approval. Emergency rollback can skip release review only for a signed last-known-good build with audit evidence retained; production logs cannot be deleted. Staging synthetic-record resets require test-owner approval and do not extend to production. External-vendor cache erasure is unresolved.',
  claims:sourceClaims(),
  uncertainties:['External-vendor cache treatment is unresolved.'],
  preservation_obligations:['Keep production/staging scope separate.','Keep rollback exception conditions and approval boundaries.','Do not turn unresolved conditions into permission.']
 };
}
function scriptedRecipient(delivery){
 const quoteText='External-vendor cache erasure is unresolved.';
 const start=delivery.packet.message.indexOf(quoteText);
 if(start<0)throw Error('SCRIPTED_CITATION_MISSING');
 const citation={text:quoteText,origin:'SENDER_MESSAGE',identity:delivery.packet.message_identity,hash:delivery.packet.message_hash,span:{start,end:start+quoteText.length}};
 return {answers:task.questions.map((q,i)=>({id:q.id,decision:['NO','YES','UNKNOWN'][i],explanation:'Scripted source-consistent application; not observed comprehension.',citations:i===2?[citation]:[]}))};
}
function scriptedEvaluation(){
 return {questions:task.questions.map((q,i)=>({id:q.id,decision_support:'SUPPORTED',explanation_support:'SUPPORTED',unsupported_or_contradicted_claims:[],missing_consequential_qualifications:[],abstention:i===2?'APPROPRIATE':'NOT_APPLICABLE',citations:i===2?[{index:0,origin:'SENDER_MESSAGE',verbatim:true,uncertainty:'This is sender wording, not promoted to an original-source quote.'}]:[],uncertainty:'Scripted advisory fixture; no independent adjudication.',unable_to_judge:false}))};
}
export async function runOffline({experiment}={}){
 experiment??=await loadExperiment();
 const pre=await preflight(experiment);
 const senders={};
 for(const arm of SENDER_ARMS){
  const a=await faux('A',senderInput(arm),scriptedSender());
  senders[arm]={a,sealed:sealSender(a.output)};
 }
 const traces=[];
 for(const arm of ARMS){
  const senderArm=arm==='PLAIN'?'PLAIN':'LINKED';
  const {a,sealed}=senders[senderArm];
  const delivery=receiverPacket(arm,sealed);
  const b=await faux('B',delivery.packet,scriptedRecipient(delivery));
  const c=await faux('C',evaluatorInput(delivery,b.output),scriptedEvaluation());
  const body={
   arm,
   standing:'SYNTHETIC_SCRIPTED_EXPLORATORY_UNADJUDICATED',
   source:task.source,
   source_hash:task.source_hash,
   sender_reuse:{reused:arm!=='PLAIN',from:senderArm,call_id:a.session_id},
   a:{...a,sealed},
   delivery,
   b,
   c,
   host_assessment:{reference:task.reference,status:'PROPOSED_UNADJUDICATED',primary:'NOT_ADJUDICATED',mechanical_citations:hostCitationChecks(delivery,b.output)},
   resources:{calls:3,retries:0,token_counts:'UNKNOWN_FAUX',cost_usd:0,latency_ms:a.latency_ms+b.latency_ms+c.latency_ms}
  };
  traces.push({...body,receipt_hash:hash(body)});
 }
 const sample=traces.find(t=>t.arm==='LINKED').c.output;
 const qualification=[];
 for(const id of [PROFILES.primary.C,PROFILES.challenger,PROFILES.additional,PROFILES.primary.B,PROFILES.primary.A]){
  const q=await qualify(id,sample,{maxTokens:id===PROFILES.primary.A?LIMITS.output_tokens.A:id===PROFILES.primary.B?LIMITS.output_tokens.B:LIMITS.output_tokens.C,experiment});
  q.transport_status=q.status;q.schema_valid=null;q.judgment_available=false;q.independently_adjudicated=false;
  if(q.status==='TRANSPORT_SUCCESS'&&id===PROFILES.primary.C){
   try{parseRoleOutput('C',q.text,task.questions.map(x=>x.id));q.schema_valid=true;q.judgment_available=true;q.judgment_standing='SUPPLIED_FIXTURE_NOT_ACTUAL_MODEL_JUDGMENT';}catch{q.schema_valid=false;}
  }
  qualification.push(q);
 }
 const linked=traces.find(t=>t.arm==='LINKED').delivery,matched=traces.find(t=>t.arm==='MATCHED_PLAIN').delivery;
 return {
  schema:'transfer-01d-offline/2',
  standing:'EXPLORATORY_UNADJUDICATED',
  status:pre.status,
  preflight:pre,
  model_matrix:await matrix(experiment),
  qualification,
  traces,
  source_information_match:{
   reference_arm:'LINKED',
   matched_arm:'MATCHED_PLAIN',
   shared_sealed_sender:true,
   excerpt_hashes_equal:JSON.stringify(linked.source_information_match.excerpt_hashes)===JSON.stringify(matched.source_information_match.excerpt_hashes),
   wire_bytes:{PLAIN:traces.find(t=>t.arm==='PLAIN').delivery.bytes,MATCHED_PLAIN:matched.bytes,LINKED:linked.bytes,CONTEXT:traces.find(t=>t.arm==='CONTEXT').delivery.bytes},
   note:'MATCHED_PLAIN and LINKED carry the same sealed sender output and verbatim excerpts; MATCHED_PLAIN renders them as ordinary text without claim metadata. This controls for source-information quantity, not for every possible stylistic difference.'
  },
  source_comparator:'NOT_EXECUTED_SOURCE_DEFINITION_PRESERVED',
  source:task.source,
  questions:task.questions,
  limits:LIMITS,
  real_requests:0
 };
}
export function save(result,out){
 mkdirSync(out,{recursive:false});
 const files={'receipts.json':JSON.stringify(result,null,2),'viewer.html':html(result)};
 for(const [p,v] of Object.entries(files))writeFileSync(join(out,p),v,{flag:'wx'});
 writeFileSync(join(out,'manifest.json'),JSON.stringify(Object.fromEntries(Object.entries(files).map(([p,v])=>[p,hash(v)])),null,2),{flag:'wx'});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.includes('--execute'))throw Error('BLOCKED: the offline runner never dispatches. Live execution requires live.mjs, an approved manifest, an explicit credential and human authorization.');
 const out=process.argv[2];
 if(!out)throw Error('Pass NEW_OFFLINE_DIRECTORY');
 const result=await runOffline();
 save(result,resolve(out));
 console.log(JSON.stringify({status:result.status,offline_traces:result.traces.length,real_requests:0,output:resolve(out)}));
}
