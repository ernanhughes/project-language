import {createServer} from 'node:http';import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';import {resolve,join,dirname} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {Studio} from '../engine/studio.mjs';import {scenario} from '../engine/scenario.mjs';import {Log} from '../storage/log.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function reportHTML(data){const escaped=JSON.stringify(data,null,2).replaceAll('&','&amp;').replaceAll('<','&lt;');return '<!doctype html><meta charset="utf-8"><title>Language Studio captured communication</title><h1>Language Studio · captured communication</h1><p>Offline replay; no regeneration. Fixtures are not model measurements. Semantic outcomes require review.</p><pre style="white-space:pre-wrap">'+escaped+'</pre>';}
export function server(studio=new Studio()){
 return createServer(async(req,res)=>{const send=(code,data,type='application/json')=>{res.writeHead(code,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(type==='application/json'?JSON.stringify(data):data);};try{
 const url=new URL(req.url,'http://127.0.0.1');
 if(req.method==='GET'&&url.pathname==='/api/state')return send(200,{...studio.view(),scenario});
 if(req.method==='GET'&&url.pathname==='/api/models')return send(200,await studio.runtime.discover());
 if(req.method==='GET'&&url.pathname==='/api/export'){Log.verify(studio.log.events);return send(200,studio.export());}
 if(req.method==='GET'&&url.pathname==='/api/report')return send(200,reportHTML(studio.export()),'text/html; charset=utf-8');
 if(req.method==='POST'&&url.pathname.startsWith('/api/')){if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'LOCAL_ORIGIN_REQUIRED'});let body='';for await(const b of req){body+=b; if(Buffer.byteLength(body)>100000)throw Error('REQUEST_TOO_LARGE');}const data=await studio.act(url.pathname.slice(5),JSON.parse(body||'{}'));return send(200,data);}
 const assets={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};if(req.method==='GET'&&assets[url.pathname]){const [p,t]=assets[url.pathname];return send(200,readFileSync(join(root,'ui',p),'utf8'),t+'; charset=utf-8');}return send(404,{error:'NOT_FOUND'});
 }catch(e){send(400,{error:e.message});}});
}
export async function start({port=0,data=join(root,'.data')}={}){const studio=new Studio({log:new Log(join(data,'events.jsonl'))});await studio.runtime.discover();const app=server(studio);await new Promise((ok,no)=>{app.once('error',no);app.listen(port,'127.0.0.1',ok);});return {app,studio,url:`http://127.0.0.1:${app.address().port}`};}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const portIndex=process.argv.indexOf('--port'),dataIndex=process.argv.indexOf('--data');const x=await start({port:portIndex<0?0:Number(process.argv[portIndex+1]),data:dataIndex<0?undefined:resolve(process.argv[dataIndex+1])});console.log('Language Studio · loopback local development · no external actions\n'+x.url);}
