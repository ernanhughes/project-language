import {z} from 'zod';
import {Anchor,hash,assert,validateAnchors} from '../protocol/state.mjs';

export const CHECKER_VERSION='lc02-r4-semantic-check/0.1';
export const FINDING_TYPES=['PRESERVED_CANDIDATE','MISSING_CANDIDATE','CHANGED_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE','UNRESOLVED','NOT_ASSESSED'];
export const DISTINCTIONS=[
 'MISSING_MEANING','MISSING_PREREQUISITE','NEGATION_REVERSAL','MODALITY_CHANGE','BROADENED_EXCEPTION',
 'TEMPORAL_ORDER','INVENTED_AUTHORITY','UNKNOWN_TO_ESTABLISHED_FACT','MISATTRIBUTED_QUOTATION_OR_SPEAKER',
 'WRONG_CROSS_SENTENCE_REFERENCE','UNSUPPORTED_CAUSAL','UNSUPPORTED_UNCERTAINTY','UNSUPPORTED_CONTENT',
 'SCOPE_OR_QUANTITY_CHANGE','PRESERVED','SOURCE_AMBIGUITY','METHOD_LIMIT'
];
export const STANDING='HEURISTIC_CANDIDATES_NOT_VERIFIED_EQUIVALENCE';

export const CheckInput=z.object({
 source:z.object({id:z.string().min(1),text:z.string().min(1),hash:z.string().regex(/^[a-f0-9]{64}$/),provenance:z.record(z.string(),z.unknown()).optional()}).strict(),
 transformation:z.object({id:z.string().min(1),text:z.string().min(1),hash:z.string().regex(/^[a-f0-9]{64}$/),provenance:z.record(z.string(),z.unknown()).optional()}).strict(),
 context:z.object({purpose:z.string().optional(),audience:z.string().optional(),declared_context:z.record(z.string(),z.unknown()).optional()}).strict().default({}),
 obligations:z.array(z.object({id:z.string().min(1),source_quote:z.string().min(1),description:z.string().optional()}).strict()).default([]),
 profile:z.enum(['technical-policy','general']).default('technical-policy'),
 method:z.enum(['HEURISTIC_SOURCE_ALIGNMENT','LEXICAL_BASELINE']).default('HEURISTIC_SOURCE_ALIGNMENT')
}).strict();

export const Finding=z.object({
 id:z.string().min(1),
 type:z.enum(FINDING_TYPES),
 distinction:z.enum(DISTINCTIONS),
 source_spans:z.array(Anchor),
 transformation_spans:z.array(Anchor),
 method:z.enum(['LEXICAL_RULE_HEURISTIC','LEXICAL_BASELINE','COMPILER_INVENTORY_ASSIST']),
 standing:z.literal('CANDIDATE_REQUIRES_REVIEW'),
 severity:z.enum(['MATERIAL','MINOR','INFO']),
 confidence:z.enum(['LOW','MEDIUM','HIGH']),
 reason:z.string().min(1)
}).strict();

export const CheckOutput=z.object({
 schema:z.literal('language-semantic-check/0.1'),
 contract_version:z.literal(CHECKER_VERSION),
 standing:z.literal(STANDING),
 source:z.object({id:z.string(),hash:z.string()}).strict(),
 transformation:z.object({id:z.string(),hash:z.string()}).strict(),
 findings:z.array(Finding),
 summary:z.object({PRESERVED_CANDIDATE:z.number().int().nonnegative(),MISSING_CANDIDATE:z.number().int().nonnegative(),CHANGED_CANDIDATE:z.number().int().nonnegative(),UNSUPPORTED_ADDITION_CANDIDATE:z.number().int().nonnegative(),UNRESOLVED:z.number().int().nonnegative(),NOT_ASSESSED:z.number().int().nonnegative()}).strict(),
 dependencies:z.object({compiler:z.unknown(),method:z.string(),model_assisted:z.literal(false)}).strict(),
 action_authority:z.literal(false),
 human_acceptance:z.literal('REQUIRED_FOR_ANY_TRANSMISSION'),
 repair:z.literal('NOT_PERFORMED')
}).strict();

export function anchor(text,quote,{id='ORIGINAL_SOURCE',hashValue}={}){
 const start=text.indexOf(quote);
 assert(start>=0,'ANCHOR_QUOTE_NOT_FOUND');
 return {origin:'ORIGINAL_SOURCE',source_id:id,source_hash:hashValue,start,end:start+quote.length,text:quote};
}
export function sourceAnchor(source,quote){return anchor(source.text,quote,{id:source.id,hashValue:source.hash});}
export function transformationAnchor(transformation,quote){return anchor(transformation.text,quote,{id:transformation.id,hashValue:transformation.hash});}
export function validateCheckInput(input){const value=CheckInput.parse(input);assert(value.source.hash===hash(value.source.text),'CHECK_SOURCE_HASH');assert(value.transformation.hash===hash(value.transformation.text),'CHECK_TRANSFORMATION_HASH');for(const o of value.obligations)assert(value.source.text.includes(o.source_quote),'CHECK_OBLIGATION_SOURCE_SPAN');return value;}
export function validateCheckOutput(output,{source,transformation}){const value=CheckOutput.parse(output);validateAnchors(value.findings.flatMap(f=>f.source_spans),source);validateAnchors(value.findings.flatMap(f=>f.transformation_spans),transformation);return value;}
export function countFindings(findings){const summary=Object.fromEntries(FINDING_TYPES.map(t=>[t,0]));for(const f of findings)summary[f.type]++;return summary;}
export function finding({id,type,distinction,sourceSpans=[],transformationSpans=[],method='LEXICAL_RULE_HEURISTIC',severity='MATERIAL',confidence='MEDIUM',reason}){return {id,type,distinction,source_spans:sourceSpans,transformation_spans:transformationSpans,method,standing:'CANDIDATE_REQUIRES_REVIEW',severity,confidence,reason};}
