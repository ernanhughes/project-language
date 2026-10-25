import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const design=JSON.parse(readFileSync(new URL('./fixtures/fresh-evaluation-v1.json',import.meta.url),'utf8'));
const labels=new Set(['YES','NO','UNKNOWN','SOURCE_CONFLICT']);

test('fresh design is frozen, unrun and internally consistent',()=>{
 assert.equal(design.standing,'DESIGN_ONLY_FROZEN_NOT_RUN');
 assert.equal(design.execution_status,'NOT_RUN');
 assert.equal(design.frozen_before_execution,true);
 assert.equal(design.cases.length,16);
 assert.equal(new Set(design.cases.map(c=>c.id)).size,16);
 const counts={};for(const c of design.cases)counts[c.expected_decision]=(counts[c.expected_decision]||0)+1;
 assert.deepEqual(counts,{YES:4,NO:6,UNKNOWN:4,SOURCE_CONFLICT:2});
 for(const c of design.cases){
  assert.ok(labels.has(c.expected_decision),c.id);
  assert.ok(c.source.trim()&&c.question.trim(),c.id);
  assert.ok(c.required_reasoning.length,c.id);
  assert.ok(c.why_one_label.trim(),c.id);
  assert.ok(Array.isArray(c.acceptable_alternatives),c.id);
  for(const q of c.source_evidence_quotes)assert.ok(c.source.includes(q),`${c.id} quote`);
 }
 const body={...design,freeze:{...design.freeze,design_sha256:null}};
 assert.equal(design.freeze.design_sha256,hash(body));
});

test('fresh design includes both scopes and a genuine-ambiguity class',()=>{
 assert.ok(design.cases.some(c=>c.scope==='SOURCE_RELATIVE'));
 assert.ok(design.cases.some(c=>c.scope==='EXTERNAL_FACTUAL_VERIFICATION'));
 assert.ok(design.cases.some(c=>c.case_class==='GENUINE_AMBIGUITY'));
 assert.ok(design.cases.some(c=>c.case_class==='FULLY_SPECIFIED_PERMISSION'));
 assert.ok(design.cases.some(c=>c.case_class==='FULLY_SPECIFIED_PROHIBITION'));
 assert.ok(design.cases.some(c=>c.case_class==='FULLY_SPECIFIED_UNKNOWN'));
 assert.ok(design.cases.some(c=>c.case_class==='FULLY_SPECIFIED_CONFLICT'));
});
