import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: browser.mjs RUN/viewer.html NEW_BROWSER_DIRECTORY');
mkdirSync(output,{recursive:false});const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[],externalRequests=[],checks=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('request',r=>{if(!r.url().startsWith('file:'))externalRequests.push(r.url());});await page.route(/^https?:/,r=>r.abort());
try{
 await page.goto(pathToFileURL(resolve(input)).href);await page.getByRole('heading',{name:'Communication Transfer · Offline qualification'}).waitFor();
 for(const task of await page.locator('#task option').evaluateAll(xs=>xs.map(x=>x.value))){
  await page.getByLabel('Task family').selectOption(task);
  for(let i=0;i<8;i++){
   await page.locator('button[data-index="'+i+'"]').click();const label=await page.locator('button[aria-pressed=true]').textContent();
   for(const text of ['Sender A actual request and response','Receiver B actual request and reconstruction','Blind evaluator C advice']){const detail=page.locator('details').filter({has:page.locator('summary').filter({hasText:text})});await detail.locator('summary').click();if(!await detail.evaluate(x=>x.open))throw Error('DETAIL_NOT_OPEN');}
   if(await page.locator('#comparison tbody tr').count()!==8)throw Error('COMPARISON_ROWS');
   if(!await page.locator('#trace').textContent().then(x=>x.includes('NOT_ADJUDICATED')))throw Error('STANDING_MISSING');
   const filename=task+'-'+i+'.png';await page.screenshot({path:join(output,filename),fullPage:true});checks.push({task,label,screenshot:filename,request_answer_visible:true});
  }
 }
 await page.reload();await page.getByRole('heading',{name:'Communication Transfer · Offline qualification'}).waitFor();
 await page.getByLabel('Task family').focus();await page.keyboard.press('Tab');if(await page.locator(':focus').evaluate(x=>x.tagName)!=='BUTTON')throw Error('KEYBOARD_NAVIGATION');
 if(errors.length||externalRequests.length)throw Error(JSON.stringify({errors,externalRequests}));
 writeFileSync(join(output,'browser.json'),JSON.stringify({status:'PASS',browser:await browser.version(),checks,reload:true,keyboard_navigation:true,errors,externalRequests},null,2),{flag:'wx'});console.log(JSON.stringify({status:'PASS',traces:checks.length,external_requests:0,page_errors:0}));
}catch(error){writeFileSync(join(output,'failure.json'),JSON.stringify({status:'FAILED',error:String(error.message),errors,externalRequests,checks},null,2),{flag:'wx'});throw error;}
finally{await browser.close();}
