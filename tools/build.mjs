import {mkdir,writeFile,cp,rm,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SPECIES} from '../src/data.js';
import {dexNumber} from '../src/sprites.js';
const root=resolve(fileURLToPath(new URL('../',import.meta.url))),out=join(root,'dist');
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
let absent=[];
for(const s of SPECIES)for(const side of ['front','back']){
 const filename=`assets/sprites/crystal/${side}/${dexNumber(s)}.png`;
 try{const buf=await readFile(join(root,filename));if(buf.length<30||!buf.subarray(0,8).equals(pngSignature))throw Error('Invalid PNG')}
 catch{absent.push(filename)}
}
if(absent.length){
 console.error(`Refusing to build incomplete deployment: ${absent.length}/${SPECIES.length*2} Crystal sprite files are missing.`);
 console.error('Run node tools/download-sprites.mjs with internet access first.');
 process.exit(1);
}
const precache=SPECIES.flatMap(s=>['front','back'].map(side=>`./assets/sprites/crystal/${side}/${dexNumber(s)}.png`));
await writeFile(join(root,'assets/sprites/crystal/precache.json'),JSON.stringify(precache));
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','manifest.webmanifest','service-worker.js'])await cp(join(root,name),join(out,name));
for(const name of ['src','assets'])await cp(join(root,name),join(out,name),{recursive:true});
await writeFile(join(out,'README.txt'),'DAILY SILVER - Crystal Sprite Edition\nContains locally installed Crystal sprites for the supported species roster.\nUpload the contents of this directory to any static website host.\nNo database or backend required. Pokemon art remains third-party copyright.\n');
console.log('Successfully built sprite-inclusive static release:',out);
