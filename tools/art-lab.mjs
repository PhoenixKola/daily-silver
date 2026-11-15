// Art preparation for generated source images. Runs the pixel work in headless Chromium
// (no extra dependencies). Usage:
//   node tools/art-lab.mjs layer <in.png> <out.png> [--key magenta|black|none] [--crop y0,h] [--pad 8] [--down 2]
//   node tools/art-lab.mjs sheet <in.png> <outDir> <name> [--key black|magenta] [--cell 128] [--min 400] [--cols N]
// "layer": median-downscale by an exact integer (keeps hard pixel edges), key the background to alpha,
// crop rows (in the downscaled space), pad left/right by edge replication.
// "sheet": find separate shapes by connected components, normalise them into equal cells (stable pivot
// at the cell centre) and emit one horizontal strip plus a JSON description.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,basename} from 'node:path';
import {launchBrowser} from './browser.mjs';

const args=process.argv.slice(2);
const mode=args[0];
const flag=(name,fallback)=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:fallback};

async function withPage(fn){
 const browser=await launchBrowser();
 try{const page=await browser.newPage();await page.setContent('<canvas id=c></canvas>');return await fn(page)}finally{await browser.close()}
}

const helpers=`
 window.loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
 window.medianDown=(img,k)=>{
  const w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
  const src=g.getImageData(0,0,w,h).data,ow=Math.floor(w/k),oh=Math.floor(h/k),out=new Uint8ClampedArray(ow*oh*4),r=[],gg=[],b=[];
  for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){
   r.length=0;gg.length=0;b.length=0;
   for(let j=0;j<k;j++)for(let i=0;i<k;i++){const p=((y*k+j)*w+x*k+i)*4;r.push(src[p]);gg.push(src[p+1]);b.push(src[p+2])}
   r.sort((a,c)=>a-c);gg.sort((a,c)=>a-c);b.sort((a,c)=>a-c);const m=r.length>>1,o=(y*ow+x)*4;
   out[o]=r[m];out[o+1]=gg[m];out[o+2]=b[m];out[o+3]=255;
  }
  return {data:out,w:ow,h:oh};
 };
 window.toPng=(data,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(new ImageData(data,w,h),0,0);return c.toDataURL('image/png')};
`;

async function layer(input,output){
 const key=flag('key','none'),down=Number(flag('down',2)),pad=Number(flag('pad',8)),trim=args.includes('--trim');
 const [y0,hh]=(flag('crop','0,0')).split(',').map(Number);
 const b64=(await readFile(input)).toString('base64');
 const dataUrl=await withPage(async page=>{
  await page.evaluate(helpers);
  return page.evaluate(async({b64,key,down,pad,y0,hh,trim})=>{
   const img=await loadImg('data:image/png;base64,'+b64);
   let {data,w,h}=medianDown(img,down);
   const q=v=>Math.min(255,Math.round(v/4)*4);
   for(let i=0;i<w*h;i++){
    const o=i*4,r=data[o],g=data[o+1],b=data[o+2];
    if(key==='magenta'){ if(r>170&&b>170&&g<110&&Math.abs(r-b)<90){data[o+3]=0;continue} }
    if(key==='black'){ const m=Math.max(r,g,b); if(m<14){data[o+3]=0;continue} data[o]=q(r*255/m);data[o+1]=q(g*255/m);data[o+2]=q(b*255/m);data[o+3]=m<60?Math.round(m*4.2):255; continue }
    data[o]=q(r);data[o+1]=q(g);data[o+2]=q(b);
   }
   // despill: opaque pixels touching transparency that still lean magenta are made transparent or pulled toward neighbours
   if(key==='magenta'){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const o=(y*w+x)*4;if(data[o+3]===0)continue;if(data[o]>data[o+1]+55&&data[o+2]>data[o+1]+55)data[o+3]=0}
   }
   if(trim){let x0=w,x1=0,y1=0,yy0=h;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>0){if(x<x0)x0=x;if(x>x1)x1=x;if(y<yy0)yy0=y;if(y>y1)y1=y}const tw=x1-x0+1,th=y1-yy0+1,t=new Uint8ClampedArray(tw*th*4);for(let y=0;y<th;y++)for(let x=0;x<tw;x++)for(let c=0;c<4;c++)t[(y*tw+x)*4+c]=data[((yy0+y)*w+x0+x)*4+c];data=t;w=tw;h=th}
   const cy=hh?y0:0,ch=hh||h,ow=w+pad*2,out=new Uint8ClampedArray(ow*ch*4);
   for(let y=0;y<ch;y++)for(let x=0;x<ow;x++){const sx=Math.max(0,Math.min(w-1,x-pad)),sy=Math.min(h-1,cy+y);for(let c=0;c<4;c++)out[(y*ow+x)*4+c]=data[(sy*w+sx)*4+c]}
   return {url:toPng(out,ow,ch),w:ow,h:ch};
  },{b64,key,down,pad,y0,hh,trim});
 });
 await writeFile(output,Buffer.from(dataUrl.url.split(',')[1],'base64'));
 console.log('layer',basename(output),dataUrl.w+'x'+dataUrl.h);
}

async function sheet(input,outDir,name){
 const key=flag('key','black'),cell=Number(flag('cell',128)),minArea=Number(flag('min',400)),down=Number(flag('down',2));
 const b64=(await readFile(input)).toString('base64');
 const res=await withPage(async page=>{
  await page.evaluate(helpers);
  return page.evaluate(async({b64,key,cell,minArea,down})=>{
   const img=await loadImg('data:image/png;base64,'+b64);
   let {data,w,h}=medianDown(img,down);
   const alpha=new Uint8Array(w*h);
   for(let i=0;i<w*h;i++){
    const o=i*4,r=data[o],g=data[o+1],b=data[o+2];
    if(key==='magenta'){const bg=r>170&&b>170&&g<110&&Math.abs(r-b)<90;alpha[i]=bg?0:255}
    else{const m=Math.max(r,g,b);alpha[i]=m<28?0:m<70?Math.round((m-28)*6):255;if(alpha[i]&&key==='black'){const s=255/Math.max(1,m);data[o]=Math.min(255,r*s);data[o+1]=Math.min(255,g*s);data[o+2]=Math.min(255,b*s)}}
    data[o+3]=alpha[i];
   }
   // connected components (8-neighbour) on alpha>0, then merge boxes closer than gap
   const label=new Int32Array(w*h).fill(-1),boxes=[];let n=0;const stack=[];
   for(let s=0;s<w*h;s++){
    if(!alpha[s]||label[s]>=0)continue;
    let minx=w,miny=h,maxx=0,maxy=0,area=0;stack.push(s);label[s]=n;
    while(stack.length){const p=stack.pop(),x=p%w,y=(p/w)|0;area++;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const q=ny*w+nx;if(alpha[q]&&label[q]<0){label[q]=n;stack.push(q)}}}
    boxes.push({minx,miny,maxx,maxy,area});n++;
   }
   let shapes=boxes.filter(b=>b.area>=minArea);
   const gap=10;let merged=true;
   while(merged){merged=false;outer:for(let i=0;i<shapes.length;i++)for(let j=i+1;j<shapes.length;j++){const a=shapes[i],b=shapes[j];
    if(a.minx-gap<=b.maxx&&b.minx-gap<=a.maxx&&a.miny-gap<=b.maxy&&b.miny-gap<=a.maxy){a.minx=Math.min(a.minx,b.minx);a.miny=Math.min(a.miny,b.miny);a.maxx=Math.max(a.maxx,b.maxx);a.maxy=Math.max(a.maxy,b.maxy);a.area+=b.area;shapes.splice(j,1);merged=true;break outer}}}
   shapes.sort((a,b)=>(Math.round(a.miny/(h/3))-Math.round(b.miny/(h/3)))||a.minx-b.minx);
   // fit all shapes into one uniform cell (scale down only, integer-ish via nearest)
   const maxW=Math.max(...shapes.map(s=>s.maxx-s.minx+1)),maxH=Math.max(...shapes.map(s=>s.maxy-s.miny+1));
   const scale=Math.min(1,(cell-4)/maxW,(cell-4)/maxH);
   const strip=document.createElement('canvas');strip.width=cell*shapes.length;strip.height=cell;const sg=strip.getContext('2d');sg.imageSmoothingEnabled=false;
   const full=document.createElement('canvas');full.width=w;full.height=h;full.getContext('2d').putImageData(new ImageData(data,w,h),0,0);
   shapes.forEach((s,i)=>{const sw=s.maxx-s.minx+1,sh=s.maxy-s.miny+1,dw=Math.round(sw*scale),dh=Math.round(sh*scale);
    sg.drawImage(full,s.minx,s.miny,sw,sh,i*cell+Math.round((cell-dw)/2),Math.round((cell-dh)/2),dw,dh)});
   return {url:strip.toDataURL('image/png'),frames:shapes.length,cell,scale,sizes:shapes.map(s=>[s.maxx-s.minx+1,s.maxy-s.miny+1])};
  },{b64,key,cell,minArea,down});
 });
 await mkdir(outDir,{recursive:true});
 await writeFile(join(outDir,name+'.png'),Buffer.from(res.url.split(',')[1],'base64'));
 console.log('sheet',name,res.frames+' frames',res.cell+'px cells','scale '+res.scale.toFixed(2),JSON.stringify(res.sizes));
}

if(mode==='layer')await layer(args[1],args[2]);
else if(mode==='sheet')await sheet(args[1],args[2],args[3]);
else{console.error('usage: art-lab.mjs layer|sheet ...');process.exit(1)}
