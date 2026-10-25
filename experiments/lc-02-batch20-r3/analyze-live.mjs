import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {explanationFlags} from '../../apps/language-demo/evaluation/decision-rubric.mjs';

const arms=['A_SOURCE_ONLY','B_AI_MEDIATED','C_UNDERSTANDING_ENHANCED'];
const L={A_SOURCE_ONLY:'A',B_AI_MEDIATED:'B',C_UNDERSTANDING_ENHANCED:'C'};
const esc=x=>String(x??'').replaceAll('|','\\|').replace(/\s+/g,' ').trim();

export function analyzeLive(runDir){
 const data=JSON.parse(readFileSync(join(runDir,'results.json'),'utf8'));
 const scripts=data.standing.includes('SCRIPTED');
 const rows=data.rows;
 const flagged=rows.map(r=>{
  const flags=Object.fromEntries(arms.map(a=>[a,explanationFlags(r.arms[a]?.explanation??'').flags]));
  return {id:r.id,expected:r.expected,scope:r.scope,decisions:Object.fromEntries(arms.map(a=>[L[a],r.arms[a]?.decision??r.arms[a]?.status])),statuses:Object.fromEntries(arms.map(a=>[L[a],r.arms[a]?.status??'MISSING'])),correct:Object.fromEntries(arms.map(a=>[L[a],r.arms[a]?.correct??null])),flags,explanations:Object.fromEntries(arms.map(a=>[L[a],r.arms[a]?.explanation??''])),mechanical:Object.fromEntries(arms.map(a=>[L[a],r.arms[a]?.mechanical??null]))};
 });
 const unnecessary=flagged.filter(r=>['YES','NO'].includes(r.expected)&&r.correct.A===true&&['B','C'].some(a=>r.decisions[a]==='UNKNOWN')).map(r=>({id:r.id,expected:r.expected,decisions:r.decisions,flags:r.flags,note:'A answered the reference label; B/C abstained. Candidate for unnecessary uncertainty, requiring source-grounded review.'}));
 const missing=flagged.filter(r=>r.correct.A!==true&&['B','C'].some(a=>r.correct[a]===true)).map(r=>({id:r.id,expected:r.expected,decisions:r.decisions,flags:r.flags,note:'B/C reached the reference label while A did not. Candidate for genuine missing-condition detection, requiring source-grounded review.'}));
 const cOnlyBetter=flagged.filter(r=>r.statuses.B==='VALID'&&r.statuses.C==='VALID'&&r.correct.C===true&&r.correct.B!==true).map(r=>({id:r.id,expected:r.expected,decisions:r.decisions,flags:r.flags,note:'C correct, B not correct.'}));
 const cOnlyWorse=flagged.filter(r=>r.statuses.B==='VALID'&&r.statuses.C==='VALID'&&r.correct.B===true&&r.correct.C!==true).map(r=>({id:r.id,expected:r.expected,decisions:r.decisions,flags:r.flags,note:'B correct, C not correct.'}));
 const tiesCorrect=flagged.filter(r=>r.statuses.B==='VALID'&&r.statuses.C==='VALID'&&r.correct.B===true&&r.correct.C===true).map(r=>r.id);
 const tiesWrong=flagged.filter(r=>r.statuses.B==='VALID'&&r.statuses.C==='VALID'&&r.correct.B!==true&&r.correct.C!==true).map(r=>r.id);
 const mechanical=flagged.filter(r=>arms.some(a=>r.statuses[L[a]]!=='VALID')).map(r=>({id:r.id,statuses:r.statuses,note:'Mechanical failure or missing arm; not a semantic tie.'}));
 const flagCounts={};for(const r of flagged)for(const a of arms)for(const f of r.flags[L[a]]??[])flagCounts[f]=(flagCounts[f]||0)+1;
 const result={schema:'lc02-r3-live-analysis/0.1',standing:scripts?'SCRIPTED_DRY_RUN_ANALYSIS_NOT_MODEL_EVIDENCE':'EXPLORATORY_LIVE_UNADJUDICATED_PROVISIONAL_CANDIDATES',run_dir:runDir,source_standing:data.standing,paired:data.paired,totals:data.totals,flag_counts:flagCounts,unnecessary_abstention_candidates:unnecessary,missing_condition_candidates:missing,c_only_better:cOnlyBetter,c_only_worse:cOnlyWorse,ties_correct:tiesCorrect,ties_wrong:tiesWrong,mechanical_failures:mechanical,rows:flagged};
 writeFileSync(join(runDir,'LIVE-ANALYSIS.json'),JSON.stringify(result,null,2)+'\n');
 const lines=[`# ${scripts?'Scripted dry-run analysis':'Exploratory live analysis'}`,'',`**Standing:** ${result.standing}. ${scripts?'These are scripted controls, not model evidence.':'These are provisional candidates, not independent semantic adjudication.'}`,'',`- Source result standing: ${data.standing}`, `- Ties both correct: ${tiesCorrect.length}`, `- Ties both wrong: ${tiesWrong.length}`, `- C-only better: ${cOnlyBetter.length}`, `- C-only worse: ${cOnlyWorse.length}`, `- Mechanical failures: ${mechanical.length}`,'', '## Paired counts','','```json',JSON.stringify(data.paired,null,2),'```','','## Explanation flags','',`\`\`\`json\n${JSON.stringify(flagCounts,null,2)}\n\`\`\``,'','## Unnecessary-abstention candidates',''];if(!unnecessary.length)lines.push('None detected by the current flags.');else for(const r of unnecessary)lines.push(`- **${r.id}** — expected ${r.expected}; A/B/C ${r.decisions.A}/${r.decisions.B}/${r.decisions.C}; flags ${JSON.stringify(r.flags)}. ${r.note}`);lines.push('','## Missing-condition candidates','');if(!missing.length)lines.push('None detected by the current decision contrast.');else for(const r of missing)lines.push(`- **${r.id}** — expected ${r.expected}; A/B/C ${r.decisions.A}/${r.decisions.B}/${r.decisions.C}; flags ${JSON.stringify(r.flags)}. ${r.note}`);lines.push('','## C-only contributions and distortions','');lines.push(`- C better than B: ${cOnlyBetter.map(r=>r.id).join(', ')||'none'}`);lines.push(`- C worse than B: ${cOnlyWorse.map(r=>r.id).join(', ')||'none'}`);lines.push('','## Ties','');lines.push(`- Both correct: ${tiesCorrect.join(', ')||'none'}`);lines.push(`- Both wrong: ${tiesWrong.join(', ')||'none'}`);lines.push('','## Mechanical failures','');if(!mechanical.length)lines.push('None.');else for(const r of mechanical)lines.push(`- **${r.id}** — statuses ${JSON.stringify(r.statuses)}. ${r.note}`);lines.push('','## Case detail','','| Case | Expected | A | B | C | A flags | B flags | C flags |','|---|---|---|---|---|---|---|---|');for(const r of flagged)lines.push(`| ${r.id} | ${r.expected} | ${r.decisions.A} | ${r.decisions.B} | ${r.decisions.C} | ${(r.flags.A??[]).join(', ')||'—'} | ${(r.flags.B??[]).join(', ')||'—'} | ${(r.flags.C??[]).join(', ')||'—'} |`);lines.push('');
 writeFileSync(join(runDir,'LIVE-ANALYSIS.md'),lines.join('\n'));
 return result;
}

if(import.meta.url===`file://${process.argv[1]}`.replaceAll('\\','/')){
 const dir=process.argv[2];if(!dir)throw Error('Usage: node --experimental-transform-types analyze-live.mjs RUN_DIR');
 console.log(JSON.stringify({status:'ANALYSIS_WRITTEN',run_dir:dir,unnecessary:analyzeLive(dir).unnecessary_abstention_candidates.length},null,2));
}
