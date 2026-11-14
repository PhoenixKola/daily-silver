import { launchBrowser } from './browser.mjs';

const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://localhost:4182/', { waitUntil: 'networkidle' });
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(async () => (await caches.open('daily-silver-6-recap-jump-v1')).keys().then(keys => keys.length >= 292));
const cached = await page.evaluate(async () => (await (await caches.open('daily-silver-6-recap-jump-v1')).keys()).length);
await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('#practice-button').click();
await page.waitForFunction(() => document.querySelector('#game-view') && !document.querySelector('#game-view').classList.contains('hidden'));
const image = await page.evaluate(() => ({ background: performance.getEntriesByType('resource').some(x => x.name.includes('summit-night.png')), rival: performance.getEntriesByType('resource').some(x => x.name.includes('summit-rival.png')), sprite: document.querySelector('#active-command-card img')?.complete }));
console.log({ cached, image, errors });
if (errors.length || !image.background || !image.rival || !image.sprite) process.exitCode = 1;
await browser.close();
