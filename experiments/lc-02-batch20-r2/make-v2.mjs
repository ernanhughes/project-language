import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const v1Path='experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json';
const v2Path='experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json';
if(existsSync(v2Path))throw Error('V2_ALREADY_EXISTS');
const v1=JSON.parse(readFileSync(v1Path,'utf8'));
const v2=structuredClone(v1);
v2.id='LC-02-R1-FRESH-2026-10-V2';
v2.version=2;
v2.supersedes={id:v1.id,design_sha256:v1.freeze.design_sha256,status:'FROZEN_NOT_RUN_SUPERSEDED_BY_V2'};
v2.status_note='V2 corrects three question-form ambiguities identified in the blind review of V1. V1 remains frozen and unrun. The corrections change only R1E-04, R1E-08 and R1E-16; the other thirteen cases are unchanged.';
v2.change_log=[
 {case_id:'R1E-04',reason:'Both reviewers noted that the word "unambiguously" permits a reasonable NO answer even though they chose SOURCE_CONFLICT.',before:'Does the excerpt unambiguously permit deleting expired drafts after the retention review?',after:'What is the status of deleting expired drafts after the retention review under the excerpt?'},
 {case_id:'R1E-08',reason:'Reviewer B was uncertain whether the dashboard statement described the current episode; the source now says "currently shows".',before:'The dashboard shows 9 uninterrupted minutes above 20 seconds.',after:'The dashboard currently shows 9 uninterrupted minutes above 20 seconds.'},
 {case_id:'R1E-16',reason:'Both reviewers noted that the yes/no form "May the auditor access" permits NO or UNKNOWN even though they chose SOURCE_CONFLICT.',before:'May the auditor access the log archive under this document?',after:'What is the status of auditor access to the log archive under this document?'}
];
v2.pre_run_approval_status='PENDING_RE_REVIEW_OF_CHANGED_CASES';
v2.freeze={...v2.freeze,design_sha256:null,supersedes_design_sha256:v1.freeze.design_sha256,note:'The hash is computed over this design with the design_sha256 field removed. V2 changes only R1E-04, R1E-08 and R1E-16; all other content is carried from V1.'};
const c4=v2.cases.find(c=>c.id==='R1E-04');
c4.question='What is the status of deleting expired drafts after the retention review under the excerpt?';
c4.required_reasoning=[
 'The excerpt contains both a permission to delete expired drafts after the retention review and a prohibition on deleting any expired draft.',
 'The two provisions have the same effective date and the excerpt supplies no precedence rule.',
 'The status is therefore an unresolved conflict, not a single permission or prohibition.'
];
c4.why_one_label='The question asks for the status. The excerpt supplies two equal-standing contradictory provisions and no precedence rule, so the status is SOURCE_CONFLICT.';
const c8=v2.cases.find(c=>c.id==='R1E-08');
c8.source=c8.source.replace('The dashboard shows 9 uninterrupted minutes above 20 seconds.','The dashboard currently shows 9 uninterrupted minutes above 20 seconds.');
c8.source_evidence_quotes=c8.source_evidence_quotes.map(q=>q.replace('9 uninterrupted minutes above 20 seconds','9 uninterrupted minutes above 20 seconds'));
c8.required_reasoning[1]='The dashboard currently shows 9 uninterrupted minutes above 20 seconds, which satisfies the threshold.';
const c16=v2.cases.find(c=>c.id==='R1E-16');
c16.question='What is the status of auditor access to the log archive under this document?';
c16.required_reasoning=[
 'Clause 7 permits auditor access to the log archive.',
 'Clause 9, with the same effective date, prohibits the same access.',
 'The document expressly denies precedence, so the status is an unresolved conflict.'
];
c16.why_one_label='The question asks for the status. The document supplies two equal-standing contradictory provisions and no precedence rule, so the status is SOURCE_CONFLICT.';
const body={...v2,freeze:{...v2.freeze,design_sha256:null}};
v2.freeze.design_sha256=hash(body);
// Validate exact quotes after the edits.
for(const c of v2.cases){for(const q of c.source_evidence_quotes??[])if(!c.source.includes(q))throw Error('V2_QUOTE '+c.id+' '+q);}
writeFileSync(v2Path,JSON.stringify(v2,null,2)+'\n');
console.log(JSON.stringify({status:'V2_FROZEN',v1:v1.freeze.design_sha256,v2:v2.freeze.design_sha256,changed:v2.change_log.map(x=>x.case_id),pre_run_approval_status:v2.pre_run_approval_status},null,2));
