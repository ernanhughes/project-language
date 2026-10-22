import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
export const normalize=text=>text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const sourceId=text=>sha(normalize(text));
function shingles(text){const w=normalize(text).split(' ');if(w.length<5)return new Set(w);return new Set(w.slice(0,-4).map((_,i)=>w.slice(i,i+5).join(' ')));}
export function similar(a,b){if(sourceId(a)===sourceId(b))return true;const x=shingles(a),y=shingles(b);const shared=[...x].filter(v=>y.has(v)).length;return shared/(x.size+y.size-shared)>=0.8;}
// Prospective local selection helper. No download, auth, AI or automatic approval.
export function planSplit(rows,priorSources,{revision,ledgerComplete=false,devGroups=12}={}){
 if(!ledgerComplete||!Array.isArray(priorSources))throw Error('CONTAMINATION_LEDGER_REQUIRED');
 if(!/^[a-f0-9]{40}$/.test(revision??''))throw Error('IMMUTABLE_REVISION_REQUIRED');
 const sorted=rows.map((r,i)=>{if(!r.document||!r.right_summary||!r.hallucinated_summary)throw Error('DATASET_SCHEMA');return {...r,row:i,id:sourceId(r.document)};}).sort((a,b)=>a.id.localeCompare(b.id));
 const groups=[];
 // Union all connected near-duplicate components, including bridging documents.
 for(const row of sorted){const matches=groups.filter(g=>g.some(x=>similar(x.document,row.document)));const merged=[row,...matches.flat()];for(const g of matches)groups.splice(groups.indexOf(g),1);groups.push(merged);}
 groups.sort((a,b)=>a.map(x=>x.id).sort()[0].localeCompare(b.map(x=>x.id).sort()[0]));
 let eligible=0;const output=[];
 for(const group of groups){const excluded=group.some(x=>priorSources.some(p=>similar(x.document,p)));const split=excluded?'EXCLUDED_PRIOR_USE':eligible++<devGroups?'dev':'heldout';for(const r of group)output.push({id:`pminervini/HaluEval@${revision}/summarization/data/${r.row}`,source_hash:r.id,group:group.map(x=>x.id).sort()[0],split});}
 return output;
}
