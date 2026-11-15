// Manual/CI acceptance runs against the real UI. Usage: node tools/uat.mjs visual|playthrough|victory|offline
// Starts its own static server. Screenshots are written to reports/uat/ (git-ignored).
import {mkdir} from 'node:fs/promises';
process.env.PORT=process.env.PORT||'4192';
await import('./server.mjs');
const {launchBrowser}=await import('./browser.mjs');
const base=`http://localhost:${process.env.PORT}/`,mode=process.argv[2]||'visual',out='reports/uat';
await mkdir(out,{recursive:true});
const browser=await launchBrowser();
const errors=[];
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})};
async function settle(page){for(let i=0;i<80&&await page.locator('#skip-fab').isVisible();i++){await page.click('#skip-fab').catch(()=>{});await page.waitForTimeout(120)}await page.waitForTimeout(250)}
async function forced(page){if(await page.locator('#sheet[open] [data-switch]').count()){if(!(await page.locator('[data-switch]:not([disabled])').first().isVisible()))await page.locator('.mon-card:has([data-switch]:not([disabled])) [data-toggle]').first().click();await page.locator('[data-switch]:not([disabled])').first().click();await page.waitForTimeout(400);await settle(page)}}
async function startPractice(page){await page.click('#practice-button');await page.click('[data-act="lab-new"]');await settle(page)}
async function fight(page,until){for(let i=0;i<500&&!(await page.locator(until).isVisible());i++){await settle(page);await forced(page);const mv=page.locator('.move-main:not([disabled])');if(await mv.count())await mv.nth(i%4).click().catch(()=>{});await page.waitForTimeout(120)}}
try{
 if(mode==='visual'){
  for(const [w,h,tag] of [[1440,900,'desktop'],[768,1024,'tablet'],[390,844,'phone'],[320,640,'narrow'],[844,390,'landscape']]){
   const ctx=await browser.newContext({viewport:{width:w,height:h}});const page=await ctx.newPage();watch(page);
   await page.goto(base);await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${tag}-home.png`});
   await startPractice(page);await page.screenshot({path:`${out}/${tag}-battle.png`});
   await page.keyboard.press('p');await page.waitForTimeout(400);await page.screenshot({path:`${out}/${tag}-party.png`});
   await ctx.close();
  }
 }else if(mode==='playthrough'){
  const ctx=await browser.newContext({viewport:{width:1280,height:800}});const page=await ctx.newPage();watch(page);
  await page.goto(base);await page.evaluate(()=>localStorage.setItem('daily-silver-v1:fx-rate','3'));await page.reload();await page.waitForTimeout(800);
  await startPractice(page);await fight(page,'#panel-results');await page.waitForTimeout(1000);
  await page.screenshot({path:`${out}/playthrough-results.png`});console.log('result:',await page.locator('#result-body h2').textContent());
 }else if(mode==='victory'){
  const first=await browser.newContext({viewport:{width:1280,height:800}});const seed=await first.newPage();watch(seed);
  await seed.goto(base);await startPractice(seed);
  const save=await seed.evaluate(()=>{const r=JSON.parse(localStorage.getItem('daily-silver-v1:practice'));r.foe.forEach((m,i)=>{m.hp=i<5?0:1});r.eActive=5;r.lab=null;return JSON.stringify(r)});await first.close();
  const ctx=await browser.newContext({viewport:{width:1280,height:800}});await ctx.addInitScript(s=>{if(!localStorage.getItem('daily-silver-v1:practice'))localStorage.setItem('daily-silver-v1:practice',s)},save);
  const page=await ctx.newPage();watch(page);await page.goto(base);await page.waitForTimeout(800);await page.click('#practice-button');await page.click('[data-act="lab-resume"]');await page.waitForTimeout(800);
  for(let i=0;i<8&&!(await page.locator('#skip-fab').isVisible())&&!(await page.locator('#panel-results').isVisible());i++){await page.locator('.move-main:not([disabled])').nth(i%4).click().catch(()=>{});await page.waitForTimeout(400);await forced(page)}
  await page.waitForTimeout(2500);await page.screenshot({path:`${out}/victory-ending.png`});await page.waitForSelector('#panel-results',{state:'visible',timeout:15000});await page.waitForTimeout(500);await page.screenshot({path:`${out}/victory.png`});console.log('result:',await page.locator('#result-body h2').textContent());
 }else if(mode==='offline'){
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});const page=await ctx.newPage();watch(page);
  await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(async()=>(await caches.keys()).some(k=>k.startsWith('daily-silver-')),null,{timeout:60000});
  await page.waitForTimeout(4000);
  await ctx.setOffline(true);await page.reload({waitUntil:'load'});await page.waitForSelector('#team-list .team-mon');
  const art=await page.evaluate(async()=>{const r=await fetch('./assets/art/summit/sky.png');return r.ok});
  console.log('offline reload ok, art cached:',art);await startPractice(page);console.log('offline battle started:',await page.locator('#moves .move').count()===4);
  await page.screenshot({path:`${out}/offline-battle.png`});
 }
}finally{await browser.close();console.log(errors.length?'ERRORS:\n'+errors.join('\n'):'no page errors');setTimeout(()=>process.exit(errors.length?1:0),100)}
