import {createHash} from 'node:crypto';
export const digest=text=>createHash('sha256').update(text).digest('hex');
const requireValue=(ok,message)=>{if(!ok)throw Error(message);};
export function validateReference(p){
 requireValue(p.source.sha256===digest(p.source.text),'REFERENCE_SOURCE_HASH');
 const ids=new Set(p.units.map(u=>u.id));requireValue(ids.size===p.units.length,'REFERENCE_DUPLICATE_UNIT');
 const span=s=>requireValue(Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&Array.from(p.source.text).slice(s.start,s.end).join('')===s.text,'REFERENCE_SPAN');
 for(const u of p.units){requireValue(u.spans.length>0,'REFERENCE_SUPPORT_REQUIRED');u.spans.forEach(span);for(const key of ['actors','actions','conditions','exceptions','temporal','ambiguities'])requireValue(Array.isArray(u[key]),'REFERENCE_FIELD_'+key);requireValue(typeof u.act==='string'&&typeof u.force==='string','REFERENCE_CLASSIFICATION');}
 for(const r of p.relations){requireValue(ids.has(r.from)&&ids.has(r.to),'REFERENCE_RELATION_ENDPOINT');requireValue(r.spans.length>0,'REFERENCE_RELATION_SUPPORT');r.spans.forEach(span);}return p;
}
// Candidate links are review navigation, never semantic judgments. A copied sentence can
// contain contradictory readings or several meanings and therefore cannot earn coverage.
export function reviewCandidates(reference,candidate){
 validateReference(reference);requireValue(candidate.source.sha256===reference.source.sha256,'CANDIDATE_SOURCE_MISMATCH');
 const units=candidate.units??candidate.meaning_units.map(u=>({id:u.id,text:u.proposed_meaning,spans:[{start:u.start,end:u.end,text:u.source_quote}]}));
 requireValue(new Set(units.map(u=>u.id)).size===units.length,'CANDIDATE_DUPLICATE_UNIT');
 return {schema:'language-semantic-review/0.1',reference_standing:'UNADJUDICATED_REFERENCE',reference_hash:digest(JSON.stringify(reference)),candidate_hash:digest(JSON.stringify(candidate)),semantic_quality:'NOT_ADJUDICATED',
 coverage:reference.units.map(r=>({reference_id:r.id,candidates:units.filter(c=>c.spans?.some(s=>r.spans.some(t=>s.start<=t.start&&s.end>=t.end))).map(c=>c.id),verdict:'UNKNOWN'})),
 support:units.map(c=>({candidate_id:c.id,exact_spans_valid:!!c.spans?.length&&c.spans.every(s=>Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&Array.from(reference.source.text).slice(s.start,s.end).join('')===s.text),entailment:'UNKNOWN'})),
 dimensions:['classification','qualifications','relationships','unsupported_additions','appropriate_uncertainty'].map(dimension=>({dimension,verdict:'UNKNOWN'})),
 limitations:['Exact quotation is not entailment.','Absent wording matches can be faithful paraphrases.','A sentence is not an atomic meaning unit.','Unknown judgments must not be counted as correct or incorrect.']};
}
// A separate reviewer supplies judgments. Bind them to exact artifacts and retain
// conflicting reviews rather than collapsing them into a complete-understanding score.
export function attachReview(report,review){
 requireValue(review.reference_hash===report.reference_hash&&review.candidate_hash===report.candidate_hash,'REVIEW_ARTIFACT_MISMATCH');
 requireValue(typeof review.reviewer==='string'&&review.reviewer.trim()&&review.independent===true,'INDEPENDENT_REVIEW_REQUIRED');
 const ids=new Set([...report.coverage.map(x=>x.reference_id),...report.support.map(x=>x.candidate_id)]);
 for(const finding of review.findings){requireValue(['coverage','support','classification','qualifications','relationships','unsupported_additions','appropriate_uncertainty'].includes(finding.dimension),'REVIEW_DIMENSION');requireValue(['SUPPORTED','DEFECT','UNKNOWN','DISAGREEMENT'].includes(finding.verdict),'REVIEW_VERDICT');requireValue(typeof finding.reason==='string'&&finding.reason.trim(),'REVIEW_REASON');requireValue(finding.unit_ids.length>0&&finding.unit_ids.every(id=>ids.has(id)),'REVIEW_UNIT');}
 return {...report,reviews:[...(report.reviews??[]),structuredClone(review)],semantic_quality:'ADVISORY_REVIEWS_NOT_GOLD'};
}
