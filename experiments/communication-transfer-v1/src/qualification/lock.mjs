import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {hash,POLICY,PROMPTS,MODELS,VERSION} from './contracts.mjs';
import {modelFor,SETTINGS} from './transport.mjs';
const repo=resolve(fileURLToPath(new URL('../../../../',import.meta.url)));
const base='experiments/communication-transfer-v1';
export const QualificationLock=z.object({schema:z.literal('transfer-qualification-lock/1'),version:z.literal(VERSION),live_authorized:z.literal(false),corpus_status:z.literal('PROPOSED_UNADJUDICATED'),policy:z.unknown(),models:z.unknown(),prompt_hashes:z.record(z.string(),z.string()),settings:z.unknown(),files:z.record(z.string(),z.string().regex(/^[a-f0-9]{64}$/))}).strict();
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function createQualificationLock(path){
 const paths=[];function walk(folder){for(const name of readdirSync(resolve(repo,folder))){const path=folder+'/'+name;if(statSync(resolve(repo,path)).isDirectory())walk(path);else paths.push(path);}}for(const folder of ['src/qualification','fixtures/pilot-v1'])walk(base+'/'+folder);
 paths.push(...Object.keys(JSON.parse(readFileSync(resolve(repo,base,'evidence/offline-source-lock.json'))).files));
 for(const name of ['PILOT-CORPUS-V1.md','INDEPENDENT-ASSESSMENT.md','PROVIDER-QUALIFICATION.md','PROSPECTIVE-PILOT-V1.md'])paths.push(base+'/docs/'+name);
 paths.push(base+'/tests/qualification.test.mjs',base+'/evidence/offline-source-lock.json','harness/session.ts','package.json','package-lock.json');
 for(const name of ['pi-ai','pi-agent-core','pi-coding-agent'])paths.push('node_modules/@earendil-works/'+name+'/package.json');
 for(const path of ['providers/data/opencode-go.json','providers/opencode-go.js','providers/opencode-headers.js','api/simple-options.js','api/openai-completions.js','api/anthropic-messages.js'])paths.push('node_modules/@earendil-works/pi-ai/dist/'+path);
 const lock={schema:'transfer-qualification-lock/1',version:VERSION,live_authorized:false,corpus_status:'PROPOSED_UNADJUDICATED',policy:POLICY,models:Object.fromEntries(Object.keys(MODELS).map(role=>{const {model}=modelFor(role);return [role,{id:model.id,api:model.api,base_url:model.baseUrl}];})),prompt_hashes:Object.fromEntries(Object.entries(PROMPTS).map(([role,text])=>[role,hash(text)])),settings:SETTINGS,files:Object.fromEntries(paths.map(p=>[p,digest(readFileSync(resolve(repo,p)))]))};
 QualificationLock.parse(lock);const bytes=JSON.stringify(lock,null,2);writeFileSync(path,bytes,{flag:'wx'});return {path,sha256:digest(bytes)};
}
export function verifyQualificationLock(path,expectedDigest){
 const bytes=readFileSync(path);if(!expectedDigest||digest(bytes)!==expectedDigest)throw Error('QUALIFICATION_LOCK_ID');const lock=QualificationLock.parse(JSON.parse(bytes));
 for(const [path,expected]of Object.entries(lock.files)){const full=resolve(repo,path),rel=relative(repo,full);if(rel==='..'||rel.startsWith('..'+sep)||resolve(full)!==full)throw Error('LOCK_PATH');if(digest(readFileSync(full))!==expected)throw Error('QUALIFICATION_SOURCE_DRIFT: '+path);}
 if(hash(lock.policy)!==hash(POLICY)||hash(lock.settings)!==hash(SETTINGS))throw Error('QUALIFICATION_POLICY_DRIFT');
 for(const [role,id]of Object.entries(MODELS)){const {model}=modelFor(role);if(lock.models[role]?.id!==id||lock.models[role]?.api!==model.api||lock.models[role]?.base_url!==model.baseUrl||lock.prompt_hashes[role]!==hash(PROMPTS[role]))throw Error('QUALIFICATION_ROLE_DRIFT');}
 return lock;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [action,path,expected]=process.argv.slice(2);
 if(action==='create')console.log(JSON.stringify(createQualificationLock(path)));
 else if(action==='verify'){verifyQualificationLock(path,expected);console.log(JSON.stringify({status:'PASS'}));}
 else throw Error('Usage: lock.mjs create NEW_FILE | verify FILE EXPECTED_SHA256');
}
