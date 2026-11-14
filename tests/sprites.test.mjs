import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES} from '../src/data.js';
import {DEX,dexNumber,localSprite,remoteSprite,spriteFilename,spriteHTML} from '../src/sprites.js';

test('Every curated species maps to exactly one valid Gen 1 or Gen 2 National Dex ID',()=>{
 assert.equal(SPECIES.length,135);
 const ids=SPECIES.map(dexNumber);
 assert.equal(ids.length,new Set(ids).size);
 for(const id of ids) assert.ok(id>=1&&id<=251);
 assert.equal(Object.keys(DEX).length,135);
});
test('Crystal front/back URL positions resolve to recognizable canonical IDs',()=>{
 assert.equal(dexNumber('Pikachu'),25);
 assert.equal(dexNumber('Typhlosion'),157);
 assert.equal(dexNumber('Espeon'),196);
 assert.equal(dexNumber('Ho-Oh'),250);
 assert.equal(dexNumber('Porygon2'),233);
 assert.equal(spriteFilename('Pikachu'),'front/25.png');
 assert.equal(spriteFilename('Pikachu',true),'back/25.png');
 assert.equal(localSprite('Pikachu',true),'./assets/sprites/crystal/back/25.png');
 assert.match(remoteSprite('Typhlosion'),/crystal\/157\.png$/);
});
test('Sprite markup uses real image assets rather than arbitrary colored dots',()=>{
 const markup=spriteHTML({name:'Pikachu',id:'pikachu'});
 assert.match(markup,/<img/);
 assert.match(markup,/front\/25\.png/);
 assert.match(markup,/data-fallback=/);
 assert.doesNotMatch(markup,/color:|border-radius:50%/);
});

test('White backdrop can be removed without erasing enclosed white Pokémon details', async()=>{
 const {clearWhiteBackdrop}=await import('../src/sprites.js');
 // 5x5 opaque white image, with dark sprite ring enclosing a white eye.
 const n=5,pixels=new Uint8ClampedArray(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const off=(y*n+x)*4;
   const dark=(x>=1&&x<=3&&y>=1&&y<=3&&!(x===2&&y===2));
   pixels.set(dark?[21,32,43,255]:[255,255,255,255],off);
 }
 clearWhiteBackdrop(pixels,n,n);
 assert.equal(pixels[(0*n+0)*4+3],0,'White background disappears');
 assert.equal(pixels[(2*n+2)*4+3],255,'Enclosed white eye remains');
 assert.equal(pixels[(2*n+1)*4+3],255,'Pokémon outline remains');
});

test('Already transparent pixels remain transparent', async()=>{
 const {clearWhiteBackdrop}=await import('../src/sprites.js');
 const p=new Uint8ClampedArray([0,0,0,0, 11,22,33,255]);
 clearWhiteBackdrop(p,2,1);
 assert.equal(p[3],0);
 assert.equal(p[7],255);
});
