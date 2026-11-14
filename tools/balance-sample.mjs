import { createRun, active, turn, estimateDamage } from '../src/engine.js';
import { MOVES } from '../src/data.js';

function play(seed, strategy) {
  const run = createRun({ mode: 'practice', date: '2026-11-04', seed });
  let actions = 0;
  while (run.phase === 'battle' && actions < 150) {
    let action;
    if (run.pendingSwitch) {
      action = { kind: 'switch', index: run.player.findIndex((m, i) => i !== run.pActive && m.hp > 0) };
    } else {
      const p = active(run, 'p'), foe = active(run, 'e');
      const choices = p.moves.map((slot, index) => ({ slot, index })).filter(x => x.slot.pp > 0);
      const selected = strategy === 'first' ? choices[0] : choices.sort((a, b) => {
        const score = x => {
          const move = MOVES[x.slot.name];
          return move.power ? estimateDamage(move, p, foe) * move.accuracy / 100 : move.heal && p.hp < p.maxHp * .35 ? p.maxHp * move.heal : 0;
        };
        return score(b) - score(a);
      })[0];
      action = { kind: 'move', index: selected?.index ?? 0 };
    }
    if (!turn(run, action)) throw Error(`Rejected action at seed ${seed}`);
    actions++;
  }
  return { won: run.phase === 'won', turns: run.turn - 1, stalled: run.phase === 'battle' };
}
for (const strategy of ['first', 'damage']) {
  const results = Array.from({ length: 200 }, (_, i) => play(i + 1, strategy));
  console.log(strategy, { wins: results.filter(x => x.won).length, stalled: results.filter(x => x.stalled).length, longest: Math.max(...results.map(x => x.turns)) });
}
console.log('winning damage seed', Array.from({ length: 200 }, (_, i) => i + 1).find(seed => play(seed, 'damage').won));
