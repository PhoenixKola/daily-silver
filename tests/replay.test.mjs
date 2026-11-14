import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,specimen,turn} from '../src/engine.js';
import {replayMoments} from '../src/replay.js';

test('new runs preserve knockout identity and cause for the replay',()=>{
 const run=createRun({mode:'practice',seed:732});
 run.player[0]=specimen('Gengar');run.player[0].stats.spe=999;run.foe[0].hp=1;
 turn(run,{kind:'move',index:0});
 const replay=replayMoments(run);
 assert.deepEqual(replay.knockouts[0],{turn:1,side:'e',index:0,name:'Pikachu',actor:'Gengar',move:'Shadow Ball'});
});

test('older saves get a partial knockout replay without new fields',()=>{
 const run=createRun({seed:5});delete run.highlights;run.phase='won';run.turn=12;
 run.log.push({turn:11,kind:'faint',text:'Pikachu fainted!'},{turn:11,kind:'win',text:'RED was defeated!'});
 const replay=replayMoments(run);
 assert.deepEqual(replay.knockouts.at(-1),{turn:11,side:'e',index:0,name:'Pikachu',actor:'',move:''});
 assert.equal(replay.decisive.turn,11);
});
