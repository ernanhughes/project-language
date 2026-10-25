import {mkdirSync,writeFileSync} from 'node:fs';import {join} from 'node:path';
import {Studio} from '../../apps/language-demo/engine/studio.mjs';
import {Runtime} from '../../apps/language-demo/models/runtime.mjs';
import {Log} from '../../apps/language-demo/storage/log.mjs';
import {applySettings} from '../../apps/language-demo/server/settings.mjs';
import {HINT_INSTRUCTION} from '../../apps/language-demo/understanding/analysis.mjs';
import {sourceOf,interpreterInput,questionOf,mechanicalReview,validAnswer,intent} from './protocol.mjs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {sourceContract} from '../../apps/language-demo/protocol/source-contract.mjs';
export function scriptedProposal(source){return {schema:'language-state/0.1',interpretation:source.text,outcome:'Scripted control only',commitments:[{id:'fixture-c1',kind:'claim',text:source.text,standing:'SOURCE_STATED',evidence:[{origin:'ORIGINAL_SOURCE',source_id:source.id,source_hash:source.hash,start:0,end:source.text.length,text:source.text}],conditions:[],exceptions:[]}],contradictions:[],unknowns:[],preservation:[],relations:[]};}
// Instrument guard: reject a question field or question metadata, but do not
// reject the source text merely because the source itself contains the exact
// question string (as in R1E-07). The old substring check produced a false
// INTERPRETER_QUESTION_LEAK before any model call in the R3 live run.
function hasQuestionField(value){
 if(Array.isArray(value))return value.some(hasQuestionField);
 if(value&&typeof value==='object')return Object.entries(value).some(([key,item])=>['question','question_text','question_id'].includes(key)||hasQuestionField(item));
 return false;
}
export function interpreterQuestionLeak(input,c){
 if(!input||typeof input!=='object')return false;
 if(hasQuestionField(input))return true;
 for(const key of ['intent','purpose','audience'])if(String(input[key]??'').includes(c.question))return true;
 return false;
}
export async function executeArm({c,arm,profile,out,live,charge,fetcher,env,scriptedProposal:makeScriptedProposal,scriptedAnswer:makeScriptedAnswer}){
 mkdirSync(out,{recursive:false});
 const runtime=new Runtime({mode:'opencode',remoteEnabled:live,directExecution:true,env:env??(live?process.env:{}),...(fetcher?{fetcher}:{})});
 const studio=new Studio({runtime,log:new Log(join(out,'events.jsonl'))});
 applySettings(studio,profile,{record:true});
 studio.understanding.configure({...studio.understanding.configuration,profile:c.profile});
 const originalRecord=studio.record;
 studio.record=(type,data)=>{if(type==='MODEL_REQUEST'){if(data.role==='recipient'&&data.input.question?.text!==c.question)throw Error('QUESTION_IDENTITY');if(data.role==='interpreter'&&interpreterQuestionLeak(data.input,c))throw Error('INTERPRETER_QUESTION_LEAK');charge(data);}return originalRecord(type,data);};
 studio.create({intent,source:c.source,audience:'Independent reader'});
 // Use selected source identity, without constructing a prospective Task containing an oracle.
 studio.exchange.source=sourceOf(c);studio.exchange.purpose='Faithful communication to a fresh recipient';studio.save();
 const trial={id:c.id+'-'+arm,exchange:studio.exchange};let packet,answer,error=null;
 const result={arm,origin:live?'HOSTED_OPENCODE_GO':'SCRIPTED_NOT_MODEL_EVIDENCE',status:'NOT_RUN',semantic_quality:'NOT_ASSESSED'};
 try{
  const initial=await studio.understanding.initial(trial,{source:sourceOf(c),purpose:studio.exchange.purpose,audience:studio.exchange.audience});
  const call=async(role,input)=>{
   if(live)return runtime.run(role,input,studio.record);
   const request={role,model:'fixture:batch20',session_id:crypto.randomUUID(),input,standing:'SCRIPTED_NOT_MODEL_EVIDENCE'};request.prompt_hash=hash(request);studio.record('SCRIPTED_REQUEST',request);
   const output=role==='interpreter'?(makeScriptedProposal?makeScriptedProposal(c,arm):scriptedProposal(sourceOf(c))):(makeScriptedAnswer?makeScriptedAnswer(c,arm):{decision:'UNKNOWN',explanation:'Scripted plumbing control; not a model answer or oracle prediction.',citations:[]});studio.record('SCRIPTED_RESULT',{role,output});return output;
  };
  let version;
  if(arm==='A_SOURCE_ONLY')packet={schema:'language-delivery/0.1',purpose:studio.exchange.purpose,audience:studio.exchange.audience,...sourceContract(c.question_scope??'SOURCE_RELATIVE'),source:sourceOf(c)};
  else{
   const input=interpreterInput(c,arm==='C_UNDERSTANDING_ENHANCED'?{artifact_id:initial.id,instructions:HINT_INSTRUCTION,inventory:initial.inventory}:undefined);
   const proposal=await call('interpreter',input);version=studio.version(proposal);studio.understanding.proposal(trial,version);
   const review=mechanicalReview(proposal,sourceOf(c));studio.record('EVALUATION_ONLY_REVIEW',{digest:version.digest,...review});
   studio.decide({digest:version.digest,decision:'ACCEPT',actor:'TEST_OPERATOR'});
   packet=studio.packet('LANGUAGE').packet;
   if(c.question_scope)packet={...packet,...sourceContract(c.question_scope)};
  }
  const input={packet,question:questionOf(c)};studio.record('BATCH_DELIVERY_SEALED',{arm,packet,packet_hash:hash(packet),question:questionOf(c),action_authority:false});
  answer=await call('recipient',input);const validated=validAnswer(answer,sourceOf(c),{allowHashRepair:true});answer=validated.answer;
  result.status='VALID';result.output=answer;result.mechanical={schema:'PASS',source_binding:'PASS',citation_resolution:validated.citation_resolution,host_repaired_hashes:validated.repaired_hashes};
  // The source-only analysis sentinel is not a proposal, version or acceptance.
  const analysisVersion=version??{digest:hash({source_only_analysis:hash(packet)}),proposal:{commitments:[]}};
  await studio.understanding.after(trial,{id:c.id,source:sourceOf(c),purpose:studio.exchange.purpose,audience:studio.exchange.audience,question:questionOf(c)},analysisVersion,packet,answer,arm);
 }catch(e){error=e.message;studio.record('BATCH_ARM_FAILURE',{arm,error,recipient_response_captured:!!answer});if(result.status==='VALID')result.analysis_error=error;else{result.status='FAILED';result.error=error;}}
 const data={case_id:c.id,split:c.split,arm,result,source:sourceOf(c),question:questionOf(c),packet:packet??null,unvalidated_answer:answer??null,understanding:trial.understanding??null,studio:studio.export()};
 writeFileSync(join(out,'record.json'),JSON.stringify(data,null,2)+'\n');
 return {...result,packet_bytes:packet?Buffer.byteLength(JSON.stringify(packet)):null,model:profile.roles.recipient,record_path:out};
}
