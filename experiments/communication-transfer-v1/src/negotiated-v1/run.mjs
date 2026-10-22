import {makeSession} from '../../../../harness/session.ts';
import {fauxAssistantMessage,fauxText} from '@earendil-works/pi-ai';
import {hash,Reservations,POLICY} from '../qualification/contracts.mjs';
import {CASES,Negotiation,stateFor,decisionFor,Proposal} from './protocol.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';
import {render} from './viewer.mjs';
import {z} from 'zod';
const RULES={interpreter:'Return only JSON proposal {id,base,responds_to,state}. Interpret the expression and any explicit clarification. Keep proposals pending; preserve independent constraints. Never invent human acceptance or grant authority.',reviewer:'Return JSON {question:string,element_ids:string[]}. Challenge a specific uncertainty in the proposed state. You are advisory, not the fresh recipient or independent evaluator; you cannot accept state or grant actions.',recipient:'Return JSON {decision: YES|NO|UNKNOWN,reason:string,support_ids:string[]}. Apply only the transferred accepted information to the new question. Source, pending proposals and original conversation are unavailable. SIMULATED_HUMAN acceptance is not real human approval or action authorization; no action execution.'};
const Recipient=z.object({decision:z.enum(['YES','NO','UNKNOWN']),reason:z.string().min(1),support_ids:z.array(z.string())}).strict();
const Reviewer=z.object({question:z.string().min(1),element_ids:z.array(z.string()).min(1)}).strict();
export async function call(role,packet,script,budget,id){
 const h=await makeSession({extensions:[],tools:[],resourceOptions:{systemPrompt:RULES[role]}});let visible,attempts=0;const start=performance.now();
 h.faux.appendResponses([ctx=>{attempts++;visible=structuredClone(ctx);budget.reserve(id,Buffer.byteLength(JSON.stringify(ctx))+1024,2048,0);return fauxAssistantMessage([fauxText(JSON.stringify(script))]);}]);
 let timer;try{await Promise.race([h.session.prompt(JSON.stringify(packet)),new Promise((_,reject)=>{timer=setTimeout(()=>{h.session.abort();reject(Error('TIMEOUT'));},1000);})]);
 const text=h.session.messages.filter(x=>x.role==='assistant').at(-1)?.content.filter(x=>x.type==='text').map(x=>x.text).join('')??'';if(Buffer.byteLength(text)>8192||attempts!==1)throw Error('RESPONSE_BOUND');
 const parsed=JSON.parse(text);(role==='interpreter'?Proposal:role==='reviewer'?Reviewer:Recipient).parse(parsed);
 return {role,standing:'SCRIPTED_PI_NOT_MODEL_RESULT',session_id:h.session.sessionId,storage_hash:hash(h.agentDir),visible,visible_hash:hash(visible),output:parsed,output_bytes:Buffer.byteLength(text),elapsed_ms:performance.now()-start,attempts,active_tools:h.session.getActiveToolNames()};
 }finally{clearTimeout(timer);h.dispose();}
}
export async function runNegotiated({negative=false,refuse=false}={}){
 const budget=new Reservations({...POLICY,maxCalls:24}),pairs=[];
 for(const c of CASES)for(const arm of ['DIRECT_REVISED','NEGOTIATED']){
  const n=new Negotiation(c),id=c.id+'/'+arm;
  const a=await call('interpreter',{source_hash:c.source_hash,expression:c.expression,base:'NONE'},{id:'initial',base:'NONE',responds_to:null,state:stateFor(c)},budget,id+'/A1');n.propose(a.output);
  const b=await call('reviewer',{expression:c.expression,pending_proposal:a.output},{question:'Which condition is established, and does it change the independent retained boundary?',element_ids:['condition','retained-boundary']},budget,id+'/B');const challenge=n.challenge('initial',b.output.question);
  const a2=await call('interpreter',{expression:c.expression,previous:a.output,challenge,clarification:{actor:'SIMULATED_HUMAN',text:c.clarification}},{id:'revised',base:'NONE',responds_to:challenge.id,state:stateFor(c,true)},budget,id+'/A2');n.propose(a2.output);
  if(refuse){n.reject('revised');pairs.push({case_id:c.id,arm,standing:'SCRIPTED / SIMULATED_HUMAN',status:'REFUSED',a,b,a2,journal:n.events,recipient:null,assessment:'NOT_ADJUDICATED'});continue;}
  const decision=decisionFor(n,'revised');n.accept('revised',decision);const accepted=n.transfer();n.verify(accepted);
  const direct={schema:'direct-revised/1',case_id:c.id,source_hash:c.source_hash,revision:accepted.revision,accepted_by:'SIMULATED_HUMAN',scope:c.id,expires:accepted.expires,facts:accepted.state.items.map(x=>({id:x.id,text:x.text,status:x.standing})),action_authority:'NO_GRANTS'};
  const transferred=arm==='NEGOTIATED'?accepted:direct;
  const packet={accepted_transfer:transferred,new_question:c.question};if(Buffer.byteLength(JSON.stringify(packet))>4096)throw Error('TRANSFER_BOUND');
  const recipient=await call('recipient',packet,{decision:negative&&arm==='NEGOTIATED'?'YES':c.expected,reason:negative&&arm==='NEGOTIATED'?'Deliberately wrong scripted permission.':'Apply the established condition without dropping the independent boundary or resolving an open question.',support_ids:['condition','retained-boundary']},budget,id+'/C');
  const body={schema:'transfer-negotiated-trace/1',standing:'SCRIPTED / SIMULATED_HUMAN / PROPOSED_UNADJUDICATED',case_id:c.id,arm,expression:c.expression,source_hash:c.source_hash,a,b,challenge,clarification:{actor:'SIMULATED_HUMAN',text:c.clarification},a2,acceptance:decision,accepted_revision:accepted,journal:n.events,proposals:n.proposals,transferred,transfer_bytes:Buffer.byteLength(JSON.stringify(packet)),recipient,assessment:{primary:'NOT_ADJUDICATED',authored_decision_matches:recipient.output.decision===c.expected,authored_reference:c.expected,scope:'SCRIPTED_INSTRUMENT_DIAGNOSTIC_ONLY',novel_question_seen_by_sender:false},resources:{calls:4,input_output_tokens:'UNKNOWN_FAUX',latency_ms:[a,b,a2,recipient].reduce((sum,x)=>sum+x.elapsed_ms,0),correction_calls:1,actual_model_spend_usd:0,estimated_billing:'NOT_APPLICABLE_OFFLINE'}};
  pairs.push({...body,receipt_hash:hash(body)});
 }
 return {schema:'transfer-negotiated-run/1',status:'PASS_OFFLINE_NOT_EFFECTIVENESS',live_authorized:false,pairs,reservations:budget.snapshot(),reviewer_is_evaluator:false,human_acceptance:'SIMULATED_HUMAN_ONLY',primary_assessment:'NOT_ADJUDICATED',taint:'NOT_COMPUTED / NOT_TRANSMITTED'};
}
export function save(result,out){mkdirSync(out,{recursive:false});const files={'receipts.json':JSON.stringify(result,null,2),'viewer.html':render(result)};for(const [name,text]of Object.entries(files))writeFileSync(join(out,name),text,{flag:'wx'});writeFileSync(join(out,'manifest.json'),JSON.stringify(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,hash(v)])),null,2),{flag:'wx'});}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const out=process.argv[2];if(!out||process.argv.length!==3)throw Error('Offline only: run.mjs NEW_DIRECTORY');save(await runNegotiated(),resolve(out));console.log(JSON.stringify({status:'PASS_OFFLINE',faux_calls:24,real_model_calls:0,output:resolve(out)}));}
