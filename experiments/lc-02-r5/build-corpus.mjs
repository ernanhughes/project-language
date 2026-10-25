import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';

const cases=[
// Development: corruptions
{
 id:'R5-D01',split:'development',case_type:'CORRUPTION',corruption_class:'MISSING_PREREQUISITE',domain:'technical-policy',profile:'technical-policy',
 source:'The vendor may access the portal only if the security review is complete and the access ticket is approved. The security review is complete. The access ticket is not approved.',
 transformation:'The vendor may access the portal because the security review is complete.',
 purpose:'Communicate whether the vendor may access the portal.',
 obligations:[{id:'o1',source_quote:'only if the security review is complete and the access ticket is approved',description:'Both prerequisites must survive.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'MISSING_CANDIDATE',distinction:'MISSING_PREREQUISITE',source_quote:'the access ticket is approved',transformation_quote:'',severity:'MATERIAL'}]}
},
{
 id:'R5-D02',split:'development',case_type:'CORRUPTION',corruption_class:'NEGATION_REVERSAL',domain:'technical-policy',profile:'technical-policy',
 source:'The archive team must not delete legal-hold records. A legal-hold record is present in the proposed batch.',
 transformation:'The archive team may delete legal-hold records. A legal-hold record is present in the proposed batch.',
 purpose:'Communicate the archive team prohibition.',
 obligations:[{id:'o1',source_quote:'The archive team must not delete legal-hold records.',description:'The prohibition must remain a prohibition.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'NEGATION_REVERSAL',source_quote:'The archive team must not delete legal-hold records.',transformation_quote:'The archive team may delete legal-hold records.',severity:'MATERIAL'}]}
},
{
 id:'R5-D03',split:'development',case_type:'CORRUPTION',corruption_class:'MODALITY_CHANGE',domain:'technical-policy',profile:'technical-policy',
 source:'The operator may restart the replica after approval. Restarting does not authorise a rollback.',
 transformation:'The operator must restart the replica after approval. Restarting does not authorise a rollback.',
 purpose:'Communicate the restart permission.',
 obligations:[{id:'o1',source_quote:'The operator may restart the replica after approval.',description:'Permission must remain permission.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'MODALITY_CHANGE',source_quote:'The operator may restart the replica after approval.',transformation_quote:'The operator must restart the replica after approval.',severity:'MATERIAL'}]}
},
{
 id:'R5-D04',split:'development',case_type:'CORRUPTION',corruption_class:'BROADENED_EXCEPTION',domain:'technical-policy',profile:'technical-policy',
 source:'Operators may use the emergency key during a declared outage, except during a planned maintenance window. Planned maintenance windows are not declared outages.',
 transformation:'Operators may use the emergency key during a declared outage, except during an operational disruption. Operational disruptions include planned maintenance windows.',
 purpose:'Communicate the emergency-key exception and its limit.',
 obligations:[{id:'o1',source_quote:'except during a planned maintenance window',description:'The exception must not be broadened.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'BROADENED_EXCEPTION',source_quote:'except during a planned maintenance window',transformation_quote:'except during an operational disruption',severity:'MATERIAL'}]}
},
// Development: faithful controls
{
 id:'R5-D05',split:'development',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'An operator may retrieve the key only if the ticket is open and the audit log remains intact. The key must stay in the isolated terminal.',
 transformation:'Provided the ticket stays open and the audit log is unaltered, the operator is allowed to retrieve the key. The key must remain in the isolated terminal.',
 purpose:'Paraphrase the retrieval permission.',
 obligations:[{id:'o1',source_quote:'only if the ticket is open and the audit log remains intact',description:'Both conditions must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'only if the ticket is open and the audit log remains intact',transformation_quote:'Provided the ticket stays open and the audit log is unaltered',severity:'INFO'}]}
},
{
 id:'R5-D06',split:'development',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The release requires an accepted security review and an approved ticket.',
 transformation:'An approved ticket and an accepted security review are required.',
 purpose:'Reorder the conditions without changing meaning.',
 obligations:[{id:'o1',source_quote:'The release requires an accepted security review and an approved ticket.',description:'Both conditions must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The release requires an accepted security review and an approved ticket.',transformation_quote:'An approved ticket and an accepted security review are required.',severity:'INFO'}]}
},
{
 id:'R5-D07',split:'development',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The vendor may keep the copy for fourteen days only if the privacy review is complete. The vendor must delete it afterwards. The vendor may not share the copy.',
 transformation:'Subject to completion of the privacy review, the vendor may keep the copy for no more than fourteen days and must delete it afterwards; the copy may not be shared.',
 purpose:'Qualified summary of the retention rules.',
 obligations:[{id:'o1',source_quote:'The vendor may keep the copy for fourteen days only if the privacy review is complete.',description:'Duration and privacy condition must survive.'},{id:'o2',source_quote:'The vendor must delete it afterwards.',description:'Deletion obligation must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The vendor may keep the copy for fourteen days only if the privacy review is complete.',transformation_quote:'Subject to completion of the privacy review, the vendor may keep the copy for no more than fourteen days',severity:'INFO'}]}
},
{
 id:'R5-D08',split:'development',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The incident desk may page the engineer when lag exceeds twenty seconds for five minutes. The dashboard shows nine minutes. Office badges are irrelevant.',
 transformation:'The incident desk may page the engineer when lag exceeds twenty seconds for five minutes; the dashboard shows nine minutes.',
 purpose:'Omit irrelevant badge material.',
 obligations:[{id:'o1',source_quote:'The incident desk may page the engineer when lag exceeds twenty seconds for five minutes.',description:'Paging permission must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The incident desk may page the engineer when lag exceeds twenty seconds for five minutes.',transformation_quote:'The incident desk may page the engineer when lag exceeds twenty seconds for five minutes; the dashboard shows nine minutes.',severity:'INFO'}]}
},
// Development: genuine ambiguity / justified uncertainty
{
 id:'R5-D09',split:'development',case_type:'AMBIGUITY',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The privacy team has not decided whether vendor replication is authorised. The record contains neither approval nor denial.',
 transformation:'It remains unclear whether vendor replication is authorised; the record contains neither approval nor denial.',
 purpose:'Preserve the unresolved vendor authorisation status.',
 obligations:[{id:'o1',source_quote:'The privacy team has not decided whether vendor replication is authorised.',description:'The unresolved status must remain unresolved.'}],
 expected:{policy:'REQUEST_CLARIFICATION',findings:[{type:'UNRESOLVED',distinction:'SOURCE_AMBIGUITY',source_quote:'The privacy team has not decided whether vendor replication is authorised.',transformation_quote:'It remains unclear whether vendor replication is authorised',severity:'MINOR'}]}
},
{
 id:'R5-D10',split:'development',case_type:'AMBIGUITY',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'Requests timestamped after 17:00 are outside the exception. The system recorded the request at 18:00. It is unclear whether 18:00 is the request timestamp or only the recording time.',
 transformation:'It is unclear whether the request was timestamped after 17:00, because 18:00 may be the recording time.',
 purpose:'Preserve the timestamp ambiguity.',
 obligations:[{id:'o1',source_quote:'It is unclear whether 18:00 is the request timestamp or only the recording time.',description:'The timestamp ambiguity must remain unresolved.'}],
 expected:{policy:'REQUEST_CLARIFICATION',findings:[{type:'UNRESOLVED',distinction:'SOURCE_AMBIGUITY',source_quote:'It is unclear whether 18:00 is the request timestamp or only the recording time.',transformation_quote:'It is unclear whether the request was timestamped after 17:00',severity:'MINOR'}]}
},
{
 id:'R5-D11',split:'development',case_type:'AMBIGUITY',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The image signature was verified. The policy requires a signed known-good image.',
 transformation:'It is unclear whether the image is known-good despite the verified signature.',
 purpose:'Preserve the justified uncertainty about known-good status.',
 obligations:[{id:'o1',source_quote:'The policy requires a signed known-good image.',description:'The known-good requirement must remain open.'}],
 expected:{policy:'REQUEST_CLARIFICATION',findings:[{type:'UNRESOLVED',distinction:'SOURCE_AMBIGUITY',source_quote:'The policy requires a signed known-good image.',transformation_quote:'It is unclear whether the image is known-good',severity:'MINOR'}]}
},
{
 id:'R5-D12',split:'development',case_type:'AMBIGUITY',corruption_class:null,domain:'interview',profile:'general',
 source:'The reviewer approved the plan. The note does not say whether "the plan" means the rollout plan or the test plan.',
 transformation:'It remains unclear which plan the reviewer approved.',
 purpose:'Preserve the referential ambiguity.',
 obligations:[{id:'o1',source_quote:'The note does not say whether "the plan" means the rollout plan or the test plan.',description:'The referential ambiguity must remain unresolved.'}],
 expected:{policy:'REQUEST_CLARIFICATION',findings:[{type:'UNRESOLVED',distinction:'SOURCE_AMBIGUITY',source_quote:'The note does not say whether "the plan" means the rollout plan or the test plan.',transformation_quote:'It remains unclear which plan the reviewer approved.',severity:'MINOR'}]}
},
// Evaluation: corruptions
{
 id:'R5-E01',split:'evaluation',case_type:'CORRUPTION',corruption_class:'MISSING_PREREQUISITE',domain:'technical-policy',profile:'technical-policy',
 source:'The change may proceed only if the ticket is open and the audit is complete. The ticket is open. The audit is not complete.',
 transformation:'The change may proceed because the ticket is open.',
 purpose:'Communicate whether the change may proceed.',
 obligations:[{id:'o1',source_quote:'only if the ticket is open and the audit is complete',description:'Both prerequisites must survive.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'MISSING_CANDIDATE',distinction:'MISSING_PREREQUISITE',source_quote:'the audit is complete',transformation_quote:'',severity:'MATERIAL'}]}
},
{
 id:'R5-E02',split:'evaluation',case_type:'CORRUPTION',corruption_class:'NEGATION_REVERSAL',domain:'technical-policy',profile:'technical-policy',
 source:'The operator is not authorised to delete the replica. A deletion request is pending.',
 transformation:'The operator is authorised to delete the replica. A deletion request is pending.',
 purpose:'Communicate the deletion authority.',
 obligations:[{id:'o1',source_quote:'The operator is not authorised to delete the replica.',description:'The authority denial must remain.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'NEGATION_REVERSAL',source_quote:'The operator is not authorised to delete the replica.',transformation_quote:'The operator is authorised to delete the replica.',severity:'MATERIAL'}]}
},
{
 id:'R5-E03',split:'evaluation',case_type:'CORRUPTION',corruption_class:'MODALITY_CHANGE',domain:'technical-policy',profile:'technical-policy',
 source:'The team may publish the internal report after review. Publication does not authorise external release.',
 transformation:'The team must publish the internal report after review. Publication does not authorise external release.',
 purpose:'Communicate the publication permission.',
 obligations:[{id:'o1',source_quote:'The team may publish the internal report after review.',description:'Permission must remain permission.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'MODALITY_CHANGE',source_quote:'The team may publish the internal report after review.',transformation_quote:'The team must publish the internal report after review.',severity:'MATERIAL'}]}
},
{
 id:'R5-E04',split:'evaluation',case_type:'CORRUPTION',corruption_class:'BROADENED_EXCEPTION',domain:'technical-policy',profile:'technical-policy',
 source:'The key may be used during an incident, except when the incident ticket is closed. A closed ticket means the incident is resolved.',
 transformation:'The key may be used during an incident, except when the incident is unresolved. An unresolved incident includes a closed ticket.',
 purpose:'Communicate the key exception.',
 obligations:[{id:'o1',source_quote:'except when the incident ticket is closed',description:'The exception must not be broadened.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'BROADENED_EXCEPTION',source_quote:'except when the incident ticket is closed',transformation_quote:'except when the incident is unresolved',severity:'MATERIAL'}]}
},
{
 id:'R5-E05',split:'evaluation',case_type:'CORRUPTION',corruption_class:'TEMPORAL_ORDER',domain:'technical-policy',profile:'technical-policy',
 source:'The review must be completed before the deployment begins. A deployment before review is unauthorised.',
 transformation:'The deployment must begin before the review is completed. A deployment before review is authorised.',
 purpose:'Communicate the review/deployment ordering.',
 obligations:[{id:'o1',source_quote:'The review must be completed before the deployment begins.',description:'The order must be preserved.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'TEMPORAL_ORDER',source_quote:'The review must be completed before the deployment begins.',transformation_quote:'The deployment must begin before the review is completed.',severity:'MATERIAL'}]}
},
{
 id:'R5-E06',split:'evaluation',case_type:'CORRUPTION',corruption_class:'INVENTED_AUTHORITY',domain:'technical-policy',profile:'technical-policy',
 source:'The note records a failed checksum. It does not grant deletion authority.',
 transformation:'The operator may delete the replica without further approval.',
 purpose:'Communicate what the note establishes.',
 obligations:[{id:'o1',source_quote:'It does not grant deletion authority.',description:'No deletion authority is granted.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'UNSUPPORTED_ADDITION_CANDIDATE',distinction:'INVENTED_AUTHORITY',source_quote:'It does not grant deletion authority.',transformation_quote:'The operator may delete the replica without further approval.',severity:'MATERIAL'}]}
},
{
 id:'R5-E07',split:'evaluation',case_type:'CORRUPTION',corruption_class:'UNKNOWN_TO_ESTABLISHED_FACT',domain:'technical-policy',profile:'technical-policy',
 source:'The vendor approval has not been decided. The record contains neither approval nor denial.',
 transformation:'The vendor is approved; the record contains the approval.',
 purpose:'Communicate the vendor approval status.',
 obligations:[{id:'o1',source_quote:'The vendor approval has not been decided.',description:'The unresolved status must remain.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'UNKNOWN_TO_ESTABLISHED_FACT',source_quote:'The vendor approval has not been decided.',transformation_quote:'The vendor is approved',severity:'MATERIAL'}]}
},
{
 id:'R5-E08',split:'evaluation',case_type:'CORRUPTION',corruption_class:'MISATTRIBUTED_QUOTATION_OR_SPEAKER',domain:'interview',profile:'general',
 source:'Reviewer: "The rollout is approved." Chair: "The test plan is approved."',
 transformation:'Chair: "The rollout is approved." Reviewer: "The test plan is approved."',
 purpose:'Communicate who approved which plan.',
 obligations:[{id:'o1',source_quote:'Reviewer: "The rollout is approved."',description:'Attribution must remain.'},{id:'o2',source_quote:'Chair: "The test plan is approved."',description:'Attribution must remain.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'MISATTRIBUTED_QUOTATION_OR_SPEAKER',source_quote:'Reviewer: "The rollout is approved."',transformation_quote:'Chair: "The rollout is approved."',severity:'MATERIAL'}]}
},
{
 id:'R5-E09',split:'evaluation',case_type:'CORRUPTION',corruption_class:'WRONG_CROSS_SENTENCE_REFERENCE',domain:'interview',profile:'general',
 source:'The reviewer approved the plan. The note does not say whether "the plan" means the rollout plan or the test plan.',
 transformation:'The reviewer approved the rollout plan.',
 purpose:'Communicate what the reviewer approved.',
 obligations:[{id:'o1',source_quote:'The note does not say whether "the plan" means the rollout plan or the test plan.',description:'The ambiguity must not be resolved silently.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'WRONG_CROSS_SENTENCE_REFERENCE',source_quote:'The note does not say whether "the plan" means the rollout plan or the test plan.',transformation_quote:'The reviewer approved the rollout plan.',severity:'MATERIAL'}]}
},
{
 id:'R5-E10',split:'evaluation',case_type:'CORRUPTION',corruption_class:'UNSUPPORTED_CAUSAL',domain:'technical-policy',profile:'technical-policy',
 source:'The checksum failed during transfer. The investigation says the cause has not been verified.',
 transformation:'The checksum failure caused the replica to become stale; the investigation confirmed the cause.',
 purpose:'Communicate the investigation finding.',
 obligations:[{id:'o1',source_quote:'The investigation says the cause has not been verified.',description:'Causal uncertainty must remain.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'UNSUPPORTED_ADDITION_CANDIDATE',distinction:'UNSUPPORTED_CAUSAL',source_quote:'The investigation says the cause has not been verified.',transformation_quote:'The checksum failure caused the replica to become stale',severity:'MATERIAL'}]}
},
{
 id:'R5-E11',split:'evaluation',case_type:'CORRUPTION',corruption_class:'SCOPE_OR_QUANTITY_CHANGE',domain:'technical-policy',profile:'technical-policy',
 source:'The queue accepts batches of no more than forty records. A batch of forty records is proposed.',
 transformation:'The queue accepts batches of no more than fifty records. A batch of forty records is proposed.',
 purpose:'Communicate the batch-size limit.',
 obligations:[{id:'o1',source_quote:'The queue accepts batches of no more than forty records.',description:'The numeric limit must survive.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'SCOPE_OR_QUANTITY_CHANGE',source_quote:'The queue accepts batches of no more than forty records.',transformation_quote:'The queue accepts batches of no more than fifty records.',severity:'MATERIAL'}]}
},
{
 id:'R5-E12',split:'evaluation',case_type:'CORRUPTION',corruption_class:'MODALITY_CHANGE',domain:'technical-policy',profile:'technical-policy',
 source:'The operator may restart the replica after approval. Restarting does not authorise a rollback.',
 transformation:'The operator must restart the replica after approval. Restarting does not authorise a rollback.',
 purpose:'Communicate the restart permission.',
 obligations:[{id:'o1',source_quote:'The operator may restart the replica after approval.',description:'Permission must remain permission.'}],
 expected:{policy:'PRESERVE_SOURCE',findings:[{type:'CHANGED_CANDIDATE',distinction:'MODALITY_CHANGE',source_quote:'The operator may restart the replica after approval.',transformation_quote:'The operator must restart the replica after approval.',severity:'MATERIAL'}]}
},
// Evaluation: faithful controls
{
 id:'R5-E13',split:'evaluation',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The operator may retrieve the key only if the ticket is open and the audit log remains intact.',
 transformation:'Provided the ticket stays open and the audit log is unaltered, the operator is allowed to retrieve the key.',
 purpose:'Paraphrase the retrieval permission.',
 obligations:[{id:'o1',source_quote:'only if the ticket is open and the audit log remains intact',description:'Both conditions must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'only if the ticket is open and the audit log remains intact',transformation_quote:'Provided the ticket stays open and the audit log is unaltered',severity:'INFO'}]}
},
{
 id:'R5-E14',split:'evaluation',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The release requires an accepted security review, an approved ticket, and a named owner.',
 transformation:'A named owner, an approved ticket, and an accepted security review are required.',
 purpose:'Reorder the same conditions.',
 obligations:[{id:'o1',source_quote:'The release requires an accepted security review, an approved ticket, and a named owner.',description:'All three conditions must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The release requires an accepted security review, an approved ticket, and a named owner.',transformation_quote:'A named owner, an approved ticket, and an accepted security review are required.',severity:'INFO'}]}
},
{
 id:'R5-E15',split:'evaluation',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'Requests must be submitted before 17:00 UTC to use the exception.',
 transformation:'Requests must be submitted prior to 17:00 UTC to use the exception.',
 purpose:'Use an equivalent deadline formulation.',
 obligations:[{id:'o1',source_quote:'Requests must be submitted before 17:00 UTC to use the exception.',description:'The deadline direction must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'Requests must be submitted before 17:00 UTC to use the exception.',transformation_quote:'Requests must be submitted prior to 17:00 UTC to use the exception.',severity:'INFO'}]}
},
{
 id:'R5-E16',split:'evaluation',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The vendor may keep the copy for fourteen days only if the privacy review is complete. It must delete the copy afterwards.',
 transformation:'Subject to completion of the privacy review, the vendor may keep the copy for no more than fourteen days and must delete it afterwards.',
 purpose:'Qualified summary of the retention rules.',
 obligations:[{id:'o1',source_quote:'The vendor may keep the copy for fourteen days only if the privacy review is complete.',description:'Duration and privacy condition must survive.'},{id:'o2',source_quote:'It must delete the copy afterwards.',description:'Deletion obligation must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The vendor may keep the copy for fourteen days only if the privacy review is complete.',transformation_quote:'Subject to completion of the privacy review, the vendor may keep the copy for no more than fourteen days',severity:'INFO'}]}
},
{
 id:'R5-E17',split:'evaluation',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'During an outage, operators may copy the backup credential into a temporary isolated terminal.',
 transformation:'During an outage, operators are allowed to duplicate the recovery key into a standalone diagnostic terminal.',
 purpose:'Use harmless terminology changes.',
 obligations:[{id:'o1',source_quote:'operators may copy the backup credential into a temporary isolated terminal',description:'The retrieval permission must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'operators may copy the backup credential into a temporary isolated terminal',transformation_quote:'operators are allowed to duplicate the recovery key into a standalone diagnostic terminal',severity:'INFO'}]}
},
{
 id:'R5-E18',split:'evaluation',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The incident desk may page the engineer when lag exceeds twenty seconds for five minutes. The dashboard shows nine minutes. Office badges are irrelevant.',
 transformation:'The incident desk may page the engineer because the dashboard shows nine minutes above the threshold.',
 purpose:'Omit irrelevant badge material.',
 obligations:[{id:'o1',source_quote:'The incident desk may page the engineer when lag exceeds twenty seconds for five minutes.',description:'Paging permission must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The incident desk may page the engineer when lag exceeds twenty seconds for five minutes.',transformation_quote:'The incident desk may page the engineer because the dashboard shows nine minutes above the threshold.',severity:'INFO'}]}
},
{
 id:'R5-E19',split:'evaluation',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The release may proceed only if the security review is accepted and the ticket is approved. Both are recorded.',
 transformation:'Provided the security review is accepted and the ticket is approved, the release may proceed; both are recorded.',
 purpose:'Paraphrase and summarise the conditions.',
 obligations:[{id:'o1',source_quote:'The release may proceed only if the security review is accepted and the ticket is approved.',description:'Both conditions must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The release may proceed only if the security review is accepted and the ticket is approved.',transformation_quote:'Provided the security review is accepted and the ticket is approved, the release may proceed',severity:'INFO'}]}
},
{
 id:'R5-E20',split:'evaluation',case_type:'FAITHFUL',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The archive team must not delete legal-hold records. The audit log must remain intact.',
 transformation:'The audit log must remain intact. Legal-hold records must not be deleted by the archive team.',
 purpose:'Reorder and paraphrase two obligations.',
 obligations:[{id:'o1',source_quote:'The archive team must not delete legal-hold records.',description:'The prohibition must survive.'},{id:'o2',source_quote:'The audit log must remain intact.',description:'The log obligation must survive.'}],
 expected:{policy:'USE_TRANSFORMATION',findings:[{type:'PRESERVED_CANDIDATE',distinction:'PRESERVED',source_quote:'The archive team must not delete legal-hold records.',transformation_quote:'Legal-hold records must not be deleted by the archive team.',severity:'INFO'}]}
},
// Evaluation: genuine ambiguity / justified uncertainty
{
 id:'R5-E21',split:'evaluation',case_type:'AMBIGUITY',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The privacy team has not decided whether vendor replication is authorised. The record contains neither approval nor denial.',
 transformation:'It remains unclear whether vendor replication is authorised.',
 purpose:'Preserve the unresolved vendor authorisation status.',
 obligations:[{id:'o1',source_quote:'The privacy team has not decided whether vendor replication is authorised.',description:'The unresolved status must remain unresolved.'}],
 expected:{policy:'REQUEST_CLARIFICATION',findings:[{type:'UNRESOLVED',distinction:'SOURCE_AMBIGUITY',source_quote:'The privacy team has not decided whether vendor replication is authorised.',transformation_quote:'It remains unclear whether vendor replication is authorised.',severity:'MINOR'}]}
},
{
 id:'R5-E22',split:'evaluation',case_type:'AMBIGUITY',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'Requests timestamped after 17:00 are outside the exception. The system recorded the request at 18:00. It is unclear whether 18:00 is the request timestamp or only the recording time.',
 transformation:'It is unclear whether the request was timestamped after 17:00, because 18:00 may be the recording time.',
 purpose:'Preserve the timestamp ambiguity.',
 obligations:[{id:'o1',source_quote:'It is unclear whether 18:00 is the request timestamp or only the recording time.',description:'The ambiguity must remain unresolved.'}],
 expected:{policy:'REQUEST_CLARIFICATION',findings:[{type:'UNRESOLVED',distinction:'SOURCE_AMBIGUITY',source_quote:'It is unclear whether 18:00 is the request timestamp or only the recording time.',transformation_quote:'It is unclear whether the request was timestamped after 17:00',severity:'MINOR'}]}
},
{
 id:'R5-E23',split:'evaluation',case_type:'AMBIGUITY',corruption_class:null,domain:'interview',profile:'general',
 source:'The reviewer approved the plan. The note does not say whether "the plan" means the rollout plan or the test plan.',
 transformation:'It remains unclear which plan the reviewer approved.',
 purpose:'Preserve the referential ambiguity.',
 obligations:[{id:'o1',source_quote:'The note does not say whether "the plan" means the rollout plan or the test plan.',description:'The referential ambiguity must remain unresolved.'}],
 expected:{policy:'REQUEST_CLARIFICATION',findings:[{type:'UNRESOLVED',distinction:'SOURCE_AMBIGUITY',source_quote:'The note does not say whether "the plan" means the rollout plan or the test plan.',transformation_quote:'It remains unclear which plan the reviewer approved.',severity:'MINOR'}]}
},
{
 id:'R5-E24',split:'evaluation',case_type:'AMBIGUITY',corruption_class:null,domain:'technical-policy',profile:'technical-policy',
 source:'The image signature was verified. The policy requires a signed known-good image.',
 transformation:'It is unclear whether the image is known-good despite the verified signature.',
 purpose:'Preserve the justified uncertainty about known-good status.',
 obligations:[{id:'o1',source_quote:'The policy requires a signed known-good image.',description:'The known-good requirement must remain open.'}],
 expected:{policy:'REQUEST_CLARIFICATION',findings:[{type:'UNRESOLVED',distinction:'SOURCE_AMBIGUITY',source_quote:'The policy requires a signed known-good image.',transformation_quote:'It is unclear whether the image is known-good',severity:'MINOR'}]}
}
];

const dev=cases.filter(c=>c.split==='development'),ev=cases.filter(c=>c.split==='evaluation');
if(dev.length!==12||ev.length!==24)throw Error('SPLIT_COUNTS '+dev.length+'/'+ev.length);
const ids=new Set();
for(const c of cases){
 if(ids.has(c.id))throw Error('DUP '+c.id);ids.add(c.id);
 for(const o of c.obligations)if(!c.source.includes(o.source_quote))throw Error('OBLIGATION '+c.id+' '+o.source_quote);
 for(const e of c.expected.findings){
  if(!c.source.includes(e.source_quote))throw Error('EXPECTED_SOURCE '+c.id+' '+e.source_quote);
  if(e.transformation_quote&&!c.transformation.includes(e.transformation_quote))throw Error('EXPECTED_TRANS '+c.id+' '+e.transformation_quote);
 }
}
const out='experiments/lc-02-r5/fixtures';mkdirSync(out,{recursive:true});
for(const [split,list] of Object.entries({development:dev,evaluation:ev})){
 const caseFile={schema:'language-semantic-checker-cases/0.1',split,standing:'AUTHOR_CONSTRUCTED_PROVISIONAL',cases:list.map(({expected,...c})=>c)};
 const refFile={schema:'language-semantic-checker-reference/0.1',split,standing:'AUTHOR_CONSTRUCTED_PROVISIONAL_NOT_INDEPENDENT_HUMAN_ADJUDICATION',cases:list.map(c=>({id:c.id,case_type:c.case_type,corruption_class:c.corruption_class,expected_policy:c.expected.policy,expected_findings:c.expected.findings,notes:c.case_type==='FAITHFUL'?'Faithful control: rejection is a false alarm.':c.case_type==='AMBIGUITY'?'Genuine ambiguity: clarification/abstention is appropriate.':'Deliberate corruption: a miss is a missed detection.'}))};
 writeFileSync(`${out}/${split}-cases.json`,JSON.stringify(caseFile,null,2)+'\n');
 writeFileSync(`${out}/${split}-references.json`,JSON.stringify(refFile,null,2)+'\n');
}
const files=['development-cases.json','evaluation-cases.json','development-references.json','evaluation-references.json'];
const freeze={schema:'language-semantic-checker-freeze/0.1',created:'2026-10-23',standing:'FROZEN_BEFORE_CHECKER_EXECUTION',files:Object.fromEntries(files.map(f=>[f,hash(readFileSync(`${out}/${f}`,'utf8'))]))};
writeFileSync(`${out}/FREEZE.json`,JSON.stringify(freeze,null,2)+'\n');
console.log(JSON.stringify({status:'R5_CORPUS_BUILT',development:dev.length,evaluation:ev.length,freeze},null,2));
