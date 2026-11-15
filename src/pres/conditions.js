// Persistent, subtle in-scene language for status and field conditions. Each condition has
// its own shape and motion (not a recoloured ring), and the HUD repeats it as text/icons.
import {frame,SHAPES} from './assets.js';
import {POS,FEET} from './fx.js';

export const STATUS_LABEL={par:'PARALYZED',brn:'BURNED',psn:'POISONED',tox:'BADLY POISONED',slp:'ASLEEP',frz:'FROZEN',confused:'CONFUSED'};
export const STATUS_SHORT={par:'PAR',brn:'BRN',psn:'PSN',tox:'TOX',slp:'SLP',frz:'FRZ',confused:'CNF'};

// Active conditions on a mon as a list of keys (single source for scene + HUD).
export function conditionsOf(mon){
 if(!mon||mon.hp<=0)return [];
 const out=[];
 if(mon.status)out.push(mon.status);
 if(mon.confused>0)out.push('confused');
 if(mon.seeded)out.push('seed');
 if(mon.cursed)out.push('curse');
 if(mon.trapped)out.push('trap');
 if(mon.substitute>0)out.push('substitute');
 return out;
}
export function fieldOf(run,side){
 const sc=run?.screens?.[side];
 const reflect=typeof sc==='number'?sc:sc?.reflect||0,light=typeof sc==='number'?sc:sc?.lightScreen||0;
 return {reflect,lightScreen:light,spikes:run?.spikes?.[side]||0};
}
export function boostsOf(mon){
 return Object.entries(mon?.boost||{}).filter(([,v])=>v).map(([k,v])=>({stat:k,stage:v}));
}

// Tint for the sprite itself (applied by the stage), returns {color,alpha} or null.
export function tintFor(mon){
 if(!mon)return null;
 if(mon.status==='frz')return {color:'#9fe8ff',alpha:.32};
 if(mon.status==='brn')return {color:'#ff7a3c',alpha:.12};
 if(mon.status==='psn'||mon.status==='tox')return {color:'#b46bd8',alpha:.14};
 return null;
}
export const idleSuppressed=mon=>mon?.status==='frz';
export const slump=mon=>mon?.status==='slp'?3:0;

export function drawCondition(ctx,side,mon,now,{reduced=false,intensity=1,spriteH=160}={}){
 if(!mon||mon.hp<=0)return;
 const c=POS[side],f=FEET[side],t=reduced?0:now*.001,top=c.y-spriteH/2;
 const a=.8*intensity;
 ctx.save();ctx.globalAlpha=a;
 if(mon.status==='psn'||mon.status==='tox'){
  const n=mon.status==='tox'?5:3;
  for(let i=0;i<n;i++){const u=((t*.35+i/n)%1);frame(ctx,'status',SHAPES.status.poison,c.x-34+i*(68/n)+Math.sin(t*2+i)*4,f.y-8-u*(spriteH*.8),{scale:.16+i%2*.04,alpha:Math.sin(Math.PI*u),blend:'source-over'})}
 }
 if(mon.status==='brn'){
  for(let i=0;i<3;i++){const u=((t*.6+i/3)%1);frame(ctx,'status',SHAPES.status.burn,c.x-30+i*30,c.y+spriteH*.15-u*50,{scale:.17,alpha:1-u,blend:'lighter'})}
 }
 if(mon.status==='par'){
  const phase=Math.floor(t*5+(side==='p'?0:2))%4;
  if(phase<2)frame(ctx,'status',SHAPES.status.par,c.x+(phase?24:-24),c.y-10,{scale:.34,rot:phase*.8,alpha:.9,blend:'lighter'});
 }
 if(mon.status==='slp'){
  for(let i=0;i<3;i++){const u=((t*.28+i/3)%1);frame(ctx,'status',SHAPES.status.sleep,c.x+30+u*26,top+8-u*40,{scale:.17+u*.1,alpha:Math.sin(Math.PI*u),blend:'source-over'})}
 }
 if(mon.status==='frz'){
  frame(ctx,'ice-barrier',SHAPES['ice-barrier'].shell,c.x,c.y+8,{scale:Math.max(.55,spriteH/230),alpha:.62,blend:'source-over'});
 }
 if(mon.confused>0){
  for(let i=0;i<3;i++){const ang=t*2.2+i*2.094;frame(ctx,'status',SHAPES.status.confused,c.x+Math.cos(ang)*38,top-2+Math.sin(ang)*9,{scale:.12,alpha:.95,blend:'lighter'})}
 }
 if(mon.seeded){
  frame(ctx,'vines',SHAPES.vines.vine,c.x,f.y-14,{scale:.34,alpha:.9,blend:'source-over'});
  const u=(t*.5)%1;ctx.fillStyle='#bfff8a';ctx.fillRect(Math.round(c.x+(side==='p'?1:-1)*u*120),Math.round(f.y-30-Math.sin(u*Math.PI)*30),4,4);
 }
 if(mon.cursed){
  const flick=reduced||Math.floor(t*7)%5!==0;
  if(flick)frame(ctx,'status',SHAPES.status.curse,c.x-(side==='p'?44:-44),c.y-20+Math.sin(t*1.5)*5,{scale:.3,alpha:.7,blend:'source-over'});
 }
 ctx.restore();
}

// Reflect / Light Screen panels stand in front of the protected side; Spikes lie on its ground.
export function drawField(ctx,side,field,now,{reduced=false,intensity=1}={}){
 const t=reduced?0:now*.001,c=POS[side],f=FEET[side],dir=side==='p'?1:-1;
 ctx.save();
 if(field.reflect>0){ctx.globalAlpha=(.26+Math.sin(t*2)*.04)*intensity+.08;frame(ctx,'ice-barrier',SHAPES['ice-barrier'].reflect,c.x+dir*66,c.y+4,{scale:.62,flip:side==='e',blend:'source-over'})}
 if(field.lightScreen>0){ctx.globalAlpha=(.26+Math.sin(t*2+1)*.04)*intensity+.08;frame(ctx,'ice-barrier',SHAPES['ice-barrier'].lightScreen,c.x+dir*82,c.y-6,{scale:.62,flip:side==='e',blend:'source-over'})}
 if(field.spikes>0){ctx.globalAlpha=1;frame(ctx,'vines',SHAPES.vines.caltrops,f.x-dir*50,f.y+4,{scale:.22,blend:'source-over'});frame(ctx,'vines',SHAPES.vines.caltrop,f.x+dir*30,f.y+10,{scale:.18,blend:'source-over'})}
 ctx.restore();
}
