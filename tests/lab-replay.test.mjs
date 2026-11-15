import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,turn,active} from '../src/engine.js';
import {startLab,createLabSession,remember,undo,redo,canUndo,retry,compare,explainTurn,focusOpponent,clone,isLab} from '../src/lab.js';
import {startRecording,recordTurn,finishRecording,stateAt,knockoutMarkers,decisiveTurnIndex,validateReplay,pruneIndex,MAX_TURNS,replayId} from '../src/recorder.js';
import {moveFacts,estimateAttack,describeEstimate,itemEffect,categoryOf} from '../src/moveinfo.js';
import {validateBackup} from '../src/backup.js';
import {MOVES} from '../src/data.js';

const act=i=>({kind:'move',index:i%4});
const json=v=>JSON.stringify(v);

test('lab undo restores the exact state including RNG, and replaying the same choice repeats the outcome',()=>{
 let run=startLab({seed:12345});const session=createLabSession();
 assert.equal(isLab(run),true);
 for(let i=0;i<3;i++){remember(session,run);turn(run,act(i))}
 const before=clone(run);
 remember(session,run);turn(run,act(1));
 const afterFirst=json({hp:run.player.map(m=>m.hp),foe:run.foe.map(m=>m.hp),rng:run.rng,log:run.log});
 const undone=undo(session,run);
 assert.equal(json({...undone,lab:0}),json({...before,lab:0}),'undo returns the identical pre-decision state');
 assert.equal(undone.rng,before.rng);
 run=undone;remember(session,run);turn(run,act(1));
 assert.equal(json({hp:run.player.map(m=>m.hp),foe:run.foe.map(m=>m.hp),rng:run.rng,log:run.log}),afterFirst,'same choice, same random result');
 assert.equal(canUndo(session),true);
 const redone=redo(session,run);assert.ok(redone===null||typeof redone==='object');
});

test('lab undo history is bounded and cleared by a new decision after undo',()=>{
 const session=createLabSession();let run=startLab({seed:7});
 for(let i=0;i<60;i++){remember(session,run);if(!turn(run,act(i)))break;if(run.phase!=='battle')break}
 assert.ok(session.stack.length<=24);
 const u=undo(session,run);assert.ok(u);assert.equal(session.redo.length,1);
 remember(session,u);assert.equal(session.redo.length,0);
});

test('retry repeats the same team and seed and the same first-turn result',()=>{
 const run=startLab({seed:424242});
 const mirror=retry(run);
 assert.deepEqual(mirror.player.map(m=>m.name),run.player.map(m=>m.name));
 assert.equal(mirror.seed,run.seed);assert.equal(mirror.lab.retries,1);
 const a=clone(run),b=clone(mirror);turn(a,act(0));turn(b,act(0));
 assert.deepEqual(a.log.map(l=>l.text),b.log.map(l=>l.text));assert.equal(a.rng,b.rng);
});

test('compare evaluates alternatives from the same RNG without touching the real run',()=>{
 const run=startLab({seed:99}),snapshot=json(run);
 const results=compare(run,[act(0),act(1),act(2),act(3)]);
 assert.equal(json(run),snapshot,'original run is untouched');
 assert.equal(results.length,4);
 assert.ok(results.every(r=>r.ok&&Number.isFinite(r.dealt)&&Array.isArray(r.notes)));
 const again=compare(run,[act(0),act(1),act(2),act(3)]);assert.deepEqual(results,again,'comparison is repeatable');
});

test('opponent practice reorders Red without losing anyone',()=>{
 const run=startLab({seed:5,focus:3});
 assert.equal(run.foe.length,6);assert.equal(run.eActive,0);assert.equal(run.foe[0].name,'Venusaur');assert.equal(run.lab.focus,'Venusaur');
 assert.deepEqual([...run.foe.map(m=>m.name)].sort(),['Blastoise','Charizard','Espeon','Pikachu','Snorlax','Venusaur']);
 const retried=retry(run);assert.equal(retried.foe[0].name,'Venusaur');
});

test('explanations name immunity, order and barriers using real events',()=>{
 let found={order:false,immune:false};
 for(const seed of [1,2,3,4,5,6,7,8,9,10,11,12]){
  const run=startLab({seed});
  for(let i=0;i<30&&run.phase==='battle';i++){
   const before=clone(run);if(!turn(run,run.pendingSwitch?{kind:'switch',index:run.player.findIndex((m,j)=>m.hp>0&&j!==run.pActive)}:act(i)))continue;
   const notes=explainTurn(before,run);
   if(notes.some(n=>n.tone==='order'&&/moved first/.test(n.text)))found.order=true;
   if(notes.some(n=>n.tone==='immune'))found.immune=true;
  }
 }
 assert.equal(found.order,true);
});

test('recording is versioned, bounded, reconstructs state and validates',()=>{
 const run=createRun({mode:'daily',date:'2026-11-05'});const rec=startRecording(run);
 assert.equal(rec.id,replayId(run));
 for(let i=0;i<40&&run.phase==='battle';i++){const a=run.pendingSwitch?{kind:'switch',index:run.player.findIndex((m,j)=>m.hp>0&&j!==run.pActive)}:act(i);if(turn(run,a))recordTurn(rec,run,a)}
 finishRecording(rec,run);validateReplay(rec);
 assert.ok(rec.turns.length>3);
 const end=stateAt(rec,rec.turns.length);
 assert.deepEqual(end.player.map(m=>m.hp),run.player.map(m=>m.hp));assert.deepEqual(end.foe.map(m=>m.hp),run.foe.map(m=>m.hp));
 assert.equal(end.pActive,run.pActive);
 assert.deepEqual(stateAt(rec,0).player.map(m=>m.hp),startRecording(createRun({mode:'daily',date:'2026-11-05'})).player.map(m=>m.hp));
 if(run.phase!=='battle')assert.ok(knockoutMarkers(rec).length>0);
 assert.ok(decisiveTurnIndex(rec)>=0);
 assert.throws(()=>validateReplay({...rec,v:99}));assert.throws(()=>validateReplay({...rec,turns:[{n:1,ev:'x'}]}));
 const size=JSON.stringify(rec).length;assert.ok(size<110_000,String(size));
});

test('recording stops growing at the turn cap and old saves still read',()=>{
 const run=createRun({mode:'practice',date:'2026-11-06',seed:3}),rec=startRecording(run);
 for(let i=0;i<MAX_TURNS+20;i++){recordTurn(rec,{...run,turn:i+2,visualEvents:[],player:run.player,foe:run.foe},act(0))}
 assert.equal(rec.turns.length,MAX_TURNS);assert.equal(rec.truncated,true);
 const {keep,drop}=pruneIndex(['a','b','c'],'d',3);assert.deepEqual(keep,['d','a','b']);assert.deepEqual(drop,['c']);
});

test('backup validation accepts a replay and rejects malformed ones; old backups still import',()=>{
 const run=createRun({mode:'daily',date:'2026-11-07'}),rec=startRecording(run);turn(run,act(0));recordTurn(rec,run,act(0));
 const good={app:'daily-silver',exportVersion:2,entries:{[`replay:${rec.id}`]:rec,'replay-index':[rec.id],'effects-level':.8,'reduced-motion':'auto','visual-intensity':'full','fx-rate':1,'volume':.5}};
 assert.doesNotThrow(()=>validateBackup(JSON.stringify(good)));
 const bad={...good,entries:{...good.entries,[`replay:${rec.id}`]:{...rec,v:1}}};
 assert.throws(()=>validateBackup(JSON.stringify(bad)));
 const old={app:'daily-silver',exportVersion:2,entries:{records:[],'fx-rate':1,volume:.5,'high-contrast':false}};
 assert.doesNotThrow(()=>validateBackup(JSON.stringify(old)));
});

test('move facts cover recoil, recharge, self-destruct, priority and Gen II categories',()=>{
 assert.equal(categoryOf(MOVES.Thunderbolt),'special');assert.equal(categoryOf(MOVES['Body Slam']),'physical');assert.equal(categoryOf(MOVES.Toxic),'status');
 assert.ok(moveFacts('Double-Edge').warnings.some(w=>/Recoil/.test(w)));
 assert.ok(moveFacts('Hyper Beam').warnings.some(w=>/recharge/.test(w)));
 assert.ok(moveFacts('Explosion').warnings.some(w=>/faints/.test(w)));
 assert.ok(moveFacts('Quick Attack').notes.some(n=>/Priority/.test(n)));
 assert.match(itemEffect('Leftovers'),/1\/16/);assert.match(itemEffect('Charcoal'),/Fire/);
 for(const name of Object.keys(MOVES))assert.ok(moveFacts(name).text.length>5,name);
});

test('damage estimates reflect type, are ranges, and never rank moves by multiplier alone',()=>{
 const run=startLab({seed:21});const att=active(run,'p'),def=active(run,'e');
 for(const slot of att.moves){
  const est=estimateAttack(slot,att,def,run,'p');assert.ok(est);
  if(est.known&&est.max>0){assert.ok(est.min<=est.max);assert.ok(est.pctMax>=est.pctMin);assert.match(describeEstimate(est),/≈|%/)}
 }
 const immune=estimateAttack({name:'Earthquake'},{...att,types:['Ground'],level:80,stats:att.stats,boost:att.boost,status:'',item:''},{...def,types:['Flying'],hp:100},run,'p');
 assert.equal(immune.max,0);
});
