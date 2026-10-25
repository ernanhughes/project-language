function escapeHtml(value){
 return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}
export function html(result){
 const data=JSON.stringify(result).replaceAll('<','\\u003c');
 const live=result.standing?.startsWith('EXPLORATORY')&&result.real_requests>0;
 const notice=live
  ?'REAL-MODEL EXPLORATORY EVIDENCE · UNADJUDICATED · Human review pending. No comparative advantage, reliability or publication claim is established.'
  :'SYNTHETIC OFFLINE EVIDENCE · UNADJUDICATED · No real-model inference was executed. Scripted traces exercise contracts and presentation only.';
 const pre=result.preflight??{};
 const config=pre.config_status??result.config_status??'UNKNOWN';
 return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TRANSFER-01D · Communication comparison</title>
<style>
:root{color-scheme:dark}body{font:16px/1.55 system-ui,sans-serif;max-width:1280px;margin:24px auto;padding:20px;background:#0f2029;color:#e5eef4}
h1,h2,h3{line-height:1.2}h1{font-size:1.7rem}h2{font-size:1.25rem;margin-top:2rem}
a{color:#9fe3ef}button{padding:11px 14px;margin:4px 6px 4px 0;background:#234b5c;color:#fff;border:1px solid #83c4cf;border-radius:8px;cursor:pointer;font:inherit}
button[aria-pressed=true]{background:#1f6b50;border-color:#8ee0b6}button:focus-visible{outline:3px solid #f1c86b;outline-offset:2px}
.notice{padding:14px 16px;border:1px solid #d8b66f;background:#2b261a;color:#f4d995;border-radius:10px}
.warning{padding:12px 14px;border-left:4px solid #e28b72;background:#30201d;border-radius:6px}
section,details,article{background:#18323f;border-radius:12px;margin:14px 0;padding:16px}
details>summary{cursor:pointer;font-weight:650;padding:2px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12.5px/1.55 ui-monospace,Consolas,monospace;background:#0d1b23;padding:12px;border-radius:8px;max-height:520px;overflow:auto}
table{width:100%;border-collapse:collapse;margin:10px 0}th,td{padding:9px 10px;text-align:left;vertical-align:top;border-bottom:1px solid #3b5c6b}th{color:#b9d7e1}
code{background:#0d1b23;padding:2px 5px;border-radius:4px}.muted{color:#a8c1cc}.pill{display:inline-block;padding:2px 8px;border-radius:99px;background:#244d5d;font-size:.85rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.card{background:#102934;padding:12px;border-radius:9px}
</style>
<h1>Communication comparison · TRANSFER-01D</h1>
<p class="notice">${escapeHtml(notice)}</p>
<section>
 <h2>Run standing</h2>
 <div class="grid">
  <div class="card"><strong>Status</strong><br><span class="pill">${escapeHtml(result.status??'UNKNOWN')}</span></div>
  <div class="card"><strong>Evaluation standing</strong><br>${escapeHtml(result.standing??'UNKNOWN')}</div>
  <div class="card"><strong>Configuration</strong><br>${escapeHtml(config)}</div>
  <div class="card"><strong>Live authorized</strong><br>${escapeHtml(String(pre.live_authorized??false))}</div>
  <div class="card"><strong>Primary assessment</strong><br>NOT_ADJUDICATED</div>
  <div class="card"><strong>Real requests</strong><br>${escapeHtml(String(result.real_requests??0))}</div>
 </div>
 ${pre.status&&pre.status.startsWith('BLOCK')?`<p class="warning"><strong>Blocked:</strong> ${escapeHtml(pre.status)}. ${escapeHtml((pre.missing_primary_models??[]).join(', '))}</p>`:''}
</section>
<section>
 <h2>Source and withheld questions</h2>
 <details><summary>Original synthetic source</summary>${'<pre>'+escapeHtml(result.source??'')+'</pre>'}</details>
 <details><summary>Application questions (never shown to the sender)</summary>${'<pre>'+escapeHtml(JSON.stringify(result.questions??[],null,2))+'</pre>'}</details>
</section>
<section>
 <h2>Arm comparison</h2>
 <p class="muted">Byte counts are measurements of the transmitted packet, not token counts, accuracy scores or evidence of benefit.</p>
 <table><caption>Representation and transport only</caption>
 <thead><tr><th>Arm</th><th>Representation</th><th>Wire bytes</th><th>Source-quote bytes</th><th>History</th><th>Recipient call</th><th>Evaluator call</th><th>Primary</th></tr></thead>
 <tbody id="comparison"></tbody></table>
</section>
<nav id="arms" aria-label="Communication arms"></nav>
<main id="trace"></main>
<section>
 <h2>Boundary</h2>
 <p>Host mechanical checks verify source/message identity, hash and exact quotation spans. They do not establish entailment, semantic preservation or answer correctness. The advisory evaluator is one model and may be correlated with the sender or recipient. Human adjudication remains pending. Model/provider deviations, missing usage and billing are recorded as unknown rather than inferred.</p>
</section>
<script>
const result=${data};
const esc=${escapeHtml.toString()};
const j=x=>'<pre>'+esc(JSON.stringify(x,null,2))+'</pre>';
const detail=(title,body)=>'<details><summary>'+esc(title)+'</summary>'+body+'</details>';
document.querySelector('#comparison').innerHTML=(result.traces||[]).map(t=>{
 const d=t.delivery||{}, b=t.b||{}, c=t.c||{};
 return '<tr><th>'+esc(t.arm)+'</th><td>'+esc(d.packet?.representation??'')+'</td><td>'+esc(d.bytes??'')+'</td><td>'+esc(d.source_anchor_bytes??'')+'</td><td>'+esc((d.context?.included??[]).length)+'</td><td>'+esc(b.status??'SCRIPTED')+'</td><td>'+esc(c.status??'SCRIPTED')+'</td><td>'+esc(t.host_assessment?.primary??'NOT_ADJUDICATED')+'</td></tr>';
}).join('');
const arms=(result.traces||[]).map((t,i)=>'<button type="button" data-arm="'+i+'" aria-pressed="'+(i===0)+'">'+esc(t.arm)+'</button>').join('');
document.querySelector('#arms').innerHTML='<h2>Inspect an arm</h2>'+arms;
function paint(i){
 const t=result.traces[i];if(!t)return;
 document.querySelectorAll('button[data-arm]').forEach((b,k)=>b.setAttribute('aria-pressed',String(k===i)));
 const a=t.a||{}, b=t.b||{}, c=t.c||{}, d=t.delivery||{};
 const senderBody=j({reuse:t.sender_reuse??null,standing:a.standing??null,planned_model:a.planned_model??null,visible_input:a.visible?.messages?.[1]??null,sealed:a.sealed??null,output:a.output??t.sealed?.output??null,receipt:a.receipt??null});
 const deliveryBody=j(d);
 const receiverBody=j({exact_packet:d.packet??null,response:b.output??null,visible_input:b.visible?.messages?.[1]??null,receipt:b.receipt??b});
 const evaluatorBody=j({exact_input:c.visible?.messages?.[1]??null,advisory_output:c.output??null,receipt:c.receipt??c,standing:'ADVISORY_ONLY; NOT HUMAN ADJUDICATION'});
 const checks=j(t.host_assessment??null);
 const resources=j({resources:t.resources??null,receipts:t.receipts??null,usage_note:'Provider usage is reported only when the provider emitted it; actual invoice cost remains unknown.'});
 document.querySelector('#trace').innerHTML='<section><h2>'+esc(t.arm)+'</h2>'+detail('Sender · exact input and sealed output',senderBody)+detail('Delivery · exact packet received by recipient',deliveryBody)+detail('Receiver · previously withheld questions and response',receiverBody)+detail('Blind evaluator · advisory per-question judgments',evaluatorBody)+detail('Mechanical citation checks',checks)+detail('Resources and receipts',resources)+'</section>';
}
document.querySelectorAll('button[data-arm]').forEach(b=>b.addEventListener('click',()=>paint(Number(b.dataset.arm))));
paint(0);
</script>
</html>`;
}
