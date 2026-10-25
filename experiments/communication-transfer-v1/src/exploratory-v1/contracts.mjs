import {z} from 'zod';
import {hash} from '../qualification/contracts.mjs';
export {hash};

export const PROFILES=Object.freeze({primary:{A:'deepseek-v4.1-flash',B:'qwen3.8-flash',C:'claude-haiku-5-5'},challenger:'gpt-6-luna',additional:'glm-5.3-flash',historical:'glm-5.3'});
export const ARMS=Object.freeze(['PLAIN','MATCHED_PLAIN','LINKED','CONTEXT']);
export const SENDER_ARMS=Object.freeze(['PLAIN','LINKED']);
export const SHARED_SENDER_ARMS=Object.freeze(['MATCHED_PLAIN','LINKED','CONTEXT']);
export const LIMITS=Object.freeze({
 estimated_usd:1,
 max_actual_requests:12,
 max_input_units:12000,
 max_total_input_units:144000,
 max_total_output_tokens:49152,
 output_tokens:{A:8192,B:3072,C:4096},
 deadline_ms:90000,
 timeout_ms:90000,
 sdk_retries:0,
 sender_retries:0,
 recipient_retries:0,
 evaluator_retries_per_arm:1,
 max_global_evaluator_retries:1,
 fallback:false,
 max_wire_bytes:6000,
 max_response_bytes:131072,
 max_stream_bytes:1048576
});
export const ORIGINS=['ORIGINAL_SOURCE','SENDER_MESSAGE','HISTORICAL_CONTEXT','MODEL_INFERENCE','UNKNOWN_ORIGIN'];
export const Citation=z.object({text:z.string().min(1),origin:z.enum(ORIGINS),identity:z.string(),hash:z.string(),span:z.object({start:z.number().int().nonnegative(),end:z.number().int().positive()}).strict().nullable()}).strict();
export const Sender=z.object({message:z.string().min(1),claims:z.array(Citation).min(1),uncertainties:z.array(z.string()),preservation_obligations:z.array(z.string())}).strict();
export const Recipient=z.object({answers:z.array(z.object({id:z.string(),decision:z.enum(['YES','NO','UNKNOWN','SOURCE_CONFLICT']),explanation:z.string(),citations:z.array(Citation)}).strict()).min(1)}).strict();
const Judgment=z.enum(['SUPPORTED','UNSUPPORTED','CONTRADICTED','UNABLE_TO_JUDGE']);
export const Evaluation=z.object({questions:z.array(z.object({id:z.string(),decision_support:Judgment,explanation_support:Judgment,unsupported_or_contradicted_claims:z.array(z.string()),missing_consequential_qualifications:z.array(z.string()),abstention:z.enum(['APPROPRIATE','INAPPROPRIATE','NOT_APPLICABLE','UNABLE_TO_JUDGE']),citations:z.array(z.object({index:z.number().int().nonnegative(),origin:z.enum(ORIGINS),verbatim:z.boolean(),uncertainty:z.string()}).strict()),uncertainty:z.string(),unable_to_judge:z.boolean()}).strict()).min(1)}).strict();
export const PROMPTS=Object.freeze({
 A:'You are a sender preparing a concise policy handoff for future software-maintenance decisions. Receive only a source and general purpose. Preserve consequential scope, exceptions, authority conditions and uncertainty; you do not know the application questions. Return JSON {message, claims, uncertainties, preservation_obligations}. Each claim has text, origin, identity, hash and span {start,end}. ORIGINAL_SOURCE claims must quote exact supplied source UTF-16 spans and source hash. Never invent approval or resolve uncertainty. No tools, retrieval or external action.',
 B:'Apply only the supplied communication packet to the new questions. Return JSON {answers:[{id,decision,explanation,citations}]}; decisions YES/NO/UNKNOWN/SOURCE_CONFLICT. Each citation has text, origin, identity, hash, span:{start,end} or null. Distinguish ORIGINAL_SOURCE, SENDER_MESSAGE, HISTORICAL_CONTEXT, MODEL_INFERENCE and UNKNOWN_ORIGIN. A paraphrase is not a verbatim source quote. Cite only actually available text. Source quotations may arrive inside an ordinary message or as structured claims; the origin is the delivered text you actually used. Preserve uncertainty and authority limits; no tools or external actions.',
 C:'Give advisory per-question source-grounded assessment, never human adjudication. Return JSON {questions:[{id,decision_support,explanation_support,unsupported_or_contradicted_claims,missing_consequential_qualifications,abstention,citations,uncertainty,unable_to_judge}]}. Support values SUPPORTED/UNSUPPORTED/CONTRADICTED/UNABLE_TO_JUDGE. Abstention APPROPRIATE/INAPPROPRIATE/NOT_APPLICABLE/UNABLE_TO_JUDGE. Citation entries {index,origin,verbatim,uncertainty}. Classify exact original-source quotations separately from sender-message quotations, historical context, inference and unknown origin. You see no condition/model label, hidden reference or other evaluations. Repeated valid-looking JSON is not proof of support.'
});
export function verifyCitation(citation,sources){
 Citation.parse(citation);
 if(['MODEL_INFERENCE','UNKNOWN_ORIGIN'].includes(citation.origin))return {claimed_origin:citation.origin,verified:false,standing:'NOT_VERBATIM_EVIDENCE'};
 const candidates=Array.isArray(sources[citation.origin])?sources[citation.origin]:sources[citation.origin]?[sources[citation.origin]]:[];
 const source=candidates.find(x=>x.identity===citation.identity);
 if(!source||citation.hash!==hash(source.text))return {claimed_origin:citation.origin,verified:false,standing:'ORIGIN_BINDING_FAILED'};
 const s=citation.span;
 if(!s||s.end<=s.start||source.text.slice(s.start,s.end)!==citation.text)return {claimed_origin:citation.origin,verified:false,standing:'SPAN_OR_TEXT_FAILED'};
 return {claimed_origin:citation.origin,verified:true,standing:'VERBATIM_AT_CLAIMED_ORIGIN_ONLY'};
}
export function coverage(output,ids,field){
 const items=output[field];
 if(!Array.isArray(items))throw Error('QUESTION_COVERAGE');
 const actual=items.map(x=>x.id);
 if(new Set(actual).size!==actual.length||JSON.stringify([...actual].sort())!==JSON.stringify([...ids].sort()))throw Error('QUESTION_COVERAGE');
}
const SCHEMAS=Object.freeze({A:Sender,B:Recipient,C:Evaluation});
export function parseRoleOutput(role,text,questionIds){
 if(!SCHEMAS[role])throw Error('UNKNOWN_ROLE');
 if(Buffer.byteLength(text)>LIMITS.max_response_bytes)throw Error('OUTPUT_BYTES');
 if(/oc_sk_|sk-ant-|Bearer\s+\S+/i.test(text))throw Error('SENSITIVE_OUTPUT');
 let value;try{value=JSON.parse(text);}catch{throw Error('MALFORMED_JSON');}
 const parsed=SCHEMAS[role].safeParse(value);if(!parsed.success)throw Error('SCHEMA_INVALID');
 if(role==='B'&&questionIds)coverage(parsed.data,questionIds,'answers');
 if(role==='C'&&questionIds)coverage(parsed.data,questionIds,'questions');
 return parsed.data;
}
export class Budget{
 constructor(policy=LIMITS){this.policy=policy;this.calls=0;this.inputUnits=0;this.outputTokens=0;this.reservedUsd=0;this.used=new Set();this.callsByRole={A:0,B:0,C:0};}
 reserve(cost,{role,id}={}){
  if(!Number.isFinite(cost)||cost<0)throw Error('INVALID_RESERVATION');
  if(this.calls>=this.policy.max_actual_requests||this.reservedUsd+cost>this.policy.estimated_usd)throw Error('REQUEST_OR_BUDGET_LIMIT');
  if(id){if(this.used.has(id))throw Error('CALL_ALREADY_PLANNED');this.used.add(id);}
  this.calls++;this.reservedUsd+=cost;if(role)this.callsByRole[role]=(this.callsByRole[role]??0)+1;
  return this.snapshot();
 }
 reserveCall({id,role,inputUnits,outputTokens,estimatedUsd}){
  const p=this.policy;
  if(!id||this.used.has(id))throw Error('CALL_ALREADY_PLANNED');
  if(!['A','B','C'].includes(role))throw Error('UNKNOWN_ROLE');
  if(!Number.isInteger(inputUnits)||inputUnits<0||inputUnits>p.max_input_units)throw Error('INPUT_BOUND');
  if(!Number.isInteger(outputTokens)||outputTokens<1||outputTokens>p.output_tokens[role])throw Error('ROLE_OUTPUT_CAP');
  if(!Number.isFinite(estimatedUsd)||estimatedUsd<0)throw Error('INVALID_RESERVATION');
  if(this.calls>=p.max_actual_requests)throw Error('REQUEST_LIMIT');
  if(this.inputUnits+inputUnits>p.max_total_input_units)throw Error('INPUT_TOTAL_EXHAUSTED');
  if(this.outputTokens+outputTokens>p.max_total_output_tokens)throw Error('OUTPUT_TOTAL_EXHAUSTED');
  if(this.reservedUsd+estimatedUsd>p.estimated_usd)throw Error('BUDGET_EXHAUSTED');
  this.used.add(id);this.calls++;this.inputUnits+=inputUnits;this.outputTokens+=outputTokens;this.reservedUsd+=estimatedUsd;this.callsByRole[role]++;
  return {id,role,input_units:inputUnits,output_tokens:outputTokens,estimated_usd:estimatedUsd,calls_after_reservation:this.calls};
 }
 remaining(){return {calls:this.policy.max_actual_requests-this.calls,usd:this.policy.estimated_usd-this.reservedUsd,input_units:this.policy.max_total_input_units-this.inputUnits,output_tokens:this.policy.max_total_output_tokens-this.outputTokens};}
 snapshot(){return {planned_calls:this.calls,calls_by_role:{...this.callsByRole},input_admission_units:this.inputUnits,output_tokens_reserved:this.outputTokens,estimated_usd_reserved:this.reservedUsd,remaining:this.remaining(),actual_provider_cost_usd:null,billing:'UNKNOWN',dollar_guarantee:false};}
}
