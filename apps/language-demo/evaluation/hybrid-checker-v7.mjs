import {z} from 'zod';
import {assert,hash} from '../protocol/state.mjs';
import {quoteAnchor} from './semantic-reviewer-v7-contract.mjs';

export const HYBRID_VERSION='lc02-r7-hybrid-reconciliation/0.1';

const FINDING_TYPES=['PRESERVED_CANDIDATE','MISSING_CANDIDATE','CHANGED_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE','UNRESOLVED','NOT_ASSESSED'];
const DISTINCTIONS=['PRESERVED','MISSING_MEANING','MISSING_PREREQUISITE','NEGATION_REVERSAL','MODALITY_CHANGE','BROADENED_EXCEPTION','TEMPORAL_ORDER','INVENTED_AUTHORITY','UNKNOWN_TO_ESTABLISHED_FACT','MISATTRIBUTED_QUOTATION_OR_SPEAKER','WRONG_CROSS_SENTENCE_REFERENCE','UNSUPPORTED_CAUSAL','UNSUPPORTED_UNCERTAINTY','UNSUPPORTED_CONTENT','SCOPE_OR_QUANTITY_CHANGE','SOURCE_AMBIGUITY','METHOD_LIMIT'];

const HybridFinding=z.object({
 id:z.string().min(1),
 origin:z.enum(['DETERMINISTIC','MODEL_ASSISTED','BOTH']),
 reviewer_assessment_id:z.string().nullable(),
 claim:z.string().min(1),
 change_kind:z.string().nullable(),
 epistemic_direction:z.string().nullable(),
 type:z.enum(FINDING_TYPES),
 distinction:z.enum(DISTINCTIONS),
 severity:z.enum(['MATERIAL','MINOR','INFO']),
 confidence:z.enum(['LOW','MEDIUM','HIGH']),
 source_spans:z.array(z.object({origin:z.literal('ORIGINAL_SOURCE'),source_id:z.string(),source_hash:z.string(),start:z.number().int().nonnegative(),end:z.number().int().positive(),text:z.string().min(1)}).strict()),
 transformation_spans:z.array(z.object({origin:z.literal('ORIGINAL_SOURCE'),source_id:z.string(),source_hash:z.string(),start:z.number().int().nonnegative(),end:z.number().int().positive(),text:z.string().min(1)}).strict()),
 reason:z.string().min(1),
 status:z.enum(['DETERMINISTIC_ONLY','MODEL_ONLY','CORROBORATED','DISPUTED','EVIDENCE_INVALID']),
 dispute_reason:z.string().nullable(),
 mapping_basis:z.string().nullable(),
 standing:z.literal('CANDIDATE_REQUIRES_REVIEW')
}).strict();

const Reconciliation=z.object({
 schema:z.literal('language-hybrid-reconciliation/0.1'),
 version:z.literal(HYBRID_VERSION),
 source:z.object({id:z.string(),hash:z.string()}).strict(),
 transformation:z.object({id:z.string(),hash:z.string()}).strict(),
 reviewer_status:z.enum(['VALID','SCRIPTED','INVALID_EVIDENCE','UNAVAILABLE']),
 model:z.unknown(),
 combined_findings:z.array(HybridFinding),
 primary_findings:z.array(HybridFinding),
 disagreements:z.array(z.object({kind:z.string().min(1),deterministic_finding_ids:z.array(z.string()),reviewer_finding_ids:z.array(z.string()),note:z.string().min(1)}).strict()),
 reviewer_only_findings:z.array(HybridFinding),
 deterministic_only_findings:z.array(HybridFinding),
 policy:z.object({outcome:z.enum(['PRESERVE_SOURCE','USE_TRANSFORMATION','REQUEST_CLARIFICATION']),reason:z.string().min(1),basis:z.object({material:z.array(z.string()),unresolved:z.array(z.string()),disputed:z.array(z.string()),preserved:z.array(z.string()),reviewer_positive:z.boolean()}).strict(),action_authority:z.literal(false),human_acceptance:z.literal('REQUIRED_FOR_ANY_TRANSMISSION'),note:z.string().min(1)}).strict(),
 action_authority:z.literal(false),
 human_acceptance:z.literal('REQUIRED_FOR_ANY_TRANSMISSION'),
 note:z.string().min(1)
}).strict();

function anchorFor(kind,entity,quote){
 const q=quoteAnchor(entity.text,quote,kind==='source'?'SOURCE_QUOTE':'TRANSFORMATION_QUOTE');
 return {origin:'ORIGINAL_SOURCE',source_id:entity.id,source_hash:entity.hash,start:q.start,end:q.end,text:q.text};
}
function intervalsOverlap(a,b){return a.start<b.end&&b.start<a.end;}
function sourceOverlap(a,b){return a.source_spans.some(x=>b.source_spans.some(y=>intervalsOverlap(x,y)));}
function sameClaim(a,b){return a.type===b.type&&a.distinction===b.distinction&&sourceOverlap(a,b);}
function conflicting(a,b){return sourceOverlap(a,b)&&(a.severity==='MATERIAL'||b.severity==='MATERIAL')&&(a.type!==b.type||a.distinction!==b.distinction);}
function hasSpeaker(text){return /^\s*[A-Z][A-Za-z .'-]{0,40}:\s+/m.test(String(text));}
function hasPermission(text){return /\b(may|can|permitted|allowed|authori[sz]ed|entitled)\b/i.test(String(text));}
function hasDenial(text){return /\b(not|no|never|does not|doesn't|may not|cannot|without)\b/i.test(String(text));}

export function mapReviewerAssessment(a,{source,transformation}){
 let type,distinction,severity,mapping_basis;
 if(a.change_kind==='QUANTITY_OR_BOUNDARY'){type='CHANGED_CANDIDATE';distinction='SCOPE_OR_QUANTITY_CHANGE';severity='MATERIAL';mapping_basis='QUANTITY_OR_BOUNDARY -> changed scope/quantity';}
 else if(a.change_kind==='EXCEPTION_SCOPE'){type='CHANGED_CANDIDATE';distinction='BROADENED_EXCEPTION';severity='MATERIAL';mapping_basis='EXCEPTION_SCOPE -> broadened exception';}
 else if(a.change_kind==='PREREQUISITE'){type='MISSING_CANDIDATE';distinction='MISSING_PREREQUISITE';severity='MATERIAL';mapping_basis='PREREQUISITE -> missing prerequisite';}
 else if(a.change_kind==='EPISTEMIC_STATUS'){
  if(a.epistemic_direction==='ESTABLISHED_FROM_UNRESOLVED'){type='CHANGED_CANDIDATE';distinction='UNKNOWN_TO_ESTABLISHED_FACT';severity='MATERIAL';mapping_basis='EPISTEMIC_STATUS/ESTABLISHED_FROM_UNRESOLVED -> unknown to established fact';}
  else if(a.epistemic_direction==='UNCERTAINTY_ADDED'){type='UNSUPPORTED_ADDITION_CANDIDATE';distinction='UNSUPPORTED_UNCERTAINTY';severity='MATERIAL';mapping_basis='EPISTEMIC_STATUS/UNCERTAINTY_ADDED -> unsupported uncertainty';}
  else if(a.epistemic_direction==='AMBIGUITY_PRESERVED'){type='UNRESOLVED';distinction='SOURCE_AMBIGUITY';severity='MINOR';mapping_basis='EPISTEMIC_STATUS/AMBIGUITY_PRESERVED -> source ambiguity';}
  else{type='UNRESOLVED';distinction='METHOD_LIMIT';severity='MINOR';mapping_basis='EPISTEMIC_STATUS/NONE -> unresolved comparison';}
 }
 else if(a.change_kind==='CAUSAL'){type='UNSUPPORTED_ADDITION_CANDIDATE';distinction='UNSUPPORTED_CAUSAL';severity='MATERIAL';mapping_basis='CAUSAL -> unsupported causal addition';}
 else if(a.change_kind==='REFERENT_OR_SPEAKER'){
  const speaker=hasSpeaker(source.text)&&hasSpeaker(transformation.text);
  type='CHANGED_CANDIDATE';distinction=speaker?'MISATTRIBUTED_QUOTATION_OR_SPEAKER':'WRONG_CROSS_SENTENCE_REFERENCE';severity='MATERIAL';mapping_basis=speaker?'REFERENT_OR_SPEAKER with speaker labels -> misattribution':'REFERENT_OR_SPEAKER without speaker labels -> wrong reference';
 }
 else if(a.change_kind==='UNSUPPORTED_ADDITION'){
  const authority=hasPermission(transformation.text)&&hasDenial(source.text);
  type='UNSUPPORTED_ADDITION_CANDIDATE';distinction=authority?'INVENTED_AUTHORITY':'UNSUPPORTED_CONTENT';severity='MATERIAL';mapping_basis=authority?'UNSUPPORTED_ADDITION with permission/denial -> invented authority':'UNSUPPORTED_ADDITION -> unsupported content';
 }
 else if(a.change_kind==='NO_MATERIAL_CHANGE'){
  const sourceAmbiguity=/\b(not\s+(?:yet\s+)?decided|neither|unclear|whether|does not say|unresolved)\b/i.test(source.text);
  const transformationAmbiguity=/\b(unclear|whether|unresolved|not\s+(?:yet\s+)?decided|neither|remains)\b/i.test(transformation.text);
  if(sourceAmbiguity&&transformationAmbiguity){type='UNRESOLVED';distinction='SOURCE_AMBIGUITY';severity='MINOR';mapping_basis='NO_MATERIAL_CHANGE with explicit ambiguity in source and transformation -> preserved ambiguity';}
  else{type='PRESERVED_CANDIDATE';distinction='PRESERVED';severity='INFO';mapping_basis='NO_MATERIAL_CHANGE -> preserved candidate';}
 }
 else{type='UNRESOLVED';distinction='METHOD_LIMIT';severity='MINOR';mapping_basis='UNCERTAIN -> unresolved comparison';}
 const source_spans=[anchorFor('source',source,a.source_quote)];
 const transformation_spans=a.transformation_quote.trim()?[anchorFor('transformation',transformation,a.transformation_quote)]:[];
 return {id:a.id,origin:'MODEL_ASSISTED',reviewer_assessment_id:a.id,claim:a.claim,change_kind:a.change_kind,epistemic_direction:a.epistemic_direction,type,distinction,severity,confidence:a.confidence,source_spans,transformation_spans,reason:a.explanation,status:'MODEL_ONLY',dispute_reason:null,mapping_basis,standing:'CANDIDATE_REQUIRES_REVIEW'};
}

function deterministicFinding(f){
 return {id:f.id,origin:'DETERMINISTIC',reviewer_assessment_id:null,claim:f.reason,change_kind:null,epistemic_direction:null,type:f.type,distinction:f.distinction,severity:f.severity,confidence:f.confidence,source_spans:f.source_spans,transformation_spans:f.transformation_spans,reason:f.reason,status:'DETERMINISTIC_ONLY',dispute_reason:null,mapping_basis:null,standing:'CANDIDATE_REQUIRES_REVIEW'};
}

export function reviewerPolicyFromFindings(findings,{valid=true}={}){
 if(!valid)return {outcome:'REQUEST_CLARIFICATION',reason:'No valid model-assisted review is available.',basis:{material:[],uncertain:[],positive:false}};
 const material=findings.filter(f=>f.severity==='MATERIAL'&&['CHANGED_CANDIDATE','MISSING_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE'].includes(f.type));
 const unresolved=findings.filter(f=>f.type==='UNRESOLVED');
 const positive=findings.some(f=>f.type==='PRESERVED_CANDIDATE'&&f.distinction==='PRESERVED');
 if(material.length)return {outcome:'PRESERVE_SOURCE',reason:'The reviewer proposed a material semantic change.',basis:{material:material.map(f=>f.id),uncertain:[],positive}};
 if(unresolved.length)return {outcome:'REQUEST_CLARIFICATION',reason:'The reviewer identified an unresolved material distinction.',basis:{material:[],uncertain:unresolved.map(f=>f.id),positive}};
 if(positive)return {outcome:'USE_TRANSFORMATION',reason:'The reviewer proposed a positive preservation finding with no material or unresolved finding.',basis:{material:[],uncertain:[],positive}};
 return {outcome:'REQUEST_CLARIFICATION',reason:'The reviewer did not provide positive preservation evidence.',basis:{material:[],uncertain:[],positive:false}};
}

export function reviewerPolicy(output){
 if(!output||output.standing==='SCRIPTED_TEST_FIXTURE')return {outcome:'REQUEST_CLARIFICATION',reason:'No qualified model-assisted review is available.'};
 const material=output.assessments.filter(a=>a.material&&a.change_kind!=='NO_MATERIAL_CHANGE'&&a.change_kind!=='UNCERTAIN'&&!(a.change_kind==='EPISTEMIC_STATUS'&&a.epistemic_direction==='AMBIGUITY_PRESERVED'));
 const uncertain=output.assessments.filter(a=>a.change_kind==='UNCERTAIN'||a.change_kind==='EPISTEMIC_STATUS'&&a.epistemic_direction==='AMBIGUITY_PRESERVED');
 const positive=output.assessments.some(a=>a.change_kind==='NO_MATERIAL_CHANGE'&&a.material===false);
 if(material.length)return {outcome:'PRESERVE_SOURCE',reason:'The reviewer proposed a material semantic change.',basis:{material:material.map(a=>a.id),uncertain:uncertain.map(a=>a.id),positive}};
 if(uncertain.length||output.abstentions.length)return {outcome:'REQUEST_CLARIFICATION',reason:'The reviewer could not resolve a material distinction.',basis:{material:[],uncertain:uncertain.map(a=>a.id),positive}};
 if(positive)return {outcome:'USE_TRANSFORMATION',reason:'The reviewer proposed a positive no-material-change assessment and no material or unresolved finding.',basis:{material:[],uncertain:[],positive}};
 return {outcome:'REQUEST_CLARIFICATION',reason:'The reviewer did not provide positive preservation evidence.',basis:{material:[],uncertain:[],positive:false}};
}

export function reconcile({source,transformation,deterministic,reviewer,reviewerStatus='VALID'}){
 const deterministicFindings=(deterministic?.findings??[]).map(deterministicFinding);
 const reviewerFindings=(reviewer?.assessments??[]).map(a=>mapReviewerAssessment(a,{source,transformation}));
 const combined=[];const disagreements=[];const matchedReviewer=new Set();const disputedNonAuthoritative=new Set();
 for(const d of deterministicFindings){
  const matches=reviewerFindings.filter(r=>sameClaim(d,r));
  if(matches.length){
   for(const r of matches)matchedReviewer.add(r.id);
   combined.push({...d,origin:'BOTH',reviewer_assessment_id:matches[0].id,status:'CORROBORATED',reason:d.reason});
   disagreements.push({kind:'CORROBORATED',deterministic_finding_ids:[d.id],reviewer_finding_ids:matches.map(r=>r.id),note:'Deterministic and model-assisted findings agree on type, distinction and source evidence.'});
  }else{
   combined.push(d);
  }
 }
 for(const r of reviewerFindings.filter(x=>!matchedReviewer.has(x.id))){
  const overlapping=deterministicFindings.filter(d=>sourceOverlap(d,r));
  const conflict=overlapping.find(d=>conflicting(d,r)||(r.type==='PRESERVED_CANDIDATE'&&d.severity==='MATERIAL'));
  if(conflict){
   const status='DISPUTED';const dispute_reason=r.type==='PRESERVED_CANDIDATE'?'MODEL_CLAIMS_PRESERVED_DETERMINISTIC_MATERIAL':'DISTINCTION_DISAGREEMENT';
   if(r.type==='PRESERVED_CANDIDATE'&&conflict.distinction==='MODALITY_CHANGE')disputedNonAuthoritative.add(conflict.id);
   const index=combined.findIndex(f=>f.id===conflict.id&&f.origin==='DETERMINISTIC');
   if(index>=0)combined[index]={...combined[index],status:'DISPUTED',dispute_reason:'NON_AUTHORITATIVE_MODALITY_DISPUTED_BY_MODEL'};
   combined.push({...r,status,dispute_reason});
   disagreements.push({kind:dispute_reason,deterministic_finding_ids:overlapping.map(d=>d.id),reviewer_finding_ids:[r.id],note:'Both findings and their exact evidence are retained; the deterministic finding remains primary for the overlapping claim.'});
  }else{
   combined.push({...r,status:'MODEL_ONLY'});
  }
 }
 const primary=[...combined.filter(f=>f.origin==='DETERMINISTIC'||f.origin==='BOTH'),...combined.filter(f=>f.origin==='MODEL_ASSISTED'&&f.status==='MODEL_ONLY')];
 const material=combined.filter(f=>f.severity==='MATERIAL'&&f.status!=='EVIDENCE_INVALID'&&!(f.origin==='DETERMINISTIC'&&disputedNonAuthoritative.has(f.id)));
 const unresolved=combined.filter(f=>f.type==='UNRESOLVED'||f.status==='DISPUTED');
 const disputed=combined.filter(f=>f.status==='DISPUTED');
 const preserved=deterministicFindings.filter(f=>f.type==='PRESERVED_CANDIDATE'&&!disputed.some(d=>sourceOverlap(d,f)));
 const reviewerPositive=reviewer?.assessments?.some(a=>a.change_kind==='NO_MATERIAL_CHANGE'&&a.material===false)??false;
 const reviewerCompleted=reviewerStatus==='VALID'||reviewerStatus==='SCRIPTED';
 let outcome='REQUEST_CLARIFICATION',reason='The evidence does not support a definite preservation or distortion judgment.';
 if(material.length){outcome='PRESERVE_SOURCE';reason='A material semantic change or loss is present in the combined findings.';}
 else if(unresolved.length||!reviewerCompleted){outcome='REQUEST_CLARIFICATION';reason='A material distinction is unresolved, disputed, or the reviewer did not complete.';}
 else if(reviewerCompleted&&reviewerPositive){outcome='USE_TRANSFORMATION';reason='The model-assisted reviewer provided positive no-change evidence, no material finding remains, and the deterministic layer found no material constraint violation.';}
 const policy={outcome,reason,basis:{material:material.map(f=>f.id),unresolved:unresolved.map(f=>f.id),disputed:disputed.map(f=>f.id),preserved:preserved.map(f=>f.id),reviewer_positive:reviewerPositive},action_authority:false,human_acceptance:'REQUIRED_FOR_ANY_TRANSMISSION',note:'Deterministic constraint findings remain authoritative for their mechanical comparison. Model-assisted findings are provisional and cannot remove them.'};
 const value={schema:'language-hybrid-reconciliation/0.1',version:HYBRID_VERSION,source:{id:source.id,hash:source.hash},transformation:{id:transformation.id,hash:transformation.hash},reviewer_status:reviewerStatus,model:reviewer?.model??null,combined_findings:combined,primary_findings:primary,disagreements,reviewer_only_findings:combined.filter(f=>f.origin==='MODEL_ASSISTED'&&f.status==='MODEL_ONLY'),deterministic_only_findings:combined.filter(f=>f.origin==='DETERMINISTIC'),policy,action_authority:false,human_acceptance:'REQUIRED_FOR_ANY_TRANSMISSION',note:'Hybrid reconciliation. Deterministic findings are authoritative only for the mechanical comparison they perform, not for complete source meaning.'};
 return Reconciliation.parse(value);
}

export function hybridPolicy(reconciliation){
 return reconciliation.policy;
}
