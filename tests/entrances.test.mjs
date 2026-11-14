import test from 'node:test';
import assert from 'node:assert/strict';
import {BOSS} from '../src/data.js';
import {createRun} from '../src/engine.js';
import {BOSS_ENTRANCES} from '../src/entrances.js';

test('all six rival entrance cards name an actual move in that opponent loadout',()=>{
 const run=createRun({seed:12});
 assert.deepEqual(Object.keys(BOSS_ENTRANCES),BOSS);
 for(const mon of run.foe){const card=BOSS_ENTRANCES[mon.name];assert.ok(card.title&&card.line&&card.motif);assert.ok(mon.moves.some(move=>move.name===card.move),mon.name)}
});
