import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.argv[2];if(!root)throw Error('Pass the run evidence directory');
const manifest=JSON.parse(readFileSync(join(root,'manifest.json')));
for(const [file,expected]of Object.entries(manifest)){
 if(!['receipts.json','viewer.html'].includes(file))throw Error('MANIFEST_PATH_REFUSED');
 const actual=createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
 if(actual!==expected)throw Error('EVIDENCE_HASH_MISMATCH: '+file);
}
console.log(JSON.stringify({status:'PASS',files:Object.keys(manifest).length}));
