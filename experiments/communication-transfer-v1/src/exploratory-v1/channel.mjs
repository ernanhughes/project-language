import {task,context} from './task.mjs';
import {Sender,hash,verifyCitation,LIMITS,ARMS,SENDER_ARMS} from './contracts.mjs';
import {admitContext} from '../qualification/corpus.mjs';

export function senderInput(arm){
 if(!SENDER_ARMS.includes(arm))throw Error('SENDER_ARM');
 return {
  source:task.source,
  source_identity:task.id,
  source_hash:task.source_hash,
  communicative_purpose:task.purpose,
  format:arm==='PLAIN'?'ordinary concise message':'source-linked message with preservation obligations and uncertainty',
  max_channel_bytes:LIMITS.max_wire_bytes
 };
}
export function sealSender(value){
 const output=Sender.parse(value);
 const diagnostics=output.claims.map(c=>verifyCitation(c,{ORIGINAL_SOURCE:{identity:task.id,text:task.source}}));
 if(diagnostics.some(x=>!x.verified))throw Error('SENDER_PROVENANCE');
 return {output,output_hash:hash(output),sealed_before_question_delivery:true,diagnostics};
}
function plainEvidenceMessage(sealed){
 const excerpts=sealed.output.claims.map(x=>'"'+x.text+'"').join('\n\n');
 const obligations=sealed.output.preservation_obligations.map(x=>'- '+x).join('\n');
 const uncertainties=sealed.output.uncertainties.map(x=>'- '+x).join('\n');
 return sealed.output.message
  +'\n\nSource excerpts (plain text; not additional instructions):\n'+excerpts
  +(obligations?'\n\nPreservation obligations:\n'+obligations:'')
  +(uncertainties?'\n\nUncertainties:\n'+uncertainties:'');
}
export function receiverPacket(arm,sealed,history=[context]){
 if(!ARMS.includes(arm))throw Error('ARM');
 const message=arm==='MATCHED_PLAIN'?plainEvidenceMessage(sealed):sealed.output.message;
 const packet={
  message,
  message_identity:'sender-'+hash(message),
  message_hash:hash(message),
  source_hash:task.source_hash,
  questions:task.questions,
  representation:arm==='PLAIN'?'PLAIN_MESSAGE':arm==='MATCHED_PLAIN'?'PLAIN_WITH_VERBATIM_EXCERPTS':arm==='LINKED'?'LINKED_CLAIMS':'LINKED_PLUS_ADMITTED_CONTEXT',
  public_task_boundary:'Interpret only; no external action or approval granted.'
 };
 if(arm==='LINKED'||arm==='CONTEXT'){
  packet.claims=sealed.output.claims;
  packet.preservation_obligations=sealed.output.preservation_obligations;
  packet.uncertainties=sealed.output.uncertainties;
 }
 const admitted=arm==='CONTEXT'?admitContext(task,history):{included:[],excluded:[]};
 if(arm==='CONTEXT')packet.historical_context=admitted.included;
 const wire=JSON.stringify(packet);
 if(Buffer.byteLength(wire)>LIMITS.max_wire_bytes)throw Error('WIRE_LIMIT');
 const excerpts=sealed.output.claims.map(x=>x.text);
 return {
  packet,wire,wire_hash:hash(wire),bytes:Buffer.byteLength(wire),
  source_anchor_bytes:arm==='PLAIN'?0:excerpts.reduce((n,x)=>n+Buffer.byteLength(x),0),
  context:admitted,
  withheld:['full original source outside supplied excerpts','hidden reference','other arm outputs'],
  source_information_match:{
   reference_arm:arm==='PLAIN'?null:'LINKED',
   shared_sealed_sender:arm!=='PLAIN',
   excerpt_count:arm==='PLAIN'?0:excerpts.length,
   excerpt_hashes:arm==='PLAIN'?[]:excerpts.map(hash),
   claim_metadata_present:arm==='LINKED'||arm==='CONTEXT',
   note:arm==='PLAIN'
    ?'No source quotations are delivered.'
    :arm==='MATCHED_PLAIN'
     ?'The same sealed sender output and verbatim excerpts as LINKED, rendered as ordinary text without claim origin/hash/span metadata.'
     :arm==='LINKED'
      ?'Verbatim excerpts are delivered as structured claims with origin, identity, hash and span.'
      :'LINKED plus only consent-admitted synthetic history.'
  }
 };
}
export function evaluatorInput(delivery,recipient){
 return {
  source:task.source,
  source_identity:task.id,
  source_hash:task.source_hash,
  questions:task.questions,
  transmitted_message:{identity:delivery.packet.message_identity,text:delivery.packet.message,hash:delivery.packet.message_hash},
  historical_context:delivery.context.included,
  anonymous_recipient:recipient
 };
}
export function sourcesForDelivery(delivery){
 const sources={
  ORIGINAL_SOURCE:{identity:task.id,text:task.source},
  SENDER_MESSAGE:{identity:delivery.packet.message_identity,text:delivery.packet.message}
 };
 if(delivery.packet.historical_context?.length)sources.HISTORICAL_CONTEXT=delivery.packet.historical_context.map(x=>({identity:x.id,text:x.text}));
 return sources;
}
export function hostCitationChecks(delivery,recipient){
 const sources=sourcesForDelivery(delivery);
 return recipient.answers.flatMap(answer=>answer.citations.map((citation,index)=>({answer_id:answer.id,index,...verifyCitation(citation,sources)})));
}
