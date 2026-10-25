import {z} from 'zod';
import {assert,hash} from '../protocol/state.mjs';

export const REVIEWER_VERSION='lc02-r7-local-review/0.1';
export const PROMPT_VERSION='lc02-r7-review-prompt/0.4';
export const REVIEWER_STANDING='MODEL_ASSISTED_PROVISIONAL';

export const CHANGE_KINDS=[
 'QUANTITY_OR_BOUNDARY',
 'EXCEPTION_SCOPE',
 'PREREQUISITE',
 'EPISTEMIC_STATUS',
 'CAUSAL',
 'REFERENT_OR_SPEAKER',
 'UNSUPPORTED_ADDITION',
 'NO_MATERIAL_CHANGE',
 'UNCERTAIN'
];

export const EPISTEMIC_DIRECTIONS=[
 'NONE',
 'ESTABLISHED_FROM_UNRESOLVED',
 'UNCERTAINTY_ADDED',
 'AMBIGUITY_PRESERVED'
];

export const ReviewerPayloadAssessment=z.object({
 claim:z.string().min(1).max(600),
 change_kind:z.enum(CHANGE_KINDS),
 epistemic_direction:z.enum(EPISTEMIC_DIRECTIONS),
 material:z.boolean(),
 source_quote:z.string().min(1).max(1200),
 transformation_quote:z.string().max(1200),
 explanation:z.string().min(1).max(2000),
 confidence:z.enum(['LOW','MEDIUM','HIGH'])
}).strict();

export const ReviewerAbstention=z.object({
 claim:z.string().min(1).max(600),
 reason:z.string().min(1).max(1200)
}).strict();

export const ReviewerPayload=z.object({
 assessments:z.array(ReviewerPayloadAssessment).max(8),
 abstentions:z.array(ReviewerAbstention).max(8),
 summary:z.string().min(1).max(2000)
}).strict();

export const ReviewerAssessment=z.object({
 id:z.string().min(1),
 claim:z.string().min(1),
 change_kind:z.enum(CHANGE_KINDS),
 epistemic_direction:z.enum(EPISTEMIC_DIRECTIONS),
 material:z.boolean(),
 source_quote:z.string().min(1),
 transformation_quote:z.string(),
 explanation:z.string().min(1),
 confidence:z.enum(['LOW','MEDIUM','HIGH']),
 standing:z.literal('PROVISIONAL_MODEL_PROPOSAL')
}).strict();

export const ReviewerOutput=z.object({
 schema:z.literal('language-semantic-review/0.1'),
 reviewer_version:z.literal(REVIEWER_VERSION),
 prompt_version:z.literal(PROMPT_VERSION),
 standing:z.enum([REVIEWER_STANDING,'SCRIPTED_TEST_FIXTURE']),
 model:z.object({
  provider:z.enum(['ollama-local','scripted-reviewer']),
  id:z.string().min(1),
  digest:z.string().min(1),
  size:z.number().nullable(),
  parameter_size:z.string().nullable(),
  quantization:z.string().nullable()
 }).strict(),
 source:z.object({id:z.string().min(1),hash:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
 transformation:z.object({id:z.string().min(1),hash:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
 assessments:z.array(ReviewerAssessment).max(8),
 abstentions:z.array(ReviewerAbstention).max(8),
 summary:z.string().min(1),
 model_assisted:z.boolean(),
 action_authority:z.literal(false),
 human_acceptance:z.literal('REQUIRED_FOR_ANY_TRANSMISSION')
}).strict();

export function quoteAnchor(text,quote,label='QUOTE'){
 const value=String(quote??'').trim();
 assert(value.length>0,label+'_EMPTY');
 const start=text.indexOf(value);
 assert(start>=0,label+'_NOT_FOUND');
 return {start,end:start+value.length,text:value};
}

export function validateReviewerPayload(payload,{source,transformation}){
 const value=ReviewerPayload.parse(payload);
 for(const a of value.assessments){
  quoteAnchor(source.text,a.source_quote,'SOURCE_QUOTE');
  if(a.transformation_quote.trim())quoteAnchor(transformation.text,a.transformation_quote,'TRANSFORMATION_QUOTE');
  if(a.change_kind==='NO_MATERIAL_CHANGE')assert(a.material===false,'NO_MATERIAL_CHANGE_MUST_NOT_BE_MATERIAL');
  if(a.change_kind==='UNCERTAIN')assert(a.material===false,'UNCERTAIN_MUST_NOT_BE_MATERIAL');
  if(a.change_kind!=='NO_MATERIAL_CHANGE'&&a.change_kind!=='UNCERTAIN')assert(a.material===true,'MATERIAL_CHANGE_MUST_BE_MATERIAL');
  if(a.change_kind==='EPISTEMIC_STATUS'&&a.epistemic_direction==='NONE')assert(false,'EPISTEMIC_STATUS_REQUIRES_DIRECTION');
 }
 return value;
}

export function makeReviewerOutput(payload,{source,transformation,model,standing=REVIEWER_STANDING,modelAssisted=true}){
 const value=validateReviewerPayload(payload,{source,transformation});
 const assessments=value.assessments.map((a,i)=>({...a,id:'ra'+(i+1),standing:'PROVISIONAL_MODEL_PROPOSAL'}));
 return ReviewerOutput.parse({
  schema:'language-semantic-review/0.1',
  reviewer_version:REVIEWER_VERSION,
  prompt_version:PROMPT_VERSION,
  standing,
  model,
  source:{id:source.id,hash:source.hash},
  transformation:{id:transformation.id,hash:transformation.hash},
  assessments,
  abstentions:value.abstentions,
  summary:value.summary,
  model_assisted:modelAssisted,
  action_authority:false,
  human_acceptance:'REQUIRED_FOR_ANY_TRANSMISSION'
 });
}

export function validateReviewerOutput(output,{source,transformation}){
 const value=ReviewerOutput.parse(output);
 assert(value.source.id===source.id&&value.source.hash===source.hash,'REVIEWER_SOURCE_BINDING');
 assert(value.transformation.id===transformation.id&&value.transformation.hash===transformation.hash,'REVIEWER_TRANSFORMATION_BINDING');
 for(const a of value.assessments){
  quoteAnchor(source.text,a.source_quote,'SOURCE_QUOTE');
  if(a.transformation_quote.trim())quoteAnchor(transformation.text,a.transformation_quote,'TRANSFORMATION_QUOTE');
 }
 return value;
}

export function reviewerFindingId(modelId,index){
 return `mr_${hash(modelId).slice(0,8)}_${index+1}`;
}
