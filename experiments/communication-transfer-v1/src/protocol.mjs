import {createHash} from 'node:crypto';
export const ARMS = Object.freeze(['SOURCE','PLAIN','LINKED','CONTEXT']);
export const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export function validateFixture(f) {
  if (!f || !f.id || !f.source || !f.question || !f.reference_answer || !Array.isArray(f.obligations) || !f.obligations.length) throw Error('FIXTURE_INVALID');
  for (const o of f.obligations) {
    const {start,end}=o.source_span??{};
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>f.source.length||f.source.slice(start,end)!==o.quotation) throw Error('SOURCE_SPAN_MISMATCH:'+o.id);
    if(o.standing!=='AUTHORED_SYNTHETIC_NOT_INDEPENDENT_GOLD') throw Error('OBLIGATION_STANDING_UNEXPECTED');
  }
  return true;
}
export function buildDelivery(f,arm,message) {
  validateFixture(f);
  if(!ARMS.includes(arm)) throw Error('UNKNOWN_ARM');
  const data = {schema:'language.transfer-delivery/0.1',arm,case_id:f.id,task:f.question,source_hash:sha256(f.source),channel_message:message,model_visibility:'RECEIVER_DOES_NOT_SEE_FULL_SOURCE_UNLESS_SOURCE_ARM',constraints:{external_action:false}};
  if(arm==='SOURCE') data.channel_message=f.source;
  if(arm==='CONTEXT') {
    data.historical_context=f.history.map(x=>({id:x.id,kind:x.kind,scope:x.scope,standing:x.standing,version:x.version,text:x.text}));
    data.current_context=f.current_context;
    // Candidate Taint is intentionally excluded: no measured detector, no consent to use.
    data.taint={status:'NOT_TRANSMITTED_NO_AUTHORITY'};
  }
  data.delivery_hash=sha256(data);
  return data;
}
export function validateDelivery(f,d) {
  validateFixture(f);
  if(!d || d.case_id!==f.id || d.source_hash!==sha256(f.source) || !ARMS.includes(d.arm)) throw Error('DELIVERY_BINDING_FAIL');
  const {delivery_hash,...unsigned}=d;
  if (delivery_hash!==sha256(unsigned)) throw Error('DELIVERY_HASH_MISMATCH');
  if(d.arm==='CONTEXT' && (d.taint?.status!=='NOT_TRANSMITTED_NO_AUTHORITY' || d.taint_candidate?.identity_claim===true)) throw Error('TAINT_AUTHORITY_REFUSED');
  return true;
}
