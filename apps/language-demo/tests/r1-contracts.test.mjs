import test from 'node:test';
import assert from 'node:assert/strict';
import {hash,validateAnchors,resolveCitations} from '../protocol/state.mjs';
import {Studio} from '../engine/studio.mjs';
import {Runtime} from '../models/runtime.mjs';
import {prompts} from '../models/prompts.mjs';
import {sourceContract,SOURCE_RELATIVE_RULES,DECISION_LABEL_RULES} from '../protocol/source-contract.mjs';
import {assessDecision,adjudicationIssue,LABEL_MEANINGS,explanationFlags} from '../evaluation/decision-rubric.mjs';
import {UnderstandingCompiler,interpretationProfile} from '../../../core/understanding/adapter.mjs';

const text='In the city of Halden, the night bridge may be crossed only while its blue lantern is burning. The keeper lit the blue lantern at midnight.';
const source={id:'r1-source',text,hash:hash(text)};
const exact={origin:'ORIGINAL_SOURCE',source_id:source.id,source_hash:source.hash,start:0,end:94,text:text.slice(0,94)};

test('accepted delivery packet carries the contract on every arm',async()=>{
 const s=new Studio({runtime:new Runtime({mode:'fixture',env:{}})});
 await s.act('create');await s.act('interpret');const v=s.current();s.decide({digest:v.digest,decision:'ACCEPT',actor:'TEST_OPERATOR'});
 for(const arm of ['SOURCE','LANGUAGE']){const p=s.packet(arm).packet;assert.equal(p.contract_version,'lc02-r1/source-relative/1');assert.equal(p.source_truth,'UNVERIFIED');assert.equal(p.source_truth_scope,'EXTERNAL_FACTUAL_VERIFICATION_ONLY');assert.equal(p.answer_scope,'SOURCE_RELATIVE');assert.equal(p.interpretation_standing,'FALLIBLE_AID_NOT_SOURCE');assert.equal(p.action_authority,false);}
});

test('trained syntax can be required instead of silently falling back',async()=>{
 const compiler=new UnderstandingCompiler({require_trained_syntax:true});
 const profile=interpretationProfile('technical-policy');
 try{
  const inventory=await compiler.compile({source_id:'r1-trained-check',source_text:'Operators may proceed only if the ticket is open.',profile:'technical-policy',profile_version:profile.version,context:{}});
  assert.equal(inventory.engine.trained_syntax_available,true);
 }catch(e){
  assert.equal(e.message,'UNDERSTANDING_TRAINED_SYNTAX_REQUIRED');
 }
});

test('strict anchor validation remains strict; host resolution is separate',()=>{
 assert.doesNotThrow(()=>validateAnchors([exact],source));
 assert.throws(()=>validateAnchors([{...exact,source_hash:'bda2f895b566751b10f6fd9a125da685f75f0f81b9127ecd7a3ced430c4dc84b'}],source),/SOURCE_BINDING/);
 const resolved=resolveCitations([{...exact,source_hash:'bda2f895b566751b10f6fd9a125da685f75f0f81b9127ecd7a3ced430c4dc84b'}],source);
 assert.deepEqual(resolved.resolutions,['HOST_RESOLVED_HASH']);
 assert.equal(resolved.citations[0].source_hash,source.hash);
 const emptyHash=resolveCitations([{...exact,source_hash:''}],source);
 assert.deepEqual(emptyHash.resolutions,['HOST_RESOLVED_HASH']);
 assert.equal(emptyHash.citations[0].source_hash,source.hash);
 assert.throws(()=>resolveCitations([{...exact,end:93}],source),/SOURCE_SPAN/);
 assert.throws(()=>resolveCitations([{...exact,source_id:'other'}],source),/SOURCE_BINDING/);
});

test('source-relative contract distinguishes scope, truth and authority',()=>{
 const c=sourceContract('SOURCE_RELATIVE');
 assert.equal(c.source_truth,'UNVERIFIED');
 assert.equal(c.source_truth_scope,'EXTERNAL_FACTUAL_VERIFICATION_ONLY');
 assert.equal(c.answer_scope,'SOURCE_RELATIVE');
 assert.equal(c.interpretation_standing,'FALLIBLE_AID_NOT_SOURCE');
 assert.equal(c.action_authority,false);
 assert.throws(()=>sourceContract('OMNISCIENT'),/UNKNOWN_ANSWER_SCOPE/);
 assert.match(SOURCE_RELATIVE_RULES,/does not prevent a source-relative answer/);
 assert.match(SOURCE_RELATIVE_RULES,/not a gap in the source/);
 assert.match(DECISION_LABEL_RULES,/UNKNOWN is not a synonym for lack of external verification/);
});

test('interpreter and recipient prompts carry the repaired contract',()=>{
 assert.match(prompts.interpreter,/do not add a condition|Do not add a condition/);
 assert.match(prompts.interpreter,/fallible aid, not the source/);
 assert.match(prompts.recipient,/source embedded in the delivered packet/);
 assert.match(prompts.recipient,/source_truth: UNVERIFIED/);
 assert.match(prompts.recipient,/does not prevent a source-relative answer/);
 assert.match(prompts.recipient,/UNKNOWN is not a synonym for lack of external verification/);
 assert.match(prompts.recipient,/NO: the source states its negation/);
 assert.match(prompts.recipient,/SOURCE_CONFLICT/);
 assert.match(prompts.recipient,/use an empty string for source_hash/);
 assert.match(prompts.recipient,/the host resolves the canonical hash/);
 assert.match(prompts.recipient,/citations: \[\]/);
 assert.match(prompts.recipient,/UTF-16/);
});

test('explanation flags detect provenance confusion and interpreter deference',()=>{
 const bad=explanationFlags('Additionally, source_truth is marked as UNVERIFIED. Therefore, it cannot be definitively stated from the text alone whether the permission is currently active for paging.');
 assert.ok(bad.flags.includes('PROVENANCE_SCOPE_CONFUSION'));
 const control=explanationFlags('source_truth is UNVERIFIED, but the question is source-relative. The document says paging is permitted, so the answer is YES.');
 assert.ok(!control.flags.includes('PROVENANCE_SCOPE_CONFUSION'));
 const defer=explanationFlags('The packet explicitly lists as unknowns whether recorded acceptance is equivalent to review acceptance. The answer is UNKNOWN.');
 assert.ok(defer.flags.includes('DEFERS_TO_INTERPRETER_DOUBT'));
});

test('rubric keeps label agreement separate from explanation and adjudication',()=>{ const reference={expected_decision:'UNKNOWN',acceptable_alternatives:[{decision:'NO',reason:'Documented approval is absent, but the status is undecided.'}]};
 assert.equal(assessDecision({decision:'UNKNOWN',reference}).status,'REFERENCE_MATCH');
 assert.equal(assessDecision({decision:'NO',reference}).status,'ACCEPTABLE_ALTERNATIVE');
 assert.equal(assessDecision({decision:'YES',reference}).status,'REFERENCE_DISAGREEMENT');
 assert.equal(assessDecision({decision:'YES',reference,mechanical:'FAILED'}).status,'MECHANICAL_FAILURE');
 const issue=adjudicationIssue({id:'x',issue:'documented versus actual',readings:[{decision:'NO',reason:'no approval recorded'},{decision:'UNKNOWN',reason:'decision pending'}]});
 assert.equal(issue.standing,'IMPLEMENTATION_TEAM_PROVISIONAL_NOT_INDEPENDENT_ADJUDICATION');
 assert.match(LABEL_MEANINGS.NO,/explanation must say which reading applies/);
 assert.throws(()=>adjudicationIssue({id:'x',issue:'bad',readings:[{decision:'YES',reason:'one'}]}),/ADJUDICATION_INPUT/);
});
