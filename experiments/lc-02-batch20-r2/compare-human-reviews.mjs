import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){const key=args[i];if(['--a','--b','--design','--out'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);}
const designPath=resolve(opts['--design']??'experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json');
const design=JSON.parse(readFileSync(designPath,'utf8'));
const aPath=resolve(opts['--a']??''),bPath=resolve(opts['--b']??'');if(!opts['--a']||!opts['--b'])throw Error('TWO_REVIEW_PATHS_REQUIRED');
const out=resolve(opts['--out']??'experiments/lc-02-batch20-r2/reviews/HUMAN-COMPARISON.json');
const A=JSON.parse(readFileSync(aPath,'utf8')),B=JSON.parse(readFileSync(bPath,'utf8'));
const labels=new Set(['YES','NO','UNKNOWN','SOURCE_CONFLICT']);
const byId=new Map(design.cases.map(c=>[c.id,c]));
if(A.cases?.length!==16||B.cases?.length!==16)throw Error('BOTH_REVIEWS_MUST_HAVE_16_CASES');
const rows=design.cases.map(c=>{
 const a=A.cases.find(x=>x.case_id===c.id),b=B.cases.find(x=>x.case_id===c.id);
 if(!a||!b)throw Error('REVIEW_CASE_MISSING '+c.id);
 for(const x of [a,b]){if(!labels.has(x.decision))throw Error('REVIEW_LABEL '+c.id);if(!x.explanation?.trim()||!x.citations?.length)throw Error('REVIEW_SUPPORT '+c.id);if(!Number.isInteger(x.confidence)||x.confidence<1||x.confidence>5)throw Error('REVIEW_CONFIDENCE '+c.id);}
 const ambiguityA=String(a.suspected_ambiguity??'').trim(),ambiguityB=String(b.suspected_ambiguity??'').trim();
 const flags=[];
 if(ambiguityA&&!/^none\b/i.test(ambiguityA))flags.push('A:AMBIGUITY_REPORTED');
 if(ambiguityB&&!/^none\b/i.test(ambiguityB))flags.push('B:AMBIGUITY_REPORTED');
 if(a.confidence<=2)flags.push('A:LOW_CONFIDENCE');if(b.confidence<=2)flags.push('B:LOW_CONFIDENCE');
 return {id:c.id,expected:c.expected_decision,A:a.decision,B:b.decision,agreement:a.decision===b.decision?'AGREE':'DISAGREE',match:{A:a.decision===c.expected_decision,B:b.decision===c.expected_decision},confidence:{A:a.confidence,B:b.confidence},ambiguity:{A:ambiguityA,B:ambiguityB},flags};
});
const disagreements=rows.filter(r=>r.agreement==='DISAGREE');
const result={schema:'lc02-r2-human-review-comparison/0.1',standing:'HUMAN_INDEPENDENT_REVIEW_COMPARISON_NOT_MODEL_EVIDENCE',design_sha256:design.freeze.design_sha256,review_hashes:{A:hash(readFileSync(aPath,'utf8')),B:hash(readFileSync(bPath,'utf8'))},reviewer_standing:{A:A.reviewer_standing,B:B.reviewer_standing},agreements:rows.length-disagreements.length,disagreements:disagreements.length,disagreement_cases:disagreements.map(r=>r.id),reference_matches:{A:rows.filter(r=>r.match.A).length,B:rows.filter(r=>r.match.B).length,total:rows.length},flagged:rows.filter(r=>r.flags.length).map(r=>({id:r.id,flags:r.flags})),rows,go_no_go:disagreements.length?'REVIEW_DISAGREEMENT_RESOLVE_BEFORE_LIVE':'READY_FOR_PROTOCOL_APPROVAL_DECISION'};
writeFileSync(out.replace(/\.json$/,'.json'),JSON.stringify(result,null,2)+'\n');
const lines=['# Human review comparison','', '**Standing:** human independent review comparison. Reviewers did not see each other’s answers or the model-based preflight reviews.','', `- Design: \`${design.freeze.design_sha256}\``, `- Reviewer A hash: \`${result.review_hashes.A}\``, `- Reviewer B hash: \`${result.review_hashes.B}\``, `- Agreement: ${result.agreements}/16; disagreements: ${result.disagreements}`, `- Reference matches (post-review): A ${result.reference_matches.A}/16, B ${result.reference_matches.B}/16`, '', '| Case | Expected | A | B | Agreement | A conf. | B conf. | Flags |','|---|---|---|---|---|---:|---:|---|',...rows.map(r=>`| ${r.id} | ${r.expected} | ${r.A} | ${r.B} | ${r.agreement} | ${r.confidence.A} | ${r.confidence.B} | ${r.flags.join(', ')||'—'} |`),'','## Decision','',`**${result.go_no_go}.** ${disagreements.length?'Resolve the disagreeing cases before approving the live run.':'No label disagreement. Check the flagged ambiguity notes before approving the live run.'}`,''];
writeFileSync(out.replace(/\.json$/,'.md'),lines.join('\n'));
console.log(JSON.stringify({status:'HUMAN_REVIEWS_COMPARED',agreements:result.agreements,disagreements:result.disagreements,reference_matches:result.reference_matches,go_no_go:result.go_no_go,out},null,2));
