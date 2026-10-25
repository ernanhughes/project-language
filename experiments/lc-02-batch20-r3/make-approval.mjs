import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const dir='experiments/lc-02-batch20-r3';mkdirSync(dir,{recursive:true});
const designPath='experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json';
const r2ProtocolPath='experiments/lc-02-batch20-r2/FROZEN-LIVE-PROTOCOL.json';
const design=JSON.parse(readFileSync(designPath,'utf8'));
const r2=JSON.parse(readFileSync(r2ProtocolPath,'utf8'));
const approval={
 schema:'lc02-r3-exploratory-approval/0.1',
 approval_id:'LC-02-R3-V2-EXPLORATORY-2026-10-23',
 status:'PENDING_EXPLICIT_USER_APPROVAL',
 standing:'EXPLORATORY_APPROVAL_REQUEST',
 created:'2026-10-23',
 design:{path:designPath,sha256:design.freeze.design_sha256,version:design.version},
 r2_protocol:{path:r2ProtocolPath,hash:r2.hash,live_execution_authorized:false},
 requested_scope:{
  reference_review:'MODEL_BASED_PROVISIONAL_NOT_INDEPENDENT_HUMAN_ADJUDICATION',
  compiler_condition:'BLANK_ENGLISH_FALLBACK',
  research_standing:'EXPLORATORY_NOT_CONFIRMATORY',
  cases:'V2 frozen 16 cases',
  planned_calls:80,
  maximum_calls:100,
  automatic_retries:0,
  fallback:false,
  resume:false,
  one_execution:true,
  post_result_tuning:false,
  validation_claim:false
 },
 terms:[
  'The sixteen frozen V2 cases and their provisional references must not change.',
  'The compiler condition is BLANK_ENGLISH_FALLBACK; no spaCy model will be installed or downloaded.',
  'The run is exploratory and cannot establish validated semantic superiority or understanding.',
  'Exactly one live execution is authorized, with 80 planned calls and an absolute ceiling of 100.',
  'No automatic retries, fallback, resume or post-result tuning.',
  'All successful and failed requests must be preserved.',
  'A null or negative result is valid.',
  'Any positive result requires later confirmation on fresh unseen cases.'
 ],
 approved_by:null,
 approved_at:null,
 approval_statement:null,
 exploratory_live_authorized:false
};
approval.hash=hash(approval);
writeFileSync(`${dir}/EXPLORATORY-APPROVAL-V2.json`,JSON.stringify(approval,null,2)+'\n');
const protocol={
 schema:'lc02-r3-exploratory-protocol/0.1',
 standing:'EXPLORATORY_PROTOCOL_PENDING_APPROVAL',
 created:'2026-10-23',
 design:approval.design,
 r2_protocol:approval.r2_protocol,
 approval:{path:`${dir}/EXPLORATORY-APPROVAL-V2.json`,hash:approval.hash,status:approval.status},
 execution:{mode:'live',split:'fresh_evaluation',cases:16,planned_calls:80,maximum_calls:100,automatic_retries:0,fallback:false,resume:false,one_execution:true,post_result_tuning:false,output:'experiments/lc-02-batch20-r3/.runs/LIVE-V2-001'},
 compiler:{condition:'BLANK_ENGLISH_FALLBACK',trained_syntax_available:false,fallback_reason:'SPACY_MODEL_NOT_INSTALLED',profile:r2.profiles['technical-policy']},
 models:r2.model_assignments,
 prompts:r2.prompt_hashes,
 profiles:r2.profiles,
 source_contract:r2.source_contract,
 treatment_differences:r2.treatment_differences,
 grading:r2.grading,
 live_execution_authorized:false
};
protocol.hash=hash(protocol);
writeFileSync(`${dir}/EXPLORATORY-PROTOCOL-V2.json`,JSON.stringify(protocol,null,2)+'\n');
console.log(JSON.stringify({status:'R3_APPROVAL_PREPARED',approval_hash:approval.hash,protocol_hash:protocol.hash,approval_status:approval.status,live_execution_authorized:protocol.live_execution_authorized},null,2));
