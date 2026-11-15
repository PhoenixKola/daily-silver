// Short authored sequences drawn on the battle canvas: summit opening, victory dawn, defeat aftermath.
// Camera/layer animation only (no video). Each is skippable by the stage and has a composed
// reduced-motion alternative. Pure drawing: no battle state is read or written.
import {img} from './assets.js';
import {SIZE} from './atmosphere.js';
const {W,H}=SIZE;
const clamp01=x=>Math.max(0,Math.min(1,x));
const ease=t=>t*t*(3-2*t);
const seg=(p,a,b)=>clamp01((p-a)/(b-a));

export const DURATIONS={opening:[4000,900],victory:[5200,1300],defeat:[3600,1100]};
export function cinemaDuration(name,reduced){const d=DURATIONS[name]||[3000,800];return reduced?d[1]:d[0]}

function sprite(ctx,env,mon,back,x,footY,scale,alpha=1,sink=0){
 const st=env.getSpriteImage(mon,back);if(!st.loaded)return;
 const image=st.renderSource||st.image,w=(image.naturalWidth||image.width)*scale,h=(image.naturalHeight||image.height)*scale;
 ctx.save();ctx.globalAlpha=alpha;
 if(sink){ctx.beginPath();ctx.rect(0,0,W,footY+2);ctx.clip()}
 ctx.drawImage(image,Math.round(x-w/2),Math.round(footY-h+sink*h),w,h);ctx.restore();
}
function shadow(ctx,cx,cy,w,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='rgba(20,40,80,.35)';ctx.fillRect(Math.round(cx-w*.39),cy-9,Math.round(w*.78),3);ctx.fillRect(Math.round(cx-w/2),cy-6,w,3);ctx.fillRect(Math.round(cx-w*.39),cy-3,Math.round(w*.78),3);ctx.restore()}
function bars(ctx,amount){const h=Math.round(amount*34);if(h<=0)return;ctx.fillStyle='#070d1d';ctx.fillRect(0,0,W,h);ctx.fillRect(0,H-h,W,h)}

export function drawCinematic(name,ctx,p,env){
 ctx.imageSmoothingEnabled=false;
 const {drawers,time,reduced,intensity}=env;
 const bg=(blend,camX=0,extra={})=>drawers.backdrop(ctx,{time,blend,camX,camY:0,reduced,intensity,...extra});
 if(name==='opening'){
  if(reduced){
   bg(1.2,0);
   const c=img('challenger'),r=img('rival-front');
   if(c){const s=.8;ctx.drawImage(c,60,H-6-Math.round(c.height*s),Math.round(c.width*s),Math.round(c.height*s))}
   if(r){ctx.globalAlpha=ease(seg(p,0,.4));ctx.drawImage(r,Math.round(600-r.width*.25),Math.round(236-r.height*.5),Math.round(r.width*.5),Math.round(r.height*.5));ctx.globalAlpha=1}
   drawers.snow(ctx,{time,blend:1,reduced,intensity});
   ctx.fillStyle=`rgba(7,13,29,${1-ease(seg(p,0,.25))*.0-(1-seg(p,.6,1))*0})`;ctx.globalAlpha=Math.max(0,1-seg(p,0,.35));ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
   return;
  }
  const fogBlend=2*(1-ease(seg(p,.05,.82)));       // dense mist thins as the wind clears the summit
  const camX=Math.round(4-8*ease(p));                // slow lateral drift reveals depth through parallax
  bg(fogBlend,camX);
  // distant rival, revealed slowly as the mist opens
  const r=img('rival-front');
  if(r){
   const a=ease(seg(p,.3,.55))*(1-ease(seg(p,.88,1)));
   const s=.5,rw=Math.round(r.width*s),rh=Math.round(r.height*s);
   ctx.save();ctx.globalAlpha=a;shadow(ctx,600+camX,236,34);ctx.drawImage(r,Math.round(600+camX*.4-rw/2),236-rh,rw,rh);
   if(p>.6&&p<.72){ctx.globalAlpha=1;ctx.fillStyle='#f4f9ff';const ex=Math.round(600+camX*.4);ctx.fillRect(ex-7,236-rh+25,3,2);ctx.fillRect(ex+4,236-rh+25,3,2)}
   ctx.restore();
  }
  // foreground silhouette: the challenger, close and slightly drifting against the camera
  const c=img('challenger');
  if(c){
   const s=.95,cw=Math.round(c.width*s),ch=Math.round(c.height*s),x=Math.round(64-camX*2.4),y=H+8-ch;
   ctx.save();ctx.globalAlpha=ease(seg(p,.02,.2))*(1-ease(seg(p,.9,1)));ctx.drawImage(c,x,y,cw,ch);ctx.restore();
  }
  drawers.foreground(ctx,{time,blend:fogBlend,camX,camY:0,reduced,intensity});
  drawers.snow(ctx,{time,blend:Math.max(1,fogBlend),reduced,intensity,camX});
  // wind streaks sweep across as it clears
  if(p>.62&&p<.9){const k=seg(p,.62,.9);ctx.fillStyle='#eef5fb';for(let i=0;i<14;i++){const y=60+((i*97)%260),x=((k*1.6+i*.13)%1.2)*W*1.3-80;ctx.globalAlpha=Math.sin(Math.PI*k)*.55;ctx.fillRect(Math.round(x),y,28+(i%3)*14,2)}ctx.globalAlpha=1}
  ctx.fillStyle='#070d1d';ctx.globalAlpha=1-ease(seg(p,0,.14));ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  bars(ctx,1-ease(seg(p,.82,1)));
  return;
 }

 if(name==='victory'){
  const survivors=env.survivors||[];
  const blend=reduced?3:2+ease(seg(p,0,.45));
  bg(blend,0,{focusDim:0});
  const dawn=img('dawn');
  const a=ease(seg(p,reduced?0:.28,reduced?.5:.62));
  if(dawn){ctx.save();ctx.globalAlpha=a;ctx.drawImage(dawn,0,0);ctx.restore()}
  const n=survivors.length;
  survivors.forEach((mon,i)=>{
   const cx=Math.round(W*(.2+.6*(n===1?.5:i/(n-1)))),foot=318+((i%2)?18:0)+(n===1?0:0);
   const appear=ease(seg(p,reduced?.3:.5+i*.04,reduced?.6:.72+i*.04));
   const bob=reduced?0:Math.round(Math.sin(time*.002+i)*1.5);
   shadow(ctx,cx,foot,n<=4?84:68,appear);sprite(ctx,env,mon,true,cx,foot+bob,n<=3?2.6:n===4?2.2:n===5?1.9:1.65,appear);
  });
  drawers.snow(ctx,{time,blend:3,reduced,intensity,camX:0});
  if(!reduced&&p>.55){ctx.fillStyle='#fff3c8';for(let i=0;i<10;i++){const k=((p*2+i*.37)%1),x=470+Math.sin(i*2.1)*90,y=140-k*40;ctx.globalAlpha=Math.sin(Math.PI*k)*.8;ctx.fillRect(Math.round(x),Math.round(y),i%3?2:4,i%3?2:4)}ctx.globalAlpha=1}
  return;
 }

 if(name==='defeat'){
  const blend=reduced?2:1+ease(seg(p,0,.3));
  bg(blend,0,{focusDim:.1*(1-seg(p,.2,.6))});
  const after=img('aftermath');
  const a=ease(seg(p,reduced?0:.2,reduced?.5:.62));
  if(after){ctx.save();ctx.globalAlpha=a;ctx.drawImage(after,0,0);ctx.restore()}
  // the last ally, fading into the drift; the victor stands quietly far off
  if(env.fallen)sprite(ctx,env,env.fallen,true,200,330,3,.4*(1-ease(seg(p,.7,1))),.52);
  if(env.victor){const v=ease(seg(p,.4,.8));shadow(ctx,560,236,60,v*.8);sprite(ctx,env,env.victor,false,560,236,2,v)}
  drawers.snow(ctx,{time,blend:1,reduced,intensity,camX:0});
  drawers.foreground(ctx,{time,blend:1.4,camX:0,camY:0,reduced,intensity});
  ctx.fillStyle='#070d1d';ctx.globalAlpha=.12*seg(p,.6,1);ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  return;
 }
}
