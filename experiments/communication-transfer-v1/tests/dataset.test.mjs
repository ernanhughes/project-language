import test from 'node:test';import assert from 'node:assert/strict';
import {planSplit,similar} from '../src/dataset-plan.mjs';
const revision='12a856119f03975a94509091e8cada3e6be6ead7';
const row=document=>({document,right_summary:'candidate right',hallucinated_summary:'candidate wrong'});
test('missing old energy calibration/evaluation ledger blocks selection',()=>assert.throws(()=>planSplit([row('source')],[],{revision}),/CONTAMINATION_LEDGER/));
test('source identity and near duplicates cannot cross dev and heldout',()=>{
 const text='one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty';
 assert.equal(similar(text,text+' twentyone'),true);
 const r=planSplit([row(text),row(text.toUpperCase()),row(text+' twentyone'),row('A distinct source in a different domain and task.')],[],{revision,ledgerComplete:true,devGroups:1});
 const dup=r.filter(x=>x.group===r.find(x=>x.id.endsWith('/0')).group);assert.equal(dup.length,3);assert.equal(new Set(dup.map(x=>x.split)).size,1);
 const excluded=planSplit([row(text),row(text+' twentyone')],[text],{revision,ledgerComplete:true});assert.ok(excluded.every(x=>x.split==='EXCLUDED_PRIOR_USE'));
});
