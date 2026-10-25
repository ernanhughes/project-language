import test from 'node:test';
import assert from 'node:assert/strict';
import {hash} from '../protocol/state.mjs';
import {CheckInput,validateCheckOutput} from '../evaluation/semantic-checker-contract.mjs';
import {checkTransformation,checkLexicalBaseline,policyDecision} from '../evaluation/semantic-checker.mjs';

const sourceText='The staging database must not be copied to removable media. The operator proposes copying the staging database to a removable drive.';
const transformationText='The staging database may be copied to removable media. The operator proposes copying it to a removable drive.';
const source={id:'checker-source',text:sourceText,hash:hash(sourceText)};
const transformation={id:'checker-transformation',text:transformationText,hash:hash(transformationText)};
const input={source,transformation,context:{purpose:'test'},obligations:[{id:'o1',source_quote:'The staging database must not be copied to removable media.'}],profile:'technical-policy'};

test('checker detects a negation reversal and preserves exact spans',async()=>{
 const out=await checkTransformation(input);
 assert.ok(out.findings.some(f=>f.type==='CHANGED_CANDIDATE'&&f.distinction==='NEGATION_REVERSAL'));
 assert.equal(out.action_authority,false);
 assert.equal(out.human_acceptance,'REQUIRED_FOR_ANY_TRANSMISSION');
 assert.equal(out.repair,'NOT_PERFORMED');
 assert.doesNotThrow(()=>validateCheckOutput(out,{source,transformation}));
 assert.equal(policyDecision(out),'PRESERVE_SOURCE');
});

test('checker input rejects reference answers, recipient answers and self-assessment fields',()=>{
 assert.throws(()=>CheckInput.parse({...input,reference:{expected_decision:'NO'}}));
 assert.throws(()=>CheckInput.parse({...input,recipient_answer:{decision:'YES'}}));
 assert.throws(()=>CheckInput.parse({...input,self_assessment:{preserved:true}}));
});

test('lexical baseline is exact-match only and over-rejects a paraphrase',async()=>{
 const paraphrase={...input,transformation:{id:'paraphrase',text:'The staging database is prohibited from being copied onto removable media. The operator proposes such a copy.',hash:hash('The staging database is prohibited from being copied onto removable media. The operator proposes such a copy.')}};
 const out=await checkLexicalBaseline(paraphrase);
 assert.ok(out.findings.some(f=>f.type==='MISSING_CANDIDATE'||f.type==='UNSUPPORTED_ADDITION_CANDIDATE'));
});

test('policy distinguishes preserve, use and clarification candidates',()=>{
 assert.equal(policyDecision({findings:[{type:'CHANGED_CANDIDATE',severity:'MATERIAL'}]}),'PRESERVE_SOURCE');
 assert.equal(policyDecision({findings:[{type:'PRESERVED_CANDIDATE',severity:'INFO'}]}),'USE_TRANSFORMATION');
 assert.equal(policyDecision({findings:[{type:'UNRESOLVED',severity:'MINOR'}]}),'REQUEST_CLARIFICATION');
 assert.equal(policyDecision({findings:[{type:'NOT_ASSESSED',severity:'INFO'}]}),'REQUEST_CLARIFICATION');
});
