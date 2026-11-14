import test from 'node:test';
import assert from 'node:assert/strict';
import {specimen} from '../src/engine.js';
import {bestCounter,moveMatchup} from '../src/matchups.js';

test('counter markers require usable super-effective damaging moves',()=>{
 const target=specimen('Blastoise');
 const attacker=specimen('Pikachu');
 assert.deepEqual(bestCounter(attacker,target)?.name,'Thunderbolt');
 assert.equal(bestCounter(attacker,target)?.multiplier,2);
 attacker.moves[0].pp=0;
 assert.equal(bestCounter(attacker,target),null);
 attacker.moves[0].pp=5;attacker.hp=0;
 assert.equal(bestCounter(attacker,target),null);
});

test('preview distinguishes immunity, resistance, and fourfold advantage',()=>{
 assert.equal(moveMatchup({name:'Thunderbolt',pp:5},specimen('Quagsire')).kind,'immune');
 assert.equal(moveMatchup({name:'Surf',pp:5},specimen('Blastoise')).kind,'resisted');
 assert.equal(moveMatchup({name:'Thunderbolt',pp:5},specimen('Gyarados')).label,'SUPER EFFECTIVE · ×4');
 assert.equal(moveMatchup({name:'Thunder Wave',pp:5},specimen('Blastoise')).kind,'utility');
 assert.equal(moveMatchup({name:'Seismic Toss',pp:5},specimen('Blastoise')).label,'FIXED DAMAGE');
 assert.equal(moveMatchup({name:'Seismic Toss',pp:5},specimen('Gengar')).kind,'immune');
});
