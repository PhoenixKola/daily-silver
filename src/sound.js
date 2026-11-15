// DAILY SILVER — original synthesized adaptive score, wind ambience and effects.
// Everything is generated with Web Audio; no recordings or samples. Audio uses Math.random only
// for timbre variation and never touches battle RNG.
const LS=globalThis.localStorage;
const readKey=(key,fallback)=>{try{const v=LS?.getItem?.(key);return v===null||v===undefined?fallback:v}catch{return fallback}};
const writeKey=(key,value)=>{try{LS?.setItem?.(key,value)}catch{}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=(v,fallback)=>{const n=Number(v);return Number.isFinite(n)?n:fallback};

let ctx=null,output=null,musicBus=null,fxBus=null,limiter=null,windGain=null,windFilter=null,windSrc=null,noiseBuf=null;
let enabled=readKey('daily-silver-v1:sound-enabled','false')==='true';
let volume=clamp(num(readKey('daily-silver:volume',.55),.55),.05,1);
let musicLevel=clamp(num(readKey('daily-silver-v1:music-level',.55),.55),0,1);
let effectsLevel=clamp(num(readKey('daily-silver-v1:effects-level',.8),.8),0,1);

const LAYERS=['pad','bass','arp','perc','lead','tense'];
const layers={};
const state={mode:'home',stage:0,foesDown:0,critical:false};
const MODES=['home','battle','critical','results','victory','defeat','cinematic','silence'];
let timer=null,step=0,nextTime=0,stepSec=.24,curBase=146.83,ambStage=null,lastGust=0,baseDelay=0;
let gestureArmed=false;
const SCALE=[0,2,3,5,7,8,10,12];
const THEMES={
 home:{steps:[0,7,4,3,0,2,4,7,5,4,2,-1,0,4,3,2],bass:[0,-5,-2,-7]},
 battle:{steps:[0,0,7,8,7,5,3,2,0,4,7,10,8,7,5,4,3,5,8,7,4,2,0,-1,0,3,7,8,10,8,7,5],bass:[0,-5,-2,-7]},
 results:{steps:[0,2,4,7,5,4,2,0,3,5,7,12,7,5,4,2],bass:[0,-3,-5,0]},
 defeat:{steps:[0,-1,-2,-4,0,-1,-4,-7],bass:[0,-3,-5,-3]}
};
const STAGE_ARP=[0,.7,.85,1],STAGE_PERC=[0,0,.6,1],STAGE_LEAD=[0,0,0,1],STAGE_BASS=[.7,.8,.9,1];

// Pure: target layer gains, step length (seconds), key and theme for a musical state.
export function musicPlan({mode='home',stage=0,critical=false}={}){
 const st=clamp(Math.round(num(stage,0)),0,3);
 const z={pad:0,bass:0,arp:0,perc:0,lead:0,tense:0,stepSec:.24,base:146.83,theme:'home'};
 if(mode==='battle'||mode==='critical'){
  const crit=!!critical||mode==='critical';
  Object.assign(z,{pad:1,bass:STAGE_BASS[st],arp:crit?1:STAGE_ARP[st],perc:crit?Math.max(STAGE_PERC[st],.7):STAGE_PERC[st],lead:STAGE_LEAD[st],tense:crit?1:0,
   stepSec:(.19-st*.012)*(crit?.92:1),base:crit?174.61:164.81,theme:'battle'});
 }else if(mode==='results')Object.assign(z,{pad:.8,bass:.4,arp:.7,stepSec:.27,base:196,theme:'results'});
 else if(mode==='victory')Object.assign(z,{pad:.8,bass:.3,arp:.45,lead:.35,stepSec:.3,base:196,theme:'results'});
 else if(mode==='defeat')Object.assign(z,{pad:.65,bass:.25,lead:.3,stepSec:.42,base:130.81,theme:'defeat'});
 else if(mode==='cinematic')Object.assign(z,{pad:.9,bass:.35,stepSec:.3,base:146.83,theme:'home'});
 else if(mode==='silence')Object.assign(z,{stepSec:.3});
 else Object.assign(z,{pad:.8,bass:.55,arp:.55});
 return z;
}
let plan=musicPlan(state);

function frequency(base,n){const octave=Math.floor(n/7),note=((n%7)+7)%7;return base*Math.pow(2,octave+SCALE[note]/12)}
function applyOutput(){if(!ctx||!output)return;const now=ctx.currentTime;output.gain.setValueAtTime(enabled?volume*.30:0,now)}
function armGesture(){
 if(gestureArmed||typeof document==='undefined'||!document.addEventListener)return;gestureArmed=true;
 const events=['pointerdown','keydown','touchstart'];
 const handler=()=>{events.forEach(e=>document.removeEventListener?.(e,handler));gestureArmed=false;if(enabled)resumeSound()};
 events.forEach(e=>document.addEventListener(e,handler));
}
function ensure(){
 if(ctx){if(ctx.state==='suspended'&&!globalThis.document?.hidden){try{ctx.resume?.()?.catch?.(()=>{})}catch{}}return ctx}
 const AC=globalThis.window?.AudioContext||globalThis.window?.webkitAudioContext||globalThis.AudioContext;
 if(!AC)return null;
 try{
  ctx=new AC();output=ctx.createGain();musicBus=ctx.createGain();fxBus=ctx.createGain();
  limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.18;
  musicBus.gain.value=musicLevel*.55;fxBus.gain.value=.65*effectsLevel;output.gain.value=enabled?volume*.30:0;
  musicBus.connect(limiter);fxBus.connect(limiter);limiter.connect(output);output.connect(ctx.destination);
  for(const name of LAYERS){const g=ctx.createGain();g.gain.value=0;g.connect(musicBus);layers[name]=g}
  if(ctx.state==='suspended'){armGesture();try{ctx.resume?.()?.catch?.(()=>{})}catch{}}
  applyPlan(true);
 }catch(e){console.debug('WebAudio unavailable',e);ctx=null;return null}
 return ctx;
}
function getNoise(){
 if(noiseBuf)return noiseBuf;
 if(!ctx?.createBuffer)return null;
 try{const len=Math.floor((ctx.sampleRate||44100)*2),buf=ctx.createBuffer(1,len,ctx.sampleRate||44100),d=buf.getChannelData(0);let last=0;
  for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.12*w)/1.12;d[i]=last*3.2+w*.25}
  noiseBuf=buf;return buf}catch{return null}
}

// ---- voices -------------------------------------------------------------------------
const VOICE_CAP=24;let voiceEnds=[];
function reserveVoice(endTime){
 const now=ctx?.currentTime||0;voiceEnds=voiceEnds.filter(e=>e>now);
 if(voiceEnds.length>=VOICE_CAP)return false;voiceEnds.push(endTime);return true;
}
function tone(freq,sec,wave,amp,delay,sweep,dest,attack=.008){
 if(!enabled||!ctx||!dest)return null;
 const start=ctx.currentTime+Math.max(0,delay);
 if(dest===fxBus&&!reserveVoice(start+sec))return null;
 try{
  const o=ctx.createOscillator(),g=ctx.createGain(),att=Math.min(attack,sec*.5);
  o.type=wave;o.frequency.setValueAtTime(Math.max(20,freq),start);
  if(sweep)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+sweep),start+sec*.88);
  g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(amp,start+att);g.gain.exponentialRampToValueAtTime(.0001,start+sec);
  o.connect(g);g.connect(dest);o.start(start);o.stop(start+sec+.02);
  o.onended=()=>{try{o.disconnect();g.disconnect()}catch{}};
  return o;
 }catch(e){console.debug('WebAudio unavailable',e);return null}
}
function noise(sec,{type='bandpass',freq=1000,q=.8,amp=.1,delay=0,to=null,dest=fxBus,attack=.004}={}){
 if(!enabled||!ctx||!dest)return false;
 const nb=getNoise();if(!nb||!ctx.createBufferSource||!ctx.createBiquadFilter)return false;
 const start=ctx.currentTime+Math.max(0,delay);
 if(dest===fxBus&&!reserveVoice(start+sec))return false;
 try{
  const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  s.buffer=nb;f.type=type;f.frequency.setValueAtTime(freq,start);if(to)f.frequency.exponentialRampToValueAtTime(Math.max(20,to),start+sec);
  if(f.Q)f.Q.value=q;
  g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(amp,start+Math.min(attack,sec*.5));g.gain.exponentialRampToValueAtTime(.0001,start+sec);
  s.connect(f);f.connect(g);g.connect(dest);
  s.start(start,Math.random()*Math.max(0,(nb.duration||1.5)-sec-.05),sec+.02);
  s.onended=()=>{try{s.disconnect();f.disconnect();g.disconnect()}catch{}};
  return true;
 }catch(e){return false}
}

// ---- music scheduler ----------------------------------------------------------------
function applyPlan(immediate=false){
 plan=musicPlan(state);if(!ctx)return;
 const now=ctx.currentTime,k=immediate?.05:(state.mode==='silence'?.25:.9);
 for(const name of LAYERS)layers[name]?.gain.setTargetAtTime(plan[name],now,k);
}
function scheduleStep(i,t,d){
 const th=THEMES[plan.theme]||THEMES.home,dl=t-ctx.currentTime;
 if(i%8===0)curBase=plan.base;
 const base=curBase,bassDeg=th.bass[Math.floor(i/4)%th.bass.length],v=th.steps[i%th.steps.length];
 if(plan.pad>.01&&i%8===0){
  const deg=th.bass[Math.floor(i/8)%th.bass.length];
  tone(frequency(base,deg),d*8,'sine',.07,dl,0,layers.pad,.45);tone(frequency(base,deg+4),d*8,'triangle',.04,dl,0,layers.pad,.6);
 }
 if(plan.bass>.01&&i%4===0)tone(frequency(base,bassDeg)*.5,Math.min(.4,d*3),'triangle',.15,dl,0,layers.bass);
 if(plan.arp>.01&&v>=0){const f=frequency(base,v);tone(f*2,Math.min(.23,d*.88),'square',.075,dl,0,layers.arp);tone(f*1.002,.11,'triangle',.035,dl,0,layers.arp)}
 if(plan.perc>.01){
  if(i%4===0)tone(72,.14,'sine',.2,dl,-48,layers.perc);
  if(i%8===4&&!noise(.1,{type:'bandpass',freq:1800,q:.8,amp:.07,delay:dl,dest:layers.perc}))tone(160,.04,'triangle',.05,dl,-70,layers.perc);
  if(i%2===1&&!noise(.03,{type:'highpass',freq:6500,amp:.03,delay:dl,dest:layers.perc}))tone(1100,.024,'square',.013,dl,0,layers.perc);
 }
 if(plan.lead>.01&&i%4===0){const n=th.steps[(i*3+5)%th.steps.length]+7;tone(frequency(base,n),d*3.2,'sine',.07,dl,0,layers.lead,.06)}
 if(plan.tense>.01&&i%2===0){const f=frequency(base,-3)*.5;tone(f,d*1.6,'sawtooth',.045,dl,0,layers.tense,.03);tone(f*1.012,d*1.6,'sawtooth',.03,dl,0,layers.tense,.03)}
}
function tick(){
 if(!enabled||!ctx||globalThis.document?.hidden)return;
 if(nextTime<ctx.currentTime-.2)nextTime=ctx.currentTime+.02;
 const horizon=ctx.currentTime+.12;let guard=0;
 while(nextTime<horizon&&guard++<8){
  stepSec=Math.max(.09,stepSec+(plan.stepSec-stepSec)*.12);
  scheduleStep(step,nextTime,stepSec);step++;nextTime+=stepSec;
 }
 gust();
}
function startScheduler(){
 if(timer||!enabled||!ensure())return;
 nextTime=ctx.currentTime+.05;stepSec=plan.stepSec;tick();
 timer=setInterval(tick,25);timer?.unref?.();
}
function stopScheduler(){if(timer)clearInterval(timer);timer=null}
export function tickNow(){tick()}
export function getSchedulerStep(){return step}

// ---- wind ambience ------------------------------------------------------------------
const WIND_GAIN=[.012,.03,.075,.035],WIND_FREQ=[350,650,1300,550];
function windLevel(){return WIND_GAIN[ambStage]*(.3+.7*musicLevel)}
function applyAmbience(){
 if(!ctx)return;const now=ctx.currentTime;
 if(ambStage===null||!enabled){windGain?.gain.setTargetAtTime(0,now,.6);return}
 if(!windGain){
  const nb=getNoise();if(!nb||!ctx.createBufferSource||!ctx.createBiquadFilter)return;
  windSrc=ctx.createBufferSource();windSrc.buffer=nb;windSrc.loop=true;
  windFilter=ctx.createBiquadFilter();windFilter.type='bandpass';if(windFilter.Q)windFilter.Q.value=.7;windFilter.frequency.value=WIND_FREQ[ambStage];
  windGain=ctx.createGain();windGain.gain.value=0;
  windSrc.connect(windFilter);windFilter.connect(windGain);windGain.connect(limiter);windSrc.start();
 }
 windGain.gain.setTargetAtTime(windLevel(),now,1.2);windFilter.frequency.setTargetAtTime(WIND_FREQ[ambStage],now,1.2);
}
function gust(){
 if(!windGain||ambStage===null||ctx.currentTime-lastGust<2.5)return;lastGust=ctx.currentTime;
 windGain.gain.setTargetAtTime(windLevel()*(.75+Math.random()*.5),ctx.currentTime,.8);
}
function teardownWind(){
 try{windSrc?.stop();windSrc?.disconnect();windFilter?.disconnect();windGain?.disconnect()}catch{}
 windSrc=windFilter=windGain=null;
}
export function setAmbience(stage){
 ambStage=stage===null||stage===undefined?null:clamp(Math.round(num(stage,0)),0,3);
 if(enabled&&ensure())applyAmbience();
}

// ---- public state API ---------------------------------------------------------------
export function isSoundOn(){return enabled}
export function isSoundReady(){return !!ctx&&ctx.state==='running'&&!!timer}
export async function resumeSound(){
 const ac=ensure();if(!ac)return false;
 try{if(ac.state==='suspended')await ac.resume();if(enabled){startScheduler();applyAmbience()}return ac.state==='running'}catch{return false}
}
export function setSound(on){
 enabled=!!on;writeKey('daily-silver-v1:sound-enabled',JSON.stringify(enabled));
 if(enabled){if(ensure()){applyOutput();startScheduler();applyPlan();applyAmbience()}}
 else{stopScheduler();teardownWind();if(ctx&&output)output.gain.setTargetAtTime(0,ctx.currentTime,.03)}
 return enabled;
}
export function setMusicMode(next){
 if(!MODES.includes(next))return;
 if(next==='critical'){state.mode='battle';state.critical=true}
 else if(next==='battle'){state.mode='battle';state.critical=false}
 else{state.mode=next;state.critical=false}
 if(ctx)applyPlan();else plan=musicPlan(state);
}
export function setEncounterState({stage,foesDown,critical}={}){
 if(foesDown!==undefined)state.foesDown=clamp(Math.round(num(foesDown,0)),0,6);
 if(stage!==undefined)state.stage=clamp(Math.round(num(stage,0)),0,3);
 else if(foesDown!==undefined)state.stage=state.foesDown<2?0:state.foesDown<4?1:state.foesDown<6?2:3;
 if(critical!==undefined)state.critical=!!critical;
 state.mode='battle';
 if(ctx)applyPlan();else plan=musicPlan(state);
}
export function getEncounterState(){return {...state}}
export function setMasterVolume(value){volume=clamp(num(value,.55),.05,1);if(ctx&&enabled)applyOutput();writeKey('daily-silver:volume',String(volume));return volume}
export function getMasterVolume(){return volume}
export function setMusicLevel(value){
 musicLevel=clamp(num(value,0),0,1);
 if(musicBus&&ctx){const now=ctx.currentTime;musicBus.gain.cancelScheduledValues(now);musicBus.gain.setValueAtTime(musicLevel*.55,now)}
 if(windGain&&ambStage!==null)windGain.gain.setTargetAtTime(windLevel(),ctx.currentTime,.3);
 writeKey('daily-silver-v1:music-level',String(musicLevel));return musicLevel;
}
export function getMusicLevel(){return musicLevel}
export function setEffectsLevel(value){
 effectsLevel=clamp(num(value,.8),0,1);
 if(fxBus&&ctx)fxBus.gain.setValueAtTime(.65*effectsLevel,ctx.currentTime);
 writeKey('daily-silver-v1:effects-level',String(effectsLevel));return effectsLevel;
}
export function getEffectsLevel(){return effectsLevel}

function onVisibility(){
 if(!ctx)return;
 if(globalThis.document?.hidden){stopScheduler();try{ctx.suspend?.()?.catch?.(()=>{})}catch{}}
 else if(enabled){try{ctx.resume?.()?.catch?.(()=>{})}catch{}startScheduler()}
}
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('visibilitychange',onVisibility);

// ---- effects ------------------------------------------------------------------------
function duck(level=.22,hold=.32,release=.18){
 if(!ensure())return;const g=musicBus.gain,now=ctx.currentTime,normal=musicLevel*.55;
 g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.setTargetAtTime(normal*level,now,.025);g.setTargetAtTime(normal,now+hold,release);
}
const J=()=>.97+Math.random()*.06;
const T=(f,s,w,a,d=0,sw=0)=>tone(f*J(),s,w,a,d+baseDelay,sw*J(),fxBus);
const N=(s,o={})=>noise(s,{...o,delay:(o.delay||0)+baseDelay});
const SPECIAL=new Set(['Fire','Water','Electric','Grass','Ice','Psychic','Dragon','Dark']);
const HEAVY=new Set(['Ground','Rock','Steel']);
const CAST_BASE={Fire:280,Water:490,Electric:920,Grass:440,Ice:690,Psychic:650,Ghost:230,Dark:190,Fighting:160,Ground:115,Rock:140,Steel:570,Normal:330,Bug:500,Poison:270,Flying:660,Dragon:370};

function impact(detail){
 const o=detail&&typeof detail==='object'?detail:{amount:num(detail,30)};
 const w=clamp(num(o.amount,30)/90,.2,1),type=o.type||'Normal',cat=o.category||(SPECIAL.has(type)?'special':'physical'),a=.11+.13*w;
 if(cat==='physical'){
  if(HEAVY.has(type)){T(95,.24,'sine',a*1.4,0,-55);N(.22,{type:'lowpass',freq:520,amp:a*1.2});T(60,.3,'triangle',a,.03,-25)}
  else{T(210,.1,'sawtooth',a,0,-120);N(.09,{type:'bandpass',freq:1900,q:.9,amp:a*1.1});T(90,.18,'triangle',a,.025,-40)}
 }else if(type==='Fire'){N(.08,{freq:2600,amp:a});N(.07,{freq:3200,amp:a*.8,delay:.07});N(.09,{freq:2200,amp:a*.7,delay:.14});T(220,.2,'sawtooth',a*.8,0,-110)}
 else if(type==='Water'){N(.26,{freq:1500,to:420,q:.8,amp:a*1.1});T(520,.16,'sine',a,0,-260);T(90,.2,'triangle',a*.7,.03,-30)}
 else if(type==='Electric'){T(1400,.12,'square',a*.8,0,-1150);N(.07,{type:'highpass',freq:3200,amp:a});T(180,.12,'sawtooth',a*.6,.02,-100)}
 else if(type==='Ice'){T(2093,.16,'triangle',a*.55);T(1568,.2,'triangle',a*.5,.04);N(.1,{type:'highpass',freq:5200,amp:a*.7});T(110,.16,'sine',a*.8,0,-50)}
 else if(type==='Psychic'){T(440,.32,'sine',a*.7,0,120);T(447,.32,'sine',a*.7,0,-130);T(90,.2,'triangle',a*.7,.02,-40)}
 else if(type==='Ghost'||type==='Dark'){T(110,.32,'sawtooth',a*.8,0,-50);N(.24,{type:'lowpass',freq:380,amp:a});T(55,.34,'sine',a,.02,-20)}
 else if(type==='Grass'){N(.18,{freq:900,q:.6,amp:a});T(260,.14,'triangle',a*.7,0,-100);T(80,.18,'sine',a*.7,.03,-30)}
 else if(type==='Dragon'){T(150,.28,'sawtooth',a,0,-80);N(.2,{type:'lowpass',freq:650,amp:a});T(70,.26,'triangle',a,.03,-30)}
 else{T(190,.15,'sawtooth',a*1.6,0,-130);T(85,.23,'triangle',a*1.6,.03,-50)}
 if(o.critical)T(1250,.07,'square',.07,.01);
}
const STATUS={
 par:()=>{T(900,.05,'square',.09,0,-300);T(1100,.05,'square',.08,.07,-400);T(760,.06,'square',.08,.14,-250)},
 brn:()=>{N(.25,{freq:2400,amp:.1});T(300,.2,'sawtooth',.07,0,60)},
 psn:()=>{T(300,.08,'sine',.12,0,150);T(380,.08,'sine',.08,.09,120);T(250,.09,'sine',.09,.18,160)},
 slp:()=>{T(523,.3,'sine',.1,0,-30);T(392,.36,'sine',.1,.2,-30)},
 frz:()=>{T(2093,.12,'triangle',.08);T(2637,.1,'triangle',.06,.06);N(.12,{type:'highpass',freq:6000,amp:.06})},
 confused:()=>{T(440,.3,'sine',.1,0,80);T(466,.3,'sine',.1,.02,-80);T(415,.3,'sine',.07,.14,60)}
};
STATUS.tox=()=>{STATUS.psn();T(160,.3,'sine',.08,.05,-30)};
const SFX={
 select:()=>{T(510,.055,'square',.08);T(740,.09,'triangle',.08,.047)},
 cast:d=>{const t=typeof d==='object'&&d?d.type:d,base=CAST_BASE[t]||390;T(base,.16,'sawtooth',.13,0,base*.25);T(base*1.48,.11,'triangle',.08,.055,-base*.3)},
 impact,
 critical:()=>{duck(.14,.4,.2);T(1200,.08,'square',.08);T(520,.25,'sawtooth',.2,.04,-420);N(.12,{freq:2200,amp:.12})},
 super:()=>{T(660,.1,'triangle',.1);T(990,.16,'triangle',.11,.07)},
 resist:()=>{T(260,.16,'triangle',.08,0,-90)},
 faint:()=>{[392,294,196,147].forEach((f,i)=>T(f,.23,'square',.10,i*.10,-35))},
 ko:()=>{duck(.1,.6,.3);T(88,.45,'sine',.3,0,-45);N(.36,{type:'lowpass',freq:420,amp:.2});[392,294,196,147].forEach((f,i)=>T(f,.26,'square',.11,.03+i*.1,-40))},
 heal:()=>{[494,659,784].forEach((f,i)=>T(f,.13,'triangle',.13,i*.10,95))},
 status:d=>{(STATUS[typeof d==='object'&&d?d.status:d]||STATUS.confused)()},
 switchout:()=>{T(660,.12,'triangle',.09,0,-280);N(.14,{freq:2000,to:600,amp:.04})},
 switchin:()=>{T(330,.1,'triangle',.09,0,330);T(660,.14,'square',.06,.07);N(.16,{freq:900,amp:.05,delay:.05})},
 barrier:()=>{T(880,.18,'triangle',.08);T(1320,.22,'sine',.06,.05);N(.14,{type:'highpass',freq:4500,amp:.04})},
 buff:()=>{[392,494,587].forEach((f,i)=>T(f,.09,'triangle',.09,i*.06))},
 debuff:()=>{[587,494,392].forEach((f,i)=>T(f,.1,'triangle',.08,i*.06))},
 whoosh:()=>{if(!N(.22,{freq:400,to:2400,q:.9,amp:.08}))T(300,.18,'sawtooth',.05,0,900)},
 danger:()=>{T(720,.12,'sawtooth',.12);T(480,.22,'sawtooth',.12,.14)},
 miss:()=>{T(300,.12,'triangle',.1,0,-160);T(220,.15,'sine',.08,.06,-70)},
 immune:()=>{T(330,.22,'triangle',.1,0,-190);T(540,.09,'square',.08)},
 blocked:()=>{T(330,.22,'triangle',.1,0,-190);T(540,.09,'square',.08)}
};
const lastAt=new Map();
export function sfx(type,detail,opts){
 if(!enabled)return;
 if(type==='victory'||type==='success')return playStinger('victory',opts);
 if(type==='defeat'||type==='loss')return playStinger('defeat',opts);
 const fn=SFX[type];if(!fn||!ensure())return;
 const delay=Math.max(0,num(opts?.delay,0)),target=(globalThis.performance?.now?.()??Date.now())+delay*1000,prev=lastAt.get(type);
 if(prev!==undefined&&Math.abs(target-prev)<35)return;lastAt.set(type,target);
 if(type!=='select')duck();
 baseDelay=delay;
 try{fn(detail)}finally{baseDelay=0}
}
export function playStinger(kind,opts){
 if(!enabled||!ensure())return;
 baseDelay=Math.max(0,num(opts?.delay,0));
 try{
  if(kind==='victory'){
   duck(.05,2.4,.8);
   [[293.66,.5],[369.99,.62],[440,.74],[587.33,.86]].forEach(([f,d])=>T(f,.22,'triangle',.15,d));
   [587.33,739.99,880,1174.66].forEach(f=>T(f,1.6,'triangle',.13,1.0,0));
   T(146.83,1.8,'sine',.16,1.0);
  }else{
   duck(.1,3.0,.8);
   [[440,0],[392,.5],[349.23,1.0],[293.66,1.5],[220,2.0]].forEach(([f,d],i)=>T(f,i===4?.9:.55,'triangle',.11,d));
   T(110,2.8,'sine',.09,.1);
  }
 }finally{baseDelay=0}
 setMusicMode(kind==='victory'?'victory':'defeat');
}
