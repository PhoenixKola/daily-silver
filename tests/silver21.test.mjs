import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,turn,specimen,visual} from '../src/engine.js';
import {validateBackup} from '../src/backup.js';
const fakeBackup=entries=>JSON.stringify({app:'daily-silver',exportVersion:2,entries});

test('move effect events expose outcome instead of implying hit before accuracy is resolved',()=>{
 const b=createRun({seed:201,date:'2026-10-10',mode:'practice'});
 b.player[0]=specimen('Pikachu',81);b.foe[0]=specimen('Golem',81);
 b.player[0].moves[0]={name:'Thunderbolt',pp:10,maxPp:10};
 turn(b,{kind:'move',index:0});
 const cue=b.visualEvents.find(e=>e.kind==='move'&&e.side==='p');
 assert.ok(cue);assert.equal(cue.outcome,'immune');assert.ok(b.visualEvents.some(e=>e.kind==='immune'));
});
test('an accurate damaging move publishes hit cue before impact damage',()=>{
 const b=createRun({seed:209,date:'2026-10-10',mode:'practice'});
 b.player[0]=specimen('Blastoise',81);b.foe[0]=specimen('Charizard',81);
 b.player[0].moves[0]={name:'Surf',pp:10,maxPp:10};
 let found;
 for(let i=0;i<10;i++){b.rng=10+i*2221;const candidate=structuredClone(b);turn(candidate,{kind:'move',index:0});let cue=candidate.visualEvents.find(e=>e.kind==='move'&&e.side==='p');if(cue?.outcome==='hit'){found=candidate.visualEvents;break}}
 assert.ok(found,'expect a landed Surf');
 const moveIndex=found.findIndex(e=>e.kind==='move'&&e.side==='p');const dmgIndex=found.findIndex(e=>e.kind==='damage'&&e.side==='e');
 assert.ok(moveIndex>=0&&dmgIndex>moveIndex);
 assert.ok(found[moveIndex].effectiveness>=2);
});
test('missed offensive attacks visibly report miss instead of pretending to land',()=>{
 const b=createRun({seed:231,date:'2026-10-10',mode:'practice'});
 b.player[0]=specimen('Machamp',81);b.foe[0]=specimen('Pikachu',81);
 b.player[0].moves[0]={name:'Dynamic Punch',pp:8,maxPp:8};
 let found=false;
 for(let i=0;i<45;i++){
  const current=structuredClone(b);current.rng=i*91112+21;turn(current,{kind:'move',index:0});
  const cue=current.visualEvents.find(e=>e.kind==='move'&&e.side==='p');
  if(cue?.outcome==='miss'){assert.ok(current.visualEvents.some(e=>e.kind==='miss'));found=true;break}
 }
 assert.ok(found,'expect deterministic miss within sample');
});
test('2.0 local save backup can be restored without changing stored run version',()=>{
 const b=createRun({seed:1,date:'2026-10-10',mode:'daily'});
 const entries=validateBackup(fakeBackup({'daily:2026-10-10':b,'sound-enabled':true,'volume':.55,'fx-rate':1.5,records:[]}));
 assert.equal(entries['daily:2026-10-10'].version,1);
 assert.equal(entries['sound-enabled'],true);
});
test('reject malformed imports, dates and hostile record payloads',()=>{
 assert.throws(()=>validateBackup(fakeBackup({'daily:2026-02-30':{}})));
 assert.throws(()=>validateBackup(fakeBackup({'records':[{mode:'daily',date:'2026-10-10',won:'yes'}]})));
 assert.throws(()=>validateBackup(fakeBackup({'something-else':'danger'})));
});
test('service worker caches only Daily Silver keys, ships with new backup module',async()=>{
 const content=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
 assert.match(content,/startsWith\(PREFIX\)/);
 assert.ok(JSON.parse(await readFile(new URL('../core-manifest.json',import.meta.url),'utf8')).files.includes('./src/backup.js'));
 assert.match(content,/await fetch\(e\.request\)/);
});
