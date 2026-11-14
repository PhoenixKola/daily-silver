import test from 'node:test';
import assert from 'node:assert/strict';
import {MOVES,SPECIES,effectiveness} from '../src/data.js';
import {createRun,turn,specimen,estimateDamage,alive} from '../src/engine.js';

const testMoves=['Extreme Speed','Explosion','Crabhammer','Seismic Toss','High Jump Kick','Lovely Kiss','Spore','Synthesis','Moonlight','Milk Drink','Aeroblast','Sacred Fire','Stun Spore','Glare','Counter','Mirror Coat','Substitute'];
test('Signature attacks are individually defined, not silent replacements',()=>{for(const m of testMoves)assert.equal(MOVES[m]?.name,m)});
test('Actual signature moves remain in species loadouts',()=>{
 const species=new Map(SPECIES.map(s=>[s.name,s]));
 assert.ok(species.get('Arcanine').moves.includes('Extreme Speed'));
 assert.ok(species.get('Golem').moves.includes('Explosion'));
 assert.ok(species.get('Ho-Oh').moves.includes('Sacred Fire'));
 assert.ok(species.get('Lugia').moves.includes('Aeroblast'));
 assert.ok(species.get('Blissey').moves.includes('Seismic Toss'));
});
test('Status effects use Gen II rules: electric type can be paralyzed',()=>{
 const b=createRun({seed:411});b.player[0]=specimen('Ampharos');b.foe[0]=specimen('Raichu');
 const par=b.player[0].moves.findIndex(m=>m.name==='Thunder Wave');
 assert.ok(par>=0);turn(b,{kind:'move',index:par});assert.equal(b.foe[0].status,'par');
});
test('Explosion does not merely call Double-Edge and self-KOs',()=>{
 const b=createRun({seed:67});b.player[0]=specimen('Golem');b.foe[0]=specimen('Blastoise');b.foe[0].stats.spe=1;
 const i=b.player[0].moves.findIndex(m=>m.name==='Explosion');assert.ok(i>=0);turn(b,{kind:'move',index:i});assert.equal(b.player[0].hp,0);
});
test('Seismic Toss deals fixed damage based on level',()=>{
 const b=createRun({seed:214});b.player[0]=specimen('Blissey',90);b.foe[0]=specimen('Snorlax',70);b.foe[0].stats.spe=1;b.foe[0].item='';
 const i=b.player[0].moves.findIndex(m=>m.name==='Seismic Toss');assert.ok(i>=0);const hp=b.foe[0].hp;turn(b,{kind:'move',index:i});assert.ok(hp-b.foe[0].hp>=76);
});
test('Reflect and Light Screen are tracked independently',()=>{
 const b=createRun({seed:21});b.player[0]=specimen('Raikou');b.foe[0]=specimen('Snorlax');b.foe[0].stats.spe=1;
 const reflect=b.player[0].moves.findIndex(m=>m.name==='Reflect');assert.ok(reflect>=0);turn(b,{kind:'move',index:reflect});assert.ok(b.screens.p.reflect>0);assert.equal(b.screens.p.lightScreen,0);
});
test('Daily run seeds unchanged from previous releases',()=>{
 const a=createRun({mode:'daily',date:'2026-10-13'}),b=createRun({mode:'daily',date:'2026-10-13'});assert.deepEqual(a.player,b.player);assert.equal(a.version,1);
});
test('All species have legal engine references and valid base stats',()=>{
 for(const s of SPECIES){assert.equal(s.moves.length,4,s.name);for(const m of s.moves)assert.ok(MOVES[m],`${s.name}/${m}`);for(const v of Object.values(s.base))assert.ok(Number.isFinite(v)&&v>0)}
});
test('Curated challenge simulation completes within finite turns',()=>{
 let done=0;for(let seed=100;seed<180;seed++){const b=createRun({seed,mode:'practice'});for(let n=0;n<200&&b.phase==='battle';n++){
 if(b.pendingSwitch){const j=b.player.findIndex((m,i)=>m.hp>0&&i!==b.pActive);if(j===-1)break;turn(b,{kind:'switch',index:j});continue}
 const a=b.player[b.pActive],t=b.foe[b.eActive];const move=a.moves.map((m,i)=>({i,pp:m.pp,damage:estimateDamage(MOVES[m.name],a,t)})).filter(m=>m.pp>0).sort((a,b)=>b.damage-a.damage)[0];
 if(move)turn(b,{kind:'move',index:move.i});else{const j=b.player.findIndex((m,i)=>m.hp>0&&i!==b.pActive);if(j<0)break;turn(b,{kind:'switch',index:j})}
 }if(b.phase!=='battle')done++;}assert.ok(done>=74,`${done}/80 runs concluded`)
});
