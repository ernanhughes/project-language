import {z} from 'zod';
import {canonicalize,sha256Hex} from '../../../core/evidence/src/canonical.ts';
export const canonical=canonicalize, hash=x=>sha256Hex(typeof x==='string'?x:canonical(x));
export const Anchor=z.object({origin:z.literal('ORIGINAL_SOURCE'),source_id:z.string(),source_hash:z.string(),start:z.number().int().nonnegative(),end:z.number().int().positive(),text:z.string().min(1)}).strict();
export const Commitment=z.object({id:z.string().min(1),kind:z.enum(['claim','condition','exception','requirement','prohibition','source_permission','unknown']),text:z.string().min(1),standing:z.enum(['SOURCE_STATED','INFERRED','UNKNOWN']),evidence:z.array(Anchor),conditions:z.array(z.string()),exceptions:z.array(z.string())}).strict();
export const Proposal=z.object({schema:z.literal('language-state/0.1'),interpretation:z.string().min(1),outcome:z.string(),commitments:z.array(Commitment).min(1),contradictions:z.array(z.string()),unknowns:z.array(z.string()),preservation:z.array(z.string()),relations:z.array(z.object({from:z.string(),to:z.string(),type:z.enum(['CONDITIONS','EXCEPTION_TO','CONTRADICTS','SUPPORTS'])}).strict())}).strict();
export const Challenge=z.object({challenges:z.array(z.object({claim_id:z.string(),issue:z.string(),suggestion:z.string(),evidence:z.array(Anchor)}).strict())}).strict();
export const Answer=z.object({decision:z.enum(['YES','NO','UNKNOWN','SOURCE_CONFLICT']),explanation:z.string(),citations:z.array(Anchor)}).strict();
export function assert(ok,msg){if(!ok)throw Error(msg);}
export function validateAnchors(anchors,source){for(const a of anchors){Anchor.parse(a);assert(a.source_id===source.id&&a.source_hash===source.hash,'SOURCE_BINDING');assert(a.end>a.start&&source.text.slice(a.start,a.end)===a.text,'SOURCE_SPAN');}}
// Prospective host-side citation resolution. The host owns the canonical source
// hash; a receiving model only needs to reproduce the exact source id, span and
// text. A mismatched hash is resolved only when that exact span check passes.
// This never repairs a wrong span and never rewrites a historical response.
export function resolveAnchor(anchor,source,{allowHashRepair=true}={}){
 Anchor.parse(anchor);
 assert(anchor.source_id===source.id,'SOURCE_BINDING');
 assert(anchor.end>anchor.start&&source.text.slice(anchor.start,anchor.end)===anchor.text,'SOURCE_SPAN');
 if(anchor.source_hash===source.hash)return {anchor:{...anchor},resolution:'EXACT'};
 assert(allowHashRepair,'SOURCE_BINDING');
 return {anchor:{...anchor,source_hash:source.hash},resolution:'HOST_RESOLVED_HASH',supplied_source_hash:anchor.source_hash};
}
export function resolveCitations(anchors,source,options={}){
 const resolved=anchors.map(a=>resolveAnchor(a,source,options));
 return {citations:resolved.map(x=>x.anchor),resolutions:resolved.map(x=>x.resolution),supplied_hashes:resolved.map(x=>x.supplied_source_hash??null)};
}
export function validateProposal(value,source){Proposal.parse(value);const ids=value.commitments.map(x=>x.id);assert(new Set(ids).size===ids.length,'DUPLICATE_COMMITMENT');for(const c of value.commitments){validateAnchors(c.evidence,source);assert(c.standing!=='SOURCE_STATED'||c.evidence.length>0,'UNSUPPORTED_SOURCE_CLAIM');assert(c.kind!=='unknown'||c.standing==='UNKNOWN','UNKNOWN_IS_NOT_PERMISSION');}for(const r of value.relations)assert(ids.includes(r.from)&&ids.includes(r.to),'RELATION_TARGET');return {mechanical:'PASS',semantic:'REQUIRES_REVIEW',source_truth:'UNVERIFIED',contradictions:value.contradictions};}
