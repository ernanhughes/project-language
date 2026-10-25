import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {UnderstandingCompiler,interpretationProfile} from '../adapter.mjs';
import {validateReference,reviewCandidates,digest} from './checker.mjs';
const output=process.argv[2];if(!output)throw Error('Usage: node --experimental-transform-types core/understanding/qualification/run.mjs NEW_OUTPUT_DIRECTORY [captured-model.json]');
const references=JSON.parse(readFileSync(new URL('./references.json',import.meta.url),'utf8'));
references.passages.forEach(validateReference);
// Optional captures are supplied explicitly; this runner never calls a model.
const captures=process.argv[3]?JSON.parse(readFileSync(resolve(process.argv[3]),'utf8')):[];
const compiler=new UnderstandingCompiler();const results=[];
for(const p of references.passages){
 const profile=interpretationProfile('technical-policy');const baseline=await compiler.compile({source_id:p.source.id,source_text:p.source.text,profile:'technical-policy',profile_version:profile.version,context:{}});
 const model=captures.filter(c=>c.source?.sha256===p.source.sha256).map(c=>{if(!c.model||!c.call_id||!['HOSTED_CAPTURE','SCRIPTED'].includes(c.origin))throw Error('MODEL_PROVENANCE_REQUIRED');return {capture:c,review:reviewCandidates(p,c)};});
 results.push({passage_id:p.id,reference:p,baseline,baseline_review:reviewCandidates(p,baseline),observations:{sentences:baseline.segments.length,baseline_units:baseline.meaning_units.length,reference_units:p.units.length,baseline_relations:baseline.relations.length,reference_relations:p.relations.length,counts_are_not_semantic_scores:true},model_assisted:model,model_evidence:model.length?'EXPLICIT_CAPTURE_ONLY':'NOT_RUN_NO_HOSTED_AUTHORIZATION'});
}
mkdirSync(resolve(output),{recursive:false});
writeFileSync(resolve(output,'references.json'),readFileSync(new URL('./references.json',import.meta.url)));
const body=JSON.stringify({schema:'lc02v-development-comparison/0.1',standing:'EXPLORATORY_UNADJUDICATED',reference_authorship:references.author,compiler:compiler.identity(),results,limitations:['Reference author independence does not validate labels.','No independently adjudicated semantic scores.','Structural differences are not automatically extraction defects.','No hosted calls performed by this runner.']},null,2)+'\n';
writeFileSync(resolve(output,'comparison.json'),body);writeFileSync(resolve(output,'manifest.json'),JSON.stringify({schema:'lc02v-artifact-manifest/0.1',files:{'comparison.json':digest(body),'references.json':digest(readFileSync(new URL('./references.json',import.meta.url))) }},null,2)+'\n');
console.log(JSON.stringify({status:'OFFLINE_COMPLETE',passages:results.length,hosted_requests:0,output:resolve(output)}));
