import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {SOURCE} from '../../core/browser/fixtures/incident.ts';
import {developmentCases as studioCases} from '../../apps/language-demo/evaluation/cases.mjs';

const out='experiments/lc-03-p0/overlap-report.json';
const words=s=>new Set(String(s).toLowerCase().match(/[a-z0-9]+/g)||[]);
const jaccard=(a,b)=>{const A=words(a),B=words(b);let n=0;for(const x of A)if(B.has(x))n++;return n/(A.size+B.size-n);};

const candidates=[];
const corpora=[];
for(const exp of ['lc-02-r4','lc-02-r5','lc-02-r6','lc-02-r7']){
 for(const split of ['development','evaluation']){
  const p=`experiments/${exp}/fixtures/${split}-cases.json`;
  if(!existsSync(p))continue;
  const data=JSON.parse(readFileSync(p,'utf8'));
  for(const c of data.cases??[])if(c.source)candidates.push({corpus:`${exp}/${split}`,id:c.id,text:c.source});
  corpora.push(p);
 }
}
const batchBase='experiments/lc-02-batch20/.runs/COMBINED-001/cases';
if(existsSync(batchBase)){
 for(const rel of readdirSync(batchBase,{recursive:true})){
  if(!String(rel).endsWith('record.json'))continue;
  const p=join(batchBase,String(rel));
  try{const rec=JSON.parse(readFileSync(p,'utf8'));if(rec.source?.text)candidates.push({corpus:'lc-02-batch20',id:String(rel).split('\\').slice(-2).join('/'),text:rec.source.text});}catch{}
 }
 corpora.push(batchBase);
}
for(const c of studioCases)candidates.push({corpus:'studio-development',id:c.id,text:c.source.text});

const sources=[{id:'LC03-DEV-INCIDENT',path:'core/browser/fixtures/incident.ts',text:SOURCE}];
const rows=[];
for(const s of sources){
 let best={corpus:'',id:'',score:0,text:''};
 let exact=null;
 for(const c of candidates){
  if(c.text===s.text)exact={corpus:c.corpus,id:c.id};
  const score=jaccard(s.text,c.text);
  if(score>best.score)best={corpus:c.corpus,id:c.id,score,text:c.text};
 }
 rows.push({id:s.id,path:s.path,sha256:hash(s.text),chars:s.text.length,nearest:{corpus:best.corpus,id:best.id,jaccard:Number(best.score.toFixed(4))},exact_duplicate:exact,status:exact?'OVERLAP_EXACT':best.score>=0.45?'OVERLAP_NEAR':'CLEAN'});
}
const result={schema:'lc03-overlap-audit/0.1',created:'2026-10-24',standing:'PRE_FREEZE_SOURCE_OVERLAP_CHECK',method:'source-token Jaccard and exact match',threshold:0.45,corpora_checked:corpora.length,comparison_sources:candidates.length,rows,clean:rows.every(r=>r.status==='CLEAN'),note:'Only the LC-03 development fixture is audited here. Evaluation sources are not authored yet and must receive the same audit before freezing.'};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
