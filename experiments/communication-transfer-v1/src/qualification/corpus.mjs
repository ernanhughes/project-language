import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {hash,Question,Claim,Context} from './contracts.mjs';
import {scopeCovers} from '../../../../core/personal/src/applicability.ts';
const Approval=z.object({identity:z.string().nullable(),approved:z.boolean(),at:z.string().nullable(),source_hash:z.string().nullable()}).strict();
export const Task=z.object({schema:z.literal('transfer-pilot-task/1'),id:z.string(),version:z.literal(1),family:z.enum(['technical-policy','research-interpretation']),standing:z.literal('PROPOSED_UNADJUDICATED'),source:z.string().min(1),source_hash:z.string(),questions:z.array(Question).min(1),claims:z.array(Claim).min(1),plain_message:z.string().min(1),reference:z.array(z.object({question_id:z.string(),supported_decisions:z.array(z.enum(['YES','NO','UNKNOWN','SOURCE_CONFLICT'])),rationale:z.string(),permitted_alternatives:z.array(z.string()),critical_distinctions:z.array(z.string()),unsupported_controls:z.array(z.string()),abstention_conditions:z.array(z.string())}).strict()),approvals:z.object({task_author:Approval,independent_reviewer:Approval}).strict(),training_absence:z.literal('NOT_KNOWN')}).strict();
export function validateTask(value){const t=Task.parse(value);if(hash(t.source)!==t.source_hash)throw Error('TASK_SOURCE_HASH');const ids=t.questions.map(x=>x.id);if(new Set(ids).size!==ids.length||new Set(t.claims.map(x=>x.id)).size!==t.claims.length)throw Error('DUPLICATE_ID');if(JSON.stringify([...ids].sort())!==JSON.stringify(t.reference.map(x=>x.question_id).sort()))throw Error('REFERENCE_COVERAGE');for(const c of t.claims)if(t.source.slice(c.start,c.end)!==c.quote)throw Error('TASK_SPAN');return t;}
export function loadCorpus(){return ['deployment-policy-v1','study-interpretation-v1'].map(id=>validateTask(JSON.parse(readFileSync(new URL('../../fixtures/pilot-v1/'+id+'.json',import.meta.url),'utf8'))));}
export function independentlyApproved(t){const a=t.approvals.task_author,r=t.approvals.independent_reviewer;return Boolean(a.approved&&r.approved&&a.identity&&r.identity&&a.identity!==r.identity&&a.at&&r.at&&a.source_hash===t.source_hash&&r.source_hash===t.source_hash);}
export function syntheticContext(task,variant){
 const base={id:'history-'+variant,kind:'OBSERVED',origin:'authored-synthetic-review',status:'ACTIVE',scope:'transfer:'+task.id,expires:'2027-01-01T00:00:00Z',permission:{purpose:'transfer-01b',recipient:'B',transmit:true},version:1,conflicts:[],supported:true,text:task.family==='technical-policy'?'Prior review asked that operational scope and exceptions stay explicit.':'Prior review asked that observations be distinguished from causal explanations.'};
 if(variant==='unavailable')return [];
 if(variant==='irrelevant')return [{...base,scope:'transfer:unrelated-project',text:'Use green section headings.'}];
 if(variant==='expired')return [{...base,status:'EXPIRED',expires:'2020-01-01T00:00:00Z'}];
 if(variant==='conflicting')return [{...base,id:'h-a',kind:'DECLARED',conflicts:['h-b'],text:'Prefer brevity even if qualifiers are lost.'},{...base,id:'h-b',kind:'DECLARED',conflicts:['h-a'],text:'Retain all consequential qualifiers.'}];
 if(variant!=='relevant')throw Error('ABLATION_UNKNOWN');return [base];
}
export function admitContext(task,candidates,now='2026-10-22T12:00:00Z'){
 const included=[],excluded=[];
 for(const item of candidates){const schema=Context.safeParse(item),reasons=[];
  if(!schema.success){excluded.push({id:item.id??'unknown',reasons:['SCHEMA_INVALID']});continue;}
  if(item.status!=='ACTIVE'||Date.parse(item.expires)<=Date.parse(now))reasons.push('EXPIRED_OR_INACTIVE');
  if(!scopeCovers(item.scope,'transfer:'+task.id))reasons.push('IRRELEVANT_SCOPE');
  if(!item.permission.transmit)reasons.push('CONSENT_MISSING');
  if(!item.supported)reasons.push('UNSUPPORTED_HISTORY');
  if(item.conflicts.length||candidates.some(x=>x.conflicts?.includes(item.id)))reasons.push('CONFLICT_UNRESOLVED');
  if(reasons.length)excluded.push({id:item.id,reasons});else included.push(item);
 }
 return {candidates,included,excluded};
}
export function makePacket(task,arm,sender,variant='relevant'){
 const channel={schema:'transfer-channel/1',source_hash:task.source_hash,objective:'Answer each question from the available information while preserving its limits.',questions:task.questions,message:arm==='SOURCE'?task.source:sender.message};
 if(['LINKED','CONTEXT'].includes(arm))channel.claims=sender.claims;
 const context=admitContext(task,arm==='CONTEXT'?syntheticContext(task,variant):[]);
 if(arm==='CONTEXT')channel.context={historical:context.included,current:{id:'current-task',kind:'DECLARED',origin:'synthetic-task',status:'ACTIVE',scope:'transfer:'+task.id,expires:'2027-01-01T00:00:00Z',permission:{purpose:'transfer-01b',recipient:'B',transmit:true},version:1,conflicts:[],supported:true,text:'This is an interpretation task, not authorization to execute actions.'}};
 if(!['SOURCE','PLAIN','LINKED','CONTEXT'].includes(arm))throw Error('ARM_INVALID');
 const wire=JSON.stringify(channel),bytes=Buffer.byteLength(wire);
 if(arm!=='SOURCE'&&(channel.message===task.source||channel.claims?.some(c=>c.quote===task.source)))throw Error('HIDDEN_SOURCE');
 if(arm!=='SOURCE'&&bytes>3000)throw Error('CHANNEL_BUDGET');
 for(const c of sender.claims)if(task.source.slice(c.start,c.end)!==c.quote)throw Error('SENDER_SPAN');
 return {packet:channel,wire,wire_hash:hash(wire),bytes,source_bytes:Buffer.byteLength(task.source),quotation_bytes:channel.claims?.reduce((n,x)=>n+Buffer.byteLength(x.quote),0)??0,context};
}
export function hostAssessment(task,receiver,advice){
 const diagnostics=receiver.answers.map(a=>{const r=task.reference.find(x=>x.question_id===a.id);return {question_id:a.id,decision_matches_authored:r.supported_decisions.includes(a.decision),unsupported_quotes:a.quotes.filter(q=>!task.source.includes(q)),distinctions:'NOT_ADJUDICATED',unsupported_claims:'NOT_ADJUDICATED',uncertainty:'NOT_ADJUDICATED',appropriate_abstention:'NOT_ADJUDICATED'};});
 return {primary_status:independentlyApproved(task)?'AWAITING_BLINDED_RESPONSE_ADJUDICATION':'NOT_ADJUDICATED',reference_standing:task.standing,diagnostics,advisory_separate:true,scripted_false_endorsement:advice.supported&&diagnostics.some(x=>!x.decision_matches_authored||x.unsupported_quotes.length>0),scripted_missed_valid_refusal:!advice.valid_abstention&&receiver.answers.some(a=>a.decision==='UNKNOWN'&&task.reference.find(x=>x.question_id===a.id).supported_decisions.includes('UNKNOWN'))};
}
