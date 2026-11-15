// The battlefield renderer. Owns the canvas, the displayed battle state, sprite poses, camera,
// atmosphere and effects, and exposes director cue handlers. Presentation only: it reads a
// battle snapshot and never mutates the real run or consumes battle RNG.
import {getSpriteImage} from '../sprites.js';
import {hash} from '../engine.js';
import {drawBackdrop,drawForeground,drawSnow,drawWash,stageForFallen,SIZE} from './atmosphere.js';
import {frame,SHAPES,img,preload} from './assets.js';
import {POS,FEET,spawnImpact,addText,addShock,addMotes,addTravel,addEffect,drawEffects,drawParticles,clearEffects,burst,spawn,seeded,TYPE_COLORS} from './fx.js';
import {drawCondition,drawField,conditionsOf,fieldOf,tintFor,idleSuppressed,slump} from './conditions.js';
import {isMelee} from './families.js';
import {drawCinematic,cinemaDuration} from './cinema.js';

const {W,H}=SIZE;
const clamp01=x=>Math.max(0,Math.min(1,x));
const ease=t=>t*t*(3-2*t);
const dirOf=side=>side==='p'?1:-1;
const SCALE={p:4,e:3};

export function createStage(canvas,hooks={}){
 const ctx=canvas.getContext('2d',{alpha:false});
 canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;
 const scratch=document.createElement('canvas');scratch.width=360;scratch.height=360;const sg=scratch.getContext('2d',{willReadFrequently:false});
 const S={
  mode:'home',run:null,display:null,focus:0,blend:0,target:0,snapBlend:true,time:0,last:0,frozenUntil:0,
  settings:{reduced:false,intensity:1},hidden:{p:false,e:false},anims:{p:[],e:[]},
  cam:{x:0,y:0,push:{x:0,y:0,t0:0,dur:0,fx:0,fy:0},shake:null},dim:{t0:0,dur:0,amp:0},
  cinema:null,tick:0,raf:0,running:true,flash:null,rand:seeded(hash('stage'))
 };
 const reduced=()=>S.settings.reduced;
 const intensity=()=>S.settings.intensity;

 function setStageTarget(n,snap=false){S.target=n;if(snap)S.blend=n}
 function setDisplay(run,{mode,snap=true}={}){
  S.ending=null;
  S.run=run;S.display=run?structuredClone({player:run.player,foe:run.foe,pActive:run.pActive,eActive:run.eActive,screens:run.screens,spikes:run.spikes}):null;
  S.hidden.p=false;S.hidden.e=false;S.anims.p.length=0;S.anims.e.length=0;
  if(mode)S.mode=mode;
  if(run){const fallen=run.foe.filter(m=>m.hp<=0).length;setStageTarget(stageForFallen(fallen),snap)}
  else setStageTarget(0,snap);
  clearEffects();
 }
 const mon=(side,index)=>{const d=S.display;if(!d)return null;return side==='p'?d.player[index??d.pActive]:d.foe[index??d.eActive]};
 const names=(side,index)=>mon(side,index)?.name||'';

 // ---- anims ----
 function addAnim(side,a){S.anims[side].push({t0:S.time,...a})}
 function clearAnims(side,kinds){S.anims[side]=S.anims[side].filter(a=>kinds?!kinds.includes(a.kind):false)}
 function poseOf(side,now){
  const P={dx:0,dy:0,sy:0,flash:0,alpha:1,sink:0,white:0,scale:1,jitter:0};
  const dir=dirOf(side),list=S.anims[side],other=side==='p'?'e':'p';
  const dist=Math.abs(POS[other].x-POS[side].x);
  for(let i=list.length-1;i>=0;i--){
   const a=list[i],age=now-a.t0,p=a.dur?age/a.dur:1;
   if(p>=1&&!a.hold){list.splice(i,1);continue}
   const q=clamp01(p);
   switch(a.kind){
    case 'brace':{const lean=ease(clamp01(age/a.A));const rel=clamp01((age-a.A-a.F*.4)/(a.dur-a.A-a.F*.4));P.dx+=-dir*7*lean*(1-rel);P.sy-=4*lean*(1-rel);break}
    case 'lunge':{
     const back=ease(clamp01(age/a.A)),dash=ease(clamp01((age-a.A)/a.F)),ret=ease(clamp01((age-a.A-a.F)/a.R));
     const reach=dir*(dist-130)*(a.far||1);
     P.dx+=(-dir*12*back*(1-dash))+reach*dash*(1-ret);P.sy-=3*back*(1-dash);break}
    case 'slam':{
     const crouch=ease(clamp01(age/(a.A*.5))),up=clamp01((age-a.A*.5)/(a.A*.5)),fall=ease(clamp01((age-a.A)/a.F)),land=clamp01((age-a.A-a.F)/a.R);
     const lift=Math.sin(Math.PI*.5*up)*(1-fall);
     P.dy+=-70*lift;P.dx+=dir*(dist-150)*ease(clamp01((age-a.A*.5)/(a.A*.5+a.F)))*(1-ease(land));
     P.sy-=(9*crouch*(1-up))+(8*Math.sin(Math.PI*land)*(age>a.A+a.F?1:0));break}
    case 'recoil':{const k=Math.pow(1-q,2);P.dx+=-dir*a.mag*k;P.flash=Math.max(P.flash,age<a.flashMs?.8:0);P.sy-=3*Math.sin(Math.PI*Math.min(1,q*2));break}
    case 'dodge':{const k=Math.sin(Math.PI*q);P.dx+=dir*-16*k*0+(-dir)*0+(side==='p'?-14:14)*k;P.dy+=-10*k;break}
    case 'shrug':{P.dy+=-Math.sin(Math.PI*q)*5;break}
    case 'jitter':P.jitter=Math.max(P.jitter,(1-q)*a.amp);break;
    case 'faint':{P.sink=ease(q);P.alpha=Math.min(P.alpha,q<.5?1:1-(q-.5)*2);P.white=Math.max(P.white,Math.sin(Math.PI*Math.min(1,q*3))*.6);break}
    case 'out':{P.white=1;P.scale*=1-ease(q)*.85;P.alpha=Math.min(P.alpha,1-q);break}
    case 'in':{
     const drop=ease(clamp01(q/.7)),land=clamp01((q-.7)/.3);
     P.dy+=-(1-drop)*46;P.white=Math.max(P.white,1-clamp01(q/.6));P.alpha=Math.min(P.alpha,clamp01(q*3));P.sy-=8*Math.sin(Math.PI*land)*(q>.7?1:0);break}
    case 'pulse':P.flash=Math.max(P.flash,Math.sin(Math.PI*q)*.6);break;
    case 'buffpop':P.dy+=-Math.sin(Math.PI*q)*6;break;
    default:break;
   }
  }
  return P;
 }

 // ---- drawing ----
 function drawShadow(cx,cy,w,h){
  ctx.fillStyle='rgba(20,40,80,.35)';
  const rows=[[1,.5],[.82,.78],[1,.5]];
  const hh=Math.max(4,Math.round(h/3));
  rows.forEach(([k,off],i)=>{const ww=Math.round(w*(i===1?1:.78));ctx.fillRect(Math.round(cx-ww/2),Math.round(cy-hh+i*hh),ww,hh)});
 }
 function drawMon(side,now){
  const d=S.display;if(!d||S.hidden[side])return;
  const m=mon(side);if(!m)return;
  const back=side==='p',state=getSpriteImage(m,back),c=POS[side],f=FEET[side];
  const pose=poseOf(side,now);
  if(!state.loaded){
   ctx.save();ctx.textAlign='center';ctx.fillStyle='#f6d89b';ctx.font='bold 12px sans-serif';ctx.fillText(state.failed?'SPRITES NOT INSTALLED':'LOADING SPRITE…',c.x,c.y);ctx.restore();return;
  }
  const image=state.renderSource||state.image,sc=SCALE[side];
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const w=Math.round(iw*sc*pose.scale),h=Math.round(ih*sc*pose.scale);
  const t=reduced()?0:now*.002+hash(m.id||m.name)%50;
  const bob=reduced()||idleSuppressed(m)?0:Math.round(Math.sin(t)*1.6);
  const breathe=reduced()||idleSuppressed(m)?0:Math.round(Math.sin(t*1.22)*1.2);
  const jx=pose.jitter?Math.round((S.rand()-.5)*2*pose.jitter):0;
  const lift=-pose.dy,sh=Math.max(.45,1-lift/120);
  const footX=c.x+pose.dx;
  if(m.hp>0||pose.sink<1)drawShadow(footX,f.y,Math.round((w*.56)*sh),9);
  const x=Math.round(footX-w/2+jx),bottom=Math.round(f.y+9+pose.dy+bob+slump(m));
  const dh=h+pose.sy+breathe,y=bottom-dh;
  ctx.save();
  if(pose.sink>0){ctx.beginPath();ctx.rect(0,0,W,f.y+2);ctx.clip()}
  ctx.globalAlpha=pose.alpha*(m.hp<=0&&!S.anims[side].some(a=>a.kind==='faint')?.0:1)*(m.status==='slp'?.9:1);
  const sunk=Math.round(pose.sink*dh*.95);
  const flashWhite=Math.max(pose.white,pose.flash);
  if(flashWhite>.01||tintFor(m)){
   scratch.width=Math.max(8,w);scratch.height=Math.max(8,dh);sg.imageSmoothingEnabled=false;sg.clearRect(0,0,scratch.width,scratch.height);
   sg.drawImage(image,0,0,w,dh);sg.globalCompositeOperation='source-atop';
   const tint=tintFor(m);
   if(tint){sg.globalAlpha=tint.alpha;sg.fillStyle=tint.color;sg.fillRect(0,0,w,dh)}
   if(flashWhite>.01){sg.globalAlpha=Math.min(1,flashWhite);sg.fillStyle='#ffffff';sg.fillRect(0,0,w,dh)}
   sg.globalCompositeOperation='source-over';sg.globalAlpha=1;
   ctx.drawImage(scratch,x,y+sunk);
  }else ctx.drawImage(image,x,y+sunk,w,dh);
  ctx.restore();
  if(m.hp>0&&pose.alpha>.5)drawCondition(ctx,side,m,now,{reduced:reduced(),intensity:intensity(),spriteH:h});
 }

 function currentCam(now){
  let x=0,y=0;
  const pu=S.cam.push;if(pu.dur){const p=clamp01((now-pu.t0)/pu.dur);const k=p<.4?ease(p/.4):1-ease((p-.4)/.6);x+=pu.fx*k;y+=pu.fy*k;if(p>=1)pu.dur=0}
  const sh=S.cam.shake;
  if(sh&&!reduced()){const p=(now-sh.t0)/sh.dur;if(p>=1)S.cam.shake=null;else{const k=Math.pow(1-p,2)*sh.amp*intensity();x+=Math.round(Math.sin(p*38)*k*sh.dx);y+=Math.round(Math.cos(p*31)*k*sh.dy)}}
  return {x:Math.round(x),y:Math.round(y)};
 }
 const dimAt=now=>{const d=S.dim;if(!d.dur)return 0;const p=(now-d.t0)/d.dur;if(p>=1){d.dur=0;return 0}return Math.sin(Math.PI*p)*d.amp};

 function renderScene(now,dt){
  const cam=currentCam(now),camX=S.mode==='home'?0:cam.x;
  // ease atmosphere toward its target stage
  if(S.blend!==S.target){const step=(reduced()?2:.45)*dt/1000;S.blend+=Math.max(-step,Math.min(step,S.target-S.blend))}
  ctx.save();ctx.translate(S.mode==='home'?0:cam.x*.6|0,S.mode==='home'?0:cam.y*.6|0);
  drawBackdrop(ctx,{time:now,blend:S.blend,camX:camX*.9,camY:cam.y*.4,reduced:reduced(),intensity:intensity(),focusDim:dimAt(now)});
  drawWash(ctx,{blend:S.blend,intensity:intensity()});
  const d=S.display;
  if(S.mode==='home'){drawHome(now)}
  else if(d){
   drawField(ctx,'p',fieldOf(d,'p'),now,{reduced:reduced(),intensity:intensity()});
   drawField(ctx,'e',fieldOf(d,'e'),now,{reduced:reduced(),intensity:intensity()});
   drawMon('e',now);drawMon('p',now);
   drawParticles(ctx,now);
   drawEffects(ctx,now,intensity());
  }
  drawForeground(ctx,{time:now,blend:S.blend,camX:camX,camY:cam.y*.4,reduced:reduced(),intensity:intensity()});
  drawSnow(ctx,{time:now,blend:S.blend,reduced:reduced(),intensity:intensity(),camX});
  ctx.restore();
  // danger vignette for a low-HP ally (stepped edges, no blur)
  const pm=d&&mon('p');
  if(pm&&pm.hp>0&&pm.hp/pm.maxHp<.24&&S.mode==='battle'){
   const pulse=reduced()?.12:.1+Math.sin(now*.005)*.04;ctx.save();ctx.globalAlpha=pulse;ctx.fillStyle='#a63a4a';
   for(let i=0;i<4;i++){ctx.fillRect(0,i*5,W,5-i);ctx.fillRect(0,H-i*5-(5-i),W,5-i)}ctx.restore();
  }
  if(S.flash){const p=(now-S.flash.t0)/S.flash.dur;if(p>=1)S.flash=null;else{ctx.save();ctx.globalAlpha=S.flash.alpha*(1-p)*intensity();ctx.fillStyle=S.flash.color;ctx.fillRect(0,0,W,H);ctx.restore()}}
 }

 function drawHome(now){
  const ally=S.run?.player?.[S.focus];
  const rival=img('rival-front');
  if(rival){const sc=.5,w=Math.round(rival.width*sc),h=Math.round(rival.height*sc);ctx.save();ctx.globalAlpha=.95;drawShadowRaw(590,236,36);ctx.drawImage(rival,Math.round(590-w/2),Math.round(236-h+(reduced()?0:Math.round(Math.sin(now*.0022)))),w,h);ctx.restore()}
  if(ally){
   const st=getSpriteImage(ally,false);if(!st.loaded)return;
   const image=st.renderSource||st.image,sc=3,w=(image.naturalWidth||image.width)*sc,h=(image.naturalHeight||image.height)*sc;
   const bob=reduced()?0:Math.round(Math.sin(now*.0026+S.focus)*2);
   drawShadowRaw(220,338,Math.round(w*.5));
   ctx.drawImage(image,Math.round(220-w/2),Math.round(338-h+bob),w,h);
  }
 }
 function drawShadowRaw(cx,cy,w){ctx.fillStyle='rgba(20,40,80,.35)';ctx.fillRect(Math.round(cx-w*.39),cy-9,Math.round(w*.78),3);ctx.fillRect(Math.round(cx-w/2),cy-6,w,3);ctx.fillRect(Math.round(cx-w*.39),cy-3,Math.round(w*.78),3)}

 function frameLoop(ts){
  S.raf=requestAnimationFrame(frameLoop);
  if(!S.running||document.hidden){S.last=0;return}
  if(!S.last)S.last=ts;
  const dt=Math.min(64,ts-S.last);S.last=ts;
  if(ts<S.frozenUntil){/* hit pause: effect clock holds still */}else S.time+=dt;
  const env=(state)=>({...state,reduced:reduced(),time:ts,intensity:intensity(),stage:S,drawers:{backdrop:drawBackdrop,foreground:drawForeground,snow:drawSnow},getSpriteImage});
  if(S.cinema){
   const c=S.cinema,p=clamp01((ts-c.start)/c.duration);
   drawCinematic(c.name,ctx,c.skip?1:p,env(c.state));
   if(p>=1||c.skip){const done=c.done;S.cinema=null;if(c.hold)S.ending={name:c.name,state:c.state};done?.(c.skip?'skipped':'finished')}
   return;
  }
  if(S.ending){drawCinematic(S.ending.name,ctx,1,env(S.ending.state));return}
  renderScene(S.time,dt);
 }
 S.raf=requestAnimationFrame(frameLoop);

 // ---- cue handlers (called by the director) ----
 const sfx=(type,detail,opts)=>hooks.sfx?.(type,detail,opts);
 const point=side=>POS[side];
 const cues={
  caption(c){hooks.caption?.(c)},
  anticipate(c){
   const fam=c.family,A=c.ms,time=S.time,timing=hooks.timing?.(fam)||{flight:300};
   const F=timing.flight,R=260;
   if(isMelee(fam)&&fam!=='bodyslam'){addAnim(c.side,{kind:'lunge',A,F,R,dur:A+F+R,far:fam==='extremespeed'?1:.96});sfx('whoosh',null,{delay:A/1000})}
   else if(fam==='bodyslam'){addAnim(c.side,{kind:'slam',A,F,R,dur:A+F+R})}
   else if(fam==='barrier'||fam==='recovery'||fam==='stat'){addAnim(c.side,{kind:'buffpop',dur:A+F})}
   else addAnim(c.side,{kind:'brace',A,F,dur:A+F+120});
   sfx('cast',c.type);
   // charge-up flourishes
   const P=POS[c.side];
   if(fam==='thunderbolt')for(let i=0;i<10;i++)spawn(time+i*(A/10),P.x+(S.rand()-.5)*80,P.y+(S.rand()-.5)*70,{vx:(S.rand()-.5)*60,vy:-30,life:260,size:3,color:i%2?'#ffe36b':'#fff'});
   if(fam==='fireblast')addEffect({kind:'frame',t0:time,dur:A+120,sheet:'fire',index:SHAPES.fire.small,x:P.x+dirOf(c.side)*50,y:P.y,s0:.2,s1:.6,blend:'lighter',fade:false});
   if(fam==='psychic')addEffect({kind:'frame',t0:time,dur:A,sheet:'psychic',index:SHAPES.psychic.ring,x:P.x,y:P.y,s0:1.6,s1:.8,blend:'lighter'});
   if(c.strong&&!reduced())S.cam.push={t0:time,dur:A+200,x:0,y:0,fx:dirOf(c.side)*6,fy:0};
  },
  release(c){
   const time=S.time;
   if(c.outcome==='charge')return;
   const a=point(c.side),b=point(c.targetSide);
   addTravel(time,{dur:Math.max(60,c.ms),family:c.family,type:c.type,move:c.move,from:{...a},to:{...b},side:c.side,targetSide:c.targetSide,outcome:c.outcome});
   if(['projectile','beam','area','inflict','shadowball','sacredfire','aeroblast','fireblast','thunderbolt','psychic','surf','gigadrain','drain'].includes(c.family))sfx('whoosh',c.type);
  },
  contact(c){
   const time=S.time,T=c.targetSide;
   const mag=(c.finisher?24:c.critical?18:c.effectiveness>=2?14:10)*(reduced()?.3:1);
   addAnim(T,{kind:'recoil',dur:c.finisher?460:300,mag,flashMs:c.critical?130:80});
   spawnImpact(time,c,S.rand,intensity());
   const P=point(T);
   if(c.amount)addText(time,P.x,P.y-80,`-${c.amount}`,{color:c.effectiveness>=2?'#ffd36b':c.effectiveness<1?'#c9ddf0':'#fff4c6',big:c.critical||c.finisher});
   if(!reduced()){
    S.cam.shake={t0:time,dur:c.finisher?420:c.critical?300:200,amp:c.finisher?6:c.critical?4:2,dx:dirOf(c.side),dy:.4};
    if(c.hitstop)S.frozenUntil=performance.now()+c.hitstop;
    if(c.finisher)S.dim={t0:time,dur:900,amp:.28};
   }
   if(c.finisher||c.critical)S.flash={t0:S.time,dur:140,color:c.finisher?'#fff1bf':'#ffffff',alpha:c.finisher?.22:.14};
   sfx('impact',{amount:c.amount,type:c.type,category:hooks.categoryOf?.(c.type),critical:c.critical,effectiveness:c.effectiveness});
   if(c.critical)sfx('critical');else if(c.effectiveness>=2)sfx('super');else if(c.effectiveness>0&&c.effectiveness<1)sfx('resist');
   if(c.screened)addEffect({kind:'frame',t0:time,dur:380,sheet:'ice-barrier',index:c.screened==='reflect'?SHAPES['ice-barrier'].reflect:SHAPES['ice-barrier'].lightScreen,x:P.x-dirOf(T)*40,y:P.y,s0:.5,s1:.62,blend:'source-over',flip:T==='e'});
   if(c.family==='bodyslam')sfx('impact',{amount:c.amount+40,category:'physical',type:'Ground'});
  },
  deflect(c){
   const T=c.targetSide,P=point(T),time=S.time;
   if(c.outcome==='miss'){addAnim(T,{kind:'dodge',dur:340});addText(time,P.x,P.y-80,'MISS',{color:'#c9ddf0',dur:800,rise:20});sfx('miss')}
   else if(c.outcome==='immune'){addAnim(T,{kind:'shrug',dur:360});addText(time,P.x,P.y-80,'NO EFFECT',{color:'#ffbad0',dur:900,rise:16});addEffect({kind:'shock',t0:time,dur:420,x:P.x,y:P.y,r:70,color:'#ffbad0'});sfx('immune')}
   else{addEffect({kind:'frame',t0:time,dur:520,sheet:'ice-barrier',index:SHAPES['ice-barrier'].lightScreen,x:P.x,y:P.y,s0:.7,s1:.85,blend:'source-over'});addText(time,P.x,P.y-80,'BLOCKED',{color:'#e8f4fa',dur:800,rise:16});sfx('blocked')}
  },
  hp(c){const m=mon(c.side,c.index);if(m){m.hp=c.hp}hooks.hud?.(S.display)},
  selfHit(c){const time=S.time,P=point(c.side);addAnim(c.side,{kind:'recoil',dur:260,mag:7,flashMs:70});if(c.amount)addText(time,P.x,P.y-80,`-${c.amount}`,{color:'#ffb0a8',dur:800,rise:24});sfx('impact',{amount:c.amount,category:'physical',type:'Normal'})},
  selfHeal(c){
   const time=S.time,P=point(c.side);
   addText(time,P.x,P.y-80,`+${c.amount}`,{color:'#aefad0',dur:900,rise:26});
   for(let i=0;i<10;i++)spawn(time+i*30,P.x+(S.rand()-.5)*70,P.y+50,{vx:0,vy:-40-S.rand()*30,life:700,size:3,color:i%2?'#9fffcd':'#eafff0'});
   if(c.cause==='drain')addAnim(c.side,{kind:'buffpop',dur:300});
   sfx('heal');
  },
  status(c){
   const m=mon(c.side,c.index);if(m){if(c.status==='confused')m.confused=2;else m.status=c.status}
   const P=point(c.side),time=S.time,sheet={psn:'poison',tox:'poison',slp:'sleep',brn:'burn',par:'par',confused:'confused',frz:'poison'}[c.status];
   if(c.status==='frz')addEffect({kind:'frame',t0:time,dur:520,sheet:'ice-barrier',index:SHAPES['ice-barrier'].shell,x:P.x,y:P.y+8,s0:1.1,s1:.75,blend:'source-over',fade:false});
   else addEffect({kind:'frame',t0:time,dur:560,sheet:'status',index:SHAPES.status[sheet]??0,x:P.x,y:P.y-40,s0:.2,s1:.6,blend:c.status==='psn'||c.status==='tox'?'source-over':'lighter'});
   addAnim(c.side,{kind:'pulse',dur:360});hooks.hud?.(S.display);sfx('status',c.status);
  },
  cure(c){const m=mon(c.side,c.index);if(m&&c.status!=='berry'){m.status=''}else if(m)m.status='';const P=point(c.side);addShock(S.time,P.x,P.y,70,'#aefad0');addAnim(c.side,{kind:'pulse',dur:320});hooks.hud?.(S.display);sfx('heal')},
  buff(c){
   const m=mon(c.side,c.index);const P=point(c.side),time=S.time;
   if(m&&c.boosts)for(const [k,v] of Object.entries(c.boosts))m.boost[k]=Math.max(-6,Math.min(6,(m.boost[k]||0)+v));
   for(let i=0;i<4;i++)addEffect({kind:'frame',t0:time+i*70,dur:520,sheet:'light',index:SHAPES.light.recall,x:P.x-40+i*27,y:P.y+30,dy:c.rising?-70:70,s0:.12,s1:.1,blend:'lighter'});
   addAnim(c.side,{kind:'buffpop',dur:280});hooks.hud?.(S.display);sfx(c.rising?'buff':'debuff');
  },
  field(c){
   const d=S.display,P=point(c.side),time=S.time;
   if(c.what==='reflect'||c.what==='lightScreen'){const s=d.screens[c.side];if(typeof s==='object')s[c.what]=5}
   if(c.what==='spikes')d.spikes[c.side]=1;
   if(c.what==='seed'){const m=mon(c.side);if(m)m.seeded=true}
   if(c.what==='curse'){const m=mon(c.side);if(m)m.cursed=true}
   if(c.what==='trap'){const m=mon(c.side);if(m)m.trapped=true}
   addShock(time,FEET[c.side].x,FEET[c.side].y,100,'#c9ddf0');
   if(c.what==='spikes')for(let i=0;i<8;i++)spawn(time+i*20,P.x+(S.rand()-.5)*120,FEET[c.side].y-60-S.rand()*30,{vy:120,g:400,life:420,size:4,color:'#b8c8d8'});
   hooks.hud?.(S.display);sfx('barrier');
  },
  denied(c){const m=mon(c.side,c.index);addAnim(c.side,{kind:'jitter',dur:360,amp:c.why==='par'?4:2});const P=point(c.side);if(c.why==='slp')addEffect({kind:'frame',t0:S.time,dur:620,sheet:'status',index:SHAPES.status.sleep,x:P.x,y:P.y-50,dy:-30,s0:.2,s1:.34,blend:'source-over'});if(c.why==='par')addEffect({kind:'frame',t0:S.time,dur:420,sheet:'status',index:SHAPES.status.par,x:P.x,y:P.y,s0:.3,s1:.5,blend:'lighter'});if(c.why==='frz')addShock(S.time,P.x,P.y,60,'#9fe8ff');sfx('blocked')},
  tick(c){addAnim(c.side,{kind:'jitter',dur:260,amp:1.5});const P=point(c.side);if(c.cause==='status'||c.cause==='curse')for(let i=0;i<6;i++)spawn(S.time,P.x+(S.rand()-.5)*50,P.y+20,{vy:-40,life:500,size:3,color:c.cause==='curse'?'#b89cf0':'#c991f7'});if(c.cause==='seed')for(let i=0;i<6;i++)spawn(S.time+i*30,P.x,P.y+20,{vx:(S.rand()-.5)*30,vy:-20,life:500,size:3,color:'#bfff8a'})},
  faint(c){
   const P=point(c.side),time=S.time,m=mon(c.side,c.index);
   addAnim(c.side,{kind:'faint',dur:620,hold:true});
   burst(time,P.x,FEET[c.side].y-8,16,{speed:70,angle:-Math.PI/2,spread:2.8,life:900,size:3,g:120,colors:['#dee1f5','#c9ddf0','#eef5fb'],rand:S.rand});
   addShock(time,FEET[c.side].x,FEET[c.side].y-2,90,'#c9ddf0');
   if(m)m.hp=0;hooks.hud?.(S.display);sfx('ko');sfx('faint');
   if(!reduced()){S.dim={t0:time,dur:700,amp:.18};S.cam.push={t0:time,dur:600,x:0,y:0,fx:dirOf(c.side)*-5,fy:0}}
  },
  switchOut(c){
   const P=point(c.side),time=S.time;
   addAnim(c.side,{kind:'out',dur:c.ms,hold:true});addMotes(time,P.x,P.y,'in',c.index);sfx('switchout');
  },
  switchIn(c){
   const d=S.display,P=point(c.side),F=FEET[c.side],time=S.time;
   clearAnims(c.side);
   if(c.side==='p')d.pActive=c.index;else d.eActive=c.index;S.hidden[c.side]=false;
   addAnim(c.side,{kind:'in',dur:c.ms});
   addMotes(time,P.x,P.y,'out',c.index+3);
   addEffect({kind:'frame',t0:time,dur:c.ms+200,sheet:'light',index:c.first?SHAPES.light.arriveL:SHAPES.light.arriveS,x:P.x,y:P.y,s0:.5,s1:c.first?1.3:.9,blend:'lighter'});
   // landing: snow is displaced outward from the feet
   const landAt=time+c.ms*.7;
   addEffect({kind:'shock',t0:landAt,dur:480,x:F.x,y:F.y-2,r:120,color:'#eef5fb'});
   burst(landAt,F.x,F.y-6,16,{speed:80,angle:-Math.PI/2,spread:2.9,life:720,size:3,g:170,colors:['#eef5fb','#c9ddf0'],rand:S.rand});
   hooks.hud?.(S.display);sfx('switchin');
  },
  hazard(c){const P=point(c.side),m=mon(c.side,c.index);addAnim(c.side,{kind:'recoil',dur:260,mag:5,flashMs:60});addText(S.time,P.x,P.y-80,`-${c.amount}`,{color:'#ffb0a8',dur:800,rise:24});sfx('impact',{amount:c.amount,category:'physical',type:'Steel'})},
  intro(c){hooks.intro?.(c)},
  settle(c){/* poses return by themselves; keep hook for sound/HUD */hooks.settle?.(c)}
 };

 // ---- public ----
 return {
  cues,
  get display(){return S.display},
  setDisplay,setStageTarget,
  setMode(m){S.mode=m;S.cinema=null;S.ending=null},
  setFocus(i){S.focus=Math.max(0,Math.min(5,Number(i)||0))},
  setSettings(o){Object.assign(S.settings,o)},
  freeze(ms){S.frozenUntil=performance.now()+ms},
  clear(){clearEffects();S.anims.p.length=0;S.anims.e.length=0;S.hidden.p=false;S.hidden.e=false;S.flash=null;S.dim.dur=0;S.cam.shake=null;S.cam.push.dur=0;S.frozenUntil=0},
  // Settle to the real battle state immediately (used after skip/cancel and on resume).
  settleTo(run){const m=S.mode;setDisplay(run,{mode:m,snap:false});},
  playCinematic(name,{state={},duration,onDone,hold=false}={}){
   return new Promise(resolve=>{
    S.ending=null;
    S.cinema={name,hold,start:performance.now(),duration:duration||cinemaDuration(name,S.settings.reduced),state,skip:false,done:(why)=>{onDone?.(why);resolve(why)}};
   });
  },
  skipCinematic(){if(S.cinema)S.cinema.skip=true},
  showEnding(name,state){S.cinema=null;S.ending={name,state}},
  hide(side,flag){S.hidden[side]=!!flag},
  get cinematic(){return !!S.cinema},
  blend:()=>S.blend,
  pause(){S.running=false},resume(){S.running=true;S.last=0},
  destroy(){cancelAnimationFrame(S.raf)},
  names,preload
 };
}
