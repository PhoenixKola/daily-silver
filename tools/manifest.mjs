// Generates core-manifest.json: every shipped file except the Crystal sprites (precache.json covers those)
// plus a content hash used as the offline cache version, so returning users always receive a new release.
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
async function walk(dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const full=join(dir,entry.name);
  if(entry.isDirectory())out.push(...await walk(full));else out.push(full);
 }
 return out;
}
export async function buildManifest(){
 const files=['index.html','manifest.webmanifest',...(await walk(join(root,'src'))).map(f=>relative(root,f)),...(await walk(join(root,'assets/art'))).map(f=>relative(root,f)),'assets/favicon.svg']
  .map(f=>f.split(sep).join('/')).sort();
 const hash=createHash('sha1');
 const text=/\.(js|mjs|css|html|json|webmanifest|svg)$/;
 for(const f of files){
  hash.update(f);
  const data=await readFile(join(root,f));
  // Hash text with LF endings so the version is identical on Windows and Linux checkouts.
  hash.update(text.test(f)?Buffer.from(data.toString('utf8').replace(/\r\n/g,'\n')):data);
 }
 return {version:hash.digest('hex').slice(0,10),files:files.map(f=>'./'+f)};
}
export async function writeManifest(){const m=await buildManifest();await writeFile(join(root,'core-manifest.json'),JSON.stringify(m,null,1)+'\n');return m}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){const m=await writeManifest();console.log('core-manifest.json',m.version,m.files.length+' files')}
