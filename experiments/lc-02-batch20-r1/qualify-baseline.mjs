import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {UnderstandingCompiler,interpretationProfile,defaultPython} from '../../core/understanding/adapter.mjs';

const root=resolve(new URL('../..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const out=join(root,'experiments/lc-02-batch20-r1');
const python=defaultPython();
const probe=JSON.parse(execFileSync(python,['-c','import spacy,json,sys; print(json.dumps({"python_version":sys.version.split()[0],"spacy_version":spacy.__version__,"installed_models":spacy.util.get_installed_models()}))'],{encoding:'utf8'}).trim());
const compiler=new UnderstandingCompiler({python});
const profile=interpretationProfile('technical-policy');
const sample='The incident desk may page the engineer when lag stays above twenty seconds for five continuous minutes. Paging is permitted; restarting the replica requires a separate command.';
const inventory=await compiler.compile({source_id:'r1-qualification',source_text:sample,profile:'technical-policy',profile_version:profile.version,context:{purpose:'baseline qualification'}});
const generalInventory=await compiler.compile({source_id:'r1-qualification-general',source_text:sample,profile:'general',profile_version:interpretationProfile('general').version,context:{purpose:'baseline qualification'}});
const result={schema:'lc02-r1-compiler-baseline/0.1',standing:'OFFLINE_QUALIFICATION_NOT_SEMANTIC_CERTIFICATION',python,probe,profile:{id:profile.id,version:profile.version,sha256:profile.sha256,file_sha256:profile.file_sha256},engine:inventory.engine,trained_syntax_available:inventory.engine.trained_syntax_available,fallback_reason:inventory.engine.fallback_reason,counts:{technical_policy:{sentences:inventory.segments.length,units:inventory.meaning_units.length,relations:inventory.relations.length,prerequisites:inventory.meaning_units.flatMap(u=>u.classification.prerequisites??[]),semicolon_split_units:inventory.meaning_units.filter(u=>u.source_quote==='Paging is permitted').length},general:{sentences:generalInventory.segments.length,units:generalInventory.meaning_units.length,relations:generalInventory.relations.length}},limitations:['No trained spaCy model is installed in the selected environment. Blank-English sentence segmentation was used.','No automatic download was attempted.','Counts and labels are heuristic candidates, not semantic completeness or correctness.']};
writeFileSync(join(out,'COMPILER-BASELINE.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:'BASELINE_QUALIFIED',trained:result.trained_syntax_available,engine:result.engine.id,counts:result.counts,out},null,2));
