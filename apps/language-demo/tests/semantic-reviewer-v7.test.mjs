import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../protocol/state.mjs';
import {checkTransformation,policyAssessment} from '../evaluation/semantic-checker-v6.mjs';
import {validateReviewerPayload,makeReviewerOutput} from '../evaluation/semantic-reviewer-v7-contract.mjs';
import {ScriptedReviewer} from '../evaluation/semantic-reviewer-v7.mjs';
import {reconcile,reviewerPolicy,mapReviewerAssessment} from '../evaluation/hybrid-checker-v7.mjs';

function input(source,transformation,obligations=[]){
 return {source:{id:'s',text:source,hash:hash(source)},transformation:{id:'t',text:transformation,hash:hash(transformation)},context:{purpose:'test'},obligations,profile:'technical-policy'};
}
function payload(overrides={}){
 return {assessments:[],abstentions:[],summary:'No material change.',...overrides};
}
const exceptionAssessment={claim:'The exception was broadened.',change_kind:'EXCEPTION_SCOPE',epistemic_direction:'NONE',material:true,source_quote:'except when the ticket is closed',transformation_quote:'except when the case is unresolved',explanation:'The transformation broadens the exception.',confidence:'HIGH'};

test('reviewer payload rejects a quote that is not in the source',()=>{
 const source='A rule.';
 const transformation='A rule.';
 assert.throws(()=>validateReviewerPayload(payload({assessments:[{...exceptionAssessment,source_quote:'not in source'}]}),{source:{id:'s',text:source,hash:hash(source)},transformation:{id:'t',text:transformation,hash:hash(transformation)}}),/SOURCE_QUOTE_NOT_FOUND/);
});

test('exception scope maps to broadened exception',()=>{
 const source={id:'s',text:'The key may be used, except when the ticket is closed.',hash:hash('The key may be used, except when the ticket is closed.')};
 const transformation={id:'t',text:'The key may be used, except when the case is unresolved.',hash:hash('The key may be used, except when the case is unresolved.')};
 const mapped=mapReviewerAssessment({...exceptionAssessment,id:'ra1',standing:'PROVISIONAL_MODEL_PROPOSAL'},{source,transformation});
 assert.equal(mapped.type,'CHANGED_CANDIDATE');
 assert.equal(mapped.distinction,'BROADENED_EXCEPTION');
 assert.equal(mapped.severity,'MATERIAL');
 assert.equal(mapped.source_spans[0].text,'except when the ticket is closed');
});

test('epistemic status maps unresolved to established fact',()=>{
 const source={id:'s',text:'The approval has not been decided.',hash:hash('The approval has not been decided.')};
 const transformation={id:'t',text:'The approval is granted.',hash:hash('The approval is granted.')};
 const mapped=mapReviewerAssessment({id:'ra1',claim:'Approval became a fact.',change_kind:'EPISTEMIC_STATUS',epistemic_direction:'ESTABLISHED_FROM_UNRESOLVED',material:true,source_quote:'The approval has not been decided.',transformation_quote:'The approval is granted.',explanation:'The transformation resolves an unresolved status.',confidence:'HIGH',standing:'PROVISIONAL_MODEL_PROPOSAL'},{source,transformation});
 assert.equal(mapped.distinction,'UNKNOWN_TO_ESTABLISHED_FACT');
});

test('reviewer policy separates material, positive and uncertain findings',()=>{
 const source={id:'s',text:'The key may be used, except when the ticket is closed.',hash:hash('The key may be used, except when the ticket is closed.')};
 const transformation={id:'t',text:'The key may be used, except when the case is unresolved.',hash:hash('The key may be used, except when the case is unresolved.')};
 const material=makeReviewerOutput(payload({assessments:[exceptionAssessment]}),{source,transformation,model:{provider:'ollama-local',id:'fixture',digest:'x',size:null,parameter_size:null,quantization:null}});
 assert.equal(reviewerPolicy(material).outcome,'PRESERVE_SOURCE');
 const positiveSource={id:'ps',text:'The key may be used during an incident.',hash:hash('The key may be used during an incident.')};
 const positiveTransformation={id:'pt',text:'The key may be used during an incident.',hash:hash('The key may be used during an incident.')};
 const positive=makeReviewerOutput(payload({assessments:[{claim:'Faithful.',change_kind:'NO_MATERIAL_CHANGE',epistemic_direction:'NONE',material:false,source_quote:'The key may be used during an incident.',transformation_quote:'The key may be used during an incident.',explanation:'Same rule.',confidence:'HIGH'}]}),{source:positiveSource,transformation:positiveTransformation,model:{provider:'ollama-local',id:'fixture',digest:'x',size:null,parameter_size:null,quantization:null}});
 assert.equal(reviewerPolicy(positive).outcome,'USE_TRANSFORMATION');
 const uncertain=makeReviewerOutput(payload({abstentions:[{claim:'Scope',reason:'Cannot decide.'}]}),{source,transformation,model:{provider:'ollama-local',id:'fixture',digest:'x',size:null,parameter_size:null,quantization:null}});
 assert.equal(reviewerPolicy(uncertain).outcome,'REQUEST_CLARIFICATION');
});

test('deterministic constraint violation survives a model preservation claim',async()=>{
 const source='The queue accepts no more than forty records.';
 const transformation='The queue accepts no more than fifty records.';
 const src=input(source,transformation,[{id:'o1',source_quote:'The queue accepts no more than forty records.'}]);
 const deterministic=await checkTransformation(src);
 const reviewer=makeReviewerOutput(payload({assessments:[{claim:'The rules are equivalent.',change_kind:'NO_MATERIAL_CHANGE',epistemic_direction:'NONE',material:false,source_quote:'no more than forty records',transformation_quote:'no more than fifty records',explanation:'The model sees no material change.',confidence:'LOW'}]}),{source:src.source,transformation:src.transformation,model:{provider:'ollama-local',id:'fixture',digest:'x',size:null,parameter_size:null,quantization:null}});
 const reconciled=reconcile({source:src.source,transformation:src.transformation,deterministic,reviewer,reviewerStatus:'VALID'});
 assert.equal(reconciled.policy.outcome,'PRESERVE_SOURCE');
 assert.ok(reconciled.disagreements.some(d=>d.kind==='MODEL_CLAIMS_PRESERVED_DETERMINISTIC_MATERIAL'));
 assert.ok(reconciled.combined_findings.some(f=>f.origin==='DETERMINISTIC'&&f.type==='CHANGED_CANDIDATE'));
});

test('hybrid requires positive reviewer evidence for use',async()=>{
 const source='The operator may rotate the token when the lease expires.';
 const transformation='The operator may rotate the token when the lease expires.';
 const src=input(source,transformation,[{id:'o1',source_quote:source}]);
 const deterministic=await checkTransformation(src);
 const empty=makeReviewerOutput(payload(),{source:src.source,transformation:src.transformation,model:{provider:'ollama-local',id:'fixture',digest:'x',size:null,parameter_size:null,quantization:null}});
 const reconciled=reconcile({source:src.source,transformation:src.transformation,deterministic,reviewer:empty,reviewerStatus:'VALID'});
 assert.equal(reconciled.policy.outcome,'REQUEST_CLARIFICATION');
 const positive=makeReviewerOutput(payload({assessments:[{claim:'Faithful.',change_kind:'NO_MATERIAL_CHANGE',epistemic_direction:'NONE',material:false,source_quote:source,transformation_quote:transformation,explanation:'Same rule.',confidence:'HIGH'}]}),{source:src.source,transformation:src.transformation,model:{provider:'ollama-local',id:'fixture',digest:'x',size:null,parameter_size:null,quantization:null}});
 const accepted=reconcile({source:src.source,transformation:src.transformation,deterministic,reviewer:positive,reviewerStatus:'VALID'});
 assert.equal(accepted.policy.outcome,'USE_TRANSFORMATION');
});

test('scripted reviewer is marked as a test fixture',async()=>{
 const source={id:'s',text:'The operator may rotate the token.',hash:hash('The operator may rotate the token.')};
 const transformation={id:'t',text:'The operator may rotate the token.',hash:hash('The operator may rotate the token.')};
 const reviewer=new ScriptedReviewer();
 const result=await reviewer.review({source,transformation});
 assert.equal(result.output.standing,'SCRIPTED_TEST_FIXTURE');
 assert.equal(result.output.model_assisted,false);
});
