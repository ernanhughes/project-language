import {z} from 'zod';
import {assert,hash} from '../protocol/state.mjs';
import {PROMPT_VERSION,REVIEWER_VERSION,ReviewerPayload,makeReviewerOutput} from './semantic-reviewer-v7-contract.mjs';

export const REVIEW_SYSTEM_PROMPT=`You are a semantic reviewer. Compare SOURCE and TRANSFORMATION and report only material semantic changes, faithful paraphrase, or genuine uncertainty.

Return only JSON matching the supplied schema. Do not add prose outside JSON.

For each assessment choose exactly one change_kind:
- QUANTITY_OR_BOUNDARY: a number, written number, operator, unit, threshold, duration, or inclusive/exclusive boundary changed.
- EXCEPTION_SCOPE: the set of cases covered by an exception, permission, or prohibition was broadened or narrowed. Set material=true.
- PREREQUISITE: a required condition, prerequisite, or dependency is missing or changed.
- EPISTEMIC_STATUS: an unresolved or uncertain matter became established (epistemic_direction=ESTABLISHED_FROM_UNRESOLVED), new uncertainty was added (UNCERTAINTY_ADDED), or genuine ambiguity was preserved (AMBIGUITY_PRESERVED).
- CAUSAL: a causal relation was added, promoted, or reversed beyond what the source states.
- REFERENT_OR_SPEAKER: a referent, quotation, attribution, or speaker changed.
- UNSUPPORTED_ADDITION: new authority, permission, fact, or content is asserted without source support.
- NO_MATERIAL_CHANGE: faithful paraphrase, reordering, terminology substitution, or task-appropriate omission.
- UNCERTAIN: the available evidence does not support a definite judgment. Use an abstention when appropriate.

Rules:
- material must be true for every change except NO_MATERIAL_CHANGE and UNCERTAIN. material must be false for NO_MATERIAL_CHANGE.
- For every change_kind except EPISTEMIC_STATUS, set epistemic_direction to NONE.
- For NO_MATERIAL_CHANGE, set material=false and epistemic_direction=NONE.
- If an exception changes which cases are covered, use EXCEPTION_SCOPE and material=true. Do not call it mere ambiguity.
- An incident labelled "unresolved" is a status label, not necessarily epistemic uncertainty about a proposition.
- Distinguish "has not been decided" (unresolved status) from ordinary negation. If the source leaves a matter unresolved and the transformation states it as fact, use EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED.
- If the transformation adds doubt that the source does not support, use EPISTEMIC_STATUS/UNCERTAINTY_ADDED.
- If the source explicitly leaves a matter unresolved and the transformation preserves that unresolved status, use EPISTEMIC_STATUS/AMBIGUITY_PRESERVED, not NO_MATERIAL_CHANGE.
- Use exact, verbatim source_quote and transformation_quote from the supplied texts. Do not paraphrase inside a quote. transformation_quote may be empty only when a source obligation is missing from the transformation.
- A task-appropriate omission is NO_MATERIAL_CHANGE when the purpose states that the omitted detail is irrelevant. If the purpose permits a supplied reading to show that a threshold is met, do not require the summary to restate the threshold arithmetic.
- Do not invent evidence. Do not infer a change from the declared obligations alone; inspect the source.
- The declared obligations are provided for context and may be incomplete.
- Do not claim that the transformation is equivalent unless the assessments support that conclusion.
- Keep the summary short and factual.`;

function requestBody({model,prompt,input,numPredict}){
 return {model,stream:false,think:false,format:z.toJSONSchema(ReviewerPayload),messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify(input)}],options:{num_predict:numPredict,temperature:0},keep_alive:'10m'};
}

export class LocalOllamaReviewer{
 constructor({model='qwen3.5:latest',endpoint='http://127.0.0.1:11434',timeoutMs=120000,maxRequests=80,numPredict=1400,fetcher=fetch}={}){
  this.model=model;this.endpoint=endpoint.replace(/\/$/,'');this.timeoutMs=timeoutMs;this.maxRequests=maxRequests;this.numPredict=numPredict;this.fetcher=fetcher;
  this.metadata=null;this.requests=0;this.records=[];this.qualified=false;this.qualification=null;
 }
 async discover(){
  const response=await this.fetcher(`${this.endpoint}/api/tags`,{signal:AbortSignal.timeout(5000),redirect:'error'});
  assert(response.ok,'LOCAL_CATALOGUE_HTTP_'+response.status);
  const data=await response.json();const found=(data.models??[]).find(m=>m.name===this.model||m.model===this.model);
  assert(found,'LOCAL_MODEL_NOT_FOUND');
  let details={};
  try{const info=await this.fetcher(`${this.endpoint}/api/show`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:this.model}),signal:AbortSignal.timeout(10000),redirect:'error'});if(info.ok)details=await info.json();}catch{}
  this.metadata={provider:'ollama-local',id:this.model,digest:found.digest??'UNKNOWN',size:found.size??null,parameter_size:details.details?.parameter_size??null,quantization:details.details?.quantization_level??null};
  return {metadata:this.metadata,status:'LOCAL_MODEL_DISCOVERED_NOT_YET_QUALIFIED'};
 }
 checkBudget(){
  assert(this.requests<this.maxRequests,'REVIEWER_REQUEST_BUDGET_EXCEEDED');
 }
 async review({source,transformation,purpose='',obligations=[]}){
  if(!this.metadata)await this.discover();
  this.checkBudget();
  const input={purpose,source:{id:source.id,text:source.text,hash:source.hash},transformation:{id:transformation.id,text:transformation.text,hash:transformation.hash},declared_obligations:obligations.map(o=>({id:o.id,source_quote:o.source_quote,description:o.description??''}))};
  const request={prompt_version:PROMPT_VERSION,reviewer_version:REVIEWER_VERSION,model:this.metadata,input};
  const requestHash=hash(request);
  const started=performance.now();
  this.requests++;
  const body=requestBody({model:this.model,prompt:REVIEW_SYSTEM_PROMPT,input,numPredict:this.numPredict});
  this.records.push({type:'REVIEW_REQUEST',at:new Date().toISOString(),request_hash:requestHash,prompt_version:PROMPT_VERSION,reviewer_version:REVIEWER_VERSION,model:this.metadata,input,request_body:{...body,format:'<json-schema>'},standing:'LOCAL_MODEL_OBSERVATION'});
  let raw=null,usage=null;
  try{
   const response=await this.fetcher(`${this.endpoint}/api/chat`,{method:'POST',redirect:'error',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(this.timeoutMs),body:JSON.stringify(body)});
   assert(response.ok,'LOCAL_HTTP_'+response.status);
   const text=await response.text();
   assert(Buffer.byteLength(text)<=262144,'LOCAL_RESPONSE_TOO_LARGE');
   const envelope=JSON.parse(text);
   raw=envelope.message?.content??'';
   usage={input_tokens:envelope.prompt_eval_count??null,output_tokens:envelope.eval_count??null,reasoning_tokens:null};
   assert(envelope.done_reason!=='length','LOCAL_TRUNCATED');
   let payload;
   try{payload=JSON.parse(raw);}catch{throw Error('REVIEWER_MALFORMED_JSON');}
   const output=makeReviewerOutput(payload,{source,transformation,model:this.metadata});
   const latency=performance.now()-started;
   this.records.push({type:'REVIEW_RESULT',at:new Date().toISOString(),request_hash:requestHash,model:this.metadata,raw,output,usage,latency_ms:latency,retries:0,status:'VALID_SCHEMA_AND_EVIDENCE',standing:'LOCAL_MODEL_OBSERVATION'});
   return {output,raw,usage,latency_ms:latency,request_hash:requestHash};
  }catch(e){
   const latency=performance.now()-started;
   this.records.push({type:'REVIEW_ERROR',at:new Date().toISOString(),request_hash:requestHash,model:this.metadata,raw,usage,latency_ms:latency,retries:0,error:e.message,standing:'LOCAL_MODEL_OBSERVATION'});
   throw e;
  }
 }
 async qualify({cases}){
  const rows=[];
  for(const c of cases){
   const started=performance.now();
   try{
    const result=await this.review({source:{id:c.id+'-source',text:c.source,hash:hash(c.source)},transformation:{id:c.id+'-transformation',text:c.transformation,hash:hash(c.transformation)},purpose:c.purpose,obligations:c.obligations??[]});
    rows.push({id:c.id,status:'PASS',latency_ms:result.latency_ms,usage:result.usage,assessments:result.output.assessments.length,abstentions:result.output.abstentions.length,summary:result.output.summary});
   }catch(e){rows.push({id:c.id,status:'FAIL',latency_ms:performance.now()-started,error:e.message});}
  }
  const passed=rows.filter(r=>r.status==='PASS').length;
  this.qualification={schema:'lc02-r7-local-model-qualification/0.1',standing:'LOCAL_MODEL_OBSERVATION',model:this.metadata,prompt_version:PROMPT_VERSION,reviewer_version:REVIEWER_VERSION,cases:rows.length,passed,failed:rows.length-passed,rows};
  this.qualified=passed===rows.length&&rows.length>0;
  return this.qualification;
 }
}

export class ScriptedReviewer{
 constructor({payloads={},defaultPayload={assessments:[],abstentions:[],summary:'Scripted reviewer: no material change proposed.'}}={}){
  this.payloads=payloads;this.defaultPayload=defaultPayload;this.records=[];this.requests=0;this.metadata={provider:'scripted-reviewer',id:'scripted',digest:'SCRIPTED',size:null,parameter_size:null,quantization:null};
 }
 async review({source,transformation,purpose='',obligations=[]}){
  this.requests++;
  const payload=this.payloads[source.id]??this.payloads[transformation.id]??this.defaultPayload;
  const output=makeReviewerOutput(payload,{source,transformation,model:{...this.metadata,provider:'scripted-reviewer'},standing:'SCRIPTED_TEST_FIXTURE',modelAssisted:false});
  const record={type:'REVIEW_RESULT',at:new Date().toISOString(),model:this.metadata,output,raw:JSON.stringify(payload),usage:null,latency_ms:0,retries:0,status:'SCRIPTED_FIXTURE',standing:'SCRIPTED_NOT_MODEL_RESULT'};
  this.records.push(record);
  return {output,raw:record.raw,usage:null,latency_ms:0,request_hash:hash({source:source.id,transformation:transformation.id,payload})};
 }
}
