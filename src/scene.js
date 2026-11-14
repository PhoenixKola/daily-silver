import {hash} from './engine.js';
import {getSpriteImage} from './sprites.js';
const W=768,H=398;
const canvas=document.querySelector('#battle-canvas');const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const summitPlate=new Image();summitPlate.src=new URL('../assets/art/summit-night.png',import.meta.url).href;
const summitRival=new Image();summitRival.src=new URL('../assets/art/summit-rival.png',import.meta.url).href;
let run=null,menuMode='home',homeFocus=0,frameId=0,introUntil=0,introStarted=0,arrivalStart=0,arrivalUntil=0;
export function setScene(b,mode='home'){run=b;menuMode=mode;if(mode==='home'){clearSceneEffects();introUntil=0;arrivalUntil=0;}}
export function setHomeFocus(index){homeFocus=Math.max(0,Math.min(5,Number(index)||0));}
export function startBattleIntro(duration=1450){introStarted=performance.now();introUntil=introStarted+duration;arrivalStart=introUntil;arrivalUntil=arrivalStart+700;}
export function clearBattleIntro(){introUntil=0;}
const pal={ink:'#1a1c39',deep:'#282b51',ridge:'#444d7f',snow:'#eaf0e8',ice:'#a8d3d8',shade:'#799bac',gold:'#f6d89b',pink:'#e6b6c3',dark:'#151a34'};
function pixelRect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function snowScene(t){
 const fallen=run?6-run.foe.filter(p=>p.hp>0).length:0;
 const stage=fallen<2?0:fallen<4?1:fallen<6?2:3;
 if(summitPlate.complete&&summitPlate.naturalWidth){
  ctx.drawImage(summitPlate,0,0,W,H);
  if(stage){ctx.fillStyle=stage===1?'#14384216':stage===2?'#53798920':'#a3657425';ctx.fillRect(0,0,W,H)}
  const still=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const tick=still?0:Math.floor(t/55);
  for(let i=0;i<30+fallen*6;i++){
   const x=(i*193+31+tick*(i%3+1))%W,y=(i*71+tick*(i%4+1))%H;
   pixelRect(x,y,i%7===0?3:2,i%7===0?3:2,i%3===0?'#edf4ed':'#a3cbd0');
  }
  if(run&&run.player[run.pActive]?.hp/run.player[run.pActive]?.maxHp<.24){ctx.fillStyle='#a74d541c';ctx.fillRect(0,0,W,H)}
  return;
 }
 const weather=[
  {sky:['#33375e','#39456e'],halo:'#535f90',far:'#424c7d',near:'#62749a',snow:'#b8d6d2',ice:'#9cbdc7'},
  {sky:['#292f58','#465b78'],halo:'#6779a5',far:'#3b4d77',near:'#587e98',snow:'#b7dcda',ice:'#8fbbca'},
  {sky:['#202d4b','#607d91'],halo:'#8aa3ad',far:'#405b76',near:'#7393a4',snow:'#d5e9df',ice:'#aecfd0'},
  {sky:['#302945','#895e72'],halo:'#ae8898',far:'#604d70',near:'#8f7891',snow:'#e4dcd8',ice:'#c4aebc'}
 ][stage];
 const still=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const motionTime=still?0:t;
 const n=Math.floor(motionTime/45);pixelRect(0,0,W,H,pal.deep);
 for(let y=0;y<230;y+=2){const d=y/230;pixelRect(0,y,W,2,d<.5?weather.sky[0]:weather.sky[1])}
 // Moon halo and late-evening layered silhouettes
 ctx.fillStyle=weather.halo;for(let r=72;r>23;r-=8){ctx.beginPath();ctx.arc(575,78,r,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#f6eed7';ctx.beginPath();ctx.arc(575,78,24,0,Math.PI*2);ctx.fill();
 for(let i=0;i<44;i++){let x=(i*173+39)%W,y=(i*61+26)%165;pixelRect(x,y,i%6===0?3:2,i%6===0?3:2,i%5===0?'#d4dce8':'#8495ba')}
 // Quiet aurora bands make the summit breathe without blurring the sprite pixels.
 ctx.save();
 for(let band=0;band<3;band++){
  const drift=Math.sin(motionTime*.00018+band*1.7)*11;
  ctx.globalAlpha=.08+band*.035+stage*.035;
  ctx.fillStyle=band===1?'#a8e9d2':'#b7bbf4';
  ctx.beginPath();ctx.moveTo(-35,75+band*25+drift);
  ctx.bezierCurveTo(160,5+band*10+drift,330,140+band*7,505,52+band*22);
  ctx.bezierCurveTo(610,11+band*13,725,62+band*9,805,38+band*12);
  ctx.lineTo(805,56+band*13);ctx.bezierCurveTo(600,82+band*7,430,113+band*6,245,68+band*14);
  ctx.bezierCurveTo(105,51+band*17,-10,116+band*15,-35,110+band*22);ctx.fill();
 }
 ctx.restore();
 let ridges=[{col:weather.far,points:[[0,218],[30,177],[78,206],[130,135],[178,190],[249,132],[297,184],[354,146],[410,203],[473,134],[527,194],[609,142],[665,203],[723,158],[768,189],[768,398],[0,398]]},
 {col:weather.near,points:[[0,245],[37,201],[100,237],[165,174],[231,232],[320,181],[371,230],[450,188],[496,243],[589,191],[659,239],[721,195],[768,232],[768,398],[0,398]]}];
 ridges.forEach((r,j)=>{ctx.fillStyle=r.col;ctx.beginPath();r.points.forEach(([x,y],i)=>{i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.fill();for(let i=1;i<r.points.length-3;i++){let [x,y]=r.points[i];pixelRect(x-11,y+5,22,4,j?'#c2d7d7':'#8faac4')}});
 pixelRect(0,280,W,118,weather.snow);pixelRect(0,296,W,102,weather.ice);pixelRect(0,366,W,32,stage===3?'#a18fa7':'#839fb4');
 for(let i=0;i<27;i++){let x=i*37-30,y=285+(i*7)%22;pixelRect(x,y,31,5,i%2?'#d7e9df':'#bbd5d6')}
 for(let k=0;k<10;k++){let x=k*87+11,y=250+(k%3)*14;drawPine(x,y,1+(k%3)*.2)}
 for(let j=0;j<42+fallen*12;j++){let x=(j*157+57+(n*(j%3+1))*(.35+fallen*.12))%W,y=(j*91+17+n*(j%5+1))%H;pixelRect(x,y,j%3===0?3:2,j%3===0?3:2,j%2?'#e2f0ec':'#aecbda')}
 if(fallen>=3){ctx.save();ctx.globalAlpha=.12+Math.sin(motionTime*.0007)*.045;ctx.fillStyle=fallen>=5?'#fc788d':'#8ef5dc';ctx.beginPath();ctx.moveTo(80,25);ctx.bezierCurveTo(230,6,420,160,750,24);ctx.lineTo(750,0);ctx.lineTo(80,0);ctx.fill();ctx.restore();}
 if(run&&run.player[run.pActive]?.hp/run.player[run.pActive]?.maxHp<.24){ctx.save();ctx.globalAlpha=.08+Math.sin(motionTime*.009)*.04;pixelRect(0,0,W,H,'#fb5467');ctx.restore();}
 // carved concentric ice runes
 for(let k=0;k<5;k++){let x=48+k*177;pixelRect(x,317,34,3,'#dcece4');pixelRect(x+8,329,19,3,'#dcece4')}
}
function drawPine(x,y,sz){ctx.save();ctx.translate(x,y);ctx.scale(sz,sz);pixelRect(-3,0,6,21,'#2c3855');pixelRect(-15,-3,30,7,'#314766');pixelRect(-12,-11,24,9,'#405c73');pixelRect(-9,-19,18,10,'#4e7784');pixelRect(-6,-25,12,9,'#6b959a');pixelRect(-9,-14,17,3,'#d1dfd5');ctx.restore()}
// Genuine Generation II sprites are loaded from local sprite files (and only
// fall back to the public PokéAPI archive if those files have not been installed).
// We never substitute colored circles for real Pokémon art.
// Canvas-only animation library: all visuals are original procedural geometry.
// Each cue runs in the same pixel coordinate space as the battle scene.
let fx=null;
const TYPE_COLORS={Normal:'#f3e8c4',Fire:'#ff8650',Water:'#62d7fa',Electric:'#ffe36b',Grass:'#8ce67b',Ice:'#befbff',Fighting:'#ffae77',Poison:'#c991f7',Ground:'#cda36d',Flying:'#def7ff',Psychic:'#ffa3de',Bug:'#c4eb71',Rock:'#b8b0a7',Ghost:'#a9a0ff',Dragon:'#fc92e2',Dark:'#8e8eac',Steel:'#e0f5fc'};
const dot=(x,y,w,h,c)=>pixelRect(x,y,w,h,c);
const mix=(a,b,t)=>a+(b-a)*t;
const clamp01=x=>Math.max(0,Math.min(1,x));
const point=(side)=>side==='p'?{x:190,y:266}:{x:553,y:174};
const noise=(i,seed=5)=>{let a=Math.sin(i*127.11+seed*37.7)*43758.5453;return a-Math.floor(a)};
function blockCircle(x,y,r,c){
  ctx.fillStyle=c;
  for(let yy=-r;yy<=r;yy+=5){const ww=Math.sqrt(Math.max(0,r*r-yy*yy));dot(x-ww,y+yy,ww*2,5,c)}
}
function lines(x,y,r,color,rot=0,count=9){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);
  for(let i=0;i<count;i++){const a=i*6.283/count;const sx=Math.cos(a),sy=Math.sin(a);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx*r*.45,sy*r*.45);ctx.lineTo(sx*r,sy*r);ctx.stroke()}
  ctx.restore();
}
function trail(x1,y1,x2,y2,col,thickness=7){
  ctx.save();ctx.strokeStyle='#1a1c39';ctx.lineWidth=thickness+4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle=col;ctx.lineWidth=thickness;ctx.stroke();ctx.restore();
}
function shard(x,y,size,color,phase=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(phase);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.6,0);ctx.lineTo(0,size);ctx.lineTo(-size*.6,0);ctx.fill();ctx.restore();
}
function motionOffset(side,now){
  if(!fx)return {x:0,y:0,opacity:1};
  const p=clamp01((now-fx.started)/fx.duration);
  if(fx.kind==='move'&&side===fx.side){let strike=Math.sin(Math.PI*clamp01(p/.48));return {x:(side==='p'?1:-1)*strike*31,y:-strike*9,opacity:1}}
  if(fx.kind==='damage'&&side===fx.side){return {x:(Math.sin(p*64)*10)*(1-p),y:0,opacity:Math.floor(p*9)%2?.48:1}}
  if(fx.kind==='faint'&&side===fx.side){return {x:0,y:p*p*135,opacity:1-p}}
  if(fx.kind==='switch'&&side===fx.side){return {x:0,y:(1-p)*50,opacity:p}}
  return {x:0,y:0,opacity:1};
}
function moveEffect(e,p){
  const a=point(e.side),b=point(e.side==='p'?'e':'p');
  const color=TYPE_COLORS[e.type]||TYPE_COLORS.Normal;
  const attacking=e.offensive??(e.power>0||(!['Protect','Reflect','Light Screen','Rest','Swords Dance','Amnesia','Curse','Recover','Soft-Boiled','Morning Sun','Synthesis','Growth','Agility','Double Team','Belly Drum'].includes(e.move)));
  if(!attacking){
    const ring=14+p*105;
    ctx.save();ctx.globalAlpha=(1-p)*.78;lines(a.x,a.y,ring,color,p*2,12);
    for(let i=0;i<14;i++){const ang=i*6.28/14+p*1.3;shard(a.x+Math.cos(ang)*ring*.7,a.y+Math.sin(ang)*ring*.7,3+(i%3),color,ang)}
    ctx.restore();return;
  }
  const landed=e.outcome==='hit';
  const flight=clamp01((p-.08)/.58),impact=landed?clamp01((p-.59)/.41):0;
  // Failed attacks stop short of their intended target: no false impact.
  const near=e.outcome==='miss'?.78:(e.outcome==='blocked'||e.outcome==='immune'?.9:1);
  const mx=mix(a.x,b.x,flight*near),my=mix(a.y,b.y,flight*near)-Math.sin(flight*Math.PI)*26;
  const k=e.type;
  if(flight<1){
    if(e.move==='Explosion'||e.move==='Selfdestruct'){blockCircle(a.x,a.y,14+flight*115,'#ffb56f');lines(a.x,a.y,32+flight*110,'#ffe5a3',p*12,24)}
    else if(e.move==='Extreme Speed'){for(let i=0;i<9;i++){const u=Math.max(0,flight-i*.07);trail(mix(a.x,b.x,u),mix(a.y,b.y,u)+i*3,mix(a.x,b.x,Math.min(1,u+.06)),mix(a.y,b.y,Math.min(1,u+.06))+i*3,'#f9faf0',3)}}
    else if(e.move==='Aeroblast'){for(let i=0;i<8;i++){const a1=i*.65+p*18;shard(mx+Math.cos(a1)*(9+i*5),my+Math.sin(a1)*(9+i*5),8,'#ecfff0',a1)}}
    else if(e.move==='Sacred Fire'){for(let i=0;i<24;i++){const ang=i*2.4+p*12;shard(mx+Math.cos(ang)*(12+i),my+Math.sin(ang)*(12+i),6+i%3*5,i%2?'#ffedaf':'#fd6c83',ang)}}
    else if(e.move==='Shadow Ball'){blockCircle(mx,my,16+Math.sin(p*24)*3,'#2e244e');blockCircle(mx,my,10,'#a99cf5');for(let i=0;i<7;i++){const lag=Math.max(0,flight-i*.095),x=mix(a.x,b.x,lag),y=mix(a.y,b.y,lag)-Math.sin(lag*Math.PI)*26;shard(x+Math.sin(i*4+p*18)*11,y,4+i%3*2,i%2?'#c8baff':'#6862aa',p*8+i)}}
    else if(k==='Electric'){
      for(let i=0;i<5;i++){const u=i/5, v=(i+1)/5;trail(mix(a.x,mx,u),mix(a.y,my,u)+Math.sin(i*3+p*30)*11,mix(a.x,mx,v),mix(a.y,my,v)-Math.sin(i*3+p*30)*9,color,5)}
    }else if(k==='Water'||k==='Ice'){
      for(let i=0;i<10;i++){const lag=Math.max(0,flight-i*.045),x=mix(a.x,mx,lag),y=mix(a.y,my,lag)-Math.sin(lag*Math.PI)*17;shard(x,y,k==='Ice'?8:5,color,p*9+i)}
    }else if(k==='Fire'||k==='Dragon'){
      for(let i=0;i<15;i++){const v=Math.max(0,flight-i*.027),x=mix(a.x,mx,v)+Math.sin(i*4)*9,y=mix(a.y,my,v)+Math.cos(i*3)*9;dot(x,y,10+(i%3)*3,8,i%3===0?'#fff2b0':color)}
    }else if(k==='Psychic'||k==='Ghost'||k==='Dark'){
      for(let i=0;i<4;i++){ctx.save();ctx.globalAlpha=.65-i*.1;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(mx,my,12+i*12+p*4,0,Math.PI*2);ctx.stroke();ctx.restore()}
    }else if(k==='Grass'||k==='Bug'||k==='Poison'){
      for(let i=0;i<13;i++){const ang=i*2.4+p*9,rr=i*2.5+9;shard(mx+Math.cos(ang)*rr,my+Math.sin(ang)*rr,5+(i%3)*2,color,ang)}
    }else if(k==='Ground'||k==='Rock'||k==='Steel'){
      for(let i=0;i<12;i++){const lag=Math.max(0,flight-i*.037);dot(mix(a.x,mx,lag),mix(a.y,my,lag)+Math.sin(i*3)*20,6+i%4,8,i%3===0?'#f2e3cc':color)}
    }else{
      trail(a.x,a.y,mx,my,color,10);lines(mx,my,21,color,p*4,6)
    }
  }
  if(impact>0){
    ctx.save();ctx.globalAlpha=Math.max(0,1-impact);const rad=22+impact*(e.finisher?136:82);
    lines(b.x,b.y,rad,e.finisher?'#fff1bf':color,impact*1.6,e.finisher?20:12);
    for(let i=0;i<(e.finisher?30:18);i++){let ang=i*2.399,rr=(15+impact*(e.finisher?105:65))*(0.6+noise(i,e.seed)*.6);const x=b.x+Math.cos(ang)*rr,y=b.y+Math.sin(ang)*rr; k==='Ice'||k==='Psychic'||k==='Steel'||e.finisher?shard(x,y,6+impact*9,i%3?'#effff8':color,ang):dot(x,y,5+i%3*5,5+i%3*5,i%3===0?'#fff8de':color)}
    blockCircle(b.x,b.y,16*(1-impact),'#fff6d2');ctx.restore();
  }
}
function drawFx(now){
 if(!fx)return;let p=clamp01((now-fx.started)/fx.duration);
 const pos=point(fx.side||'e'),color=TYPE_COLORS[fx.type]||'#fff0b8';
 if(fx.kind==='move')moveEffect(fx,p);
 else if(fx.kind==='damage'){
  ctx.save();ctx.globalAlpha=1-p;
  lines(pos.x,pos.y,25+p*100,'#fff2b3',p*3,12);
  ctx.textAlign='center';ctx.font='bold 21px monospace';ctx.lineWidth=4;ctx.strokeStyle='#1a1c39';ctx.strokeText('-'+fx.amount+' HP',pos.x,pos.y-52-p*42);ctx.fillStyle='#fff4c6';ctx.fillText('-'+fx.amount+' HP',pos.x,pos.y-52-p*42);
  ctx.restore();
 } else if(fx.kind==='miss'||fx.kind==='immune'||fx.kind==='blocked'){
  ctx.save();ctx.globalAlpha=Math.max(.04,1-p);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 18px monospace';
  const word=fx.kind==='miss'?'MISSED!':fx.kind==='immune'?'IMMUNE':'BLOCKED';
  const yy=pos.y-65-p*35;ctx.lineWidth=5;ctx.strokeStyle='#141a33';ctx.strokeText(word,pos.x,yy);ctx.fillStyle=fx.kind==='immune'?'#ffbad0':'#e8f4fa';ctx.fillText(word,pos.x,yy);
  if(fx.kind==='blocked'){lines(pos.x,pos.y,24+p*52,'#b5e5f9',p*2,9)}ctx.restore();
 } else if(fx.kind==='critical'||fx.kind==='effectiveness'){
  ctx.save();ctx.globalAlpha=1-p;ctx.textAlign='center';ctx.font='bold 17px monospace';ctx.lineWidth=4;ctx.strokeStyle='#151a33';
  const word=fx.kind==='critical'?'CRITICAL!':fx.effectiveness>=2?'SUPER EFFECTIVE':'RESISTED';
  ctx.strokeText(word,pos.x,pos.y-80-p*25);ctx.fillStyle=fx.kind==='critical'?'#ffe8a0':'#b7f5cf';ctx.fillText(word,pos.x,pos.y-80-p*25);ctx.restore();
 } else if(fx.kind==='heal'){
  ctx.save();ctx.globalAlpha=1-p;const rr=19+p*65;lines(pos.x,pos.y,rr,'#85f7bc',p*2,9);
  ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.fillStyle='#b2ffd1';ctx.fillText('+'+fx.amount+' HP',pos.x,pos.y-46-p*36);ctx.restore();
 } else if(fx.kind==='status'||fx.kind==='buff'){
  ctx.save();ctx.globalAlpha=(1-p)*.9;for(let i=0;i<7;i++){let theta=i*6.28/7+p*3;shard(pos.x+Math.cos(theta)*(18+p*70),pos.y+Math.sin(theta)*(18+p*70),10,fx.kind==='buff'?'#aefad0':'#d19cfa',theta)}ctx.restore();
 } else if(fx.kind==='switch'){
  ctx.save();ctx.globalAlpha=1-p;lines(pos.x,pos.y,78*(1-p)+15,'#fff5ca',p*5,12);ctx.restore();
 } else if(fx.kind==='faint'){
  ctx.save();ctx.globalAlpha=1-p;for(let i=0;i<15;i++){const ang=i*2.399,rr=p*65;dot(pos.x+Math.cos(ang)*rr,pos.y+Math.sin(ang)*rr,5,5,'#dee1f5')}ctx.restore();
 }
}
export function playSceneEvent(event,requestedDuration=500){
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const duration=reduced?Math.min(85,requestedDuration):requestedDuration;
 const cue={...event,seed:(event.move||event.name||'FX').length,started:performance.now(),duration};
 fx=cue;
 return new Promise(resolve=>setTimeout(()=>{if(fx===cue)fx=null;resolve()},duration));
}
export function clearSceneEffects(){fx=null}

function drawMon(mon,side,t){
 if(!mon)return;
 const back=side==='p', x=back?191:554, y=back?263:176;
 const state=getSpriteImage(mon,back);
 pixelRect(x-88,y+67,182,10,back?'#617e96':'#7794a4');
 pixelRect(x-69,y+80,142,4,'#d6e7de');
 if(!state.loaded){
   ctx.save();ctx.textAlign='center';ctx.fillStyle='#f6d89b';ctx.font='bold 10px monospace';
   ctx.fillText(state.failed?'SPRITES NOT INSTALLED':'LOADING SPRITE...',x,y-5);
   ctx.fillStyle='#eaf0e8';ctx.font='9px monospace';ctx.fillText(mon.name.toUpperCase(),x,y+13);ctx.restore();return;
 }
 const img=state.renderSource||state.image,scale=back?4:3;
 const w=(img.naturalWidth||img.width)*scale,h=(img.naturalHeight||img.height)*scale;
 const offset=motionOffset(side,t);
 const phase=t*.002+hash(mon.id)%50;
 const wobble=Math.round(Math.sin(phase)*2.0)+Math.round(Math.sin(t*.0045+hash(mon.name)%11));
 const breathe=1+Math.sin(phase*1.22)*.012;
 const arrival=arrivalUntil>t?clamp01((t-arrivalStart-(back?180:0))/(back?520:440)):1;
 ctx.save();ctx.translate(x+offset.x,y+wobble+offset.y+(1-arrival)*70);ctx.scale(1,breathe);
 ctx.globalAlpha=offset.opacity*arrival*(mon.hp<=0?.22:1);
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(img,Math.round(-w/2),Math.round(-h/2),Math.round(w),Math.round(h));
 ctx.restore();
}
function drawSummitSentinel(t){
  if(!summitRival.complete||!summitRival.naturalWidth)return;
  const still=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const bob=still?0:Math.round(Math.sin(t*0.0022));
  // Keep the distant rival understated against the panorama, with a crisp local pixel edge.
  ctx.save();
  ctx.globalAlpha=.25;
  pixelRect(365,282,42,3,'#111a27');
  pixelRect(371,285,30,2,'#111a27');
  ctx.globalAlpha=.94;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(summitRival,356,186+bob,60,100);
  ctx.restore();
}
function drawHomeAlly(t){
 const mon=run?.player?.[homeFocus];if(!mon)return;
 const sprite=getSpriteImage(mon,false);if(!sprite.loaded)return;
 const img=sprite.renderSource||sprite.image;
 const w=(img.naturalWidth||img.width)*3,h=(img.naturalHeight||img.height)*3;
 const still=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const bob=still?0:Math.round(Math.sin(t*.0026+homeFocus)*3);
 pixelRect(111,294,170,8,'#6d899c');pixelRect(130,302,132,4,'#d4e5db');
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.97;
 ctx.drawImage(img,Math.round(196-w/2),Math.round(251-h/2+bob),Math.round(w),Math.round(h));
 ctx.restore();
}
function drawTitleScene(t){
  snowScene(t);
  drawHomeAlly(t);
  drawSummitSentinel(t);
}
function render(t){
 ctx.imageSmoothingEnabled=false;
 if(menuMode==='home'||!run){drawTitleScene(t)}
 else if(introUntil>t){
   const p=clamp01((t-introStarted)/(introUntil-introStarted));
   ctx.save();const zoom=1+p*.12;ctx.translate(W/2,H/2);ctx.scale(zoom,zoom);ctx.translate(-W/2,-H/2);drawTitleScene(t);ctx.restore();
   ctx.fillStyle=`rgba(13,18,38,${Math.max(0,.47-p*.3)})`;ctx.fillRect(0,0,W,H);
   ctx.textAlign='center';ctx.fillStyle='#f7d59d';ctx.font='bold 19px monospace';ctx.fillText(p<.64?'THE SUMMIT IS SILENT.':'RED ACCEPTS THE CHALLENGE.',W/2,335);
 } else {
   snowScene(t);
   const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
   const beat=!reduced&&fx&&['faint','switch'].includes(fx.kind)?Math.sin(Math.PI*clamp01((t-fx.started)/fx.duration)):0;
   if(beat){ctx.save();ctx.globalAlpha=beat*.17;pixelRect(0,0,W,H,'#101a32');ctx.restore();const focus=point(fx.side||'e'),zoom=1+beat*(fx.kind==='faint'?.095:.045);ctx.save();ctx.translate(focus.x,focus.y);ctx.scale(zoom,zoom);ctx.translate(-focus.x,-focus.y)}
   drawMon(run.foe[run.eActive],'e',t);drawMon(run.player[run.pActive],'p',t);drawFx(t);
   if(beat)ctx.restore();
 }
 frameId=requestAnimationFrame(render);
}
canvas.width=W;canvas.height=H;frameId=requestAnimationFrame(render);
