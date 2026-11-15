// Browser smoke test: serves the project, drives the real UI in Chromium and fails on any page error.
// Needs a local Chromium/Chrome (npm run browser:install, or CHROME_PATH).
import assert from 'node:assert/strict';
process.env.PORT=process.env.PORT||'4191';
await import('../tools/server.mjs');
const {launchBrowser}=await import('../tools/browser.mjs');
const base=`http://localhost:${process.env.PORT}/`;
const browser=await launchBrowser();
const errors=[];
try{
 for(const [w,h] of [[1280,800],[390,800],[320,640]]){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  page.on('pageerror',e=>errors.push(`${w}: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')errors.push(`${w}: ${m.text()}`)});
  await page.goto(base);await page.waitForSelector('#team-list .team-mon');
  assert.equal(await page.locator('#team-list .team-mon').count(),6,'six allies on the home screen');
  assert.match(await page.locator('#daily-label').textContent(),/Begin today/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=0,`no horizontal overflow at ${w}px (${overflow})`);
  await page.click('.team-mon >> nth=0');await page.waitForSelector('#sheet[open] .mon-card');
  assert.ok(await page.locator('#sheet .mini-move').count()>=4,'dossier lists moves');
  await page.keyboard.press('Escape');
  await page.click('#practice-button');await page.click('[data-act="lab-new"]');
  for(let i=0;i<60&&!(await page.locator('.move-main:not([disabled])').count());i++){if(await page.locator('#skip-fab').isVisible())await page.click('#skip-fab').catch(()=>{});await page.waitForTimeout(150)}
  assert.equal(await page.locator('#moves .move').count(),4,'four moves shown');
  assert.ok(await page.locator('#plate-foe .hp-num').textContent(),'opponent HP is visible');
  const after=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(after<=0,`no overflow in battle at ${w}px`);
  await page.keyboard.press('1');await page.waitForTimeout(200);
  for(let i=0;i<60&&await page.locator('#skip-fab').isVisible();i++){await page.click('#skip-fab').catch(()=>{});await page.waitForTimeout(120)}
  await page.waitForTimeout(300);
  if(await page.locator('#sheet[open] [data-switch]').count()){if(!(await page.locator('[data-switch]:not([disabled])').first().isVisible()))await page.locator('.mon-card:has([data-switch]:not([disabled])) [data-toggle]').first().click();await page.locator('[data-switch]:not([disabled])').first().click();await page.waitForTimeout(500)}
  assert.match(await page.locator('#bar-title').textContent(),/Turn 0[2-9]|Turn 1/,'turn advanced');
  for(const id of ['#help-button','#settings-button','#archive-button']){await page.click(id);await page.waitForSelector('#sheet[open]');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('sheet').open)}
  await page.close();
 }
}finally{await browser.close();setTimeout(()=>process.exit(errors.length?1:0),100)}
assert.deepEqual(errors,[],'no page errors');
console.log('UI smoke passed at 1280, 390 and 320 px');
