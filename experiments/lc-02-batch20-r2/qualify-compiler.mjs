import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {UnderstandingCompiler,interpretationProfile,defaultPython} from '../../core/understanding/adapter.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const design=JSON.parse(readFileSync('experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json','utf8'));
const python=defaultPython();
const probe=JSON.parse(execFileSync(python,['-c','import spacy,json,sys; print(json.dumps({"python_version":sys.version.split()[0],"spacy_version":spacy.__version__,"installed_models":spacy.util.get_installed_models()}))'],{encoding:'utf8'}).trim());
const compiler=new UnderstandingCompiler({python});
const profile=interpretationProfile('technical-policy');
const controls=[
 {id:'R1E-01',kind:'POSITIVE_CONTROL_FULLY_SPECIFIED_PERMISSION'},
 {id:'R1E-02',kind:'NEGATIVE_CONTROL_FULLY_SPECIFIED_PROHIBITION'}
];
const results=[];
for(const control of controls){
 const c=design.cases.find(x=>x.id===control.id);
 const inventory=await compiler.compile({source_id:c.id+'-source-v1',source_text:c.source,profile:'technical-policy',profile_version:profile.version,context:{purpose:'R2 compiler qualification'}});
 results.push({case_id:c.id,control:control.kind,source:c.source,engine:inventory.engine,profile:{id:inventory.profile.id,version:inventory.profile.version,sha256:inventory.profile.sha256},segments:inventory.segments.length,meaning_units:inventory.meaning_units.map(u=>({id:u.id,quote:u.source_quote,start:u.start,end:u.end,kind:u.classification.kind,force:u.classification.normative_force,condition_cues:u.classification.condition_cues,prerequisites:u.classification.prerequisites,speaker:u.classification.speaker,possible_unresolved_reference:u.classification.possible_unresolved_reference})),relations:inventory.relations,relationship_candidates_implemented:false,warnings:inventory.warnings});
}
const result={schema:'lc02-r2-compiler-qualification/0.1',standing:'OFFLINE_QUALIFICATION_NOT_SEMANTIC_CERTIFICATION',python,probe,profile,engine:results[0].engine,trained_syntax_available:results.every(r=>r.engine.trained_syntax_available),fallback_reason:results[0].engine.fallback_reason,controls:results,limitations:['No trained spaCy model is installed in the selected environment. Blank-English sentence segmentation was used.','No automatic download was attempted.','No cross-sentence relationship candidates are implemented; relations remain empty.','Counts and labels are heuristic candidates, not semantic completeness or correctness.']};
writeFileSync('experiments/lc-02-batch20-r2/COMPILER-QUALIFICATION.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:'COMPILER_QUALIFIED',trained:result.trained_syntax_available,engine:result.engine.id,controls:results.map(r=>({case_id:r.case_id,segments:r.segments,units:r.meaning_units.length,relations:r.relations.length,prerequisites:r.meaning_units.flatMap(u=>u.prerequisites??[])}))},null,2));
