// DAILY SILVER 2.0 — original synthesized score and game audio.
// Compositions and synthesis are independent; no copyrighted recordings or samples.
let ctx,output,musicBus,fxBus,enabled=globalThis.localStorage?.getItem?.('daily-silver-v1:sound-enabled')==='true',clock=null,step=0,mode='home';
let volume=Number(globalThis.localStorage?.getItem?.('daily-silver:volume') ?? .55);
volume=Number.isFinite(volume)?Math.max(.05,Math.min(1,volume)):.55;
let musicLevel=Number(globalThis.localStorage?.getItem?.('daily-silver-v1:music-level') ?? .55);
musicLevel=Number.isFinite(musicLevel)?Math.max(0,Math.min(1,musicLevel)):.55;
const SCALE=[0,2,3,5,7,8,10,12]; // D-minor / Nordic-inspired original ostinato
const THEMES={
 home:{base:146.83,steps:[0,7,4,3,0,2,4,7,5,4,2,-1,0,4,3,2],bass:[0,-5,-2,-7],tempo:240},
 battle:{base:164.81,steps:[0,0,7,8,7,5,3,2,0,4,7,10,8,7,5,4,3,5,8,7,4,2,0,-1,0,3,7,8,10,8,7,5],bass:[0,-5,-2,-7],tempo:167},
 critical:{base:174.61,steps:[0,0,3,0,5,3,0,-2,0,0,7,5,3,2,0,-2],bass:[0,-1,-2,-4],tempo:205},
 results:{base:196,steps:[0,2,4,7,5,4,2,0,3,5,7,12,7,5,4,2],bass:[0,-3,-5,0],tempo:270}
};
function ensure(){if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();output=ctx.createGain();musicBus=ctx.createGain();fxBus=ctx.createGain();const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.18;musicBus.gain.value=musicLevel*.55;fxBus.gain.value=.65;output.gain.value=volume*.30;musicBus.connect(limiter);fxBus.connect(limiter);limiter.connect(output);output.connect(ctx.destination)}if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx}
function frequency(base,n){const octave=Math.floor(n/7),note=((n%7)+7)%7;return base*Math.pow(2,octave+SCALE[note]/12)}
function osc(freq,seconds=.12,wave='square',amp=.12,delay=0,sweep=0,effect=false){if(!enabled)return;try{const ac=ensure(),start=ac.currentTime+Math.max(0,delay),o=ac.createOscillator(),g=ac.createGain();o.type=wave;o.frequency.setValueAtTime(Math.max(20,freq),start);if(sweep)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+sweep),start+seconds*.88);g.gain.setValueAtTime(.0001,start);g.gain.linearRampToValueAtTime(amp,start+.008);g.gain.exponentialRampToValueAtTime(.0001,start+seconds);o.connect(g);g.connect(effect?fxBus:musicBus);o.start(start);o.stop(start+seconds+.018);o.onended=()=>{o.disconnect();g.disconnect()}}catch(e){console.debug('WebAudio unavailable',e)}}
const effectTone=(freq,seconds,wave,amp,delay=0,sweep=0)=>osc(freq,seconds,wave,amp,delay,sweep,true);
function duckMusic(){const ac=ensure(),gain=musicBus.gain,now=ac.currentTime,normal=musicLevel*.55;gain.cancelScheduledValues(now);gain.setValueAtTime(gain.value,now);gain.setTargetAtTime(normal*.22,now,.025);gain.setTargetAtTime(normal,now+.32,.18)}
function tick(){if(!enabled||document.hidden)return;const th=THEMES[mode]||THEMES.home;const v=th.steps[step%th.steps.length],strong=step%4===0;const tone=frequency(th.base,v);if(v>=0){osc(tone*2,Math.min(.23,th.tempo/1000*.88),'square',.09);osc(tone*1.002,.11,'triangle',.04)}if(strong){const b=th.bass[Math.floor(step/4)%th.bass.length];osc(frequency(th.base,b)*.5,.32,'triangle',.16);osc(72,.08,'sine',.23,0,-48)}if(step%4===2)osc(160,.035,'triangle',.045,0,-70);if(mode==='battle'&&step%2)osc(1100,.024,'square',.013);step++}
function resetClock(){if(clock)clearInterval(clock);clock=null;if(enabled){ensure();step=0;tick();clock=setInterval(tick,THEMES[mode]?.tempo||230)}}
export function isSoundOn(){return enabled}
export function isSoundReady(){return !!ctx&&ctx.state==='running'&&!!clock}
export async function resumeSound(){const ac=ensure();try{if(ac.state==='suspended')await ac.resume();if(enabled)resetClock();return ac.state==='running'}catch{return false}}
export function setSound(on){enabled=!!on;try{localStorage.setItem('daily-silver-v1:sound-enabled',JSON.stringify(enabled))}catch{}resetClock();return enabled}
export function setMusicMode(next){if(!THEMES[next]||mode===next)return;mode=next;if(enabled)resetClock()}
export function setMasterVolume(value){volume=Math.max(.05,Math.min(1,Number(value)||.55));if(output)output.gain.value=volume*.30;try{localStorage.setItem('daily-silver:volume',String(volume))}catch{}return volume}
export function getMasterVolume(){return volume}
export function setMusicLevel(value){musicLevel=Math.max(0,Math.min(1,Number(value)||0));if(musicBus){const now=ctx.currentTime;musicBus.gain.cancelScheduledValues(now);musicBus.gain.setValueAtTime(musicLevel*.55,now)}try{localStorage.setItem('daily-silver-v1:music-level',String(musicLevel))}catch{}return musicLevel}
export function getMusicLevel(){return musicLevel}
export function sfx(type,detail){if(!enabled)return;
 if(type!=='select')duckMusic();
 if(type==='cast'){const base={Fire:280,Water:490,Electric:920,Grass:440,Ice:690,Psychic:650,Ghost:230,Dark:190,Fighting:160,Ground:115,Rock:140,Steel:570,Normal:330,Bug:500,Poison:270,Flying:660,Dragon:370}[detail]||390;effectTone(base,.16,'sawtooth',.13,0,base*.25);effectTone(base*1.48,.11,'triangle',.08,.055,-base*.3)}
 else if(type==='impact'){effectTone(190,.15,'sawtooth',.24,0,-130);effectTone(85,.23,'triangle',.24,.03,-50)}
 else if(type==='heal'){[494,659,784].forEach((f,i)=>effectTone(f,.13,'triangle',.13,i*.10,95))}
 else if(type==='faint'){[392,294,196,147].forEach((f,i)=>effectTone(f,.23,'square',.10,i*.10,-35))}
 else if(type==='select'){effectTone(510,.055,'square',.08);effectTone(740,.09,'triangle',.08,.047)}
 else if(type==='success'){[294,392,494,587,784,988].forEach((f,i)=>effectTone(f,.19,'triangle',.16,i*.11))}
 else if(type==='loss'){[440,370,294,220,164].forEach((f,i)=>effectTone(f,.29,'triangle',.12,i*.18,-30))}
 else if(type==='danger'){effectTone(720,.12,'sawtooth',.12);effectTone(480,.22,'sawtooth',.12,.14)}
 else if(type==='miss'){effectTone(300,.12,'triangle',.1,0,-160);effectTone(220,.15,'sine',.08,.06,-70)}
 else if(type==='immune'||type==='blocked'){effectTone(330,.22,'triangle',.1,0,-190);effectTone(540,.09,'square',.08)}
 else if(type==='critical'){effectTone(1200,.08,'square',.08);effectTone(520,.25,'sawtooth',.2,.04,-420)}
}
