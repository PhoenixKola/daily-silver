import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,turn} from '../src/engine.js';
import {buildBeats} from '../src/pres/beats.js';
import {planBeat,planSequence} from '../src/pres/plan.js';
import {createDirector} from '../src/pres/director.js';
import {familyOf} from '../src/pres/families.js';
import {MOVES} from '../src/data.js';

const names=()=> 'MON';
const kinds=plan=>plan.cues.map(c=>c.kind);

test('every move maps to a family and Red\'s six signatures are individual',()=>{
 for(const name of Object.keys(MOVES))assert.ok(familyOf(name),name);
 const sig=['Thunderbolt','Psychic','Body Slam','Giga Drain','Fire Blast','Surf'].map(n=>familyOf(n));
 assert.equal(new Set(sig).size,6);
 assert.equal(familyOf('Shadow Ball'),'shadowball');assert.equal(familyOf('Recover'),'recovery');assert.equal(familyOf('Reflect'),'barrier');assert.equal(familyOf('Swords Dance'),'stat');assert.equal(familyOf('Toxic'),'inflict');
});

test('a hit resolves anticipation -> release -> contact -> settle with HP applied at contact',()=>{
 const beats=buildBeats([
  {kind:'move',side:'p',index:0,move:'Thunderbolt',type:'Electric',power:95,offensive:true,outcome:'hit',targetSide:'e',effectiveness:2,critical:true},
  {kind:'critical',side:'e'},{kind:'damage',side:'e',index:0,hp:40,amount:60,cause:'move'},{kind:'effectiveness',side:'e',effectiveness:2}
 ]);
 assert.equal(beats.length,1);assert.equal(beats[0].hits.length,1);
 const plan=planBeat(beats[0],{names});
 const order=kinds(plan);
 for(const [a,b] of [['anticipate','release'],['release','contact'],['contact','settle']])assert.ok(order.indexOf(a)<order.indexOf(b),`${a} before ${b}`);
 const contact=plan.cues.find(c=>c.kind==='contact'),hp=plan.cues.find(c=>c.kind==='hp');
 assert.equal(hp.t,contact.t,'HP changes exactly at contact');
 assert.ok(contact.hitstop>=90,'critical hits get a stronger pause');
 assert.equal(plan.cues.filter(c=>c.kind==='caption').length>=2,true);
});

test('misses, immunity and protection never show a successful impact',()=>{
 for(const outcome of ['miss','immune','blocked']){
  const beats=buildBeats([{kind:'move',side:'p',index:0,move:'Thunderbolt',type:'Electric',power:95,offensive:true,outcome:'utility',targetSide:'e'},{kind:outcome,side:'e'}]);
  const plan=planBeat(beats[0],{names});
  assert.equal(beats[0].outcome,outcome);
  assert.equal(kinds(plan).includes('contact'),false,outcome);
  assert.ok(kinds(plan).includes('deflect'),outcome);
  assert.equal(plan.cues.some(c=>c.kind==='hp'),false,outcome);
 }
});

test('healing and drain never look like damage; recoil is shown on the attacker',()=>{
 const heal=buildBeats([{kind:'move',side:'p',index:0,move:'Recover',type:'Normal',power:0,outcome:'heal',targetSide:'e'},{kind:'heal',side:'p',index:0,hp:90,amount:40,cause:'recover'}]);
 const hp=planBeat(heal[0],{names}).cues.filter(c=>c.kind==='hp');
 assert.deepEqual(hp.map(c=>c.mode),['heal']);assert.equal(planBeat(heal[0],{names}).cues.some(c=>c.kind==='contact'),false);
 const recoil=buildBeats([{kind:'move',side:'p',index:0,move:'Double-Edge',type:'Normal',power:120,offensive:true,outcome:'hit',targetSide:'e'},{kind:'damage',side:'e',index:0,hp:10,amount:90,cause:'move'},{kind:'damage',side:'p',index:0,hp:70,amount:20,cause:'recoil'}]);
 const modes=planBeat(recoil[0],{names}).cues.filter(c=>c.kind==='hp').map(c=>`${c.side}:${c.mode}`);
 assert.deepEqual(modes,['e:damage','p:damage']);
 assert.ok(planBeat(recoil[0],{names}).cues.some(c=>c.kind==='selfHit'&&c.side==='p'));
});

test('residual damage is its own beat and entry hazards belong to the incoming mon',()=>{
 const beats=buildBeats([
  {kind:'switch',side:'p',index:2,from:0,name:'Snorlax',voluntary:true},{kind:'damage',side:'p',index:2,hp:300,amount:50,cause:'spikes'},
  {kind:'damage',side:'e',index:1,hp:200,amount:30,cause:'status'}
 ]);
 assert.deepEqual(beats.map(b=>b.type),['switch','residual']);
 assert.equal(beats[0].entryDamage[0].index,2);
 const plan=planBeat(beats[0],{names});
 assert.ok(plan.cues.find(c=>c.kind==='hazard').index===2);
 const kindOrder=kinds(plan);assert.ok(kindOrder.indexOf('switchOut')<kindOrder.indexOf('switchIn')&&kindOrder.indexOf('switchIn')<kindOrder.indexOf('hazard'));
});

test('only an opponent\'s first appearance gets the elaborate introduction',()=>{
 const sw=idx=>({kind:'switch',side:'e',index:idx,from:0,name:'Espeon',voluntary:true});
 const first=planSequence(buildBeats([sw(1)]),{names,seenFoes:[0]}).cues.map(c=>c.kind);
 const again=planSequence(buildBeats([sw(1)]),{names,seenFoes:[0,1]}).cues.map(c=>c.kind);
 assert.ok(first.includes('intro'));assert.equal(again.includes('intro'),false);
});

test('reduced motion compresses timing without dropping semantic cues',()=>{
 const beats=buildBeats([{kind:'move',side:'e',index:0,move:'Surf',type:'Water',power:95,offensive:true,outcome:'hit',targetSide:'p'},{kind:'damage',side:'p',index:0,hp:10,amount:30,cause:'move'}]);
 const full=planBeat(beats[0],{names}),reduced=planBeat(beats[0],{names,reduced:true});
 assert.ok(reduced.duration<full.duration/2);assert.deepEqual(kinds(full).sort(),kinds(reduced).sort());
});

test('fuzz: every beat from real battles has ordered phases and consistent semantics',()=>{
 let beatsSeen=0;
 for(const date of ['2026-11-01','2026-11-02','2026-11-03','2026-11-04']){
  const run=createRun({mode:'daily',date});
  for(let i=0;i<200&&run.phase==='battle';i++){
   const action=run.pendingSwitch||i%9===5?{kind:'switch',index:run.player.findIndex((m,j)=>m.hp>0&&j!==run.pActive)}:{kind:'move',index:i%4};
   if(!turn(run,action))continue;
   const beats=buildBeats(run.visualEvents);
   for(const beat of beats){
    beatsSeen++;const plan=planBeat(beat,{names});
    for(let k=1;k<plan.cues.length;k++)assert.ok(plan.cues[k].t>=0&&Number.isFinite(plan.cues[k].t));
    assert.ok(plan.duration>=Math.max(...plan.cues.map(c=>c.t)));
    if(beat.type==='exchange'){
     const has=kind=>plan.cues.some(c=>c.kind===kind);
     if(beat.outcome!=='hit')assert.equal(has('contact'),false,`${beat.move} ${beat.outcome}`);
     if(beat.outcome==='hit'&&beat.hits.length)assert.ok(has('contact'));
     const damageIdx=plan.cues.findIndex(c=>c.kind==='hp'&&c.mode==='damage');
     if(has('contact')&&damageIdx>=0)assert.ok(plan.cues.find(c=>c.kind==='contact').t<=plan.cues[damageIdx].t);
    }
   }
  }
 }
 assert.ok(beatsSeen>40);
});

function fakeTimers(){
 let time=0,seq=0;const pending=new Map();
 return {timers:{now:()=>time,set:(fn,ms)=>{const id=++seq;pending.set(id,{at:time+ms,fn});return id},clear:id=>pending.delete(id)},
  async advance(ms){const end=time+ms;for(;;){const next=[...pending.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;pending.delete(next[0]);time=Math.max(time,next[1].at);next[1].fn();await Promise.resolve();await Promise.resolve()}time=end;await Promise.resolve()},
  get pending(){return pending.size}};
}

test('director fires cues in order on one clock and resolves complete',async()=>{
 const f=fakeTimers(),director=createDirector(f.timers),log=[];
 const done=director.play([{t:0,kind:'a'},{t:300,kind:'b'},{t:900,kind:'c'}],{a:()=>log.push('a'),b:()=>log.push('b'),c:()=>log.push('c')},{rate:1});
 await f.advance(0);await f.advance(310);assert.deepEqual(log,['a','b']);
 await f.advance(700);const result=await done;assert.deepEqual(log,['a','b','c']);assert.equal(result.completed,true);assert.equal(f.pending,0);assert.equal(director.active,false);
});

test('director speed scales time; skip settles immediately and leaves no timers',async()=>{
 const f=fakeTimers(),director=createDirector(f.timers),log=[];
 const done=director.play([{t:0,kind:'a'},{t:1000,kind:'b'},{t:2000,kind:'c'}],{a:()=>log.push('a'),b:()=>log.push('b'),c:()=>log.push('c')},{rate:2});
 await f.advance(0);await f.advance(520);assert.deepEqual(log,['a','b']);
 director.skip();const result=await done;assert.equal(result.skipped,true);assert.equal(result.completed,false);assert.deepEqual(log,['a','b']);assert.equal(f.pending,0);assert.equal(director.active,false);
});

test('cancel stops pending cues, never calls handlers afterwards and a new play can start',async()=>{
 const f=fakeTimers(),director=createDirector(f.timers),log=[];
 const first=director.play([{t:0,kind:'a'},{t:500,kind:'b'}],{a:()=>log.push('a'),b:()=>log.push('b')});
 await f.advance(0);director.cancel();const r=await first;assert.equal(r.cancelled,true);await f.advance(2000);assert.deepEqual(log,['a']);
 const second=director.play([{t:0,kind:'z'}],{z:()=>log.push('z')});await f.advance(0);assert.equal((await second).completed,true);assert.deepEqual(log,['a','z']);
});

test('a throwing handler cannot wedge the director',async()=>{
 const f=fakeTimers(),director=createDirector(f.timers),log=[],original=console.error;console.error=()=>{};
 try{const done=director.play([{t:0,kind:'x'},{t:10,kind:'y'}],{x:()=>{throw Error('boom')},y:()=>log.push('y')});await f.advance(0);await f.advance(20);const r=await done;assert.equal(r.completed,true);assert.deepEqual(log,['y'])}finally{console.error=original}
});
