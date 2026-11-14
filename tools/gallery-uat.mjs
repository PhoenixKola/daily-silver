import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from './browser.mjs';

const browser=await launchBrowser();
const page=await browser.newPage({viewport:{width:1280,height:900}});
await page.goto(pathToFileURL(resolve('reports/final-visual-uat/index.html')).href,{waitUntil:'load'});
const images=await page.locator('img').evaluateAll(elements=>elements.map(image=>({alt:image.alt,loaded:image.complete&&image.naturalWidth>0})));
console.log({title:await page.title(),images:images.length,failed:images.filter(x=>!x.loaded)});
if(images.some(x=>!x.loaded))process.exitCode=1;
await browser.close();
