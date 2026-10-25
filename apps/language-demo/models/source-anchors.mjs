import {hash,assert} from '../protocol/state.mjs';
export function sourceAnchors(source){
 assert(source&&typeof source.id==='string'&&typeof source.text==='string'&&source.hash===hash(source.text),'ANCHOR_CATALOGUE_SOURCE_BINDING');
 const anchor=(start,end)=>({origin:'ORIGINAL_SOURCE',source_id:source.id,source_hash:source.hash,start,end,text:source.text.slice(start,end)});
 const spans=[anchor(0,source.text.length)];
 for(const s of new Intl.Segmenter('en',{granularity:'sentence'}).segment(source.text)){
  const trimmed=s.segment.trim();if(!trimmed)continue;const start=s.index+s.segment.indexOf(trimmed),end=start+trimmed.length;
  if(start!==0||end!==source.text.length)spans.push(anchor(start,end));
 }
 return {schema:'language-source-anchor-catalogue/0.1',offset_unit:'UTF16_CODE_UNITS',standing:'EXACT_SOURCE_LOCATIONS_NOT_SEMANTIC_SUPPORT',anchors:spans};
}
export function withSourceAnchors(input){
 const copy=structuredClone(input),source=copy.source??copy.packet?.source;
 if(source)copy.source_anchors=sourceAnchors(source);return copy;
}
