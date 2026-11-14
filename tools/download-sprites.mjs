/** Downloads authentic Pokémon Crystal front/back sprites from the public
 * PokéAPI sprite archive. Once fetched, no connection is needed to play.
 * Art copyright belongs to the franchise's rightsholders. Fan use only.
 * Run: node tools/download-sprites.mjs [--verify] [--force]
 */
import {SPECIES} from '../src/data.js';
import {dexNumber,remoteSprite} from '../src/sprites.js';
import {mkdir,readFile,writeFile,rename,unlink,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const basedir=join(root,'assets','sprites','crystal');
const args=new Set(process.argv.slice(2)),verify=args.has('--verify'),force=args.has('--force');
const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
const files=[...new Set(SPECIES.map(dexNumber))].flatMap(id=>[
 {id,back:false,file:join(basedir,'front',`${id}.png`),url:remoteSprite(idAsMon(id),false)},
 {id,back:true,file:join(basedir,'back',`${id}.png`),url:remoteSprite(idAsMon(id),true)}
]);
function idAsMon(id){const sp=SPECIES.find(s=>dexNumber(s)===id);return sp;}
function pngOK(buf){return buf?.length>30&&buf.subarray(0,8).equals(PNG)&&buf.readUInt32BE(16)>0&&buf.readUInt32BE(20)>0}
async function exists(file){try{return pngOK(await readFile(file))}catch{return false}}
async function fetchImage(asset){
 let lastError;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
   let response;try{response=await fetch(asset.url,{signal:controller.signal,headers:{'User-Agent':'DailySilver-LocalSpriteInstaller/1.1'}})}finally{clearTimeout(timer)}
   if(!response.ok)throw Error(`HTTP ${response.status}`);
   const data=Buffer.from(await response.arrayBuffer());
   if(!pngOK(data))throw Error('Not a valid PNG file');
   await mkdir(join(basedir,asset.back?'back':'front'),{recursive:true});
   const tmp=asset.file+'.part';await writeFile(tmp,data);await rename(tmp,asset.file);
   return true;
  }catch(e){lastError=e;await new Promise(r=>setTimeout(r,attempt*550))}
 }
 throw new Error(`${asset.id} ${asset.back?'back':'front'}: ${lastError?.message??'download failed'}`);
}
const existing=(await Promise.all(files.map(x=>exists(x.file))));
const missing=files.filter((f,i)=>force||!existing[i]);
console.log(`Crystal sprite pack: ${files.length-missing.length}/${files.length} already available`);
if(verify){if(missing.length){console.error(`${missing.length} sprites missing. Run: node tools/download-sprites.mjs`);process.exitCode=1}else console.log('Verified: all Crystal sprites available for fully offline play.');}
else if(!missing.length){console.log('All sprites installed; no internet needed.');}
else {
 console.log(`Downloading ${missing.length} original front/back Pokémon sprites. One-time internet connection required...`);
 let next=0,done=0,failed=[];
 await Promise.all(Array.from({length:Math.min(8,missing.length)},async()=>{
  while(true){let i=next++;if(i>=missing.length)break;const file=missing[i];try{await fetchImage(file)}catch(e){failed.push(e.message)}
   done++;if(done%25===0||done===missing.length)console.log(`  ${done}/${missing.length} processed (${failed.length} failed)`);
  }
 }));
 if(failed.length){console.error(`Could not download ${failed.length} sprites. Internet access to raw.githubusercontent.com is required.`);console.error(failed.slice(0,12).join('\n'));process.exitCode=1;}
 else console.log('Sprite library ready — all Pokémon artwork is stored locally. You can play fully offline.');
}
