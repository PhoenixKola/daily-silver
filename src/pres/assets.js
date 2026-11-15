// Image loading with graceful degradation: a missing asset simply returns null and the
// renderer falls back to simple code-drawn shapes, so the game stays playable.
const ROOT=new URL('../../assets/art/',import.meta.url);
export const MANIFEST={
 sky:'summit/sky.png','sky-last-light':'summit/sky-last-light.png',ridges:'summit/ridges.png',ground:'summit/ground.png',foreground:'summit/foreground.png',
 aurora:'summit/aurora.png',fog:'summit/fog.png',dawn:'summit/dawn.png',aftermath:'summit/aftermath.png',challenger:'summit/challenger.png','rival-front':'summit/rival-front.png',
 fire:'fx/fire.png',water:'fx/water.png',electric:'fx/electric.png',psychic:'fx/psychic.png',drain:'fx/drain.png',snow:'fx/snow.png',impact:'fx/impact.png','ice-barrier':'fx/ice-barrier.png',vines:'fx/vines.png',status:'fx/status.png',light:'fx/light.png'
};
export const CRITICAL=['sky','ridges','ground','foreground','aurora','fog','impact','snow','light'];
const cache=new Map();
function ensure(name){
 if(cache.has(name)||!MANIFEST[name]||typeof Image==='undefined')return cache.get(name);
 const entry={img:new Image(),ok:false,failed:false};
 entry.promise=new Promise(resolve=>{entry.img.onload=()=>{entry.ok=true;resolve(true)};entry.img.onerror=()=>{entry.failed=true;resolve(false)}});
 entry.img.src=new URL(MANIFEST[name],ROOT).href;
 cache.set(name,entry);return entry;
}
export const img=name=>{const e=ensure(name);return e?.ok?e.img:null};
export function preload(names=CRITICAL,timeoutMs=6000){
 const waits=names.map(n=>ensure(n)?.promise).filter(Boolean);
 return Promise.race([Promise.all(waits),new Promise(r=>setTimeout(r,timeoutMs))]);
}
export const CELL=240;
export const frameCount=name=>{const i=img(name);return i?Math.max(1,Math.round(i.naturalWidth/CELL)):0};
// Frame indices by meaning (the generated sheets are a shape library, not timed animations).
export const SHAPES={
 fire:{spark:2,small:0,ball:1,stream:3,break:4,ember:5},
 water:{crest:0,curl:1,swell:2,collapse:3,ring:4,recede:5},
 electric:{bolt:[0,1,2],burstS:3,burstL:4},
 psychic:{ring:0,double:1,rune:2,spiral:3,spark:4},
 drain:{orbS:0,orbit:1,tendril:2,leaf:3,absorb:4,leaves:[5,6,7]},
 snow:{puff:0,ring:1,tiny:2,broken:3,flakes:4},
 impact:{starS:0,star8:1,starL:2,slashA:3,slashB:4,spark:5},
 'ice-barrier':{shell:0,reflect:1,lightScreen:2,shards:3,shard:4,sparkle:5},
 vines:{pod:0,sprout:1,vine:2,caltrops:3,caltrop:4},
 status:{poison:0,sleep:1,burn:2,par:3,confused:4,curse:5},
 light:{recall:0,arriveS:1,arriveL:2,column:3,ring:4}
};
export function frame(ctx,name,index,x,y,{scale=1,rot=0,alpha=1,flip=false,blend='source-over',flipY=false}={}){
 const i=img(name);if(!i)return false;
 const n=Math.max(1,Math.round(i.naturalWidth/CELL));if(index<0||index>=n)return false;
 ctx.save();ctx.globalAlpha*=alpha;ctx.globalCompositeOperation=blend;ctx.translate(Math.round(x),Math.round(y));if(rot)ctx.rotate(rot);ctx.scale(flip?-scale:scale,flipY?-scale:scale);
 ctx.drawImage(i,index*CELL,0,CELL,i.naturalHeight,-CELL/2,-i.naturalHeight/2,CELL,i.naturalHeight);ctx.restore();return true;
}
