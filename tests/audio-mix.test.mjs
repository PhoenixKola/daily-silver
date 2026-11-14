import test from 'node:test';
import assert from 'node:assert/strict';

test('battle effects use a separate bus, duck music, and pass through a limiter',async()=>{
 const nodes=[];
 const param=value=>({value,events:[],setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t])},linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t])},exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exponential',v,t])},setTargetAtTime(v,t,k){this.events.push(['target',v,t,k])},cancelScheduledValues(t){this.events.push(['cancel',t])}});
 class FakeNode{constructor(kind){this.kind=kind;this.targets=[];this.gain=param(1);this.frequency=param(440);this.threshold=param(0);this.knee=param(0);this.ratio=param(0);this.attack=param(0);this.release=param(0);nodes.push(this)}connect(node){this.targets.push(node);return node}disconnect(){}start(){}stop(){}}
 class FakeAudioContext{constructor(){this.currentTime=1;this.state='running';this.destination=new FakeNode('destination')}createGain(){return new FakeNode('gain')}createDynamicsCompressor(){return new FakeNode('compressor')}createOscillator(){return new FakeNode('oscillator')}}
 const saved=new Map([['daily-silver-v1:sound-enabled','false']]);
 globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
 globalThis.window={AudioContext:FakeAudioContext};globalThis.document={hidden:false};
 const audio=await import('../src/sound.js?mix-test');
 try{
  audio.setSound(true);
  const compressor=nodes.find(node=>node.kind==='compressor');
  assert.ok(compressor,'a shared limiter must exist');
  assert.equal(compressor.targets[0].targets[0].kind,'destination');
  const buses=nodes.filter(node=>node.kind==='gain'&&node.targets.includes(compressor));
  assert.equal(buses.length,2,'music and effects require separate buses');
  const musicBus=buses[0],fxBus=buses[1];
  const tonesBefore=nodes.filter(node=>node.kind==='oscillator').length;
  audio.sfx('cast','Electric');
  assert.equal(nodes.filter(node=>node.kind==='oscillator').length,tonesBefore+2);
  assert.ok(musicBus.gain.events.some(event=>event[0]==='target'&&event[1]<musicBus.gain.value),'effect should duck the music');
  assert.ok(nodes.filter(node=>node.kind==='gain'&&node.targets.includes(fxBus)).length>=2,'effect tones should use the effect bus');
  audio.setMusicLevel(.25);
  assert.equal(audio.getMusicLevel(),.25);
  assert.equal(saved.get('daily-silver-v1:music-level'),'0.25');
 }finally{audio.setSound(false)}
});
