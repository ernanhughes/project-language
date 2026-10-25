import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const cases=[
// Development: corruptions
{
 id:'R4-D01',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'MISSING_PREREQUISITE',
 source:'An incident operator may restore the service into the isolated recovery environment before the normal change review, but only if a signed known-good image is used and the audit log remains intact. The restore must not expose the recovery environment to customers. For incident I42 the image signature was verified, the audit log is intact, and the target is the isolated recovery environment.',
 transformation:'For incident I42, an incident operator may restore the service into the isolated recovery environment before the normal change review. The image signature was verified and the target is the isolated recovery environment.',
 purpose:'Communicate the I42 restore permission to a fresh operator without granting external action authority.',
 obligations:[{id:'o1',source_quote:'only if a signed known-good image is used and the audit log remains intact',description:'Both prerequisites must be preserved.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'MISSING_CANDIDATE',distinction:'MISSING_PREREQUISITE',source_quote:'the audit log remains intact',transformation_quote:'',severity:'MATERIAL'}]}
},
{
 id:'R4-D02',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'NEGATION_REVERSAL',
 source:'The staging database must not be copied to removable media. The operator proposes copying the staging database to a removable drive. No exception applies.',
 transformation:'The staging database may be copied to removable media. The operator proposes copying it to a removable drive. No exception applies.',
 purpose:'Communicate the staging-media rule to the operator.',
 obligations:[{id:'o1',source_quote:'The staging database must not be copied to removable media.',description:'Prohibition must remain a prohibition.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'NEGATION_REVERSAL',source_quote:'The staging database must not be copied to removable media.',transformation_quote:'The staging database may be copied to removable media.',severity:'MATERIAL'}]}
},
{
 id:'R4-D03',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'MODALITY_CHANGE',
 source:'The incident desk may page the on-call database engineer when replication lag stays above twenty seconds for five continuous minutes. Paging does not authorise restarting the replica.',
 transformation:'The incident desk must page the on-call database engineer when replication lag stays above twenty seconds for five continuous minutes. Paging does not authorise restarting the replica.',
 purpose:'Communicate the escalation permission without turning it into a duty.',
 obligations:[{id:'o1',source_quote:'The incident desk may page the on-call database engineer when replication lag stays above twenty seconds for five continuous minutes.',description:'Permission must remain permission.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'MODALITY_CHANGE',source_quote:'The incident desk may page the on-call database engineer when replication lag stays above twenty seconds for five continuous minutes.',transformation_quote:'The incident desk must page the on-call database engineer when replication lag stays above twenty seconds for five continuous minutes.',severity:'MATERIAL'}]}
},
{
 id:'R4-D04',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'BROADENED_EXCEPTION',
 source:'During a declared outage, operators may retrieve the backup credential into a temporary isolated terminal for diagnostics. The exception does not apply during a routine maintenance window. Routine windows are not declared outages.',
 transformation:'During a declared outage, operators may retrieve the backup credential into a temporary isolated terminal for diagnostics. The exception does not apply during an operational disruption. Operational disruptions include routine maintenance windows.',
 purpose:'Communicate the outage exception and its limit.',
 obligations:[{id:'o1',source_quote:'The exception does not apply during a routine maintenance window.',description:'The exception limit must not be broadened.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'BROADENED_EXCEPTION',source_quote:'The exception does not apply during a routine maintenance window.',transformation_quote:'The exception does not apply during an operational disruption.',severity:'MATERIAL'}]}
},
{
 id:'R4-D05',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'TEMPORAL_ORDER',
 source:'The change review must be completed before the deployment begins. A deployment that begins before the review is complete is unauthorised.',
 transformation:'The deployment must begin before the change review is completed. A deployment that begins before the review is complete is authorised.',
 purpose:'Communicate the review/deployment ordering.',
 obligations:[{id:'o1',source_quote:'The change review must be completed before the deployment begins.',description:'The order of review and deployment must be preserved.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'TEMPORAL_ORDER',source_quote:'The change review must be completed before the deployment begins.',transformation_quote:'The deployment must begin before the change review is completed.',severity:'MATERIAL'}]}
},
{
 id:'R4-D06',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'INVENTED_AUTHORITY',
 source:'The investigation note records a failed checksum. It offers one possible explanation and does not establish the cause. The note does not grant an operator permission to discard the replica.',
 transformation:'The investigation note records a failed checksum. The operator may discard the replica and does not need further approval.',
 purpose:'Communicate what the investigation note establishes.',
 obligations:[{id:'o1',source_quote:'The note does not grant an operator permission to discard the replica.',description:'No deletion authority is granted.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'UNSUPPORTED_ADDITION_CANDIDATE',distinction:'INVENTED_AUTHORITY',source_quote:'The note does not grant an operator permission to discard the replica.',transformation_quote:'The operator may discard the replica and does not need further approval.',severity:'MATERIAL'}]}
},
// Development: faithful controls
{
 id:'R4-D07',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'An operator may retrieve the backup credential only if the incident ticket is open and the audit log remains intact. The credential must stay in the temporary isolated terminal. The ticket is open and the audit log is intact.',
 transformation:'Provided that the incident ticket is open and the audit log is intact, the operator is allowed to retrieve the backup credential. The credential must remain in the temporary isolated terminal.',
 purpose:'Paraphrase the retrieval permission while preserving both conditions.',
 obligations:[{id:'o1',source_quote:'only if the incident ticket is open and the audit log remains intact',description:'Both conditions must survive the paraphrase.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'only if the incident ticket is open and the audit log remains intact',transformation_quote:'Provided that the incident ticket is open and the audit log is intact',severity:'INFO'}]}
},
{
 id:'R4-D08',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'The release requires an accepted security review, an approved change ticket, and a named production owner. The security review is accepted. The change ticket is approved. The production owner is named.',
 transformation:'The production owner is named. The change ticket is approved. The security review is accepted. The release requires all three: an accepted security review, an approved change ticket, and a named production owner.',
 purpose:'Communicate the same three conditions in a different order.',
 obligations:[{id:'o1',source_quote:'The release requires an accepted security review, an approved change ticket, and a named production owner.',description:'All three conditions must be preserved.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The release requires an accepted security review, an approved change ticket, and a named production owner.',transformation_quote:'The release requires all three: an accepted security review, an approved change ticket, and a named production owner.',severity:'INFO'}]}
},
{
 id:'R4-D09',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'The incident desk may page the database engineer when replication lag stays above twenty seconds for five continuous minutes. The dashboard shows nine uninterrupted minutes above twenty seconds. The policy also discusses office access badges, which are irrelevant to paging.',
 transformation:'The incident desk may page the database engineer because the dashboard shows nine uninterrupted minutes of replication lag above twenty seconds.',
 purpose:'Omit irrelevant badge material while preserving the paging permission and its condition.',
 obligations:[{id:'o1',source_quote:'The incident desk may page the database engineer when replication lag stays above twenty seconds for five continuous minutes.',description:'The paging permission and threshold must be preserved.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The incident desk may page the database engineer when replication lag stays above twenty seconds for five continuous minutes.',transformation_quote:'The incident desk may page the database engineer because the dashboard shows nine uninterrupted minutes of replication lag above twenty seconds.',severity:'INFO'}]}
},
{
 id:'R4-D10',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'During an outage, operators may copy the backup credential into a temporary isolated terminal for diagnostics. The credential must not be sent by email.',
 transformation:'During an outage, operators are allowed to duplicate the recovery key into a standalone diagnostic terminal. The key must not be emailed.',
 purpose:'Use harmless terminology changes while preserving the permission and prohibition.',
 obligations:[{id:'o1',source_quote:'operators may copy the backup credential into a temporary isolated terminal for diagnostics',description:'The retrieval permission must be preserved.'},{id:'o2',source_quote:'The credential must not be sent by email.',description:'The email prohibition must be preserved.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'operators may copy the backup credential into a temporary isolated terminal for diagnostics',transformation_quote:'operators are allowed to duplicate the recovery key into a standalone diagnostic terminal',severity:'INFO'}]}
},
{
 id:'R4-D11',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'The vendor may retain its recovery copy only for fourteen days and only if the privacy review is complete. The vendor must delete the copy after fourteen days. The vendor may not share the copy with subcontractors.',
 transformation:'Subject to completion of the privacy review, the vendor may keep its recovery copy for no more than fourteen days, must delete it afterwards, and may not share it with subcontractors.',
 purpose:'Summarise the retention permission and obligations without losing the conditions.',
 obligations:[{id:'o1',source_quote:'The vendor may retain its recovery copy only for fourteen days and only if the privacy review is complete.',description:'The retention duration and privacy-review condition must survive.'},{id:'o2',source_quote:'The vendor must delete the copy after fourteen days.',description:'The deletion obligation must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The vendor may retain its recovery copy only for fourteen days and only if the privacy review is complete.',transformation_quote:'Subject to completion of the privacy review, the vendor may keep its recovery copy for no more than fourteen days',severity:'INFO'}]}
},
{
 id:'R4-D12',split:'development',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'The exception window closes at 17:00 UTC on 16 October 2026. Requests must be submitted before 17:00 UTC to use the exception.',
 transformation:'The exception window closes at 17:00 UTC on 16 October 2026. Requests must be submitted prior to 17:00 UTC to use the exception.',
 purpose:'Use an equivalent temporal formulation.',
 obligations:[{id:'o1',source_quote:'Requests must be submitted before 17:00 UTC to use the exception.',description:'The deadline direction must be preserved.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'Requests must be submitted before 17:00 UTC to use the exception.',transformation_quote:'Requests must be submitted prior to 17:00 UTC to use the exception.',severity:'INFO'}]}
},
// Evaluation: corruptions
{
 id:'R4-E01',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'UNKNOWN_TO_ESTABLISHED_FACT',
 source:'The privacy team has not decided whether vendor replication will be authorised. The record contains neither an approval nor a denial. No future decision or commitment is recorded.',
 transformation:'The privacy team has authorised vendor replication. The record contains the approval, and the commitment is recorded.',
 purpose:'Communicate the vendor-replication status.',
 obligations:[{id:'o1',source_quote:'The privacy team has not decided whether vendor replication will be authorised.',description:'The unresolved status must remain unresolved.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'UNKNOWN_TO_ESTABLISHED_FACT',source_quote:'The privacy team has not decided whether vendor replication will be authorised.',transformation_quote:'The privacy team has authorised vendor replication.',severity:'MATERIAL'}]}
},
{
 id:'R4-E02',split:'evaluation',domain:'interview',profile:'general',faithful:false,corruption_class:'MISATTRIBUTED_QUOTATION_OR_SPEAKER',
 source:'Reviewer: "The rollout is approved." Chair: "The test plan is approved." Editor: "I will prepare the internal copy."',
 transformation:'Chair: "The rollout is approved." Reviewer: "The test plan is approved." Editor: "I will prepare the internal copy."',
 purpose:'Communicate who approved which plan.',
 obligations:[{id:'o1',source_quote:'Reviewer: "The rollout is approved."',description:'The Reviewer’s statement must remain attributed to the Reviewer.'},{id:'o2',source_quote:'Chair: "The test plan is approved."',description:'The Chair’s statement must remain attributed to the Chair.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'MISATTRIBUTED_QUOTATION_OR_SPEAKER',source_quote:'Reviewer: "The rollout is approved."',transformation_quote:'Chair: "The rollout is approved."',severity:'MATERIAL'}]}
},
{
 id:'R4-E03',split:'evaluation',domain:'interview',profile:'general',faithful:false,corruption_class:'WRONG_CROSS_SENTENCE_REFERENCE',
 source:'The reviewer approved the plan after the chair’s note. The note does not say whether "the plan" refers to the rollout plan or the test plan. The rollout plan is the larger document.',
 transformation:'The reviewer approved the rollout plan after the chair’s note. The rollout plan is the larger document.',
 purpose:'Communicate what the reviewer approved.',
 obligations:[{id:'o1',source_quote:'The note does not say whether "the plan" refers to the rollout plan or the test plan.',description:'The unresolved reference must not be silently resolved.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'WRONG_CROSS_SENTENCE_REFERENCE',source_quote:'The note does not say whether "the plan" refers to the rollout plan or the test plan.',transformation_quote:'The reviewer approved the rollout plan after the chair’s note.',severity:'MATERIAL'}]}
},
{
 id:'R4-E04',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'UNSUPPORTED_CAUSAL',
 source:'The checksum failed during the transfer. The investigation note says the cause has not been verified and offers one possible explanation. The replica was later marked stale.',
 transformation:'The checksum failure caused the replica to become stale. The investigation confirmed the causal link.',
 purpose:'Communicate the investigation finding.',
 obligations:[{id:'o1',source_quote:'The investigation note says the cause has not been verified and offers one possible explanation.',description:'The causal uncertainty must be preserved.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'UNSUPPORTED_ADDITION_CANDIDATE',distinction:'UNSUPPORTED_CAUSAL',source_quote:'The investigation note says the cause has not been verified and offers one possible explanation.',transformation_quote:'The checksum failure caused the replica to become stale. The investigation confirmed the causal link.',severity:'MATERIAL'}]}
},
{
 id:'R4-E05',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'MISSING_PREREQUISITE',
 source:'A release may be deployed only if the security review is accepted and the change ticket is approved. The security review is accepted. The change ticket has not been approved. No other approval applies.',
 transformation:'A release may be deployed because the security review is accepted. No other approval applies.',
 purpose:'Communicate whether this release may be deployed.',
 obligations:[{id:'o1',source_quote:'only if the security review is accepted and the change ticket is approved',description:'Both necessary conditions must be preserved.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'MISSING_CANDIDATE',distinction:'MISSING_PREREQUISITE',source_quote:'the change ticket is approved',transformation_quote:'',severity:'MATERIAL'}]}
},
{
 id:'R4-E06',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:false,corruption_class:'NEGATION_REVERSAL',
 source:'The archive team is not authorised to delete legal-hold records. A legal-hold record is present in the proposed batch. No exception is recorded.',
 transformation:'The archive team is authorised to delete legal-hold records. A legal-hold record is present in the proposed batch. No exception is recorded.',
 purpose:'Communicate the archive team’s authority.',
 obligations:[{id:'o1',source_quote:'The archive team is not authorised to delete legal-hold records.',description:'The authority denial must remain a denial.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'NEGATION_REVERSAL',source_quote:'The archive team is not authorised to delete legal-hold records.',transformation_quote:'The archive team is authorised to delete legal-hold records.',severity:'MATERIAL'}]}
},
// Evaluation: faithful controls
{
 id:'R4-E07',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'An operator may retrieve the backup credential only if the incident ticket is open and the audit log remains intact. The credential must stay in the temporary isolated terminal.',
 transformation:'Provided the incident ticket stays open and the audit log is unaltered, the operator is permitted to retrieve the backup credential. The credential must remain in the temporary isolated terminal.',
 purpose:'Paraphrase the retrieval permission and both conditions.',
 obligations:[{id:'o1',source_quote:'only if the incident ticket is open and the audit log remains intact',description:'Both conditions must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'only if the incident ticket is open and the audit log remains intact',transformation_quote:'Provided the incident ticket stays open and the audit log is unaltered',severity:'INFO'}]}
},
{
 id:'R4-E08',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'The release requires an accepted security review, an approved change ticket, and a named production owner. All three records are present.',
 transformation:'All three records are present: a named production owner, an approved change ticket, and an accepted security review. The release requires all three.',
 purpose:'Reorder the same conditions.',
 obligations:[{id:'o1',source_quote:'The release requires an accepted security review, an approved change ticket, and a named production owner.',description:'All three conditions must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The release requires an accepted security review, an approved change ticket, and a named production owner.',transformation_quote:'The release requires all three.',severity:'INFO'}]}
},
{
 id:'R4-E09',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'The incident desk may page the database engineer when replication lag stays above twenty seconds for five continuous minutes. The dashboard shows nine uninterrupted minutes above twenty seconds. The policy also discusses office access badges, which are irrelevant to paging.',
 transformation:'The incident desk may page the database engineer because the dashboard shows nine uninterrupted minutes of replication lag above twenty seconds.',
 purpose:'Omit the irrelevant badge material.',
 obligations:[{id:'o1',source_quote:'The incident desk may page the database engineer when replication lag stays above twenty seconds for five continuous minutes.',description:'The paging permission must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The incident desk may page the database engineer when replication lag stays above twenty seconds for five continuous minutes.',transformation_quote:'The incident desk may page the database engineer because the dashboard shows nine uninterrupted minutes of replication lag above twenty seconds.',severity:'INFO'}]}
},
{
 id:'R4-E10',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'During an outage, operators may copy the backup credential into a temporary isolated terminal for diagnostics. The credential must not be sent by email.',
 transformation:'During an outage, operators are allowed to duplicate the recovery key into a standalone diagnostic terminal. The key must not be emailed.',
 purpose:'Use harmless terminology changes.',
 obligations:[{id:'o1',source_quote:'operators may copy the backup credential into a temporary isolated terminal for diagnostics',description:'The retrieval permission must survive.'},{id:'o2',source_quote:'The credential must not be sent by email.',description:'The email prohibition must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'operators may copy the backup credential into a temporary isolated terminal for diagnostics',transformation_quote:'operators are allowed to duplicate the recovery key into a standalone diagnostic terminal',severity:'INFO'}]}
},
{
 id:'R4-E11',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'The vendor may retain its recovery copy only for fourteen days and only if the privacy review is complete. The vendor must delete the copy after fourteen days. The vendor may not share the copy with subcontractors.',
 transformation:'Subject to completion of the privacy review, the vendor may keep its recovery copy for no more than fourteen days, must delete it afterwards, and may not share it with subcontractors.',
 purpose:'Qualified summary of the retention rules.',
 obligations:[{id:'o1',source_quote:'The vendor may retain its recovery copy only for fourteen days and only if the privacy review is complete.',description:'Retention duration and privacy condition must survive.'},{id:'o2',source_quote:'The vendor must delete the copy after fourteen days.',description:'Deletion obligation must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The vendor may retain its recovery copy only for fourteen days and only if the privacy review is complete.',transformation_quote:'Subject to completion of the privacy review, the vendor may keep its recovery copy for no more than fourteen days',severity:'INFO'}]}
},
{
 id:'R4-E12',split:'evaluation',domain:'technical-policy',profile:'technical-policy',faithful:true,corruption_class:null,
 source:'The exception window closes at 17:00 UTC on 16 October 2026. Requests must be submitted before 17:00 UTC to use the exception.',
 transformation:'The exception window closes at 17:00 UTC on 16 October 2026. Requests must be submitted prior to 17:00 UTC to use the exception.',
 purpose:'Use an equivalent deadline formulation.',
 obligations:[{id:'o1',source_quote:'Requests must be submitted before 17:00 UTC to use the exception.',description:'Deadline direction must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'Requests must be submitted before 17:00 UTC to use the exception.',transformation_quote:'Requests must be submitted prior to 17:00 UTC to use the exception.',severity:'INFO'}]}
}
];

const bySplit={development:cases.filter(c=>c.split==='development'),evaluation:cases.filter(c=>c.split==='evaluation')};
for(const [split,list] of Object.entries(bySplit))if(list.length!==12)throw Error('SPLIT_SIZE '+split+' '+list.length);
const ids=new Set();
for(const c of cases){
 if(ids.has(c.id))throw Error('DUP '+c.id);ids.add(c.id);
 for(const o of c.obligations)if(!c.source.includes(o.source_quote))throw Error('OBLIGATION_QUOTE '+c.id+' '+o.source_quote);
 for(const e of c.expected.findings){
  if(!c.source.includes(e.source_quote))throw Error('EXPECTED_SOURCE_QUOTE '+c.id+' '+e.source_quote);
  if(e.transformation_quote&&!c.transformation.includes(e.transformation_quote))throw Error('EXPECTED_TRANSFORMATION_QUOTE '+c.id+' '+e.transformation_quote);
 }
}
const out='experiments/lc-02-r4/fixtures';mkdirSync(out,{recursive:true});
for(const [split,list] of Object.entries(bySplit)){
 const caseFile={schema:'language-semantic-checker-cases/0.1',split,standing:'AUTHOR_CONSTRUCTED_PROVISIONAL',cases:list.map(({expected,...c})=>c)};
 const refFile={schema:'language-semantic-checker-reference/0.1',split,standing:'AUTHOR_CONSTRUCTED_PROVISIONAL_NOT_INDEPENDENT_HUMAN_ADJUDICATION',cases:list.map(c=>({id:c.id,faithful:c.faithful,corruption_class:c.corruption_class,expected_policy:c.expected.policy,expected_findings:c.expected.findings,notes:c.faithful?'Faithful control: a rejection is a false alarm.':'Deliberate corruption: a miss is a missed detection.'}))};
 writeFileSync(`${out}/${split}-cases.json`,JSON.stringify(caseFile,null,2)+'\n');
 writeFileSync(`${out}/${split}-references.json`,JSON.stringify(refFile,null,2)+'\n');
}
const files=['development-cases.json','evaluation-cases.json','development-references.json','evaluation-references.json'];
const freeze={schema:'language-semantic-checker-freeze/0.1',created:'2026-10-23',standing:'FROZEN_BEFORE_CHECKER_EXECUTION',files:Object.fromEntries(files.map(f=>[f,hash(readFileSync(`${out}/${f}`,'utf8'))]))};
writeFileSync(`${out}/FREEZE.json`,JSON.stringify(freeze,null,2)+'\n');
console.log(JSON.stringify({status:'CORPUS_BUILT',development:bySplit.development.length,evaluation:bySplit.evaluation.length,freeze},null,2));
