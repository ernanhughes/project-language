import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../protocol/state.mjs';
import {CheckInput} from '../evaluation/semantic-checker-v5-contract.mjs';
import {checkTransformation,policyAssessment,policyDecision} from '../evaluation/semantic-checker-v5.mjs';

const first=s=>s.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()??s;
const mk=(s,t)=>({source:{id:'v5-source',text:s,hash:hash(s)},transformation:{id:'v5-transformation',text:t,hash:hash(t)},context:{purpose:'test'},obligations:[{id:'o1',source_quote:first(s)}],profile:'technical-policy'});

test('v5 grounds justified uncertainty and rejects manufactured uncertainty',async()=>{
 const justified=await checkTransformation(mk('The image signature was verified. The policy requires a signed known-good image.','It is unclear whether the image is known-good despite the verified signature.'));
 assert.ok(justified.uncertainty_assessments.some(a=>a.status==='SUPPORTED_UNCERTAINTY'));
 assert.ok(justified.findings.some(f=>f.type==='UNRESOLVED'&&f.distinction==='SOURCE_AMBIGUITY'));
 assert.equal(policyDecision(justified),'REQUEST_CLARIFICATION');
 const manufactured=await checkTransformation(mk('Paging is permitted. The dashboard shows nine minutes above the threshold.','It is unclear whether paging is permitted.'));
 assert.ok(manufactured.uncertainty_assessments.some(a=>a.status==='UNSUPPORTED_UNCERTAINTY'));
 assert.ok(manufactured.findings.some(f=>f.type==='UNSUPPORTED_ADDITION_CANDIDATE'&&f.distinction==='UNSUPPORTED_UNCERTAINTY'));
 assert.equal(policyDecision(manufactured),'PRESERVE_SOURCE');
});

test('v5 keeps findings and policy separate',async()=>{
 const out=await checkTransformation(mk('The operator may restart the replica after approval.','The operator must restart the replica after approval.'));
 const policy=policyAssessment(out);
 assert.equal(policy.outcome,'PRESERVE_SOURCE');
 assert.ok(policy.basis.material.length);
 assert.equal(policy.action_authority,false);
 assert.equal(out.action_authority,false);
});

test('v5 input still rejects reference and recipient evidence',()=>{
 const input=mk('The operator may restart the replica after approval.','The operator may restart the replica after approval.');
 assert.throws(()=>CheckInput.parse({...input,reference:{expected_decision:'YES'}}));
 assert.throws(()=>CheckInput.parse({...input,recipient_answer:{decision:'YES'}}));
});
