import {existsSync} from 'node:fs';import {join} from 'node:path';
import {Log} from '../storage/log.mjs';import {loadTask} from '../engine/task.mjs';
// Select only the specifically requested exchange. Never copy, repair or reset it.
export function existingS17(root){
 const data=join(root,'.data/lc-01s-s17-01'),path=join(data,'events.jsonl');
 if(!existsSync(path))return null;
 const log=new Log(path),exchange=log.events.filter(e=>e.type==='STATE').at(-1)?.data,v=exchange?.versions.at(-1);
 if(exchange?.scenario!=='archive-recovery-s17-v1'||!v?.digest.startsWith('6dad8fde')||v.status!=='ACCEPTED')return null;
 return {data,task:loadTask(join(root,'tasks/lc-01s-s17-v1.json'))};
}
