import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,generateTraces} from '../src/demo.mjs';
import {validateFixture,buildDelivery,validateDelivery} from '../src/protocol.mjs';
import {htmlForTraces} from '../src/viewer.mjs';
test('exact source-span validation, including a mutation refusal',()=>{
 assert.equal(validateFixture(fixture),true);
 const corrupt=structuredClone(fixture);corrupt.obligations[1].quotation='four attempts';
 assert.throws(()=>validateFixture(corrupt),/SOURCE_SPAN_MISMATCH/);
});
test('four scripted arms are explicitly non-evidential',()=>{
 const traces=generateTraces();assert.equal(traces.length,4);
 for(const t of traces){assert.equal(t.evidence,'SCRIPTED_DEMONSTRATION_NOT_AI_RESULT');assert.equal(t.mechanical.hallucination_energy.status,'NOT_COMPUTED');assert.equal(t.mechanical.human_semantic_fidelity,'NOT_ADJUDICATED');}
});
test('receiver visibility limited by arm; no hidden reference answer',()=>{
 const traces=generateTraces();
 for(const t of traces){assert.ok(!Object.hasOwn(t.delivery,'reference_answer'));assert.ok(!Object.hasOwn(t.delivery,'obligations'));assert.ok(!Object.hasOwn(t.delivery,'taint_candidate'));}
 assert.equal(traces[0].delivery.channel_message,fixture.source);
 assert.notEqual(traces[1].delivery.channel_message,fixture.source);
});
test('historical context is scoped; taint is not transmitted',()=>{
 const d=buildDelivery(fixture,'CONTEXT','test');assert.equal(d.historical_context.length,1);assert.equal(d.taint.status,'NOT_TRANSMITTED_NO_AUTHORITY');
 assert.ok(!JSON.stringify(d).includes('Prior exchanges often ask'));
});
test('tampering with transmitted payload invalidates hash',()=>{
 const d=buildDelivery(fixture,'PLAIN','test');validateDelivery(fixture,d);d.channel_message='changed';
 assert.throws(()=>validateDelivery(fixture,d),/DELIVERY_HASH_MISMATCH/);
});
test('single-file visualisation includes scripted disclosure',()=>{
 const html=htmlForTraces(generateTraces());assert.match(html,/Scripted demonstration/);assert.match(html,/Communication Transfer Observer/);assert.match(html,/NOT COMPUTED/);
});
