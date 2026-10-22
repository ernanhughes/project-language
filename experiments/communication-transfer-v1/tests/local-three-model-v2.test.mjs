import test from 'node:test';import assert from 'node:assert/strict';
import {liveCall,MAX_STREAM_BYTES} from '../src/local-three-model-v2.mjs';import {Reservations,POLICY} from '../src/qualification/contracts.mjs';
const budget=()=>new Reservations({...POLICY,maxCalls:3});
const response={message:'Keep the explicit policy.',claims:[{id:'x',quote:'policy',start:0,end:6}]};
function framed(extra){return 'data: '+JSON.stringify({id:'fixture',object:'chat.completion.chunk',padding:extra,choices:[{index:0,delta:{content:JSON.stringify(response)},finish_reason:null}]})+'\n\ndata: '+JSON.stringify({choices:[{index:0,delta:{},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:40,total_tokens:140}})+'\n\ndata: [DONE]\n\n';}
test('large SSE framing does not consume the completion-byte budget or trigger old 128 KiB guard',async()=>{
 let calls=0;const b=budget();const r=await liveCall({role:'A',packet:{source_hash:'synthetic'},credential:'synthetic-only',budget:b,send:async req=>{calls++;const body=await req.json();assert.equal(body.max_tokens,2048);return new Response(framed('x'.repeat(150000)),{headers:{'content-type':'text/event-stream'}});}});
 assert.equal(r.status,'COMPLETED');assert.equal(calls,1);assert.ok(r.transport.wire_bytes>131072);assert.ok(r.transport.completion_bytes<8192);assert.equal(b.outputTokens,2048);assert.equal(MAX_STREAM_BYTES,2097152);
});
test('new wire ceiling still stops oversized streams, records metrics and never retries',async()=>{
 let calls=0;const r=await liveCall({role:'A',packet:{source_hash:'synthetic'},credential:'synthetic-only',budget:budget(),send:async()=>{calls++;return new Response(framed('x'.repeat(MAX_STREAM_BYTES)),{headers:{'content-type':'text/event-stream'}});}});
 assert.equal(r.status,'FAILED');assert.equal(r.failure_code,'RESPONSE_STREAM_LIMIT');assert.ok(r.transport.wire_bytes>MAX_STREAM_BYTES);assert.equal(calls,1);assert.equal(r.output,null);
});
