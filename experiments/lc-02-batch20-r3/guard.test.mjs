import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {interpreterInput,sourceOf} from '../lc-02-batch20/protocol.mjs';
import {interpreterQuestionLeak} from '../lc-02-batch20/engine.mjs';

const design=JSON.parse(readFileSync(new URL('../lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json',import.meta.url),'utf8'));
const c={...design.cases.find(x=>x.id==='R1E-07'),source_id:'R1E-07-source-v1',question_id:'R1E-07-question-v1',question_scope:'SOURCE_RELATIVE'};

test('question text inside the source is not an interpreter question leak',()=>{
 const input=interpreterInput(c);
 assert.ok(input.source.text.includes(c.question),'fixture must contain the question in the source');
 assert.equal(interpreterQuestionLeak(input,c),false);
});

test('question field or question metadata is still rejected',()=>{
 const input=interpreterInput(c);
 assert.equal(interpreterQuestionLeak({...input,question:{id:c.question_id,text:c.question}},c),true);
 assert.equal(interpreterQuestionLeak({...input,intent:'Answer this: '+c.question},c),true);
 assert.equal(interpreterQuestionLeak({...input,understanding_inventory:{inventory:{source:{text:c.question}}}},c),false);
});

test('the R3 live failure is reproduced as a guard false positive',()=>{
 assert.ok(sourceOf(c).text.includes(c.question));
 assert.equal(interpreterQuestionLeak(interpreterInput(c),c),false);
});
