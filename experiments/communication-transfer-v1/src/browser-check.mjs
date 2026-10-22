import {chromium} from 'playwright';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node src/browser-check.mjs NEW_RUN/viewer.html NEW_BROWSER_EVIDENCE_DIRECTORY');
mkdirSync(output,{recursive:false});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>network.push(r.url()));
try{
 await page.goto(pathToFileURL(resolve(input)).href);await page.getByRole('heading',{name:'Communication Transfer Observer'}).waitFor();
 const checks=[];
 for(const [i,arm]of ['SOURCE','PLAIN','LINKED','CONTEXT'].entries()){
  await page.locator('button[data-arm="'+i+'"]').click();
  await page.getByRole('heading',{name:arm,exact:true}).waitFor();
  for(const name of ['B exact provider request and answer','C blinded advisory request and answer','Exact transmitted bytes / context / exclusions'])await page.getByRole('heading',{name,exact:true}).waitFor();
  await page.screenshot({path:join(output,arm+'.png'),fullPage:true});checks.push({arm,request_answer_visible:true,screenshot:arm+'.png'});
 }
 await page.reload();await page.getByRole('heading',{name:'SOURCE',exact:true}).waitFor();
 if(errors.length||network.some(x=>!x.startsWith('file:')))throw Error(JSON.stringify({errors,network}));
 writeFileSync(join(output,'browser.json'),JSON.stringify({status:'PASS',browser:await browser.version(),file_protocol:true,checks,reload:true,errors,network},null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'PASS',arms:4,errors:0,external_requests:0}));
}finally{await browser.close();}
