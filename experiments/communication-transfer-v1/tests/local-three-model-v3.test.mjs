import test from 'node:test';import assert from 'node:assert/strict';
import {attemptRole,createManualBudget,MAX_OUTPUT_TOKENS,MAX_STREAM_BYTES} from '../src/local-three-model-v3.mjs';
const packet={source_hash:'synthetic'},credential='synthetic-only';
function success(){const output={message:'A source-bound summary.',claims:[{id:'c',quote:'policy',start:0,end:6}]};return new Response('data: '+JSON.stringify({choices:[{index:0,delta:{content:JSON.stringify(output)},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{index:0,delta:{},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:40,total_tokens:140}})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});}
test('v3 sets 16K tokens, retries up to three times and preserves each failed attempt',async()=>{
 let sent=0;const records=[],b=createManualBudget();const r=await attemptRole({role:'A',packet,credential,budget:b,pause:async()=>{},onAttempt:(receipt,index)=>records.push({receipt,index}),send:async req=>{sent++;const body=await req.json();assert.equal(body.max_tokens,16384);assert.equal(req.headers.get('x-stainless-retry-count'),'0');return sent<4?new Response('transient',{status:500}):success();}});
 assert.equal(MAX_OUTPUT_TOKENS,16384);assert.equal(MAX_STREAM_BYTES,16777216);assert.equal(sent,4);assert.equal(records.length,4);assert.equal(r.final.status,'COMPLETED');assert.equal(b.outputTokens,4*16384);assert.deepEqual(r.history.map(x=>x.status),['FAILED','FAILED','FAILED','COMPLETED']);
});
test('four failed attempts stop without fallback or additional calls',async()=>{let sent=0;const r=await attemptRole({role:'A',packet,credential,budget:createManualBudget(),pause:async()=>{},send:async()=>{sent++;return new Response('busy',{status:429});}});assert.equal(sent,4);assert.equal(r.history.length,4);assert.equal(r.final.failure_code,'HTTP_429');});
test('budget and authentication refusals stop retries early',async()=>{
 let sent=0;const b=await attemptRole({role:'A',packet,credential,budget:createManualBudget(0.000001),pause:async()=>{},send:async()=>{sent++;return success();}});assert.equal(sent,0);assert.equal(b.final.failure_code,'RESERVATION_EXHAUSTED');assert.equal(b.history.length,1);
 const a=await attemptRole({role:'A',packet,credential,budget:createManualBudget(),pause:async()=>{},send:async()=>new Response('denied',{status:401})});assert.equal(a.history.length,1);assert.equal(a.final.failure_code,'HTTP_401');
});
