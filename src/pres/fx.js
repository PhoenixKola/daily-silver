// Effect families and signature move spectacle. Cosmetic only: uses its own tiny PRNG so it
// can never consume or influence battle randomness. Works from either side.
import {frame,SHAPES,img} from './assets.js';

export const POS={p:{x:191,y:240},e:{x:554,y:172}};
export const FEET={p:{x:191,y:331},e:{x:554,y:243}};
export const TYPE_COLORS={Normal:'#f3e8c4',Fire:'#ff8650',Water:'#62d7fa',Electric:'#ffe36b',Grass:'#8ce67b',Ice:'#befbff',Fighting:'#ffae77',Poison:'#c991f7',Ground:'#cda36d',Flying:'#def7ff',Psychic:'#ffa3de',Bug:'#c4eb71',Rock:'#b8b0a7',Ghost:'#a9a0ff',Dragon:'#fc92e2',Dark:'#8e8eac',Steel:'#e0f5fc'};
const clamp01=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const out=t=>1-(1-t)*(1-t);
export function seeded(seed){let s=(seed>>>0)||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
const hashStr=str=>{let h=2166136261;for(const c of String(str)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

const px=(ctx,x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
function pixLine(ctx,x1,y1,x2,y2,w,color){
 const dx=x2-x1,dy=y2-y1,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(w*.8)));
 ctx.fillStyle=color;
 for(let i=0;i<=n;i++){const t=i/n;ctx.fillRect(Math.round(x1+dx*t-w/2),Math.round(y1+dy*t-w/2),w,w)}
}
function orb(ctx,x,y,r,color,core='#ffffff'){
 ctx.fillStyle=color;
 for(let yy=-r;yy<=r;yy+=3){const ww=Math.sqrt(Math.max(0,r*r-yy*yy));ctx.fillRect(Math.round(x-ww),Math.round(y+yy),Math.round(ww*2),3)}
 const c=Math.max(2,r*.5);ctx.fillStyle=core;ctx.fillRect(Math.round(x-c/2),Math.round(y-c/2),Math.round(c),Math.round(c));
}
function ring(ctx,x,y,rx,ry,color,w=3,alpha=1){
 ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),Math.max(1,rx),Math.max(1,ry),0,0,Math.PI*2);ctx.stroke();ctx.restore();
}
const lerpPt=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t)});

// ---- particle pool (no per-frame allocation) ----
const MAX=360;
const pool=Array.from({length:MAX},()=>({on:false,x:0,y:0,vx:0,vy:0,g:0,t0:0,life:0,size:2,color:'#fff',shape:0,drag:0}));
let cursor=0;
export function spawn(now,x,y,{vx=0,vy=0,g=0,life=600,size=3,color='#fff',shape=0,drag=0}={}){
 const p=pool[cursor++%MAX];p.on=true;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.g=g;p.t0=now;p.life=life;p.size=size;p.color=color;p.shape=shape;p.drag=drag;return p;
}
export function burst(now,x,y,n,{speed=90,spread=Math.PI*2,angle=0,life=600,size=3,color='#fff',g=120,colors,rand=Math.random,shape=0}={}){
 for(let i=0;i<n;i++){const a=angle+(rand()-.5)*spread,s=speed*(.4+rand()*.8);spawn(now,x,y,{vx:Math.cos(a)*s,vy:Math.sin(a)*s,g,life:life*(.6+rand()*.6),size:size+(rand()>.7?2:0),color:colors?colors[i%colors.length]:color,shape})}
}
export function drawParticles(ctx,now){
 for(const p of pool){
  if(!p.on)continue;
  const age=now-p.t0;if(age<0)continue;
  if(age>p.life){p.on=false;continue}
  const s=age/1000,k=p.drag?Math.exp(-p.drag*s):1;
  const x=p.x+p.vx*s*k,y=p.y+p.vy*s*k+.5*p.g*s*s;
  ctx.globalAlpha=Math.min(1,(1-age/p.life)*1.6);
  ctx.fillStyle=p.color;
  ctx.fillRect(Math.round(x),Math.round(y),p.size,p.size);
 }
 ctx.globalAlpha=1;
}
export function clearParticles(){for(const p of pool)p.on=false}

// ---- effect instances ----
const effects=[];
export function addEffect(e){effects.push(e);return e}
export function clearEffects(){effects.length=0;clearParticles()}
export function activeEffects(){return effects.length}
export function drawEffects(ctx,now,intensity=1){
 for(let i=effects.length-1;i>=0;i--){
  const e=effects[i],p=(now-e.t0)/e.dur;
  if(p>=1){effects.splice(i,1);continue}
  if(p<0)continue;
  ctx.save();
  try{(DRAW[e.kind]||(()=>{}))(ctx,e,clamp01(p),now,intensity)}finally{ctx.restore()}
 }
}
// is something still animating (used to decide when the scene may idle)
export const busy=()=>effects.length>0;

// ---- release (travel) effects by family ----
const DRAW={};
DRAW.travel=(ctx,e,p,now,intensity)=>{
 const a=e.from,b=e.to,color=TYPE_COLORS[e.type]||'#f3e8c4';
 const F=FAMILY_TRAVEL[e.family]||FAMILY_TRAVEL.projectile;F(ctx,e,p,now,a,b,color,intensity);
};
const FAMILY_TRAVEL={
 contact(){},slash(){},extremespeed(ctx,e,p,now,a,b){for(let i=0;i<9;i++){const u=Math.max(0,p-i*.07);const q=lerpPt(a,b,u),r=lerpPt(a,b,Math.min(1,u+.06));pixLine(ctx,q.x,q.y+i*3,r.x,r.y+i*3,3,'#f9faf0')}},
 bodyslam(){},
 projectile(ctx,e,p,now,a,b,color){
  const miss=e.outcome==='miss'?.78:e.outcome==='immune'||e.outcome==='blocked'?.9:1;
  const q=lerpPt(a,b,ease(p)*miss);q.y-=Math.sin(p*Math.PI)*26;
  for(let i=1;i<7;i++){const u=Math.max(0,p-i*.045),r=lerpPt(a,b,ease(u)*miss);r.y-=Math.sin(u*Math.PI)*26;px(ctx,r.x,r.y,8-i,8-i,i%2?color:'#fff')}
  orb(ctx,q.x,q.y,9,color);
 },
 beam(ctx,e,p,now,a,b,color){
  const reach=e.outcome==='miss'?.8:e.outcome==='immune'||e.outcome==='blocked'?.92:1;
  const grow=out(clamp01(p*1.6)),fade=1-clamp01((p-.7)/.3),end=lerpPt(a,b,grow*reach);
  ctx.globalAlpha=fade;pixLine(ctx,a.x,a.y,end.x,end.y,10,color);pixLine(ctx,a.x,a.y,end.x,end.y,4,'#ffffff');
  orb(ctx,a.x,a.y,12*(1-p*.4),color);
 },
 area(ctx,e,p,now,a,b,color){
  const t=e.type,r=seeded(hashStr(e.move));
  if(t==='Ground'||t==='Rock'||t==='Fighting'){
   for(let k=0;k<3;k++){const q=clamp01(p*1.4-k*.15);ring(ctx,b.x,FEET[e.targetSide].y-2,20+q*150,6+q*30,color,4,1-q)}
   if(t==='Rock')for(let i=0;i<9;i++){const x=b.x-90+r()*180,y=-20+ease(clamp01(p*1.5-r()*.4))*(b.y+40);px(ctx,x,y,10,10,i%2?'#b8b0a7':'#6f7f9b');}
  }else if(t==='Ice'||t==='Flying'||t==='Dragon'){
   for(let i=0;i<14;i++){const x=b.x-110+r()*220,y=-10+((p*1.2+r())%1)*(b.y+60);frame(ctx,'snow',SHAPES.snow.flakes,x,y,{scale:.28,alpha:1-p*.5})}
  }else if(t==='Electric'){
   for(let k=0;k<3;k++){const x=b.x-70+k*70+(r()-.5)*30,q=clamp01(p*2-k*.2);if(q>0&&q<1)bolt(ctx,x,0,x+(r()-.5)*30,b.y+20,hashStr(e.move)+k+Math.floor(p*14),'#ffe36b')}
  }else{
   for(let k=0;k<3;k++){const q=clamp01(p*1.5-k*.2);ring(ctx,b.x,b.y,18+q*130,18+q*130,color,4,1-q)}
  }
 },
 drain(ctx,e,p,now,a,b,color){FAMILY_TRAVEL.gigadrain(ctx,e,p,now,a,b,color)},
 recovery(ctx,e,p,now,a){
  const r=seeded(7);
  for(let i=0;i<14;i++){const x=a.x-50+r()*100,y=a.y+50-((p*1.1+r())%1)*130;frame(ctx,'light',SHAPES.light.recall,x,y,{scale:.14+r()*.08,alpha:1-p*.5,blend:'lighter'})}
  ring(ctx,a.x,a.y+60,30+p*50,10+p*14,'#9fffcd',3,1-p);
 },
 barrier(ctx,e,p,now,a){
  const k=e.move==='Light Screen'?SHAPES['ice-barrier'].lightScreen:SHAPES['ice-barrier'].reflect;
  const dir=e.side==='p'?1:-1;
  ctx.globalAlpha=Math.sin(Math.PI*p)*.85;
  frame(ctx,'ice-barrier',k,a.x+dir*60,a.y+10,{scale:.45+p*.15,flip:e.side==='e'});
 },
 stat(ctx,e,p,now,a,b,color){
  const target=e.outcome==='debuff'?b:a,up=e.outcome!=='debuff';
  for(let i=0;i<5;i++){const x=target.x-44+i*22,y=target.y+(up?50-p*90-i*4:-50+p*90+i*4);ctx.globalAlpha=1-p;chevron(ctx,x,y,up,up?'#aefad0':'#ff9aa8')}
 },
 inflict(ctx,e,p,now,a,b,color){FAMILY_TRAVEL.projectile(ctx,e,p,now,a,b,color)},
 shadowball(ctx,e,p,now,a,b){
  const q=lerpPt(a,b,ease(p));q.y-=Math.sin(p*Math.PI)*26;
  for(let i=0;i<7;i++){const u=Math.max(0,p-i*.06),r=lerpPt(a,b,ease(u));r.y-=Math.sin(u*Math.PI)*26;px(ctx,r.x+Math.sin(i*4+p*18)*9,r.y,6,6,i%2?'#c8baff':'#6862aa')}
  orb(ctx,q.x,q.y,17+Math.sin(p*24)*2,'#2e244e','#a99cf5');
 },
 sacredfire(ctx,e,p,now,a,b){
  const q=lerpPt(a,b,ease(p)),s=1+p*.8;
  frame(ctx,'fire',SHAPES.fire.stream,q.x,q.y,{scale:.7*s,flip:e.side==='e',rot:Math.atan2(b.y-a.y,b.x-a.x)*.2,blend:'lighter'});
  const r=seeded(3);for(let i=0;i<10;i++){const ang=i*2.4+p*12;px(ctx,q.x+Math.cos(ang)*(14+i*2),q.y+Math.sin(ang)*(14+i*2),5,5,i%2?'#ffedaf':'#fd6c83')}
 },
 aeroblast(ctx,e,p,now,a,b){
  const q=lerpPt(a,b,ease(p));
  for(let i=0;i<8;i++){const ang=i*.65+p*18;px(ctx,q.x+Math.cos(ang)*(9+i*5),q.y+Math.sin(ang)*(9+i*5),8,8,'#ecfff0')}
  ring(ctx,q.x,q.y,16+p*20,16+p*20,'#def7ff',4,1);pixLine(ctx,a.x,a.y,q.x,q.y,5,'#ffffff');
 },
 explosion(ctx,e,p,now,a){
  const r=14+p*125;orb(ctx,a.x,a.y,r,'#ffb56f','#fff1bf');ring(ctx,a.x,a.y,r+10,r*.7,'#ffe5a3',5,1-p);
 },
 // --- signature moves ---
 thunderbolt(ctx,e,p,now,a,b,color){
  const seed=hashStr('tb')+Math.floor(p*16);
  if(p<.25){ctx.globalAlpha=.4*(p/.25);ctx.fillStyle='#10163a';ctx.fillRect(0,0,768,398)}
  if(p>.15){const q=clamp01((p-.15)/.2);if(q<1||p<.7)bolt(ctx,b.x+(e.side==='p'?-30:30),-10,b.x,b.y+30,seed,'#ffe36b',true)}
  if(p>.2&&p<.8)frame(ctx,'electric',SHAPES.electric.burstL,b.x,b.y,{scale:.9,alpha:1-p*.6,blend:'lighter'});
 },
 psychic(ctx,e,p,now,a,b){
  const r=seeded(11),conv=ease(clamp01(p*1.25));
  for(let i=0;i<3;i++){const u=clamp01(conv*1.2-i*.12);frame(ctx,'psychic',i?SHAPES.psychic.double:SHAPES.psychic.ring,b.x,b.y,{scale:mix(1.9,.35,u),alpha:(1-u)*.9+.1*u,blend:'lighter'})}
  for(let i=0;i<14;i++){const ang=r()*6.28,dist=mix(60+r()*50,6,conv);const lift=Math.sin(p*3+i)*5*(1-conv);px(ctx,b.x+Math.cos(ang)*dist,b.y+Math.sin(ang)*dist*.7+lift,3,3,i%3?'#f4f9ff':'#ffa3de')}
  if(p>.8)frame(ctx,'psychic',SHAPES.psychic.spiral,b.x,b.y,{scale:.8,alpha:(p-.8)*5,blend:'lighter'});
 },
 gigadrain(ctx,e,p,now,a,b,color){
  const r=seeded(5);
  for(let k=0;k<3;k++){
   const reach=clamp01(p*2-k*.12),pts=[];
   for(let i=0;i<=10;i++){const u=i/10*reach,q=lerpPt(b,a,u);pts.push({x:q.x+Math.sin(u*9+k*2+p*6)*12*Math.sin(Math.PI*u),y:q.y+Math.cos(u*7+k)*10*Math.sin(Math.PI*u)+k*6-6})}
   for(let i=1;i<pts.length;i++)pixLine(ctx,pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y,5,i%2?'#8ce67b':'#d8ffb0');
  }
  const back=clamp01((p-.35)/.65);
  for(let i=0;i<7;i++){const u=clamp01(back*1.1-i*.07);if(u>0&&u<1){const q=lerpPt(b,a,ease(u));orb(ctx,q.x+Math.sin(i*3)*8,q.y+Math.cos(i*2)*8,4,'#bfff8a')}}
  if(p>.85)frame(ctx,'drain',SHAPES.drain.absorb,a.x,a.y,{scale:.7,alpha:(1-p)*6,blend:'lighter'});
 },
 fireblast(ctx,e,p,now,a,b){
  const q=lerpPt(a,b,ease(clamp01(p*1.1))),grow=.35+Math.sin(p*Math.PI)*.4+p*.25;
  frame(ctx,'fire',p<.3?SHAPES.fire.small:SHAPES.fire.ball,q.x,q.y,{scale:grow,flip:e.side==='e',blend:'lighter'});
  frame(ctx,'fire',SHAPES.fire.stream,mix(a.x,q.x,.6),mix(a.y,q.y,.6),{scale:grow*.7,flip:e.side==='e',alpha:.8,blend:'lighter'});
  const r=seeded(Math.floor(p*30));for(let i=0;i<6;i++)px(ctx,q.x-20+r()*40,q.y-20+r()*40,4,4,i%2?'#ffd36b':'#ff6a3c');
 },
 surf(ctx,e,p,now,a,b){
  const dir=e.side==='p'?1:-1;
  const x=mix(a.x+dir*40,b.x+dir*30,ease(p)),y=mix(FEET[e.side].y-30,FEET[e.targetSide].y-20,ease(p));
  const stage=p<.25?SHAPES.water.swell:p<.7?SHAPES.water.crest:SHAPES.water.curl;
  const s=.8+p*.9;
  frame(ctx,'water',stage,x,y-26*s*.4,{scale:s,flip:e.side==='e',blend:'source-over'});
  for(let i=0;i<5;i++){const u=Math.max(0,p-i*.05);px(ctx,mix(a.x,b.x,ease(u))+dir*10,mix(FEET[e.side].y,FEET[e.targetSide].y,ease(u))-8+Math.sin(i*3+p*20)*4,5,5,'#ffffff')}
 }
};
DRAW.shock=(ctx,e,p)=>{ring(ctx,e.x,e.y,16+p*e.r,5+p*e.r*.22,e.color||'#eef5fb',4,1-p);frame(ctx,'light',SHAPES.light.ring,e.x,e.y,{scale:.3+p*(e.r/110),alpha:(1-p)*.7,blend:'lighter'})};
DRAW.frame=(ctx,e,p)=>{frame(ctx,e.sheet,e.index,e.x+(e.dx||0)*p,e.y+(e.dy||0)*p,{scale:mix(e.s0,e.s1,out(p)),alpha:e.fade===false?1:1-p*p,rot:e.rot||0,flip:e.flip,blend:e.blend||'lighter'})};
DRAW.text=(ctx,e,p)=>{
 const y=e.y-e.rise*out(p),a=p<.8?1:1-(p-.8)/.2;
 ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='middle';
 const scale=e.big?1.35:1;ctx.font=`800 ${Math.round(22*scale)}px "Segoe UI",system-ui,sans-serif`;ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='#0d1b3a';ctx.strokeText(e.text,e.x,y);ctx.fillStyle=e.color||'#fff4c6';ctx.fillText(e.text,e.x,y);
};
DRAW.flash=(ctx,e,p)=>{ctx.globalAlpha=e.alpha*(1-p);ctx.fillStyle=e.color;ctx.fillRect(0,0,768,398)};
DRAW.motes=(ctx,e,p)=>{
 // recall: motes converge on the point; arrival: motes burst outward
 const r=seeded(e.seed||1),conv=e.mode==='in';
 for(let i=0;i<14;i++){const ang=r()*6.28,dist=30+r()*70,u=conv?1-p:p;const x=e.x+Math.cos(ang)*dist*u,y=e.y+Math.sin(ang)*dist*u*.8;ctx.globalAlpha=conv?p*.9+.1:1-p;px(ctx,x,y,i%3?3:5,i%3?3:5,i%2?'#fff6d0':'#ffe9a0')}
 ring(ctx,e.x,e.y,conv?(1-p)*70:p*70,conv?(1-p)*70:p*70,'#fff6d0',3,conv?p:1-p);
};

function bolt(ctx,x1,y1,x2,y2,seed,color,branches){
 const r=seeded(seed),pts=[{x:x1,y:y1}],n=9;
 for(let i=1;i<n;i++){const u=i/n;pts.push({x:mix(x1,x2,u)+(r()-.5)*34*(1-u*.4),y:mix(y1,y2,u)})}
 pts.push({x:x2,y:y2});
 for(let i=1;i<pts.length;i++){pixLine(ctx,pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y,6,color);}
 for(let i=1;i<pts.length;i++){pixLine(ctx,pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y,2,'#ffffff')}
 if(branches)for(let k=2;k<8;k+=2){const s=pts[k],dir=r()>.5?1:-1;let px_=s.x,py_=s.y;for(let j=0;j<3;j++){const nx=px_+dir*(10+r()*10),ny=py_+10+r()*14;pixLine(ctx,px_,py_,nx,ny,3,color);px_=nx;py_=ny}}
}
function chevron(ctx,x,y,up,color){
 ctx.fillStyle='#0d1b3a';for(let i=0;i<3;i++)ctx.fillRect(x-8+i*0,y+(up?i:-i)*5-2,16-i*5,6);
 ctx.fillStyle=color;
 for(let i=0;i<3;i++){const w=14-i*5,yy=y+(up?i:-i)*5;ctx.fillRect(Math.round(x-w/2),Math.round(yy),w,4)}
}

// ---- impact effects at the target (contact) ----
export function spawnImpact(now,{family,type,targetSide,side,critical,finisher,effectiveness,amount,move},rand=Math.random,intensity=1){
 const T=POS[targetSide],F=FEET[targetSide],color=TYPE_COLORS[type]||'#fff4c6';
 const big=finisher?1.5:critical?1.25:effectiveness>=2?1.1:1;
 const add=(o)=>addEffect({t0:now,...o});
 const flashSheet=(sheet,idx,s0,s1,dur=360,extra={})=>add({kind:'frame',dur,sheet,index:idx,x:T.x,y:T.y,s0:s0*big,s1:s1*big,...extra});
 switch(family){
  case 'contact':case 'extremespeed':flashSheet('impact',SHAPES.impact.star8,.5,1.1);break;
  case 'slash':flashSheet('impact',SHAPES.impact.slashA,.9,1.2,300,{rot:-.4});flashSheet('impact',SHAPES.impact.slashB,.9,1.25,300,{rot:.3,x:T.x+8,y:T.y-4});break;
  case 'projectile':case 'inflict':case 'beam':flashSheet('impact',effectiveness>=2||critical?SHAPES.impact.starL:SHAPES.impact.star8,.5,1.0);break;
  case 'area':flashSheet('impact',SHAPES.impact.star8,.6,1.2);break;
  case 'bodyslam':add({kind:'shock',dur:520,x:F.x,y:F.y,r:170*big,color:'#eef5fb'});flashSheet('snow',SHAPES.snow.ring,.5,1.2,520,{x:F.x,y:F.y-10,blend:'source-over'});flashSheet('impact',SHAPES.impact.starL,.5,1.1,260);break;
  case 'thunderbolt':flashSheet('electric',SHAPES.electric.burstL,.6,1.3,420,{blend:'lighter'});add({kind:'shock',dur:420,x:F.x,y:F.y,r:90,color:'#ffe36b'});break;
  case 'psychic':flashSheet('psychic',SHAPES.psychic.spiral,1.1,.2,480);flashSheet('psychic',SHAPES.psychic.spark,.5,1.2,380);break;
  case 'gigadrain':flashSheet('drain',SHAPES.drain.absorb,.5,1.1,380);break;
  case 'fireblast':flashSheet('fire',SHAPES.fire.ball,.6,1.5,520,{blend:'lighter'});flashSheet('fire',SHAPES.fire.break,.8,1.6,640,{blend:'lighter'});break;
  case 'surf':flashSheet('water',SHAPES.water.collapse,.9,1.4,520,{blend:'source-over',x:T.x,y:T.y+10});flashSheet('water',SHAPES.water.ring,.5,1.5,640,{blend:'source-over',y:F.y-8});break;
  case 'shadowball':flashSheet('impact',SHAPES.impact.starL,.5,1.1,380,{blend:'source-over'});add({kind:'shock',dur:420,x:T.x,y:T.y,r:100,color:'#a99cf5'});break;
  case 'sacredfire':flashSheet('fire',SHAPES.fire.ball,.7,1.7,560,{blend:'lighter'});break;
  case 'aeroblast':flashSheet('impact',SHAPES.impact.starL,.6,1.3,360);add({kind:'shock',dur:480,x:T.x,y:T.y,r:140,color:'#def7ff'});break;
  case 'explosion':flashSheet('fire',SHAPES.fire.ball,1,2.4,640,{blend:'lighter'});add({kind:'shock',dur:640,x:T.x,y:T.y+30,r:260,color:'#ffe5a3'});break;
  default:flashSheet('impact',SHAPES.impact.star8,.5,1.1);
 }
 // snow reacts to every real hit: a puff at the target's feet and kicked-up flecks
 add({kind:'frame',dur:520,sheet:'snow',index:SHAPES.snow.puff,x:F.x,y:F.y-6,s0:.45,s1:.9*big,blend:'source-over',fade:true});
 burst(now,F.x,F.y-6,Math.round((family==='bodyslam'||finisher?20:10)*intensity),{speed:70*big,angle:-Math.PI/2,spread:2.6,life:700,size:3,color:'#eef5fb',g:160,colors:['#eef5fb','#c9ddf0','#8fb5dc'],rand});
 // type-flavoured aftermath
 if(type==='Fire'||family==='fireblast'||family==='sacredfire')for(let i=0;i<14*intensity;i++)spawn(now+i*30,T.x+(rand()-.5)*60,T.y+10,{vx:(rand()-.5)*30,vy:-30-rand()*40,g:-10,life:900,size:3,color:i%2?'#ffb454':'#ff6a3c'});
 if(type==='Electric')burst(now,T.x,T.y+30,10*intensity,{speed:110,angle:-Math.PI/2,spread:3,life:420,size:3,color:'#ffe36b',colors:['#ffe36b','#ffffff'],g:300,rand});
}

export const addText=(now,x,y,text,opts={})=>addEffect({kind:'text',t0:now,dur:opts.dur||900,x,y,text,rise:opts.rise??34,color:opts.color,big:opts.big});
export const addShock=(now,x,y,r,color)=>addEffect({kind:'shock',t0:now,dur:480,x,y,r,color});
export const addMotes=(now,x,y,mode,seed)=>addEffect({kind:'motes',t0:now,dur:mode==='in'?300:420,x,y,mode,seed});
export const addTravel=(now,o)=>addEffect({kind:'travel',t0:now,...o});
export {img};
