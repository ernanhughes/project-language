import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const v1=JSON.parse(readFileSync(new URL('../lc-02-batch20-r1/fixtures/fresh-evaluation-v1.json',import.meta.url),'utf8'));
const v2=JSON.parse(readFileSync(new URL('../lc-02-batch20-r1/fixtures/fresh-evaluation-v2.json',import.meta.url),'utf8'));

test('V1 remains frozen and V2 changes only the three reviewed cases',()=>{
 const v1body={...v1,freeze:{...v1.freeze,design_sha256:null}};
 assert.equal(v1.freeze.design_sha256,hash(v1body));
 assert.equal(v1.execution_status,'NOT_RUN');
 const v2body={...v2,freeze:{...v2.freeze,design_sha256:null}};
 assert.equal(v2.freeze.design_sha256,hash(v2body));
 assert.equal(v2.execution_status,'NOT_RUN');
 assert.equal(v2.version,2);
 const changed=v2.change_log.map(x=>x.case_id);
 assert.deepEqual(changed,['R1E-04','R1E-08','R1E-16']);
 for(const c of v2.cases){
  const old=v1.cases.find(x=>x.id===c.id);
  assert.ok(old,c.id);
  if(!changed.includes(c.id))assert.deepEqual(c,old,c.id);
 }
 assert.equal(v2.cases.find(c=>c.id==='R1E-04').question,'What is the status of deleting expired drafts after the retention review under the excerpt?');
 assert.equal(v2.cases.find(c=>c.id==='R1E-16').question,'What is the status of auditor access to the log archive under this document?');
 assert.match(v2.cases.find(c=>c.id==='R1E-08').source,/currently shows/);
});

test('V2 questions and quotes are internally exact',()=>{
 for(const c of v2.cases){
  for(const q of c.source_evidence_quotes)assert.ok(c.source.includes(q),`${c.id}: ${q}`);
  assert.ok(['YES','NO','UNKNOWN','SOURCE_CONFLICT'].includes(c.expected_decision),c.id);
 }
});

test('V2 design hash and blind/review artifacts are present',()=>{
 assert.equal(v2.freeze.supersedes_design_sha256,v1.freeze.design_sha256);
 assert.equal(v2.pre_run_approval_status,'PENDING_RE_REVIEW_OF_CHANGED_CASES');
 assert.ok(existsSync(new URL('./blind-v2/manifest.json',import.meta.url)));
 assert.ok(existsSync(new URL('./reviews/BLIND-REVIEW-V2-DELTA.json',import.meta.url)));
 assert.ok(existsSync(new URL('./.runs/DRY-RUN-V2-001/mechanical-checks.json',import.meta.url)));
 const checks=JSON.parse(readFileSync(new URL('./.runs/DRY-RUN-V2-001/mechanical-checks.json',import.meta.url),'utf8')).checks;
 assert.ok(checks.every(c=>c.status==='PASS'));
 const delta=JSON.parse(readFileSync(new URL('./reviews/BLIND-REVIEW-V2-DELTA.json',import.meta.url),'utf8'));
 assert.equal(delta.disagreements,0);
 assert.equal(delta.reference_matches.A2,3);
 assert.equal(delta.reference_matches.B2,3);
});

test('frozen live protocol hash is internally consistent and not authorized',()=>{
 const protocol=JSON.parse(readFileSync(new URL('./FROZEN-LIVE-PROTOCOL.json',import.meta.url),'utf8'));
 const {hash:stored,...body}=protocol;
 assert.equal(stored,hash(body));
 assert.equal(protocol.design.sha256,v2.freeze.design_sha256);
 assert.equal(protocol.live_execution_authorized,false);
 assert.deepEqual(protocol.blockers,['HUMAN_INDEPENDENT_REVIEW_OF_V2','V2_PRE_RUN_APPROVAL','TRAINED_SPACY_DECISION']);
 assert.equal(protocol.limits.planned_calls_total,80);
 assert.equal(protocol.limits.absolute_request_ceiling,100);
});

