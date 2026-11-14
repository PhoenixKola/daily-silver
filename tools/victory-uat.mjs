import { launchBrowser } from './browser.mjs';
import { mkdir } from 'node:fs/promises';

await mkdir('reports/final-visual-uat', { recursive: true });
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://localhost:4182/', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  const { createRun } = await import('./src/engine.js');
  localStorage.setItem('daily-silver-v1:practice', JSON.stringify(createRun({ mode: 'practice', date: '2026-11-04', seed: 1 })));
});
await page.locator('#practice-button').click();
let actions = 0;
while (await page.locator('#game-view').isVisible() && actions < 150) {
  const choice = await page.evaluate(async () => {
    const { active, estimateDamage } = await import('./src/engine.js');
    const { MOVES } = await import('./src/data.js');
    const run = JSON.parse(localStorage.getItem('daily-silver-v1:practice'));
    if (run.pendingSwitch) return { kind: 'switch', index: run.player.findIndex((m, i) => i !== run.pActive && m.hp > 0) };
    const p = active(run, 'p'), foe = active(run, 'e');
    const options = p.moves.map((slot, index) => ({ slot, index })).filter(x => x.slot.pp > 0);
    options.sort((a, b) => {
      const score = x => { const move = MOVES[x.slot.name]; return move.power ? estimateDamage(move, p, foe) * move.accuracy / 100 : move.heal && p.hp < p.maxHp * .35 ? p.maxHp * move.heal : 0; };
      return score(b) - score(a);
    });
    return { kind: 'move', index: options[0]?.index ?? 0 };
  });
  if (choice.kind === 'switch') await page.locator(`#party-panel button[data-switch="${choice.index}"]`).click();
  else await page.locator(`#moves-panel button[data-move="${choice.index}"]`).click();
  actions++;
  const skip = page.locator('#skip-fx');
  if (await skip.isVisible()) await skip.click();
  await page.waitForFunction(() => !document.querySelector('#game-view')?.classList.contains('is-animating'));
}
if (!await page.locator('#result-view.is-victory').isVisible()) throw Error(`Seed 1 did not win in ${actions} actions`);
await page.screenshot({ path: 'reports/final-visual-uat/desktop-victory.png', fullPage: true });
const downloadPromise = page.waitForEvent('download');
await page.locator('#result-card').click();
const download = await downloadPromise;
await download.saveAs('reports/final-visual-uat/result-card.png');
console.log({ actions, title: await page.locator('#result-title').textContent(), errors });
if (errors.length) process.exitCode = 1;
await browser.close();
