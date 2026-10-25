import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const approval=JSON.parse(readFileSync(new URL('./EXPLORATORY-APPROVAL-V2.json',import.meta.url),'utf8'));
const protocol=JSON.parse(readFileSync(new URL('./EXPLORATORY-PROTOCOL-V2.json',import.meta.url),'utf8'));
const design=JSON.parse(readFileSync(new URL('../lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json',import.meta.url),'utf8'));
const r2=JSON.parse(readFileSync(new URL('../lc-02-batch20-r2/FROZEN-LIVE-PROTOCOL.json',import.meta.url),'utf8'));

test('R3 approval and exploratory protocol are internally hashed and authorized',()=>{
 const {hash:a,...ab}=approval;assert.equal(a,hash(ab));
 const {hash:p,...pb}=protocol;assert.equal(p,hash(pb));
 assert.equal(approval.status,'APPROVED');
 assert.equal(approval.exploratory_live_authorized,true);
 assert.equal(protocol.live_execution_authorized,true);
 assert.equal(protocol.standing,'EXPLORATORY_PROTOCOL_APPROVED_FOR_SINGLE_RUN');
 assert.equal(protocol.approval.hash,approval.hash);
 assert.equal(protocol.design.sha256,design.freeze.design_sha256);
 assert.equal(protocol.r2_protocol.hash,r2.hash);
 assert.equal(r2.live_execution_authorized,false);
 assert.equal(protocol.execution.planned_calls,80);
 assert.equal(protocol.execution.maximum_calls,100);
 assert.equal(protocol.execution.automatic_retries,0);
 assert.equal(protocol.execution.fallback,false);
 assert.equal(protocol.execution.resume,false);
 assert.equal(protocol.compiler.condition,'BLANK_ENGLISH_FALLBACK');
});

test('R3 approval terms match the requested exploratory scope',()=>{
 assert.equal(approval.requested_scope.reference_review,'MODEL_BASED_PROVISIONAL_NOT_INDEPENDENT_HUMAN_ADJUDICATION');
 assert.equal(approval.requested_scope.compiler_condition,'BLANK_ENGLISH_FALLBACK');
 assert.equal(approval.requested_scope.research_standing,'EXPLORATORY_NOT_CONFIRMATORY');
 assert.equal(approval.requested_scope.planned_calls,80);
 assert.equal(approval.requested_scope.maximum_calls,100);
 assert.equal(approval.requested_scope.one_execution,true);
 assert.equal(approval.requested_scope.post_result_tuning,false);
 assert.equal(approval.approved_by,'USER');
});
