import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {prompts} from '../../apps/language-demo/models/prompts.mjs';
import {HINT_INSTRUCTION} from '../../apps/language-demo/understanding/analysis.mjs';
import {sourceContract} from '../../apps/language-demo/protocol/source-contract.mjs';
import {UnderstandingCompiler,interpretationProfile} from '../../core/understanding/adapter.mjs';
import {loadSettings} from '../../apps/language-demo/server/settings.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));process.chdir(root);
const designPath='experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json';
const design=JSON.parse(readFileSync(designPath,'utf8'));
const blindV1=JSON.parse(readFileSync('experiments/lc-02-batch20-r2/blind/manifest.json','utf8'));
const blindV2=JSON.parse(readFileSync('experiments/lc-02-batch20-r2/blind-v2/manifest.json','utf8'));
const blindDelta=JSON.parse(readFileSync('experiments/lc-02-batch20-r2/blind-v2-delta/manifest.json','utf8'));
const reviewsV1=JSON.parse(readFileSync('experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-COMPARISON.json','utf8'));
const reviewsV2=JSON.parse(readFileSync('experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-V2-DELTA.json','utf8'));
const settings=loadSettings(resolve('apps/language-demo/.settings/studio-v2.json'));
const compiler=new UnderstandingCompiler({python:settings.understanding?.python_executable||undefined,timeout_ms:settings.understanding?.timeout_ms??15000});
const body={
 schema:'lc02-r2-frozen-live-protocol/0.1',
 standing:'PREFLIGHT_FROZEN_NOT_APPROVED_FOR_LIVE_EXECUTION',
 created:'2026-10-23',
 design:{path:designPath,sha256:design.freeze.design_sha256,version:design.version,status:design.execution_status},
 pre_run_approval_status:design.pre_run_approval_status,
 model_assignments:settings.roles,
 limits:{...settings.limits,planned_calls_per_case:5,planned_calls_total:80,absolute_request_ceiling:100,automatic_retries:0,fallback:false,resume:false},
 profiles:Object.fromEntries(['technical-policy','general'].map(id=>[id,interpretationProfile(id)])),
 compiler:compiler.identity(),
 prompt_hashes:{prompts_module:hash(readFileSync('apps/language-demo/models/prompts.mjs','utf8')),source_contract_module:hash(readFileSync('apps/language-demo/protocol/source-contract.mjs','utf8')),hint_instruction:hash(HINT_INSTRUCTION),...Object.fromEntries(['interpreter','mediator','challenger','recipient'].map(r=>[r,hash(prompts[r])]))},
 source_contract:sourceContract('SOURCE_RELATIVE'),
 case_hashes:design.cases.map(c=>({id:c.id,source_sha256:hash(c.source),question_sha256:hash(c.question),expected_decision:c.expected_decision,acceptable_alternatives:c.acceptable_alternatives,scope:c.scope,case_class:c.case_class})),
 treatment_differences:{
  A_ORDINARY:'Original source and exact question; no interpreter proposal and no compiler inventory.',
  B_AI_MEDIATED:'Interpreter proposal plus the same original source and exact question; interpreter receives no compiler inventory.',
  C_UNDERSTANDING_ENHANCED:'The same interpreter receives the versioned compiler inventory as fallible context; the recipient receives the proposal plus the same original source and exact question.',
  common:'Same source, question, question scope, recipient model, recipient contract, source-relative contract and answer schema in all arms.',
  not_token_matched:'B and C packets are not token matched; packet length and semantic structure are recorded as treatment variables.'
 },
 grading:{
  primary_comparison:'C versus B',
  secondary_comparisons:['B versus A','C versus A'],
  decision_agreement:'Exact label agreement with the frozen source-relative reference; acceptable alternatives are recorded separately and never silently converted to matches.',
  explanation_fidelity:'Required reasoning and unsupported additions are separate from label agreement; no label match establishes semantic fidelity.',
  uncertainty:'Correct UNKNOWN, unnecessary abstention and overconfident YES/NO are separate categories.',
  mechanical:'Schema, exact spans, host-resolved citation identifiers and provider completion are separate from semantic disagreement; failed arms are never ties.',
  adjudication_issues:'Cases with declared adjudication issues are reported, not silently rescored.'
 },
 preflight:{
  v1_blind_package_sha256:blindV1.package_sha256,
  v2_blind_package_sha256:blindV2.package_sha256,
  v2_delta_package_sha256:blindDelta.package_sha256,
  v1_review_agreement:reviewsV1.agreements+'/16',
  v1_reference_matches:reviewsV1.reference_comparison,
  v2_delta_agreement:reviewsV2.agreements+'/3',
  v2_delta_reference_matches:reviewsV2.reference_matches,
  reviewer_standing:'MODEL_BASED_PROVISIONAL_NOT_HUMAN',
  human_independent_review:false,
  residual_issue:reviewsV2.residual_issue
 },
 blockers:['HUMAN_INDEPENDENT_REVIEW_OF_V2','V2_PRE_RUN_APPROVAL','TRAINED_SPACY_DECISION'],
 live_execution_authorized:false
};
body.hash=hash(body);
writeFileSync('experiments/lc-02-batch20-r2/FROZEN-LIVE-PROTOCOL.json',JSON.stringify(body,null,2)+'\n');
console.log(JSON.stringify({status:'PROTOCOL_FROZEN',hash:body.hash,design:body.design.sha256,authorized:body.live_execution_authorized,blockers:body.blockers},null,2));
