/** Verify the installed sprite set and write a local visual review gallery.
 * Usage: node tools/audit-sprites.mjs
 * The gallery references local files; it does not copy or modify franchise art.
 */
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SPECIES} from '../src/data.js';
import {dexNumber} from '../src/sprites.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const png=Buffer.from([137,80,78,71,13,10,26,10]);
const rows=[];const errors=[];
for(const species of SPECIES){
  const id=dexNumber(species);
  const files=[];
  for(const side of ['front','back']){
    const rel=`assets/sprites/crystal/${side}/${id}.png`;
    try{
      const b=await readFile(join(root,rel));
      if(b.length<45||!b.subarray(0,8).equals(png)||b.toString('ascii',12,16)!=='IHDR'||b.readUInt32BE(16)===0||b.readUInt32BE(20)===0||b.toString('ascii',b.length-8,b.length-4)!=='IEND')throw Error('invalid or truncated PNG');
      files.push({rel,width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length});
    }catch(e){errors.push(`${rel}: ${e.message}`)}
  }
  if(files.length===2)rows.push({id,name:species.name,files});
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards=rows.map(({id,name,files})=>`<article><b>${escape(name)} #${id}</b><div>${files.map(f=>`<figure><img src="../${f.rel}" alt="${escape(name)} ${f.rel.includes('/back/')?'back':'front'}"><figcaption>${f.rel.includes('/back/')?'back':'front'} ${f.width}×${f.height}</figcaption></figure>`).join('')}</div></article>`).join('');
await mkdir(join(root,'reports'),{recursive:true});
await writeFile(join(root,'reports/sprite-gallery.html'),`<!doctype html><meta charset="utf-8"><title>Daily Silver sprite review</title><style>body{background:#202643;color:#f6eed7;font:14px system-ui}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}article{background:#394b68;padding:12px}article div{display:flex}figure{margin:8px;text-align:center}img{width:64px;height:64px;object-fit:contain;image-rendering:pixelated;background:repeating-conic-gradient(#fff 0 25%,#ccc 0 50%) 0/16px 16px}figcaption{font-size:11px}</style><h1>Installed Crystal sprite review</h1><p>${rows.length} complete species; ${errors.length} invalid or missing files. Local review only. Artwork is third-party copyright.</p><main>${cards}</main>`);
console.log(`${rows.length}/${SPECIES.length} complete species; ${errors.length} missing or invalid sprites. Gallery: reports/sprite-gallery.html`);
if(errors.length){console.error(errors.slice(0,20).join('\n'));process.exitCode=1;}
