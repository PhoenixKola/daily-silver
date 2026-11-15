// The evolving summit: four atmospheric stages blended continuously over generated layers.
// Stage 0 Stillness, 1 Rising Wind, 2 Whiteout, 3 Last Light. Works with the real art loaded.
import {img} from './assets.js';
const W=768,H=398,PAD=8;
export const STAGE_NAMES=['Stillness','Rising Wind','Whiteout','Last Light'];
// Last Light begins when Red's final ally steps up, so it is earned and visible during play.
export const stageForFallen=fallen=>fallen<2?0:fallen<4?1:fallen<5?2:3;

// Per-stage targets: fog alpha, snow count, wind px/s, aurora alpha, last-light sky, white wash, tint, parallax strength
const P={
 fog:[.16,.36,.92,.28],snow:[26,70,210,26],wind:[5,28,70,10],aurora:[1,.72,.22,0],lastSky:[0,0,0,1],wash:[0,.05,.3,0],cold:[0,.05,.1,0],
 warm:[0,0,0,.2],dim:[0,.08,.2,.06],sway:[1,1.5,2.2,.8]
};
export function weights(blend){return [0,1,2,3].map(k=>Math.max(0,1-Math.abs(blend-k)))}
export function mixParam(key,blend){const w=weights(blend);return P[key].reduce((s,v,i)=>s+v*w[i],0)}

const snow=[];for(let i=0;i<240;i++){const a=Math.sin(i*127.1+3.7)*43758.5453,b=Math.sin(i*311.7+9.1)*43758.5453;snow.push({x:(a-Math.floor(a)),y:(b-Math.floor(b)),s:(i%5)+1,k:(i*37%100)/100})}

export function drawBackdrop(ctx,{time,blend,camX=0,camY=0,reduced,intensity=1,focusDim=0}){
 const t=reduced?0:time;
 const sway=reduced?0:Math.sin(t*.00023)*mixParam('sway',blend);
 const cx=camX,off=(f)=>Math.round(cx*f+sway*f*1.2);
 const sky=img('sky'),last=img('sky-last-light'),ridges=img('ridges'),ground=img('ground'),fg=img('foreground'),aurora=img('aurora'),fog=img('fog');
 const lastA=mixParam('lastSky',blend);
 if(sky){ctx.drawImage(sky,-PAD+off(.12),Math.round(camY*.1))}else{ctx.fillStyle='#14284f';ctx.fillRect(0,0,W,H)}
 if(last&&lastA>.01){ctx.save();ctx.globalAlpha=Math.min(1,lastA);ctx.drawImage(last,-PAD+off(.12),Math.round(camY*.1));ctx.restore()}
 // aurora ribbons: pixel-column wave, not a blur
 const aA=mixParam('aurora',blend)*intensity;
 if(aurora&&aA>.02){
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let x=0;x<W+PAD*2;x+=4){
   const wave=reduced?0:Math.round(Math.sin(x*.012+t*.0007)*3+Math.sin(x*.005-t*.0004)*2);
   ctx.globalAlpha=aA*(.78+(reduced?0:Math.sin(t*.0011+x*.01)*.18));
   ctx.drawImage(aurora,x,0,4,H,x-PAD+off(.2),wave,4,H);
  }
  ctx.restore();
 }
 if(ridges)ctx.drawImage(ridges,-PAD+off(.32),Math.round(camY*.2));
 // distant haze between ridges and ground gives depth without blur
 const fogA=mixParam('fog',blend)*(.7+.3*intensity);
 drawFog(ctx,fog,t,blend,fogA*.55,.25,off,.4,0);
 if(ground)ctx.drawImage(ground,-PAD+off(.5),Math.round(camY*.35));else{ctx.fillStyle='#b2d2ec';ctx.fillRect(0,158,W,H-158)}
 const warm=mixParam('warm',blend);
 if(warm>.01){ctx.save();ctx.globalAlpha=warm;ctx.globalCompositeOperation='screen';ctx.fillStyle='#8a4a52';ctx.fillRect(0,130,W,H-130);ctx.restore()}
 const dim=mixParam('dim',blend)+focusDim;
 if(dim>.01){ctx.save();ctx.globalAlpha=dim;ctx.fillStyle='#0d1b3a';ctx.fillRect(0,0,W,H);ctx.restore()}
 return {fogA};
}

// Foreground layer: rocks and low fog that pass in front of the combatants' feet, never over their bodies.
export function drawForeground(ctx,{time,blend,camX=0,camY=0,reduced,intensity=1}){
 const t=reduced?0:time;
 const fg=img('foreground'),fog=img('fog');
 const off=f=>Math.round(camX*f);
 const fogA=mixParam('fog',blend)*(.7+.3*intensity);
 drawFog(ctx,fog,t,blend,fogA*.5,.9,off,1.1,150);
 if(fg)ctx.drawImage(fg,-PAD+off(1.5),Math.round(camY*.6));
}

function drawFog(ctx,fog,t,blend,alpha,speedScale,off,parallax,yBias){
 if(!fog||alpha<.01)return;
 const wind=mixParam('wind',blend)*speedScale;
 const shift=(t*.001*wind)%W;
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let layer=0;layer<2;layer++){
  const dir=layer?-.6:1,s=Math.round((shift*dir*(1+layer*.5)+layer*311)%W+W)%W,y=Math.round((layer?18:0)-yBias*.1);
  ctx.globalAlpha=alpha*(layer?.7:1);
  for(let k=-1;k<=1;k++)ctx.drawImage(fog,0,0,fog.width,fog.height,Math.round(k*W-s+off(parallax)-PAD*0),y,W+PAD*2,H);
 }
 ctx.restore();
}

// Falling snow: pooled fixed table, integer-pixel flecks, wind slants with the stage.
export function drawSnow(ctx,{time,blend,reduced,intensity=1,camX=0}){
 const n=Math.round(mixParam('snow',blend)*(.5+.5*intensity)*(reduced?.4:1));
 const wind=mixParam('wind',blend),t=reduced?0:time*.001;
 ctx.save();
 for(let i=0;i<n&&i<snow.length;i++){
  const f=snow[i],speed=18+f.s*9;
  const x=((f.x*W+t*wind*(.6+f.k)+Math.sin(t*.6+i)*(reduced?0:4)+camX*(.5+f.k))%W+W)%W;
  const y=((f.y*H+t*speed*(.6+f.k*.8))%H+H)%H;
  const big=f.s>3;
  ctx.fillStyle=f.k>.5?'#eef5fb':'#a9c7e4';
  ctx.globalAlpha=f.k>.5?.95:.7;
  ctx.fillRect(Math.round(x),Math.round(y),big?3:2,big?3:2);
 }
 if(wind>18&&!reduced){
  const count=Math.round((wind-18)/2.2*(.5+.5*intensity));
  ctx.fillStyle='#eef5fb';
  for(let i=0;i<count;i++){const y=(i*53+17)%H,x=((t*wind*(2.2+(i%4)*.5)+i*131)%(W+80))-40;ctx.globalAlpha=.16+(i%3)*.08;ctx.fillRect(Math.round(x),y,12+(i%5)*7,2)}
 }
 ctx.restore();
}

// Whiteout wash: sits behind combatants (called before sprites) and stays light so they remain readable.
export function drawWash(ctx,{blend,intensity=1}){
 const a=mixParam('wash',blend)*intensity;
 if(a<.01)return;
 ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#dbe8f5';ctx.fillRect(0,0,W,H);ctx.restore();
}
export const SIZE={W,H};
