import test from 'node:test';import assert from 'node:assert/strict';
import {liveCall} from '../src/local-three-model.mjs';
import {Reservations,POLICY} from '../src/qualification/contracts.mjs';
const credential='synthetic-test-only';
const response={message:'At most three attempts.',claims:[{id:'c',quote:'three',start:0,end:5}]};
const budget=()=>new Reservations({...POLICY,maxCalls:3});
test('manual launcher uses installed adapter with injected HTTP, finite cap and redacted authentication',async()=>{
 let requests=0;const send=async req=>{requests++;assert.equal(req.url,'https://opencode.ai/zen/go/v1/chat/completions');const body=await req.json();assert.equal(body.max_tokens,2048);assert.equal(req.headers.get('authorization'),'Bearer '+credential);return new Response('data: '+JSON.stringify({choices:[{index:0,delta:{content:JSON.stringify(response)},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{index:0,delta:{},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120}})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});};
 const r=await liveCall({role:'A',packet:{source_hash:'synthetic',source:'three'},credential,budget:budget(),send});assert.equal(r.status,'COMPLETED');assert.equal(requests,1);assert.equal(r.attempts,1);assert.ok(!JSON.stringify(r).includes(credential));
});
test('HTTP failure is recorded without retries or disclosing provider text',async()=>{
 let count=0;const r=await liveCall({role:'A',packet:{source_hash:'synthetic'},credential,budget:budget(),send:async()=>{count++;return new Response('private '+credential,{status:429});}});assert.equal(r.status,'FAILED');assert.equal(r.failure_code,'HTTP_429');assert.equal(count,1);assert.ok(!JSON.stringify(r).includes(credential));assert.equal(r.output,null);
});
test('exhausted reservation stops before sending',async()=>{
 let count=0;const r=await liveCall({role:'A',packet:{source_hash:'synthetic'},credential,budget:new Reservations({...POLICY,maxCalls:0}),send:async()=>{count++;throw Error('must not send');}});assert.equal(r.status,'FAILED');assert.equal(count,0);
});
