import { launchBrowser } from './browser.mjs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const output = process.argv[2] || 'reports/final-visual-uat';
const base = process.env.DAILY_SILVER_URL || 'http://localhost:4182/';
await mkdir(output, { recursive: true });
const browser = await launchBrowser();
const failures = [];
const matrix=[['wide',1920,1080],['desktop',1440,900],['laptop',1366,768],['tablet',768,1024],['large-phone',430,932],['phone',390,844],['medium-phone',375,812],['compact-phone',360,800],['small-phone',320,700],['landscape',844,390],['small-landscape',667,375]];
const selected=process.argv[3]?matrix.filter(([name])=>process.argv[3].split(',').includes(name)):matrix;
for (const [name, width, height] of selected) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(`${name}: ${error.message}`));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${name}: ${response.status()} ${response.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(output, `${name}-home.png`), fullPage: true });
  await page.locator('#practice-button').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(output, `${name}-battle.png`), fullPage: true });
  const dims = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, battleTop: document.querySelector('#game-view').getBoundingClientRect().top, firstMoveBottom: document.querySelector('#moves-panel button')?.getBoundingClientRect().bottom }));
  await page.locator('#party-toggle').click();
  await page.screenshot({ path: join(output, `${name}-party.png`), fullPage: true });
  await page.locator('#settings-button').click();
  await page.screenshot({ path: join(output, `${name}-settings.png`), fullPage: true });
  console.log(name, dims);
  if(dims.width>dims.viewport)failures.push(`${name}: horizontal overflow ${dims.width-dims.viewport}px`);
  await context.close();
}
await browser.close();
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
