import {readFileSync,writeFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const j=p=>JSON.parse(readFileSync(p,'utf8'));
const v1=j('experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json');
const v2=j('experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json');
const blindV1=j('experiments/lc-02-batch20-r2/blind/manifest.json');
const blindV2=j('experiments/lc-02-batch20-r2/blind-v2/manifest.json');
const deltaPackage=j('experiments/lc-02-batch20-r2/blind-v2-delta/manifest.json');
const reviewsV1=j('experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-COMPARISON.json');
const reviewsV2=j('experiments/lc-02-batch20-r2/reviews/BLIND-REVIEW-V2-DELTA.json');
const dryV2=j('experiments/lc-02-batch20-r2/.runs/DRY-RUN-V2-001/mechanical-checks.json');
const dryV1=j('experiments/lc-02-batch20-r2/.runs/DRY-RUN-002/mechanical-checks.json');
const failure=j('experiments/lc-02-batch20-r2/.runs/FAILURE-CONTROL-V2-001/failure-control.json');
const compiler=j('experiments/lc-02-batch20-r2/COMPILER-QUALIFICATION.json');
const protocol=j('experiments/lc-02-batch20-r2/FROZEN-LIVE-PROTOCOL.json');
const status={
 schema:'lc02-r2-preflight-status/0.1',
 standing:'OFFLINE_PREFLIGHT_NOT_LIVE_EVIDENCE',
 created:'2026-10-23',
 design:{v1:{path:'experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json',sha256:v1.freeze.design_sha256,status:v1.execution_status},v2:{path:'experiments/lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json',sha256:v2.freeze.design_sha256,version:v2.version,status:v2.execution_status,pre_run_approval_status:v2.pre_run_approval_status}},
 blind_review:{v1:{package_sha256:blindV1.package_sha256,review_hashes:reviewsV1.review_hashes,agreement:reviewsV1.agreements+'/16',disagreements:reviewsV1.disagreements,reference_matches:reviewsV1.reference_comparison,reviewer_standing:reviewsV1.reviewer_standing},v2_full:{package_sha256:blindV2.package_sha256,cases:16,review_status:'READY_FOR_HUMAN_INDEPENDENT_REVIEW'},v2_delta:{package_sha256:deltaPackage.package_sha256,review_hashes:reviewsV2.review_hashes,agreement:reviewsV2.agreements+'/3',disagreements:reviewsV2.disagreements,reference_matches:reviewsV2.reference_matches,reviewer_standing:reviewsV2.standing,residual_issue:reviewsV2.residual_issue},human_independent_review:false,limitation:'All reviewers were model-based provisional reviewers, not independent human adjudication.'},
 dry_run:{v2:{path:'experiments/lc-02-batch20-r2/.runs/DRY-RUN-V2-001',checks:dryV2.checks.length,passed:dryV2.checks.filter(c=>c.status==='PASS').length,failed:dryV2.checks.filter(c=>c.status!=='PASS').length,scripted_requests:80,hosted_requests:0},v1:{path:'experiments/lc-02-batch20-r2/.runs/DRY-RUN-002',checks:dryV1.checks.length,passed:dryV1.checks.filter(c=>c.status==='PASS').length,failed:dryV1.checks.filter(c=>c.status!=='PASS').length}},
 failure_control:{path:'experiments/lc-02-batch20-r2/.runs/FAILURE-CONTROL-V2-001/failure-control.json',results:failure.results},
 compiler:{trained_syntax_available:compiler.trained_syntax_available,engine:compiler.engine.id,fallback_reason:compiler.fallback_reason,qualification:'experiments/lc-02-batch20-r2/COMPILER-QUALIFICATION.json'},
 frozen_protocol:{path:'experiments/lc-02-batch20-r2/FROZEN-LIVE-PROTOCOL.json',hash:protocol.hash,authorized:protocol.live_execution_authorized},
 request_plan:{planned_hosted_calls:80,absolute_request_ceiling:100,hosted_requests_so_far:0},
 go_no_go:'NO_GO_PENDING_HUMAN_INDEPENDENT_REVIEW',
 live_execution_authorized:false,
 blockers:['Human independent review of V2 (two model-based reviewers are not sufficient)','Explicit V2 pre-run approval','Trained spaCy decision: install manually or label the run BLANK_ENGLISH_FALLBACK'],
 notes:['Mechanical dry run is qualified.','An earlier V1 dry run (DRY-RUN-001) exposed two harness-check defects; DRY-RUN-002 is the corrected control and is retained alongside it.','No Language experiment provider call was made.','V2 changed only R1E-04, R1E-08 and R1E-16; the V2 delta review agreed 3/3 and matched 3/3.','Residual modal-priority debate remains in the conflict cases; both delta reviewers still chose SOURCE_CONFLICT with high confidence.']
};
status.hash=hash(status);
writeFileSync('experiments/lc-02-batch20-r2/PREFLIGHT-STATUS.json',JSON.stringify(status,null,2)+'\n');
console.log(JSON.stringify({status:'PREFLIGHT_STATUS_WRITTEN',go_no_go:status.go_no_go,blockers:status.blockers,hash:status.hash},null,2));
