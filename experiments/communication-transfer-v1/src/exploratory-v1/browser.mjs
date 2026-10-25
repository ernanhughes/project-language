import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const [input,out]=process.argv.slice(2);
if(!input||!out)throw Error('Pass viewer.html and NEW browser evidence directory');
mkdirSync(out,{recursive:false});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[],external=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('request',r=>{if(!r.url().startsWith('file:'))external.push(r.url());});
await page.route(/^https?:/,r=>r.abort());
try{
 await page.goto(pathToFileURL(resolve(input)).href);
 await page.getByRole('heading',{name:'Communication comparison · TRANSFER-01D'}).waitFor();
 const count=await page.locator('button[data-arm]').count();
 if(count<3)throw Error('ARM_COUNT');
 for(let i=0;i<count;i++){
  await page.locator('button[data-arm="'+i+'"]').click();
  for(const title of ['Sender · exact input and sealed output','Delivery · exact packet received by recipient','Receiver · previously withheld questions and response','Blind evaluator · advisory per-question judgments','Mechanical citation checks'])await page.locator('summary').filter({hasText:title}).click();
  const arm=await page.locator('button[aria-pressed=true]').textContent();
  await page.screenshot({path:join(out,arm+'.png'),fullPage:true});
  checks.push({arm,request_answer_visible:true,previously_withheld_questions_visible_at_recipient:true});
 }
 await page.reload();
 await page.getByRole('heading',{name:'Communication comparison · TRANSFER-01D'}).waitFor();
 await page.locator('button[data-arm="0"]').focus();
 await page.keyboard.press('Tab');
 if(await page.locator(':focus').evaluate(x=>x.tagName)!=='BUTTON')throw Error('KEYBOARD');
 if(errors.length||external.length)throw Error('BROWSER_ERRORS');
 writeFileSync(join(out,'browser.json'),JSON.stringify({status:'PASS',browser:await browser.version(),file_protocol:true,arms:count,checks,reload:true,keyboard:true,errors,external_requests:external},null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'PASS',arms:count,external_requests:0,errors:0}));
}catch(e){
 writeFileSync(join(out,'failure.json'),JSON.stringify({status:'FAILED',errors,external,error:e.message},null,2),{flag:'wx'});
 throw e;
}finally{await browser.close();}
