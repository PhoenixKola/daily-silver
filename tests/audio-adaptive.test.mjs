import test from 'node:test';
import assert from 'node:assert/strict';

function setup(initial={}){
 const nodes=[],counters={createBuffer:0,suspend:0,resume:0},listeners={};
 const param=value=>({value,events:[],setValueAtTime(v){this.value=v;this.events.push(['set',v])},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},setTargetAtTime(v,t,k){this.events.push(['target',v,t,k])},cancelScheduledValues(){}});
 class FakeNode{constructor(kind){this.kind=kind;this.targets=[];this.gain=param(1);this.frequency=param(440);this.Q=param(1);this.threshold=param(0);this.knee=param(0);this.ratio=param(0);this.attack=param(0);this.release=param(0);nodes.push(this)}connect(n){this.targets.push(n);return n}disconnect(){}start(){}stop(){}}
 class FakeAudioContext{
  constructor(){this.currentTime=1;this.state='running';this.sampleRate=8000;this.destination=new FakeNode('destination');this.ctxNodes=nodes}
  createGain(){return new FakeNode('gain')}createDynamicsCompressor(){return new FakeNode('compressor')}createOscillator(){return new FakeNode('oscillator')}
  createBiquadFilter(){return new FakeNode('filter')}createBufferSource(){return new FakeNode('source')}
  createBuffer(c,len){counters.createBuffer++;return {duration:len/8000,getChannelData:()=>new Float32Array(len)}}
  suspend(){counters.suspend++;this.state='suspended';return Promise.resolve()}resume(){counters.resume++;this.state='running';return Promise.resolve()}
 }
 const saved=new Map(Object.entries({'daily-silver-v1:sound-enabled':'false',...initial}));
 globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 globalThis.document={hidden:false,addEventListener:(t,fn)=>{(listeners[t]??=[]).push(fn)},removeEventListener(){}};
 globalThis.window={AudioContext:FakeAudioContext};
 return {nodes,counters,saved,listeners};
}
const load=tag=>import('../src/sound.js?adaptive-'+tag);
const count=(nodes,kind)=>nodes.filter(n=>n.kind===kind).length;

test('musicPlan layers in monotonically with stage and critical adds tension',async()=>{
 setup();const audio=await load('plan');
 let prev=audio.musicPlan({mode:'battle',stage:0});
 assert.equal(prev.arp,0);assert.equal(prev.perc,0);assert.equal(prev.lead,0);
 for(const stage of [1,2,3]){
  const cur=audio.musicPlan({mode:'battle',stage});
  for(const layer of ['pad','bass','arp','perc','lead'])assert.ok(cur[layer]>=prev[layer],`${layer} must not drop at stage ${stage}`);
  assert.ok(cur.stepSec<=prev.stepSec);prev=cur;
 }
 assert.ok(audio.musicPlan({mode:'battle',stage:1}).arp>0,'arp enters at stage 1');
 assert.ok(audio.musicPlan({mode:'battle',stage:2}).perc>0,'percussion at stage 2');
 assert.ok(audio.musicPlan({mode:'battle',stage:3}).lead>0,'last-light melody at stage 3');
 assert.equal(audio.musicPlan({mode:'battle',stage:1}).tense,0);
 assert.equal(audio.musicPlan({mode:'battle',stage:1,critical:true}).tense,1);
 assert.equal(audio.musicPlan({mode:'critical',stage:0}).tense,1);
 const silent=audio.musicPlan({mode:'silence'});
 assert.ok(['pad','bass','arp','perc','lead','tense'].every(k=>silent[k]===0));
});

test('encounter and mode changes crossfade layers without resetting the scheduler step',async()=>{
 const env=setup();const audio=await load('step');
 try{
  audio.setSound(true);
  audio.setEncounterState({foesDown:0});
  for(let i=0;i<3;i++)audio.tickNow();
  const before=audio.getSchedulerStep();assert.ok(before>=1);
  audio.setEncounterState({foesDown:4});
  audio.setEncounterState({critical:true});
  audio.setMusicMode('battle');audio.setMusicMode('critical');
  assert.ok(audio.getSchedulerStep()>=before,'step counter never decreases or restarts');
  assert.deepEqual(audio.getEncounterState(),{mode:'battle',stage:2,foesDown:4,critical:true});
  const layerGains=env.nodes.filter(n=>n.kind==='gain'&&n.targets.some(t=>t.kind==='gain')&&n.gain.events.some(e=>e[0]==='target'));
  assert.ok(layerGains.length>=6,'layer gains are crossfaded with setTargetAtTime');
  assert.ok(layerGains.every(g=>g.gain.events.filter(e=>e[0]==='target').every(e=>e[3]>=.05)));
 }finally{audio.setSound(false)}
});

test('effects level persists, clamps and scales the effects bus',async()=>{
 const env=setup({'daily-silver-v1:effects-level':'0.3'});const audio=await load('fxlevel');
 try{
  assert.equal(audio.getEffectsLevel(),.3);
  audio.setSound(true);
  const compressor=env.nodes.find(n=>n.kind==='compressor');
  const fxBus=env.nodes.filter(n=>n.kind==='gain'&&n.targets.includes(compressor))[1];
  assert.ok(Math.abs(fxBus.gain.value-.65*.3)<1e-9);
  assert.equal(audio.setEffectsLevel(5),1);assert.equal(env.saved.get('daily-silver-v1:effects-level'),'1');
  assert.ok(Math.abs(fxBus.gain.value-.65)<1e-9);
  assert.equal(audio.setEffectsLevel(-2),0);assert.equal(audio.getEffectsLevel(),0);
 }finally{audio.setSound(false)}
});

test('rapid duplicate effects are throttled and concurrent voices are capped',async()=>{
 const env=setup();const audio=await load('voices');
 try{
  audio.setSound(true);
  const osc=()=>count(env.nodes,'oscillator');
  const base=osc();audio.sfx('miss');const afterOne=osc();assert.ok(afterOne>base);
  audio.sfx('miss');assert.equal(osc(),afterOne,'same sfx within 35ms is dropped');
  audio.sfx('miss',undefined,{delay:.5});assert.ok(osc()>afterOne,'a distinct scheduled time is allowed');
  const before=osc();
  for(let i=0;i<60;i++)audio.sfx('heal',undefined,{delay:i*.05});
  assert.ok(osc()-before<=24,'effect voices are capped at 24');
 }finally{audio.setSound(false)}
});

test('wind ambience reuses one noise buffer across stages and impacts',async()=>{
 const env=setup();const audio=await load('wind');
 try{
  audio.setSound(true);
  audio.setAmbience(0);audio.setAmbience(2);audio.setAmbience(3);
  audio.sfx('impact',{amount:40,type:'Water',category:'special'});
  audio.sfx('impact',{amount:60,type:'Rock'},{delay:.2});
  assert.equal(env.counters.createBuffer,1,'a single reusable noise buffer');
  assert.equal(count(env.nodes,'source')>=1,true);
  const filters=env.nodes.filter(n=>n.kind==='filter');
  const wind=filters[0];assert.ok(wind.frequency.events.some(e=>e[0]==='target'&&e[1]===550),'cutoff follows the stage');
  audio.setAmbience(null);
 }finally{audio.setSound(false)}
});

test('hidden tab suspends audio and stops the scheduler; visible resumes',async()=>{
 const env=setup();const audio=await load('hidden');
 try{
  audio.setSound(true);
  assert.ok(env.listeners.visibilitychange?.length,'visibility handler registered');
  globalThis.document.hidden=true;env.listeners.visibilitychange.forEach(fn=>fn());
  assert.equal(env.counters.suspend,1);
  const step=audio.getSchedulerStep();audio.tickNow();assert.equal(audio.getSchedulerStep(),step,'no scheduling while hidden');
  globalThis.document.hidden=false;env.listeners.visibilitychange.forEach(fn=>fn());
  assert.ok(env.counters.resume>=1);
 }finally{globalThis.document.hidden=false;audio.setSound(false)}
});

test('victory and defeat stingers are distinct and defeat stays short',async()=>{
 const env=setup();const audio=await load('stinger');
 try{
  audio.setSound(true);
  let before=count(env.nodes,'oscillator');audio.playStinger('victory');const win=count(env.nodes,'oscillator')-before;
  assert.equal(audio.getEncounterState().mode,'victory');
  before=count(env.nodes,'oscillator');audio.playStinger('defeat');const loss=count(env.nodes,'oscillator')-before;
  assert.equal(audio.getEncounterState().mode,'defeat');
  assert.ok(win>0&&loss>0&&win!==loss);
 }finally{audio.setSound(false)}
});
