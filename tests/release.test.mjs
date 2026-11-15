import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {buildManifest} from '../tools/manifest.mjs';
import {MANIFEST} from '../src/pres/assets.js';

test('core-manifest.json lists every shipped module and art file (run npm run manifest after changes)',async()=>{
 const onDisk=JSON.parse(readFileSync(new URL('../core-manifest.json',import.meta.url),'utf8')),fresh=await buildManifest();
 assert.deepEqual(onDisk.files,fresh.files);assert.equal(onDisk.version,fresh.version,'cache version must change with content');
 for(const needed of ['./src/app.js','./src/pres/stage.js','./src/pres/fx.js','./src/pres/cinema.js','./src/ui.css','./src/recorder.js','./src/lab.js','./assets/art/summit/sky.png','./assets/art/fx/fire.png'])assert.ok(fresh.files.includes(needed),needed);
});
test('every art asset the renderer references exists',()=>{
 for(const [name,file] of Object.entries(MANIFEST))assert.ok(existsSync(new URL('../assets/art/'+file,import.meta.url)),name+' -> '+file);
});
test('service worker versions its cache from the manifest and Vercel keeps serving dist',()=>{
 const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
 assert.match(sw,/core-manifest\.json/);assert.match(sw,/manifest\.version/);
 assert.equal(JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')).outputDirectory,'dist');
});
