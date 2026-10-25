import {assert} from '../protocol/state.mjs';

export function guidedState(studio){
 const exchange=studio.exchange,v=exchange?.versions.at(-1),transfer=exchange?.transfers.findLast(t=>t.version===v?.digest);
 if(transfer)return {stage:'complete',primary:'See Results',version:v.digest};
 if(v?.status==='ACCEPTED'){
  try{studio.packet('LANGUAGE');return {stage:'resume',primary:'Finish Test',version:v.digest};}
  catch(e){return {stage:'blocked',primary:null,error:e.message};}
 }
 if(v?.status==='REJECTED')return {stage:'blocked',primary:null,error:'The proposed meaning was rejected. Request a correction before finishing.'};
 if(v){const challenged=studio.log.events.some(e=>e.type==='CHALLENGE'&&e.data.version===v.digest);return {stage:challenged||v.transformation==='human-clarified-revision'?'review':'continue',primary:challenged||v.transformation==='human-clarified-revision'?'Approve & Finish':'Continue Test',version:v.digest};}
 return {stage:'start',primary:'Start Test'};
}
function gate(studio,payload,roles){
 const remote=roles.some(r=>studio.runtime.assignments[r]!=='fixture');
 if(!remote)return;
 const plan=studio.runtime.plan();
 if(!studio.runtime.directExecution)assert(payload.plan_hash===plan.hash,'STALE_REMOTE_PLAN');
 if(!studio.runtime.directExecution&&!plan.approval_active)studio.authorize({plan_hash:payload.plan_hash,confirm_remote:payload.confirm_remote===true,confirm_service_use:payload.confirm_service_use===true});
 assert(studio.runtime.requests+roles.filter(r=>studio.runtime.assignments[r]!=='fixture').length<=studio.runtime.settings.max_requests,'REQUEST_CAP_EXCEEDED');
 assert(studio.runtime.reserved+roles.filter(r=>studio.runtime.assignments[r]!=='fixture').length*plan.per_request_reservation_usd<=studio.runtime.settings.budget_usd,'BUDGET_CAP_EXCEEDED');
}
export async function guidedStart(studio,payload){
 assert(['start','continue'].includes(guidedState(studio).stage),'GUIDED_START_NOT_REQUIRED');
 const v=studio.exchange?.versions.at(-1),hasChallenge=v&&studio.log.events.some(e=>e.type==='CHALLENGE'&&e.data.version===v.digest);
 const needed=[...(!v?['interpreter']:[]),...(!hasChallenge?['challenger']:[])];
 gate(studio,payload,needed);
 if(!studio.exchange)studio.create(payload.input??{});
 if(!studio.current())await studio.interpret();
 if(!studio.log.events.some(e=>e.type==='CHALLENGE'&&e.data.version===studio.current().digest))await studio.challenge();
 return studio.view();
}
export async function guidedFinish(studio,payload){
 const v=studio.current();assert(v,'PROPOSAL_REQUIRED');
 studio.verifyVersion(v);assert(payload.digest===v.digest,'STALE_VERSION');
 assert(!studio.exchange.transfers.some(t=>t.version===v.digest),'RECIPIENT_ALREADY_COMPLETED');
 assert(['PROPOSED','CHALLENGED','ACCEPTED'].includes(v.status),'NOT_PENDING');
 const accepted=v.status==='ACCEPTED';
 if(!accepted)assert(payload.reviewed===true,'HUMAN_REVIEW_REQUIRED');
 // Prepare/validate before accepting; existing acceptance is never replaced.
 gate(studio,payload,['recipient']);
 if(!accepted)studio.decide({digest:v.digest,decision:'ACCEPT',acknowledge_challenges:payload.reviewed===true,actor:studio.runtime.executionStanding==='INJECTED_HTTP_NOT_MODEL_RESULT'?'TEST_OPERATOR':payload.actor??'LOCAL_OPERATOR'});
 const arm=v.transformation==='human-clarified-revision'?'NEGOTIATED_LANGUAGE':'LANGUAGE';
 const packet=studio.packet(arm);
 if(payload.packet_hash)assert(packet.packet_hash===payload.packet_hash,'PACKET_PREVIEW_MISMATCH');
 studio.record('GUIDED_FINISH',{version:v.digest,packet_hash:packet.packet_hash,resumed_existing_acceptance:accepted});
 return studio.deliver(arm);
}

export async function guidedCorrect(studio,payload){assert(typeof payload.clarification==='string'&&payload.clarification.trim(),'CLARIFICATION_REQUIRED');assert(!studio.exchange?.question_revealed,'SENDER_SEALED_QUESTION_ALREADY_EXPOSED');gate(studio,payload,['mediator']);return studio.correct({clarification:payload.clarification});}
