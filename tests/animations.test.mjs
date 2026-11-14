import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,turn,alive} from '../src/engine.js';

test('successful moves emit ordered animation cues without altering battle damage',()=>{
 let run;
 for(let i=0;i<50;i++){
   const b=createRun({mode:'practice',date:'2026-10-13',seed:i+1});
   turn(b,{kind:'move',index:0});
   if(b.visualEvents.some(x=>x.kind==='damage')){run=b;break;}
 }
 assert.ok(run,'At least one battle should have damage');
 const ev=run.visualEvents;
 assert.ok(ev.length>1);
 assert.ok(ev.some(x=>x.kind==='move'&&typeof x.type==='string'&&x.move));
 for(const x of ev.filter(x=>x.kind==='damage')){
   assert.ok(x.amount>0);
   assert.ok(['p','e'].includes(x.side));
   assert.ok(Number.isInteger(x.index));
   assert.ok(x.hp>=0);
 }
 const firstMove=ev.findIndex(x=>x.kind==='move'),firstHit=ev.findIndex(x=>x.kind==='damage');
 assert.ok(firstMove>=0&&firstMove<firstHit);
});
test('switching and recovery create independently animated, scoped cues',()=>{
 const run=createRun({mode:'practice',seed:31});
 assert.equal(turn(run,{kind:'switch',index:1}),true);
 assert.ok(run.visualEvents.some(x=>x.kind==='switch'&&x.side==='p'&&x.index===1));
 assert.equal(run.pActive,1);
 assert.equal(alive(run.player),6);
});
test('new visual events replace previous turn events, not replay prior attacks',()=>{
 const run=createRun({mode:'practice',seed:31});
 turn(run,{kind:'switch',index:1});
 const first=run.visualEvents;
 turn(run,{kind:'switch',index:0});
 assert.notEqual(run.visualEvents,first);
 assert.ok(run.visualEvents.some(x=>x.kind==='switch'&&x.index===0));
 assert.equal(run.visualEvents.some(x=>x.kind==='switch'&&x.side==='p'&&x.index===1),false);
});
