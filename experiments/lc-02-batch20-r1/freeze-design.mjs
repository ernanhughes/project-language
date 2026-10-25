import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const root=resolve(new URL('../..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const path=resolve(root,'experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json');
const design=JSON.parse(readFileSync(path,'utf8'));
const labels=new Set(['YES','NO','UNKNOWN','SOURCE_CONFLICT']);
const scopes=new Set(['SOURCE_RELATIVE','EXTERNAL_FACTUAL_VERIFICATION','ACTION_AUTHORITY']);
const ids=new Set();
for(const c of design.cases){
 if(ids.has(c.id))throw Error('DUPLICATE_CASE '+c.id);ids.add(c.id);
 if(!labels.has(c.expected_decision))throw Error('BAD_LABEL '+c.id);
 if(!scopes.has(c.scope))throw Error('BAD_SCOPE '+c.id);
 if(!c.source?.trim()||!c.question?.trim())throw Error('EMPTY_CASE '+c.id);
 for(const q of c.source_evidence_quotes??[])if(!c.source.includes(q))throw Error('QUOTE_NOT_IN_SOURCE '+c.id+' '+q);
 if(!Array.isArray(c.acceptable_alternatives))throw Error('ALTERNATIVES '+c.id);
 for(const a of c.acceptable_alternatives){if(!labels.has(a.decision)||!a.reason?.trim())throw Error('BAD_ALTERNATIVE '+c.id);}
 if(!c.required_reasoning?.length)throw Error('REASONING_REQUIRED '+c.id);
 if(!c.why_one_label?.trim())throw Error('WHY_ONE_LABEL '+c.id);
}
if(design.execution_status!=='NOT_RUN')throw Error('DESIGN_MUST_NOT_HAVE_RUN');
const counts={};for(const c of design.cases)counts[c.expected_decision]=(counts[c.expected_decision]||0)+1;
const body={...design,freeze:{...design.freeze,design_sha256:null}};
body.freeze.design_sha256=hash(body);
writeFileSync(path,JSON.stringify(body,null,2)+'\n');
console.log(JSON.stringify({status:'DESIGN_FROZEN',cases:design.cases.length,counts,design_sha256:body.freeze.design_sha256},null,2));
