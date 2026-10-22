import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDelivery,validateDelivery,sha256,ARMS,validateFixture} from './protocol.mjs';
import {mechanicalDiagnostic} from './analysis.mjs';
import {htmlForTraces} from './viewer.mjs';
const here=dirname(fileURLToPath(import.meta.url));
export const fixture=JSON.parse(readFileSync(resolve(here,'../fixtures/synthetic-policy-001.json'),'utf8'));
// DO NOT TREAT THESE AS MODEL RESULTS: hand-authored outputs demonstrate a trace format.
const mocks={
  PLAIN:{message:'Failed payments may be retried three times.',answer:'YES',explanation:'The summary permits three retries, so four total attempts may be allowed.'},
  LINKED:{message:'Non-idempotent payment requests: at most three total attempts including first; idempotent uses separate recovery; third-party timeouts unresolved; consult D-17 before change.',answer:'NO',explanation:'Non-idempotent payments have at most three total attempts. Idempotent requests use a separate path; third-party timeouts are unresolved. D-17 must be consulted.'},
  CONTEXT:{message:'Non-idempotent payment requests: at most three total attempts including first; idempotent uses separate recovery; third-party timeouts unresolved; consult D-17 before change.',answer:'NO',explanation:'For this implementation review, non-idempotent payments have at most three total attempts. Idempotent requests use a separate path; third-party timeouts are unresolved. D-17 must be consulted.'},
  SOURCE:{message:fixture.source,answer:'NO',explanation:'Non-idempotent requests permit only three total attempts; idempotent requests have a separate path, and timeout handling is unresolved. D-17 must be consulted.'}
};
export function generateTraces(f=fixture) {
  validateFixture(f);
  return ARMS.map(arm=>{
    const m=mocks[arm];
    const d=buildDelivery(f,arm,m.message);
    validateDelivery(f,d);
    const receiver={role:'AI_B_SCRIPTED_DOUBLE',answer:m.answer,explanation:m.explanation};
    const analysis=mechanicalDiagnostic(f,receiver);
    return {id:`${f.id}/${arm}`,schema:'language.transfer-trace/0.1',evidence:'SCRIPTED_DEMONSTRATION_NOT_AI_RESULT',case_id:f.id,arm,source_hash:sha256(f.source),source:f.source,question:f.question,reference_answer:f.reference_answer,obligations:f.obligations,history:f.history,current_context:f.current_context,taint_candidate:f.taint_candidate,sender:{role:'AI_A_SCRIPTED_DOUBLE',message:arm==='SOURCE'?'SOURCE_PASS_THROUGH':m.message},delivery:d,receiver,judge:{role:'AI_C_SCRIPTED_DOUBLE',verdict:analysis.answer_matches_fixture?'MATCHES_AUTHORED_REFERENCE':'DISAGREES_WITH_AUTHORED_REFERENCE',semantic_status:'NOT_INDEPENDENTLY_VERIFIED'},mechanical:analysis};
  });
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const traces=generateTraces();
  const dest=resolve(here,'../artifacts');mkdirSync(dest,{recursive:true});
  writeFileSync(resolve(dest,'demo-traces.json'),JSON.stringify(traces,null,2)+'\n');
  writeFileSync(resolve(dest,'viewer.html'),htmlForTraces(traces));
  console.log('SCRIPTED ONLY: created artifacts/demo-traces.json and artifacts/viewer.html');
  console.log('Open artifacts/viewer.html in a browser. No model, network or provider credentials used.');
}
