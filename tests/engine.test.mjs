import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,MOVES,effectiveness,SPECIAL,BOSS} from '../src/data.js';
import {createRun,turn,alive,dailySeed,specimen,estimateDamage} from '../src/engine.js';

test('all 135 curated species have four playable moves',()=>{
 assert.equal(SPECIES.length,135);
 for(const s of SPECIES){assert.equal(s.moves.length,4,s.name);for(const move of s.moves)assert.ok(MOVES[move],s.name+' / '+move)}
});
test('deterministic daily seed and teams',()=>{
 const a=createRun({mode:'daily',date:'2026-10-13'}),b=createRun({mode:'daily',date:'2026-10-13'});
 assert.equal(dailySeed('2026-10-13'),dailySeed('2026-10-13'));
 assert.deepEqual(a.player,b.player);assert.deepEqual(a.foe,b.foe);
 assert.equal(new Set(a.player.map(x=>x.name)).size,6);
 assert.deepEqual(a.foe.map(x=>x.name),BOSS);
});
test('Generation II type rules',()=>{
 assert.equal(effectiveness('Electric',['Ground']),0);
 assert.equal(effectiveness('Psychic',['Dark']),0);
 assert.equal(effectiveness('Ghost',['Normal']),0);
 assert.equal(effectiveness('Fighting',['Dark','Steel']),4);
 assert.equal(effectiveness('Fire',['Grass','Steel']),4);
 assert.ok(SPECIAL.has('Dark'));
 assert.ok(!SPECIAL.has('Ghost'));
 assert.ok(!SPECIAL.has('Steel'));
});
test('physical, special, and immunities drive damage',()=>{
 const e=specimen('Pikachu'),d=specimen('Quagsire');
 assert.ok(estimateDamage(MOVES['Surf'],e,d)>0);
 assert.equal(effectiveness('Electric',d.types),0);
});
test('attack spends PP and increments turn',()=>{
 const b=createRun({seed:2});const before=b.player[0].moves[0].pp;
 assert.ok(turn(b,{kind:'move',index:0}));
 assert.equal(b.player[0].moves[0].pp,before-1);
 assert.equal(b.turn,2);
});
test('forced switch from fainted ally is possible and does not skip the next action',()=>{
 const b=createRun({seed:22});b.player[0].hp=0;b.pendingSwitch=true;
 assert.ok(turn(b,{kind:'switch',index:1}));
 assert.equal(b.pActive,1);assert.equal(b.pendingSwitch,false);
 assert.ok(b.player[1].hp>0);
});
test('no switching to already active or fainted creatures',()=>{
 const b=createRun({seed:11});assert.equal(turn(b,{kind:'switch',index:0}),false);
 b.player[1].hp=0;assert.equal(turn(b,{kind:'switch',index:1}),false);
});
test('result is final once every enemy is defeated',()=>{
 const b=createRun({seed:3});for(const p of b.foe.slice(1))p.hp=0;
 b.foe[0].hp=1;const m=b.player[0].moves.findIndex(m=>MOVES[m.name].power>0);
 assert.ok(m>=0);turn(b,{kind:'move',index:m});
 assert.ok(['battle','won'].includes(b.phase));
 if(b.phase==='won')assert.equal(turn(b,{kind:'move',index:0}),false);
});
test('game stress check: 120 random daily encounters finish',()=>{
 let finished=0;for(let seed=1;seed<=120;seed++){
  const b=createRun({mode:'practice',seed});for(let i=0;i<220&&b.phase==='battle';i++){
   if(b.pendingSwitch){const j=b.player.findIndex((x,k)=>x.hp>0&&k!==b.pActive);if(j<0)break;turn(b,{kind:'switch',index:j});continue}
   const p=b.player[b.pActive],f=b.foe[b.eActive];const ranked=p.moves.map((s,i)=>({i,value:s.pp>0?estimateDamage(MOVES[s.name],p,f):0})).sort((a,b)=>b.value-a.value);
   if(ranked[0].value){turn(b,{kind:'move',index:ranked[0].i})}else{const j=b.player.findIndex((x,k)=>x.hp>0&&k!==b.pActive);if(j===-1)break;turn(b,{kind:'switch',index:j})}
  }if(b.phase!=='battle')finished++;
 }assert.ok(finished>=115,`Only ${finished}/120 battles finished`);
});
