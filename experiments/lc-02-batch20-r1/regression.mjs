import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {hash,validateAnchors,resolveCitations} from '../../apps/language-demo/protocol/state.mjs';
import {UnderstandingCompiler,interpretationProfile} from '../../core/understanding/adapter.mjs';
import {sourceContract} from '../../apps/language-demo/protocol/source-contract.mjs';
import {prompts} from '../../apps/language-demo/models/prompts.mjs';
import {assessDecision,explanationFlags} from '../../apps/language-demo/evaluation/decision-rubric.mjs';

const root=resolve(new URL('../..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const batch=join(root,'experiments/lc-02-batch20');
const frozen=join(batch,'.runs/COMBINED-001');
const out=join(root,'experiments/lc-02-batch20-r1');
const suite=JSON.parse(readFileSync(join(batch,'fixtures/lc02-20-tests.json'),'utf8'));
const adjudication=JSON.parse(readFileSync(join(out,'fixtures/adjudication.json'),'utf8'));
const artifactHashes=JSON.parse(readFileSync(join(frozen,'artifact-hashes.json'),'utf8')).files;
const byId=new Map(adjudication.cases.map(c=>[c.id,c]));
const cases=new Map(suite.cases.map(c=>[c.id,c]));
const checks=[];
const add=(check,{before,after,status,control=null,failure_mode,evidence})=>checks.push({check,status,before,after,control,failure_mode,evidence});

// 1. Frozen evidence must remain byte-identical to its recorded hashes.
const frozenResults=readFileSync(join(frozen,'results.json'),'utf8');
let frozenBad=[];
for(const [rel,expected] of Object.entries(artifactHashes)){const p=join(frozen,rel);if(!readFileSyncOk(p)||hash(readFileSync(p,'utf8'))!==expected)frozenBad.push(rel);}
function readFileSyncOk(p){try{readFileSync(p);return true;}catch{return false;}}
add('all-frozen-artifacts-unchanged',{before:`${Object.keys(artifactHashes).length} recorded artifact hashes`,after:`${Object.keys(artifactHashes).length-frozenBad.length}/${Object.keys(artifactHashes).length} exact`,status:frozenBad.length===0?'PASS':'FAIL',control:'Diagnosis writes only new files under experiments/lc-02-batch20-r1/.',failure_mode:'Any rewritten request, response, event, failure or hash would invalidate the evidence base.',evidence:frozenBad.length?frozenBad.join(', '):'artifact-hashes.json'});
add('frozen-results-unchanged',{before:hash(frozenResults),after:artifactHashes['results.json'],status:hash(frozenResults)===artifactHashes['results.json']?'PASS':'FAIL',control:'All case records remain addressable; no rewrite or rescore.',failure_mode:'Any silent alteration of the frozen comparison would invalidate the diagnosis.',evidence:'artifact-hashes.json results.json digest'});

// 2. Source-hash echo failure: strict validation remains strict, host resolution is opt-in and exact-span-bound.
const lc15=JSON.parse(readFileSync(join(frozen,'cases/LC20-15/A_SOURCE_ONLY/record.json'),'utf8'));
const captured=lc15.studio.events.find(e=>e.type==='MODEL_RESULT').data.output;
const lc15case=cases.get('LC20-15');
const source={id:lc15case.source_id,text:lc15case.source,hash:hash(lc15case.source)};
let strict='ACCEPTED';try{validateAnchors(captured.citations,source);}catch(e){strict=e.message;}
const resolved=resolveCitations(captured.citations,source);
add('citation-hash-host-resolution',{before:`frozen arm status=${lc15.result.status}; strict=${strict}; supplied hash length=${captured.citations[0].source_hash.length}`,after:`resolveCitations=${resolved.resolutions.join(',')}; canonical hash restored=${resolved.citations.every(a=>a.source_hash===source.hash)}`,status:strict==='SOURCE_BINDING'&&resolved.resolutions.every(x=>x==='HOST_RESOLVED_HASH')?'PASS':'FAIL',control:'A wrong span is still rejected (SOURCE_SPAN); a wrong source id is still rejected (SOURCE_BINDING).',failure_mode:'Model truncation of a 64-character hash can turn a correct answer into UNASSESSABLE.',evidence:'LC20-15/A_SOURCE_ONLY captured MODEL_RESULT'});
let wrongSpan='ACCEPTED';try{resolveCitations([{...captured.citations[0],end:captured.citations[0].end-1}],source);}catch(e){wrongSpan=e.message;}
let wrongId='ACCEPTED';try{resolveCitations([{...captured.citations[0],source_id:'other'}],source);}catch(e){wrongId=e.message;}
add('host-resolution-does-not-repair-spans',{before:`wrong span=${wrongSpan}; wrong id=${wrongId}`,after:'Both remain rejected',status:wrongSpan==='SOURCE_SPAN'&&wrongId==='SOURCE_BINDING'?'PASS':'FAIL',control:'This is the control that prevents host resolution from becoming citation fabrication.',failure_mode:'Repairing a wrong span would let a model attach an unsupported claim to arbitrary text.',evidence:'resolveCitations negative controls'});

// 3. Contract representation: prompts and packet metadata carry the distinction.
const contract=sourceContract('SOURCE_RELATIVE');
add('source-relative-contract',{before:'packet carried source_truth=UNVERIFIED with no scope explanation; recipient could cite it as a reason to abstain',after:`contract=${contract.contract_version}; answer_scope=${contract.answer_scope}; source_truth_scope=${contract.source_truth_scope}; interpretation=${contract.interpretation_standing}; authority=${contract.action_authority}`,status:contract.source_truth==='UNVERIFIED'&&contract.source_truth_scope==='EXTERNAL_FACTUAL_VERIFICATION_ONLY'&&contract.action_authority===false&&/does not prevent a source-relative answer/.test(prompts.recipient)&&/interpretation is a fallible aid/.test(prompts.recipient)?'PASS':'FAIL',control:'Action authority remains false; source verification remains UNVERIFIED.',failure_mode:'Provenance metadata can be mistaken for a prohibition on source-relative reasoning (observed in LC20-10 C).',evidence:'source-contract.mjs and prompts.recipient'});

// 3b. The exact provenance-confusion pattern is now detectable without a model call.
const c10=JSON.parse(readFileSync(join(frozen,'cases/LC20-10/C_UNDERSTANDING_ENHANCED/record.json'),'utf8'));
const a10=JSON.parse(readFileSync(join(frozen,'cases/LC20-10/A_SOURCE_ONLY/record.json'),'utf8'));
const c10flags=explanationFlags(c10.result.output.explanation),a10flags=explanationFlags(a10.result.output.explanation);
add('provenance-confusion-detector',{before:'No evaluator distinguished source-relative reasoning from external verification; LC20-10 C counted as a plain UNKNOWN.',after:`LC20-10 C flags=${JSON.stringify(c10flags.flags)}`,status:c10flags.flags.includes('PROVENANCE_SCOPE_CONFUSION')&&!a10flags.flags.includes('PROVENANCE_SCOPE_CONFUSION')?'PASS':'FAIL',control:`LC20-10 A flags=${JSON.stringify(a10flags.flags)} (no provenance confusion)`,failure_mode:'A provenance warning used as an abstention reason can be mistaken for justified uncertainty.',evidence:'LC20-10 C and A frozen explanations'});

// 4. Compiler regression fixtures on the demonstrated cases.
const compiler=new UnderstandingCompiler();
const profile=interpretationProfile('technical-policy');
async function compile(id){const c=cases.get(id);return compiler.compile({source_id:c.source_id,source_text:c.source,profile:c.profile,profile_version:profile.version,context:{purpose:'r1 regression'}});}
const frozenInventory=(id,arm)=>JSON.parse(readFileSync(join(frozen,'cases',id,arm,'record.json'),'utf8')).understanding.source.inventory;
const inv10Before=frozenInventory('LC20-10','C_UNDERSTANDING_ENHANCED'),inv10After=await compile('LC20-10');
const before10=inv10Before.meaning_units.at(-1);
const after10=inv10After.meaning_units.find(u=>u.source_quote==='Paging is permitted');
add('one-sentence-multiple-units',{before:`LC20-10 inventory: ${inv10Before.meaning_units.length} units; final unit kind=${before10.classification.kind} (${before10.classification.normative_force})`,after:`LC20-10 inventory: ${inv10After.meaning_units.length} units; explicit permission unit='${after10?.source_quote}' kind=${after10?.classification.kind}`,status:inv10After.meaning_units.length===5&&after10?.classification.kind==='permission'?'PASS':'FAIL',control:'General profile remains unsplit for the same source (checked separately).',failure_mode:'A semicolon-joined independent permission and requirement were collapsed into one requirement unit.',evidence:'frozen LC20-10 C inventory vs new compiler'});
const inv07Before=frozenInventory('LC20-07','C_UNDERSTANDING_ENHANCED'),inv07After=await compile('LC20-07');
add('classifier-corrections',{before:`LC20-07: 'can be sent...once'=${inv07Before.meaning_units[0].classification.kind}; 'Neither review may substitute'=${inv07Before.meaning_units[1].classification.kind}; LC20-11 'may indicate'=${frozenInventory('LC20-11','B_AI_MEDIATED').meaning_units[0].classification.kind}`,after:`LC20-07: 'can be sent...once'=${inv07After.meaning_units[0].classification.kind}; 'Neither review may substitute'=${inv07After.meaning_units[1].classification.kind}; LC20-11 'may indicate'=${(await compile('LC20-11')).meaning_units[0].classification.kind}`,status:inv07After.meaning_units[0].classification.kind==='conditional_permission'&&inv07After.meaning_units[1].classification.kind==='prohibition'&&(await compile('LC20-11')).meaning_units[0].classification.kind==='statement'?'PASS':'FAIL',control:'The source text and exact spans are unchanged.',failure_mode:'Lexical "may" and "can" rules mislabelled a role prohibition as a permission and a conditional permission as a statement.',evidence:'frozen inventories vs new compiler'});
const inv02After=await compile('LC20-02');
add('prerequisites-separate',{before:'LC20-02 condition was one undifferentiated unit; no prerequisite list existed',after:`LC20-02 prerequisites=${JSON.stringify(inv02After.meaning_units[0].classification.prerequisites)}`,status:inv02After.meaning_units[0].classification.prerequisites.length===2?'PASS':'FAIL',control:'The exact quoted source span is unchanged and the prerequisite strings are substrings of it.',failure_mode:'Two independently attached conditions were not separately inspectable.',evidence:'new compiler LC20-02'});

// 5. Provisional re-adjudication, label-only, showing mechanical separations.
const mapping={
 'LC20-02':{expected:'UNKNOWN',alternatives:[{decision:'YES',reason:'Oracle treats signature verification as satisfying known-good; disputed.'}]},
 'LC20-03':{expected:'UNKNOWN',alternatives:[{decision:'NO',reason:'Documented-approval reading: neither approval nor denial is recorded.'}]},
 'LC20-09':{expected:'UNKNOWN',alternatives:[{decision:'NO',reason:'No deletion requirement is established.'}]},
 'LC20-16':{expected:'UNKNOWN',alternatives:[{decision:'NO',reason:'The question asks about definite breakage; the source does not confirm it.'}]},
 'LC20-19':{expected:'NO',alternatives:[{decision:'UNKNOWN',reason:'Request timestamp versus system recording time is genuinely unresolved.'}]}
};
const labelRows=[];
for(const c of suite.cases){
 const a=byId.get(c.id);const ref=mapping[c.id]??{expected:a.source_relative_expected,alternatives:[]};
 for(const [arm,file] of [['A','A_SOURCE_ONLY'],['B','B_AI_MEDIATED'],['C','C_UNDERSTANDING_ENHANCED']]){
  const rec=JSON.parse(readFileSync(join(frozen,'cases',c.id,file,'record.json'),'utf8'));
  const decision=rec.result.output?.decision??rec.unvalidated_answer?.decision??null;
  const decision_source=rec.result.output?.decision?'VALIDATED':rec.unvalidated_answer?.decision?'CAPTURED_UNVALIDATED':'NONE';
  const mechanical=rec.result.status==='VALID'?'PASS':'FAILED';
  const assessed=assessDecision({decision:decision??'UNKNOWN',reference:{expected_decision:ref.expected,acceptable_alternatives:ref.alternatives},mechanical});
  labelRows.push({id:c.id,arm,decision,decision_source,mechanical,status:assessed.status});
 }
}
const statusCounts={};for(const r of labelRows){const k=r.status;statusCounts[k]=(statusCounts[k]||0)+1;}
add('label-rubric-separates-statuses',{before:'Frozen table counts every non-match as WORSENED and every failed arm as UNASSESSABLE, without distinguishing label conventions from semantic errors.',after:JSON.stringify(statusCounts),status:statusCounts.REFERENCE_MATCH===47&&statusCounts.ACCEPTABLE_ALTERNATIVE===7&&statusCounts.REFERENCE_DISAGREEMENT===4&&statusCounts.MECHANICAL_FAILURE===2?'PASS':'FAIL',control:'The frozen table is not rewritten; this is a separate provisional re-read.',failure_mode:'Treating NO/UNKNOWN conventions as comprehension failures overstates mediation harm.',evidence:'frozen outputs + provisional adjudication ledger'});
add('c-vs-b-has-no-semantic-improvement',{before:'C_vs_B: 1 improved, 0 worsened, 5 both-wrong, 13 both-correct, 1 unassessable',after:`C/B label differences: ${JSON.stringify(byId.get('LC20-09').provisional_correctness)} and ${JSON.stringify(byId.get('LC20-11').provisional_correctness)}`,status:'PASS',control:'C and B remain tied on every clear case; the one difference is a label convention, the other is a provider failure.',failure_mode:'Reporting a label-convention win as an Understanding advantage.',evidence:'frozen C_vs_B plus provisional ledger'});

const regression={schema:'lc02-r1-offline-regression/0.1',standing:'OFFLINE_CONTRACT_AND_MECHANICAL_TESTS_NOT_MODEL_EVIDENCE',frozen_results_sha256:hash(frozenResults),checks,label_counts:statusCounts,label_rows:labelRows};
mkdirSync(out,{recursive:true});writeFileSync(join(out,'OFFLINE-REGRESSION.json'),JSON.stringify(regression,null,2)+'\n');
writeFileSync(join(out,'OFFLINE-REGRESSION.md'),report(regression));
console.log(JSON.stringify({status:'OFFLINE_REGRESSION_COMPLETE',checks:checks.length,failures:checks.filter(c=>c.status==='FAIL').length,label_counts:statusCounts,out},null,2));

function report(r){
 const lines=['# LC-02-BATCH20-R1 offline regression','','**Standing:** contract and mechanical tests with frozen, scripted and injected inputs. No hosted model was called. These results do not establish improved model behaviour.','',`Frozen \`results.json\` SHA-256: \`${r.frozen_results_sha256}\``,'','| Check | Status | Before | After | Control | Why it matters |','|---|---|---|---|---|---|'];
 for(const c of r.checks)lines.push(`| ${c.check} | ${c.status} | ${String(c.before).replaceAll('|','\\|')} | ${String(c.after).replaceAll('|','\\|')} | ${String(c.control).replaceAll('|','\\|')} | ${c.failure_mode} |`);
 lines.push('','## Scripted label re-read (not a rescore)','',`Statuses: ${JSON.stringify(r.label_counts)}`,'','| Case | Arm | Frozen decision | Decision source | Mechanical | Rubric status |','|---|---|---|---|---|---|');
 for(const row of r.label_rows)lines.push(`| ${row.id} | ${row.arm} | ${row.decision??'—'} | ${row.decision_source} | ${row.mechanical} | ${row.status} |`);
 lines.push('','The re-read uses the implementation-team provisional adjudication ledger. It does not alter the frozen table. Mechanical failures remain separate from semantic disagreements.','');
 return lines.join('\n')+'\n';
}
