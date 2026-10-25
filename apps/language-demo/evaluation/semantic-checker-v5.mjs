import {UnderstandingCompiler,interpretationProfile} from '../../../core/understanding/adapter.mjs';
import {hash} from '../protocol/state.mjs';
import {CHECKER_VERSION,FINDING_TYPES,STANDING,countFindings,finding,sourceAnchor,transformationAnchor,validateCheckInput,validateCheckOutput} from './semantic-checker-v5-contract.mjs';

const STOP=new Set('a an the and or of to in on for with by is are was were be been being this that these those it its their they them from as at if when only provided unless once may can must shall should will would could might not no never none neither without cannot into than then there here which who whom whose what while where why how all any each every some more most less least very also just such other another same own so only over under again further both few many much'.split(' '));
const SYN={
 'permit':'allow','permits':'allow','permitted':'allow','permission':'allow','authorise':'allow','authorises':'allow','authorised':'allow','authorize':'allow','authorized':'allow','may':'allow','can':'allow',
 'prohibit':'forbid','prohibits':'forbid','prohibited':'forbid','prohibition':'forbid','forbidden':'forbid','mustnot':'forbid',
 'require':'need','requires':'need','required':'need','requirement':'need','shall':'need','must':'need',
 'approve':'approve','approves':'approve','approved':'approve','approval':'approve','accept':'accept','accepts':'accept','accepted':'accept','acceptance':'accept',
 'unknown':'uncertain','undecided':'uncertain','unresolved':'uncertain','uncertainty':'uncertain','ambiguous':'uncertain','ambiguity':'uncertain',
 'copy':'copy','copies':'copy','copied':'copy','copying':'copy','duplicate':'copy','duplicates':'copy','duplicated':'copy',
 'delete':'delete','deletes':'delete','deleted':'delete','deletion':'delete','remove':'delete','removes':'delete','removed':'delete',
 'retain':'retain','retains':'retain','retained':'retain','retention':'retain','keep':'retain','keeps':'retain','kept':'retain',
 'intact':'intact','unaltered':'intact','unchanged':'intact','remain':'remain','remains':'remain','stays':'remain','stay':'remain','completion':'complete','completed':'complete','complete':'complete',
 'restore':'restore','restores':'restore','restored':'restore','restoration':'restore',
 'verify':'verify','verifies':'verify','verified':'verify','verification':'verify',
 'signature':'signature','signatures':'signature','signed':'signature','sign':'signature',
 'isolated':'isolated','isolation':'isolated','sealed':'isolated',
 'temporary':'temporary','temporarily':'temporary','standalone':'temporary',
 'before':'before','prior':'before','earlier':'before','preceding':'before',
 'after':'after','following':'after','later':'after','subsequent':'after',
 'until':'until','till':'until','through':'until',
 'permission':'allow','obligation':'need','prohibition':'forbid',
 'vendor':'vendor','supplier':'vendor',
 'replica':'replica','database':'database','db':'database',
 'key':'key','credential':'key','credentials':'key',
 'log':'log','logs':'log','record':'log','records':'log',
 'image':'image','build':'image',
 'plan':'plan','rollout':'rollout','deployment':'deployment'
};
function norm(s){return String(s??'').toLowerCase().replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\s+/g,' ').trim();}
function words(s){return norm(s).match(/[a-z0-9]+(?:-[a-z0-9]+)?/g)??[];}
function stem(w){if(SYN[w])return SYN[w];if(w.length>5&&w.endsWith('ing'))return w.slice(0,-3);if(w.length>4&&w.endsWith('ed'))return w.slice(0,-2);if(w.length>4&&w.endsWith('es'))return w.slice(0,-2);if(w.length>3&&w.endsWith('s'))return w.slice(0,-1);return w;}
function content(s){return [...new Set(words(s).filter(w=>!STOP.has(w)).map(stem).filter(w=>w.length>1))];}
function overlap(a,b){const A=new Set(content(a)),B=new Set(content(b));let n=0;for(const x of A)if(B.has(x))n++;return {n,j:A.size?B.size?n/(A.size+B.size-n):0:0,c:A.size&&B.size?n/Math.min(A.size,B.size):0};}
function numbers(s){return (norm(s).match(/\b\d+(?:\.\d+)?\b/g)??[]);}
function quotes(s){const out=[];for(const m of String(s).matchAll(/"([^"]{2,240})"/g))out.push(m[1]);return out;}
function speaker(s){const m=String(s).match(/^\s*([A-Z][A-Za-z .'-]{0,40}):\s+/);return m?m[1].trim():'';}

function features(text){
 const t=norm(text);
 const prohibition=/\b(must not|shall not|may not|cannot|can't|prohibited|forbidden|not allowed|not authori[sz]ed)\b/.test(t);
 const uncertainty=/\b(may indicate|might|could|unknown|undecided|unresolved|not (?:yet )?decided|not established|not confirmed|possible|possibly|unclear|ambiguous|whether)\b/.test(t);
 const obligation=/\b(must|shall|required|requires|need|needs)\b/.test(t);
 const permission=/\b(may|can|permitted|allowed|authori[sz]ed|entitled)\b/.test(t);
 const modality=prohibition?'PROHIBITION':uncertainty?'UNCERTAINTY':obligation?'OBLIGATION':permission?'PERMISSION':'ASSERTION';
 const conditional=/\b(if|when|only if|provided|unless|once|requires|required)\b/.test(t);
 const exception=/\b(except|unless|does not allow|does not apply|not covered|excluding|but not)\b/.test(t);
 const causal=/\b(because|therefore|thus|hence|as a result|due to|causes|caused|causing|leads to|led to|resulted in|results in|so that)\b/.test(t);
 const temporal=/\b(before|after|until|during|within|by|no later than|prior to|following)\b/.test(t);
 const scope=/\b(all|only|any|every|no more than|at least|more than|less than|exactly)\b/.test(t);
 const negText=t.replace(/\bno (more|less|later|fewer) than\b/g,'at most');
 const negated=/\b(not|never|no|none|neither|without|cannot|can't)\b/.test(negText);
 const ambiguity=/\b(whether|unknown|undecided|unresolved|does not (?:state|show|specify|establish|confirm)|not (?:yet )?decided|ambiguous|ambiguity)\b/.test(t);
 return {text,prohibition,uncertainty,obligation,permission,modality,conditional,exception,causal,temporal,scope,negated,ambiguity,speaker:speaker(text),quotes:quotes(text),numbers:numbers(text)};
}
function temporalPairs(text){
 const t=norm(text);const tokens=words(t);const cues=new Set(['before','prior','after','following','until','during','within','by']);
 const out=[];
 for(let i=0;i<tokens.length;i++)if(cues.has(tokens[i])){
  const left=tokens.slice(Math.max(0,i-5),i).filter(w=>!STOP.has(w)&&!cues.has(w)).map(stem);
  const right=tokens.slice(i+1,Math.min(tokens.length,i+6)).filter(w=>!STOP.has(w)&&!cues.has(w)).map(stem);
  out.push({cue:tokens[i]==='prior'?'before':tokens[i]==='following'?'after':tokens[i],left:left.join(' '),right:right.join(' ')});
 }
 return out;
}
function exceptionText(text){
 const m=String(text).match(/\b(?:except|unless|does not allow|does not apply|not covered|excluding|but not)\b(.{0,160})/i);
 return m?m[1].trim():'';
}
function align(sourceUnits,transUnits){
 const pairs=[];
 for(const s of sourceUnits){
  let best=null;
  for(const t of transUnits){const o=overlap(s.text,t.text);const score=0.62*o.j+0.38*o.c+(numbers(s.text).some(n=>numbers(t.text).includes(n))?0.08:0);if(!best||score>best.score)best={source:s,trans:t,score};}
  if(best&&best.score>=0.28)pairs.push(best);
 }
 return pairs;
}
function bestTrans(source,transUnits){let best=null;for(const t of transUnits){const o=overlap(source.text,t.text);let score=0.62*o.j+0.38*o.c;if(t.features.modality===source.features.modality)score+=0.6;if(!best||score>best.score)best={source,trans:t,score};}return best;}
function bestSource(trans,sourceUnits){let best=null;for(const s of sourceUnits){const o=overlap(s.text,trans.text);const score=0.62*o.j+0.38*o.c;if(!best||score>best.score)best={source:s,trans,score};}return best;}
function bestUncertaintySource(trans,sourceUnits){
 let best=null;
 for(const s of sourceUnits){
  const o=overlap(s.text,trans.text);let score=0.62*o.j+0.38*o.c;
  if(s.features.ambiguity||s.features.uncertainty)score+=1.0;
  if((s.prerequisites??[]).length)score+=0.25;
  if(!best||score>best.score)best={source:s,trans,score};
 }
 return best;
}
function clauseParts(text){return String(text).split(/;(?=\s)|,(?!\s*(?:except|unless|but not|excluding)\b)|\s+and\s+(?=(?:must|may|shall|can|will|should)\b)/i).map(x=>x.trim()).filter(Boolean);}
function transClauses(units){const out=[];for(const u of units){const parts=clauseParts(u.text);if(parts.length<2){out.push({...u,fullText:u.text});continue;}let cursor=0;for(const p of parts){const idx=u.text.indexOf(p,cursor);const start=idx>=0?idx:cursor;cursor=Math.max(cursor,start+p.length);out.push({id:u.id+'-c'+out.length,text:p,start:u.start+start,end:u.start+start+p.length,features:features(p),prerequisites:[],speaker:speaker(p),unresolved:false,fullText:u.text});}}return out.length?out:units;}
function bestSubclause(sourceText,transText,sourceFeatures){
 const parts=String(transText).split(/[;,]/).map(x=>x.trim()).filter(Boolean);
 let best=transText,bestScore=-1;
 for(const p of parts){const pf=features(p);const score=overlap(sourceText,p).c+(sourceFeatures&&pf.modality===sourceFeatures.modality?0.45:0);if(score>bestScore){bestScore=score;best=p;}}
 return bestScore>=0.3?best:transText;
}

function unitsFromInventory(inventory){
 return inventory.meaning_units.map(u=>{
  const derived=(u.classification.prerequisites??[]).length?u.classification.prerequisites:(()=>{
   const m=String(u.source_quote).match(/\b(?:only if|if|when|provided that|provided|requires?|requiring)\b\s+(.+?)(?:[.;]|$)/i);
   return m?[m[1].trim()]:[];
  })();
  return {id:u.id,text:u.source_quote,start:u.start,end:u.end,features:features(u.source_quote),prerequisites:derived,speaker:u.classification.speaker??'',unresolved:u.classification.possible_unresolved_reference??false};
 });
}
function sentenceUnits(text){return new Intl.Segmenter('en',{granularity:'sentence'}).segment(text).map((s,i)=>({id:'s'+(i+1),text:s.segment.trim(),start:s.index,end:s.index+s.segment.trim().length,features:features(s.segment),prerequisites:[],speaker:speaker(s.segment),unresolved:false})).filter(x=>x.text);}

function materialIssues(s,t){
 const out=[];const reason=(x)=>`Source says “${s.text}”; transformation says “${t.text}”. ${x}`;
 const tf=features(bestSubclause(s.text,t.text,s.features));
 const negDiff=s.features.negated!==tf.negated;
 if(negDiff)out.push({type:'CHANGED_CANDIDATE',distinction:'NEGATION_REVERSAL',severity:'MATERIAL',confidence:'HIGH',reason:reason('Negation polarity differs.')});
 if(!negDiff&&s.features.modality!==tf.modality){
  if(s.features.modality==='UNCERTAINTY'&&tf.modality!=='UNCERTAINTY')out.push({type:'CHANGED_CANDIDATE',distinction:'UNKNOWN_TO_ESTABLISHED_FACT',severity:'MATERIAL',confidence:'HIGH',reason:reason('Source uncertainty was converted into an established claim.')});
  else if(tf.modality!=='UNCERTAINTY')out.push({type:'CHANGED_CANDIDATE',distinction:'MODALITY_CHANGE',severity:'MATERIAL',confidence:'HIGH',reason:reason('Permission/obligation/prohibition modality differs.')});
 }
 if(/\b(not grant|not authori[sz]e|not permit|no permission|not allowed|does not grant|does not authori[sz]e|does not permit)\b/.test(norm(s.text))&&tf.permission)out.push({type:'UNSUPPORTED_ADDITION_CANDIDATE',distinction:'INVENTED_AUTHORITY',severity:'MATERIAL',confidence:'HIGH',reason:reason('The source denies authority but the transformation asserts permission.')});
 if(s.features.uncertainty&&!tf.uncertainty)out.push({type:'CHANGED_CANDIDATE',distinction:'UNKNOWN_TO_ESTABLISHED_FACT',severity:'MATERIAL',confidence:'HIGH',reason:reason('Source hedges or leaves the matter unresolved; transformation states it without the hedge.')});
 if(tf.causal&&!s.features.causal)out.push({type:'UNSUPPORTED_ADDITION_CANDIDATE',distinction:'UNSUPPORTED_CAUSAL',severity:'MATERIAL',confidence:'MEDIUM',reason:reason('The transformation adds a causal relation not stated in the aligned source meaning.')});
 if(s.features.exception){
  const se=exceptionText(s.text),te=exceptionText(t.text);
  if(!te)out.push({type:'MISSING_CANDIDATE',distinction:'BROADENED_EXCEPTION',severity:'MATERIAL',confidence:'MEDIUM',reason:reason('The source exception is absent or no longer stated as an exception.')});
  else if(overlap(se,te).c<0.6||content(se).some(x=>!content(te).includes(x)))out.push({type:'CHANGED_CANDIDATE',distinction:'BROADENED_EXCEPTION',severity:'MATERIAL',confidence:'MEDIUM',reason:reason(`Exception changed from “${se}” to “${te}”.`)});
 }
 if(s.features.temporal&&tf.temporal){
  const sp=temporalPairs(s.text),tp=temporalPairs(t.text);
  if(sp.length&&tp.length&&sp[0].cue!==tp[0].cue)out.push({type:'CHANGED_CANDIDATE',distinction:'TEMPORAL_ORDER',severity:'MATERIAL',confidence:'HIGH',reason:reason(`Temporal direction changed from ${sp[0].cue} to ${tp[0].cue}.`)});
  else if(sp.length&&tp.length&&sp[0].left&&tp[0].left&&overlap(sp[0].left,tp[0].left).c<0.5)out.push({type:'CHANGED_CANDIDATE',distinction:'TEMPORAL_ORDER',severity:'MATERIAL',confidence:'MEDIUM',reason:reason('The entities around the temporal relation appear reversed or replaced.')});
 }
 if(s.features.speaker&&tf.speaker&&norm(s.features.speaker)!==norm(tf.speaker))out.push({type:'CHANGED_CANDIDATE',distinction:'MISATTRIBUTED_QUOTATION_OR_SPEAKER',severity:'MATERIAL',confidence:'HIGH',reason:reason(`Speaker changed from ${s.features.speaker} to ${tf.speaker}.`)});
 if(s.features.quotes.length&&tf.quotes.length&&overlap(s.features.quotes.join(' '),tf.quotes.join(' ')).c<0.5)out.push({type:'CHANGED_CANDIDATE',distinction:'MISATTRIBUTED_QUOTATION_OR_SPEAKER',severity:'MATERIAL',confidence:'MEDIUM',reason:reason('Quoted content differs.')});
 if(s.features.scope&&tf.scope){
  const sn=numbers(s.text),tn=numbers(t.text);
  if(sn.length&&tn.length&&sn.join(',')!==tn.join(','))out.push({type:'CHANGED_CANDIDATE',distinction:'SCOPE_OR_QUANTITY_CHANGE',severity:'MATERIAL',confidence:'HIGH',reason:reason(`Quantity changed from ${sn.join(',')} to ${tn.join(',')}.`)});
 }
 for(const p of s.prerequisites??[]){
  if(!String(t.fullText??t.text).toLowerCase().includes(p.toLowerCase())&&overlap(p,t.fullText??t.text).c<0.55)out.push({type:'MISSING_CANDIDATE',distinction:'MISSING_PREREQUISITE',severity:'MATERIAL',confidence:'MEDIUM',reason:reason(`The required condition “${p}” is not preserved in the transformation.`)});
 }
 if((s.unresolved||s.features.ambiguity)&&!tf.uncertainty){
  const srcCandidates=words(s.text).filter(w=>!STOP.has(w)&&w.length>3);
  if(srcCandidates.some(w=>t.text.toLowerCase().includes(w)))out.push({type:'CHANGED_CANDIDATE',distinction:'WRONG_CROSS_SENTENCE_REFERENCE',severity:'MATERIAL',confidence:'MEDIUM',reason:reason('The source flags an unresolved reference; the transformation resolves or replaces it without preserving the ambiguity.')});
 }
 return out;
}

function assessUncertainty(value,sourceUnits,transUnits){
 const assessments=[];let n=0;
 for(const t of transUnits.filter(x=>x.features.uncertainty)){
  const best=bestUncertaintySource(t,sourceUnits);const s=best?.source;
  const required=[...(s?.prerequisites??[])];
  const established=[],denied=[],unresolved=[],ambiguous=[],extra=[];
  if(s){
   if(s.features.ambiguity||s.features.uncertainty)unresolved.push(s.text);
   if(s.features.prohibition||(s.features.negated&&!s.features.ambiguity))denied.push(s.text);
   for(const p of s.prerequisites??[]){
    const support=sourceUnits.find(u=>u!==s&&!u.features.uncertainty&&overlap(p,u.text).c>=0.8);
    if(support)established.push(p);else unresolved.push(p);
   }
   for(const m of s.text.matchAll(/["“]([^"”]+)["”]\s+refers to\s+([^.;]+)/gi))ambiguous.push(m[1]);
  }
  let status;
  if(!s){status='UNSUPPORTED_UNCERTAINTY';extra.push('No relevant source claim was found.');}
  else if(unresolved.length||s.features.ambiguity||s.features.uncertainty)status='SUPPORTED_UNCERTAINTY';
  else if(denied.length){status='UNSUPPORTED_UNCERTAINTY';extra.push('The relevant source claim is explicitly denied.');}
  else {status='UNSUPPORTED_UNCERTAINTY';extra.push('The relevant source claim is stated without a hedge or unresolved condition.');}
  const sourceSpan=s?sourceAnchor(value.source,s.text):sourceAnchor(value.source,sourceUnits[0]?.text??value.source.text);
  assessments.push({id:'u'+(++n),claim:t.text,source_spans:[sourceSpan],transformation_spans:[transformationAnchor(value.transformation,t.text)],required_conditions:required,established_conditions:established,denied_conditions:denied,unresolved_conditions:unresolved,ambiguous_referents:ambiguous,extra_assumptions:extra,epistemic_scope:'SOURCE_RELATIVE',status,method:'LEXICAL_RULE_HEURISTIC',standing:'CANDIDATE_REQUIRES_REVIEW'});
 }
 return assessments;
}


async function inventories(input,compiler){
 const profile=interpretationProfile(input.profile);
 const [si,ti]=await compiler.compileMany([
  {source_id:input.source.id,source_text:input.source.text,profile:input.profile,profile_version:profile.version,context:input.context},
  {source_id:input.transformation.id,source_text:input.transformation.text,profile:input.profile,profile_version:profile.version,context:{...input.context,purpose:(input.context.purpose??'')+' [transformation]'}}
 ]);
 return {si,ti,profile,compiler:compiler.identity(input.profile)};
}

function obligationsToUnits(input,sourceUnits){
 if(!input.obligations.length)return sourceUnits;
 const out=[];
 for(const o of input.obligations){
  let best=null;for(const u of sourceUnits){const score=u.text.includes(o.source_quote)||o.source_quote.includes(u.text)?1:overlap(u.text,o.source_quote).c;if(!best||score>best.score)best={unit:u,score};}
  if(best&&best.score>=0.3&&!out.some(u=>u.id===best.unit.id))out.push(best.unit);
 }
 return out;
}

export async function checkTransformation(input,{compiler=new UnderstandingCompiler()}={}){
 const value=validateCheckInput(input);const {si,ti,compiler:identity}=await inventories(value,compiler);
 const sourceUnits=si.meaning_units.length?unitsFromInventory(si):sentenceUnits(value.source.text);
 const transUnits=ti.meaning_units.length?unitsFromInventory(ti):sentenceUnits(value.transformation.text);
 const matchUnits=transClauses(transUnits);
 const obligated=obligationsToUnits(value,sourceUnits);
 const findings=[];let n=0;
 const mk=(type,distinction,ss,ts,extra={})=>findings.push(finding({id:'f'+(++n),type,distinction,sourceSpans:ss,transformationSpans:ts,...extra}));
 for(const s of obligated){
  const best=bestTrans(s,matchUnits);
  if(!best||best.score<0.28){mk('MISSING_CANDIDATE',s.prerequisites.length?'MISSING_PREREQUISITE':'MISSING_MEANING',[sourceAnchor(value.source,s.text)],[],{confidence:'MEDIUM',reason:`The obligated source meaning “${s.text}” has no adequate counterpart in the transformation.`});continue;}
  const issues=materialIssues(s,best.trans);
  if(best.trans.features.uncertainty){continue;}
  if(!issues.length)mk('PRESERVED_CANDIDATE','PRESERVED',[sourceAnchor(value.source,s.text)],[transformationAnchor(value.transformation,best.trans.text)],{severity:'INFO',confidence:best.score>=0.6?'HIGH':'MEDIUM',reason:`The obligated source meaning has a candidate counterpart in the transformation (alignment ${best.score.toFixed(2)}).`});
  else for(const x of issues)mk(x.type,x.distinction,[sourceAnchor(value.source,s.text)],[transformationAnchor(value.transformation,best.trans.text)],{severity:x.severity,confidence:x.confidence,reason:x.reason});
 }
 for(const t of matchUnits){
  const best=bestSource(t,sourceUnits);
  if(best&&best.score>=0.32)continue;
  if(overlap(t.text,value.source.text).c>=0.6)continue;
  const f=t.features;
  const distinction=f.causal?'UNSUPPORTED_CAUSAL':f.uncertainty?'UNSUPPORTED_UNCERTAINTY':f.modality==='PERMISSION'||f.modality==='OBLIGATION'?'INVENTED_AUTHORITY':'UNSUPPORTED_CONTENT';
  const context=best?.source??sourceUnits[0];
  mk('UNSUPPORTED_ADDITION_CANDIDATE',distinction,context?[sourceAnchor(value.source,context.text)]:[],[transformationAnchor(value.transformation,t.text)],{confidence:'MEDIUM',reason:`No adequate source counterpart supports the transformation unit “${t.text}” (best alignment ${best?best.score.toFixed(2):'none'}).`});
 }
 const uncertainty_assessments=assessUncertainty(value,sourceUnits,transUnits);
 for(const a of uncertainty_assessments){
  if(findings.some(f=>f.transformation_spans.some(s=>s.text===a.claim)))continue;
  if(a.status==='SUPPORTED_UNCERTAINTY')mk('UNRESOLVED','SOURCE_AMBIGUITY',a.source_spans,a.transformation_spans,{severity:'MINOR',confidence:'MEDIUM',reason:`The uncertainty in “${a.claim}” is grounded in the source: ${a.unresolved_conditions.join('; ')||'the source leaves the relevant condition or reference unresolved'}.`});
  else if(a.status==='INDETERMINATE')mk('UNRESOLVED','METHOD_LIMIT',a.source_spans,a.transformation_spans,{severity:'MINOR',confidence:'LOW',reason:`The checker cannot determine whether the uncertainty in “${a.claim}” is supported.`});
  else mk('UNSUPPORTED_ADDITION_CANDIDATE','UNSUPPORTED_UNCERTAINTY',a.source_spans,a.transformation_spans,{severity:'MATERIAL',confidence:'MEDIUM',reason:`The transformation adds uncertainty in “${a.claim}” despite a source claim that is stated without an unresolved condition. ${a.extra_assumptions.join(' ')}`});
 }
 if(!findings.length)mk('NOT_ASSESSED','METHOD_LIMIT',[],[],{severity:'INFO',confidence:'LOW',reason:'No source or transformation meaning units were available to compare.'});
 const summary=countFindings(findings);
 const output={schema:'language-semantic-check/0.1',contract_version:CHECKER_VERSION,standing:STANDING,source:{id:value.source.id,hash:value.source.hash},transformation:{id:value.transformation.id,hash:value.transformation.hash},findings,uncertainty_assessments,summary,dependencies:{compiler:identity,method:'LEXICAL_ALIGNMENT_WITH_COMPILER_INVENTORY',model_assisted:false},action_authority:false,human_acceptance:'REQUIRED_FOR_ANY_TRANSMISSION',repair:'NOT_PERFORMED'};
 return validateCheckOutput(output,{source:{id:value.source.id,hash:value.source.hash,text:value.source.text},transformation:{id:value.transformation.id,hash:value.transformation.hash,text:value.transformation.text}});
}

export async function checkLexicalBaseline(input){
 const value=validateCheckInput(input);const profile=interpretationProfile(value.profile);
 const compiler=new UnderstandingCompiler();
 const {si,ti}=await inventories(value,compiler);
 const sourceUnits=si.meaning_units.length?unitsFromInventory(si):sentenceUnits(value.source.text);
 const transUnits=ti.meaning_units.length?unitsFromInventory(ti):sentenceUnits(value.transformation.text);
 const obligated=obligationsToUnits(value,sourceUnits);
 const findings=[];let n=0;const mk=(type,distinction,ss,ts,extra={})=>findings.push(finding({id:'b'+(++n),type,distinction,sourceSpans:ss,transformationSpans:ts,method:'LEXICAL_BASELINE',...extra}));
 for(const s of obligated){
  if(norm(value.transformation.text).includes(norm(s.text)))mk('PRESERVED_CANDIDATE','PRESERVED',[sourceAnchor(value.source,s.text)],[transformationAnchor(value.transformation,s.text)],{severity:'INFO',confidence:'HIGH',reason:'Exact normalized source unit appears in the transformation.'});
  else mk('MISSING_CANDIDATE','MISSING_MEANING',[sourceAnchor(value.source,s.text)],[],{confidence:'HIGH',reason:'Exact normalized source unit does not appear in the transformation.'});
 }
 for(const t of transUnits)if(!norm(value.source.text).includes(norm(t.text)))mk('UNSUPPORTED_ADDITION_CANDIDATE','UNSUPPORTED_CONTENT',[],[transformationAnchor(value.transformation,t.text)],{confidence:'HIGH',reason:'Transformation sentence does not appear exactly in the source.'});
 if(!findings.length)mk('NOT_ASSESSED','METHOD_LIMIT',[],[],{severity:'INFO',confidence:'LOW',reason:'No exact-match obligations or units.'});
 return validateCheckOutput({schema:'language-semantic-check/0.1',contract_version:CHECKER_VERSION,standing:STANDING,source:{id:value.source.id,hash:value.source.hash},transformation:{id:value.transformation.id,hash:value.transformation.hash},findings,uncertainty_assessments:[],summary:countFindings(findings),dependencies:{compiler:compiler.identity(value.profile),method:'EXACT_QUOTE_MATCH_BASELINE',model_assisted:false},action_authority:false,human_acceptance:'REQUIRED_FOR_ANY_TRANSMISSION',repair:'NOT_PERFORMED'},{source:{id:value.source.id,hash:value.source.hash,text:value.source.text},transformation:{id:value.transformation.id,hash:value.transformation.hash,text:value.transformation.text}});
}

export function policyAssessment(output){
 const f=output.findings;
 const material=f.filter(x=>['CHANGED_CANDIDATE','UNSUPPORTED_ADDITION_CANDIDATE','MISSING_CANDIDATE'].includes(x.type)&&x.severity==='MATERIAL');
 const unresolved=f.filter(x=>x.type==='UNRESOLVED');
 const notAssessed=f.filter(x=>x.type==='NOT_ASSESSED');
 const preserved=f.filter(x=>x.type==='PRESERVED_CANDIDATE');
 let outcome='REQUEST_CLARIFICATION';
 if(material.length)outcome='PRESERVE_SOURCE';
 else if(unresolved.length||notAssessed.length)outcome='REQUEST_CLARIFICATION';
 else if(preserved.length)outcome='USE_TRANSFORMATION';
 return {schema:'language-semantic-check-policy/0.1',outcome,basis:{material:material.map(x=>x.id),unresolved:unresolved.map(x=>x.id),not_assessed:notAssessed.map(x=>x.id),preserved:preserved.map(x=>x.id)},action_authority:false,human_acceptance:'REQUIRED_FOR_ANY_TRANSMISSION',note:'Findings are assessments; the policy is a separate test-only decision.'};
}
export function policyDecision(output){return policyAssessment(output).outcome;}
