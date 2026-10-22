import {readFileSync,appendFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {hash,canonical,assert} from '../protocol/state.mjs';
export class Log{
 constructor(path){this.path=path;this.events=[];if(path&&existsSync(path)){const raw=readFileSync(path,'utf8');assert(!raw||raw.endsWith('\n'),'INCOMPLETE_LOG');this.events=raw.trim()?raw.trim().split('\n').map(JSON.parse):[];Log.verify(this.events);}}
 static verify(events){let prev=null;for(let i=0;i<events.length;i++){const {digest,...body}=events[i];assert(body.seq===i&&body.previous===prev&&hash(body)===digest,'REPLAY_INTEGRITY');prev=digest;}return true;}
 append(type,data){const body={seq:this.events.length,previous:this.events.at(-1)?.digest??null,at:new Date().toISOString(),type,data:structuredClone(data)},event={...body,digest:hash(body)};if(this.path){mkdirSync(dirname(this.path),{recursive:true});appendFileSync(this.path,canonical(event)+'\n',{flush:true});}this.events.push(event);return event;}
}
