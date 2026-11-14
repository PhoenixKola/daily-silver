import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,specimen,turn,runSummary} from '../src/engine.js';
import {validateBackup} from '../src/backup.js';

const finalOpponent=()=>{
 const run=createRun({mode:'practice',seed:2718,date:'2026-10-30'});
 run.foe.slice(1).forEach(mon=>mon.hp=0);
 run.foe[0].hp=1;
 return run;
};

test('a direct finishing strike is identified and its effect cue is marked',()=>{
 const run=finalOpponent();
 run.player[0]=specimen('Gengar');
 run.player[0].stats.spe=999;
 const slot=run.player[0].moves.findIndex(move=>move.name==='Shadow Ball');
 assert.ok(turn(run,{kind:'move',index:slot}));
 assert.equal(run.phase,'won');
 assert.deepEqual(run.moment,{turn:1,kind:'finisher',actor:'Gengar',target:'Pikachu',move:'Shadow Ball'});
 assert.equal(run.visualEvents.find(event=>event.kind==='move'&&event.move==='Shadow Ball').finisher,true);
 assert.equal(runSummary(run).recordVersion,2);
});

test('a final faint from a condition does not credit the previous attack',()=>{
 const run=finalOpponent();
 run.foe[0].status='psn';
 run.player[0].stats.spe=999;
 assert.ok(turn(run,{kind:'switch',index:1}));
 assert.equal(run.phase,'won');
 assert.equal(run.moment.kind,'final-faint');
 assert.equal(run.moment.target,'Pikachu');
 assert.equal(run.moment.move,'');
});

test('backup accepts old records and validates the optional decisive moment',()=>{
 const old={id:'daily:2026-10-30:1',mode:'daily',date:'2026-10-30',won:true,turns:4,remaining:3};
 const backup=records=>JSON.stringify({app:'daily-silver',exportVersion:2,entries:{records}});
 assert.equal(validateBackup(backup([old])).records.length,1);
 const updated={...old,recordVersion:2,moment:{turn:3,kind:'finisher',actor:'Gengar',target:'Pikachu',move:'Shadow Ball'}};
 assert.deepEqual(validateBackup(backup([updated])).records[0].moment,updated.moment);
 assert.throws(()=>validateBackup(backup([{...updated,moment:{...updated.moment,move:'X'.repeat(100)}}])));
});

test('backup accepts new display and music preferences without weakening validation',()=>{
 const backup=entries=>JSON.stringify({app:'daily-silver',exportVersion:2,entries});
 assert.deepEqual(validateBackup(backup({'high-contrast':true,'music-level':.3})),{'high-contrast':true,'music-level':.3});
 assert.throws(()=>validateBackup(backup({'music-level':2})));
 assert.throws(()=>validateBackup(backup({'high-contrast':'yes'})));
});
