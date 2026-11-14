import { launchBrowser } from './browser.mjs';
import { mkdir } from 'node:fs/promises';
await mkdir('reports/final-visual-uat', { recursive: true });
const browser=await launchBrowser();
for(const [label,width,height,count] of [['empty',1440,900,0],['many',390,844,25]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
 await page.goto('http://localhost:4182/',{waitUntil:'networkidle'});
 if(count)await page.evaluate(count=>localStorage.setItem('daily-silver-v1:records',JSON.stringify(Array.from({length:count},(_,i)=>({id:`daily:2026-10-${String(31-i).padStart(2,'0')}:${i}`,mode:'daily',date:`2026-10-${String(31-i).padStart(2,'0')}`,won:i%2===0,turns:20+i,remaining:i%7,score:1800-i*10,party:['Pikachu','Typhlosion','Espeon','Lapras','Steelix','Mewtwo']})))),count);
 if(await page.locator('#records-button').isVisible())await page.locator('#records-button').click();else{await page.locator('#settings-button').click();await page.locator('[data-show-records]').click()}
 await page.screenshot({path:`reports/final-visual-uat/archive-${label}-${width}.png`});
 if(count){await page.locator('#modal').evaluate(node=>node.scrollTop=node.scrollHeight);await page.screenshot({path:'reports/final-visual-uat/archive-many-bottom-390.png'})}
 await context.close();
}
await browser.close();
