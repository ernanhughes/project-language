import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {loadCorpus,validateTask,independentlyApproved,syntheticContext,admitContext,makePacket,hostAssessment} from '../src/qualification/corpus.mjs';
import {POLICY,MODELS,Reservations,hash,parseOutput} from '../src/qualification/contracts.mjs';
import {qualifyCall,makeLock} from '../src/qualification/transport.mjs';
import {runQualification,scriptedReceiver,saveQualification} from '../src/qualification/run.mjs';
import {verifyQualificationLock} from '../src/qualification/lock.mjs';
const corpus=loadCorpus(),t=corpus[0];
const packet={source_hash:t.source_hash,questions:t.questions};
const samples={A:{message:t.plain_message,claims:t.claims},B:scriptedReceiver(t),C:{supported:true,unsupported_claims:[],valid_abstention:true,rationale:'test advice'}};
test('two different source-pinned families stay proposed with distinct author/reviewer fields',()=>{
 assert.equal(new Set(corpus.map(x=>x.family)).size,2);for(const task of corpus){assert.equal(task.standing,'PROPOSED_UNADJUDICATED');assert.equal(independentlyApproved(task),false);assert.equal(task.training_absence,'NOT_KNOWN');assert.equal(task.source_hash,hash(task.source));assert.ok(task.questions.length>=3);assert.ok(task.reference.some(x=>x.supported_decisions.includes('UNKNOWN')));}
 const changed=structuredClone(t);changed.source+=' changed';assert.throws(()=>validateTask(changed),/TASK_SOURCE_HASH/);
});
test('author cannot self-approve as independent reviewer',()=>{
 const task=structuredClone(t);for(const a of Object.values(task.approvals))Object.assign(a,{identity:'same',approved:true,at:'2026-10-22',source_hash:task.source_hash});assert.equal(independentlyApproved(task),false);
});
test('all five synthetic history variants admit relevant history only without blocking the task',()=>{
 for(const variant of ['relevant','irrelevant','conflicting','expired','unavailable']){const d=makePacket(t,'CONTEXT',samples.A,variant);assert.equal(d.context.included.length,variant==='relevant'?1:0);assert.equal(d.packet.questions.length,t.questions.length);assert.equal(d.packet.source_hash,t.source_hash);}
 const no=syntheticContext(t,'relevant');no[0].permission.transmit=false;assert.equal(admitContext(t,no).included.length,0);
});
test('binding source is separate from optional history and all paired objectives match',()=>{
 const ds=['SOURCE','PLAIN','LINKED','CONTEXT'].map(a=>makePacket(t,a,samples.A));for(const d of ds){assert.deepEqual(d.packet.questions,t.questions);assert.equal(d.packet.objective,ds[0].packet.objective);}assert.ok(!JSON.stringify(ds[1].packet).includes('reference'));assert.equal(ds[0].packet.message,t.source);assert.ok(ds.slice(1).every(d=>!d.wire.includes(t.source)));
 assert.throws(()=>makePacket(t,'PLAIN',{...samples.A,message:t.source}),/HIDDEN_SOURCE/);
});
for(const role of ['A','B','C'])test('installed '+role+' exact route, family, auth, stream, preview and bounded output',async()=>{
 const r=await qualifyCall({role,packet,response:samples[role]});assert.equal(r.status,'COMPLETED');assert.equal(r.model,MODELS[role]);assert.equal(r.attempts,1);assert.equal(r.terminal_seen,true);
 assert.equal(r.capture.auth_mode,role==='B'?'X_API_KEY':'BEARER');assert.equal(r.capture.headers['x-stainless-retry-count'],'0');assert.ok(r.capture.headers['x-opencode-session']);
 const body=JSON.parse(r.capture.body);assert.equal(body.max_tokens??body.max_completion_tokens,2048);assert.equal(body.stream,true);assert.equal(r.api,role==='B'?'anthropic-messages':'openai-completions');
 assert.equal(r.capture.url,role==='B'?'https://opencode.ai/zen/go/v1/messages?beta=true':'https://opencode.ai/zen/go/v1/chat/completions');
 assert.ok(!JSON.stringify(r).includes('synthetic-transfer-01b-not-a-credential'));assert.equal(r.usage.actual_provider_cost_usd,null);
 const replay=await qualifyCall({role,packet,response:samples[role],expectedRequestHash:r.capture.request_hash});assert.equal(replay.status,'COMPLETED');assert.equal(replay.capture.request_hash,r.capture.request_hash);
 const mismatch=await qualifyCall({role,packet,response:samples[role],expectedRequestHash:'bad'});assert.equal(mismatch.status,'REQUEST_PREVIEW_MISMATCH');assert.equal(mismatch.output,null);
});
test('supported omitted reasoning keeps finite shared completion caps in both API families',async()=>{
 const a=await qualifyCall({role:'A',packet,response:samples.A}),b=await qualifyCall({role:'B',packet,response:samples.B});
 assert.equal(JSON.parse(a.capture.body).max_tokens,2048);assert.equal(JSON.parse(b.capture.body).max_tokens,2048);assert.equal(JSON.parse(b.capture.body).thinking.type,'disabled');
});
for(const role of ['A','B','C'])test(role+' refuses HTTP errors, length finish, missing terminator and malformed output without retry',async()=>{
 for(const kind of ['http429','http500','length','truncated']){const r=await qualifyCall({role,packet,response:samples[role],kind});assert.notEqual(r.status,'COMPLETED');assert.equal(r.attempts,1);assert.equal(r.output,null);assert.ok(!JSON.stringify(r).includes('unsafe-provider-error'));}
 for(const text of ['', '{}','{"broken"','[]','oc_sk_do-not-disclose']){const r=await qualifyCall({role,packet,response:text});assert.notEqual(r.status,'COMPLETED');assert.equal(r.output,null);assert.equal(r.raw_response_disclosed,false);}
});
test('complete JSON followed by incomplete SSE is refused even when parser can normalize it',async()=>{
 for(const role of ['A','B','C']){const r=await qualifyCall({role,packet,response:samples[role],kind:'truncated'});assert.ok(['INCOMPLETE_STREAM','PROVIDER_FAILED'].includes(r.status));assert.equal(r.output,null);}
});
test('timeout, cancellation during request and pre-cancellation have explicit states',async()=>{
 const timeout=await qualifyCall({role:'A',packet,response:samples.A,kind:'timeout',timeoutMs:10});assert.equal(timeout.status,'TIMED_OUT');assert.equal(timeout.attempts,1);
 const ctrl=new AbortController();const pending=qualifyCall({role:'B',packet,response:samples.B,kind:'cancel',signal:ctrl.signal});setTimeout(()=>ctrl.abort(),10);const during=await pending;assert.equal(during.status,'CANCELLED');assert.equal(during.attempts,1);
 const before=await qualifyCall({role:'C',packet,response:samples.C,signal:ctrl.signal});assert.equal(before.status,'CANCELLED_BEFORE_DISPATCH');assert.equal(before.attempts,0);
});
test('source, role, prompt, model, settings and API locks fail before a request',async()=>{
 for(const key of ['source_hash','role','prompt_hash','model','settings_hash','api','base_url']){const lock={...makeLock('A',packet),[key]:'drift'};await assert.rejects(()=>qualifyCall({role:'A',packet,response:samples.A,lock}),/LOCK_MISMATCH/);}
});
test('shared reservations reject duplicate ids, exhausted calls/cost/output with no refund or fallback',async()=>{
 const budget=new Reservations({...POLICY,maxCalls:1});budget.reserve('one',100,2048,0.1);assert.throws(()=>budget.reserve('one',100,2048,0.1),/CALL_ALREADY/);assert.throws(()=>budget.reserve('two',100,2048,0.1),/EXHAUSTED/);assert.equal(budget.calls,1);
 const exhausted=new Reservations({...POLICY,proposedUsd:0});const r=await qualifyCall({role:'C',packet,response:samples.C,budget:exhausted});assert.equal(r.status,'RESERVATION_EXHAUSTED');assert.equal(r.output,null);assert.equal(exhausted.calls,0);
 assert.throws(()=>new Reservations().reserve('bad',1,2049,0),/EXHAUSTED/);assert.throws(()=>new Reservations().reserve('bad',1,1,NaN),/INVALID/);
});
test('absent, ambiguous, duplicated and wrong-question answers are refused',()=>{
 assert.throws(()=>parseOutput('B',JSON.stringify({answers:[]}),t.questions.map(x=>x.id)),/SCHEMA/);
 const d=scriptedReceiver(t);d.answers.push(d.answers[0]);assert.throws(()=>parseOutput('B',JSON.stringify(d),t.questions.map(x=>x.id)),/COVERAGE/);
 const a=scriptedReceiver(t);a.answers[0].decision='MAYBE';assert.throws(()=>parseOutput('B',JSON.stringify(a)),/SCHEMA/);
});
test('reported over-cap usage is refused; absent usage stays unknown and oversized output is withheld',async()=>{
 for(const role of ['A','B','C']){const excess=await qualifyCall({role,packet,response:samples[role],kind:'usage-excess'});assert.equal(excess.status,'REPORTED_USAGE_EXCEEDED');assert.equal(excess.output,null);}
 const missing=await qualifyCall({role:'A',packet,response:samples.A,kind:'missing-usage'});assert.equal(missing.usage.reported,null);assert.equal(missing.usage.billing,'UNKNOWN');assert.equal(missing.usage.catalog_cost_estimate,null);
 const long=await qualifyCall({role:'A',packet,response:{...samples.A,message:'x'.repeat(9000)}});assert.equal(long.status,'OUTPUT_BYTES');assert.equal(long.output,null);
 const sensitive=await qualifyCall({role:'C',packet,response:{...samples.C,rationale:'oc_sk_synthetic-hidden'}});assert.equal(sensitive.status,'SENSITIVE_OUTPUT');assert.ok(!JSON.stringify(sensitive).includes('oc_sk_synthetic-hidden'));
});
test('qualification snapshot rejects wrong digest, live authorization, source drift and path traversal',()=>{
 const p=join(mkdtempSync(join(tmpdir(),'transfer-lock-')),'lock.json');writeFileSync(p,'{}');assert.throws(()=>verifyQualificationLock(p,'wrong'),/LOCK_ID/);
 const fake={schema:'transfer-qualification-lock/1',version:'TRANSFER-01B/1',live_authorized:false,corpus_status:'PROPOSED_UNADJUDICATED',policy:{},models:{},prompt_hashes:{},settings:{},files:{'package.json':'0'.repeat(64)}};
 writeFileSync(p,JSON.stringify(fake));assert.throws(()=>verifyQualificationLock(p,hash(JSON.stringify(fake))),/SOURCE_DRIFT/);
 fake.files={'../outside': '0'.repeat(64)};writeFileSync(p,JSON.stringify(fake));assert.throws(()=>verifyQualificationLock(p,hash(JSON.stringify(fake))),/LOCK_PATH/);
 fake.live_authorized=true;writeFileSync(p,JSON.stringify(fake));assert.throws(()=>verifyQualificationLock(p,hash(JSON.stringify(fake))));
});
test('C false endorsements and missed valid refusals stay separate from NOT_ADJUDICATED primary judgments',()=>{
 const bad=scriptedReceiver(t);bad.answers[0].decision='YES';const r=hostAssessment(t,bad,samples.C);assert.equal(r.scripted_false_endorsement,true);assert.equal(r.primary_status,'NOT_ADJUDICATED');
 assert.equal(hostAssessment(t,scriptedReceiver(t),{...samples.C,valid_abstention:false}).scripted_missed_valid_refusal,true);
});
test('qualification integrates distinct Pi roles, complete ablations and blinded host-only labels',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>{throw Error('UNAUTHORIZED_EXTERNAL_REQUEST');};let result;
 try{result=await runQualification();}finally{globalThis.fetch=previous;}
 assert.equal(result.traces.length,16);assert.equal(result.reservations.planned_calls,48);
 const roles=result.traces.flatMap(x=>[x.a,x.b,x.c]);assert.equal(new Set(roles.map(x=>x.session_id)).size,48);assert.equal(new Set(roles.map(x=>x.storage_hash)).size,48);
 for(const trace of result.traces){const {receipt_hash,...body}=trace;assert.equal(receipt_hash,hash(body));for(const r of [trace.a,trace.b,trace.c]){assert.deepEqual(r.active_tools,[]);assert.equal(r.visible.messages.length,2);}
  const b=trace.b.visible.messages[1].content[0].text,c=trace.c.visible.messages[1].content[0].text;
  assert.equal(b,trace.channel.wire);for(const text of [b,c]){assert.ok(!text.includes('supported_decisions'));assert.ok(!text.includes('permitted_alternatives'));assert.ok(!text.includes('critical_distinctions'));}
  assert.equal(JSON.parse(b).message===trace.source,trace.arm==='SOURCE');const cp=JSON.parse(c);assert.deepEqual(Object.keys(cp).sort(),['anonymous_response','questions','source']);assert.equal(trace.assessment.primary_status,'NOT_ADJUDICATED');
 }
 const out=join(mkdtempSync(join(tmpdir(),'transfer-01b-')),'new');saveQualification(result,out);assert.throws(()=>saveQualification(result,out),/EEXIST/);assert.equal(hash(readFileSync(join(out,'receipts.json'),'utf8')),JSON.parse(readFileSync(join(out,'manifest.json')) )['receipts.json']);
});
