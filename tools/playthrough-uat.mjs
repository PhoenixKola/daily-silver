import { launchBrowser } from './browser.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('reports/final-visual-uat', { recursive: true });
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://localhost:4182/', { waitUntil: 'networkidle' });
await page.locator('#practice-button').click();
if (await page.locator('#skip-fx').isVisible()) await page.locator('#skip-fx').click();
await page.waitForFunction(() => !document.querySelector('#game-view')?.classList.contains('is-animating'));
let actions = 0;
while (await page.locator('#game-view').isVisible() && actions < 180) {
  if (await page.locator('#party-panel').isVisible()) {
    const choice = page.locator('#party-panel button:not([disabled])').first();
    if (await choice.count()) await choice.click();
    else throw Error('No available party replacement');
  } else {
    const strong = page.locator('#moves-panel button.matchup-good:not([disabled])');
    const choice = await strong.count() ? strong.first() : page.locator('#moves-panel button:not([disabled])').first();
    await choice.click();
  }
  actions++;
  const skip = page.locator('#skip-fx');
  if (await skip.isVisible()) await skip.click();
  await page.waitForFunction(() => !document.querySelector('#game-view')?.classList.contains('is-animating'), { timeout: 15000 });
}
if (!await page.locator('#result-view').isVisible()) throw Error(`Battle did not finish in ${actions} actions`);
await page.screenshot({ path: 'reports/final-visual-uat/phone-result.png', fullPage: true });
await page.locator('#result-recap').click();
await page.screenshot({ path: 'reports/final-visual-uat/phone-recap.png' });
const firstHighlight = page.locator('.replay-highlight').first();
let recapJump = 'no knockout highlight';
if (await firstHighlight.count()) {
  const turn = await firstHighlight.getAttribute('data-recap-turn');
  await firstHighlight.click();
  await page.waitForTimeout(750);
  recapJump = await page.evaluate(turn => {
    const dialog = document.querySelector('#modal');
    const section = dialog.querySelector(`.recap-turn[data-turn="${turn}"]`);
    const box = section?.getBoundingClientRect();
    const frame = dialog.getBoundingClientRect();
    const closeBar = dialog.querySelector('.modal-top').getBoundingClientRect();
    return box && box.top >= closeBar.bottom + 6 && box.bottom <= frame.bottom ? `turn ${turn} heading visible` : `turn ${turn} heading missed recap viewport`;
  }, turn);
  await page.screenshot({ path: 'reports/final-visual-uat/recap-jump-390.png' });
}
console.log({ actions, title: await page.locator('#result-title').textContent(), recapJump, errors });
if (errors.length || recapJump.includes('missed')) process.exitCode = 1;
await browser.close();
