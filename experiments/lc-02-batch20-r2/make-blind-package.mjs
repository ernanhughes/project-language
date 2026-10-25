import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i++){const key=args[i];if(['--design','--out','--ids'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))opts[key]=args[++i];else throw Error('UNKNOWN_OR_MISSING_ARGUMENT '+key);}
const designPath=resolve(opts['--design']??'experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json');
const design=JSON.parse(readFileSync(designPath,'utf8'));
const only=opts['--ids']?String(opts['--ids']).split(',').map(x=>x.trim()).filter(Boolean):null;
const selected=only?design.cases.filter(c=>only.includes(c.id)):design.cases;
if(only&&selected.length!==only.length)throw Error('BLIND_PACKAGE_UNKNOWN_CASE_ID');
const out=resolve(opts['--out']??'experiments/lc-02-batch20-r2/blind');
mkdirSync(join(out,'cases'),{recursive:true});
const scopes={
 SOURCE_RELATIVE:'Answer only from the supplied communication. This question asks what the communication states, permits, prohibits, requires or leaves unresolved.',
 EXTERNAL_FACTUAL_VERIFICATION:'The question asks about the external world, not only about what the supplied communication says. The communication may assert something without establishing that it is true in reality.',
 ACTION_AUTHORITY:'The question asks whether an actual actor or system may execute an operation now. A communication that describes a permission does not by itself grant the reader action authority.'
};
const labels={
 YES:'The source states or entails the proposition.',
 NO:'The source states its negation, expressly prohibits it, or does not establish the requested permission or condition. Say which reading applies.',
 UNKNOWN:'The source leaves a question-relevant fact, condition or authority unresolved, or contains a genuine ambiguity that the text does not settle.',
 SOURCE_CONFLICT:'The source contains unresolved contradictory provisions of equal standing and supplies no precedence rule.'
};
const forbidden=['expected_decision','acceptable_alternatives','required_reasoning','source_evidence_quotes','why_one_label','case_class','c_difference_probe','A_SOURCE_ONLY','B_AI_MEDIATED','C_UNDERSTANDING_ENHANCED','hypothesis','Language superiority'];
const lines=[];
lines.push(`# Independent reader review — ${selected.length} communications`,'');
lines.push('**Reviewer ID:** ______________________','');
lines.push('**Standing:** independent reader review. This package contains no expected answer, experimental-arm information or previous model output. Please do not consult the repository or any other file. Answer only from the communication and question shown.','');
lines.push('## How to answer','');
lines.push('For each case, choose exactly one label: **YES**, **NO**, **UNKNOWN** or **SOURCE_CONFLICT**. Then write a short explanation, quote the exact source passage(s) you relied on, rate your confidence from 1 (very low) to 5 (very high), and note any ambiguity you think a reasonable reader could defend.','');
lines.push('### Label meanings','');
for(const [k,v] of Object.entries(labels))lines.push(`- **${k}:** ${v}`);
lines.push('','### Question scopes','');
for(const [k,v] of Object.entries(scopes))lines.push(`- **${k}:** ${v}`);
lines.push('','### Output','');
lines.push('Return the completed JSON object using the companion `response-template.json`. Do not add fields that reveal another reviewer’s answer. If you are a model-based reviewer, say so in `reviewer_standing`; your judgment is provisional, not human independent adjudication.','');
for(const c of selected){
 const scope=scopes[c.scope];
 const block=[];
 block.push(`## ${c.id}`,'');
 block.push(`**Declared context:** synthetic ${c.domain} communication.`,'');
 block.push(`**Question scope:** ${c.scope} — ${scope}`,'');
 block.push('**Communication:**','');
 block.push('```text',c.source,'```','');
 block.push('**Question:** '+c.question,'');
 block.push('**Answer:** ☐ YES  ☐ NO  ☐ UNKNOWN  ☐ SOURCE_CONFLICT','');
 block.push('**Explanation:**','');
 block.push('____________________________________________________________________________','');
 block.push('**Exact source passage(s) relied on:**','');
 block.push('____________________________________________________________________________','');
 block.push('**Confidence (1–5):** ____','');
 block.push('**Suspected ambiguity (if any):**','');
 block.push('____________________________________________________________________________','');
 block.push('');
 lines.push(block.join('\n'));
 writeFileSync(join(out,'cases',c.id+'.md'),block.join('\n'));
}
writeFileSync(join(out,'reviewer-package.md'),lines.join('\n'));
const template={schema:'language-blind-review-response/1.0',reviewer_id:null,reviewer_standing:'HUMAN_INDEPENDENT_REVIEWER_OR_MODEL_BASED_PROVISIONAL',reviewed_at:null,cases:selected.map(c=>({case_id:c.id,decision:null,explanation:'',citations:[],confidence:null,suspected_ambiguity:'',notes:''}))};
writeFileSync(join(out,'response-template.json'),JSON.stringify(template,null,2)+'\n');
writeFileSync(join(out,'README.md'),'# Blind review package\n\nThis directory contains reviewer-facing material only: original communications, questions, declared context, question scope, answer choices and blank response fields. It contains no expected labels, arm identities, hypothesis or previous model outputs.\n\nGive `reviewer-package.md` (or the per-case files) and `response-template.json` to each reviewer. Each reviewer must work independently.\n\nFor **human independent review**, save the completed files as `../reviews/human-a.json` and `../reviews/human-b.json`, then run `../compare-human-reviews.mjs`. Do not show the reviewers `../reviews/` or any expected labels before both are complete.\n\nFor **model-based provisional review**, save as `../reviews/reviewer-a.json` and `../reviews/reviewer-b.json` and run `../compare-reviews.mjs`; label the findings provisional, not human adjudication.\n\nDo not add expected answers to this directory. Do not show one reviewer the other reviewer’s response before both are complete.\n');
const packageText=readFileSync(join(out,'reviewer-package.md'),'utf8');
for(const token of forbidden)if(packageText.includes(token))throw Error('BLIND_PACKAGE_LEAK '+token);
const manifest={schema:'lc02-r2-blind-package/0.1',design_sha256:design.freeze.design_sha256,package_sha256:hash(packageText),cases:selected.map(c=>c.id),contains_expected_labels:false,contains_arm_identities:false,contains_previous_outputs:false};
writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'BLIND_PACKAGE_READY',cases:selected.length,package_sha256:manifest.package_sha256,out},null,2));
