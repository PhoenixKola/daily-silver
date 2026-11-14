/**
 * Optional one-time expansion: fetch 116 missing Gen I+II species from PokéAPI,
 * including actual base stats, typing, and four Crystal-era learnable moves
 * selected from the battle engine's supported subset. Generates an OFFLINE ES
 * module: src/extra-species.js. Does not call an API during gameplay.
 * Run: node tools/expand-roster.mjs && node tools/download-sprites.mjs
 * Copyright: name/data are third-party game intellectual property. Noncommercial fan use.
 */
import {SPECIES,MOVES} from '../src/data.js';
import {dexNumber} from '../src/sprites.js';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const file=fileURLToPath(new URL('../src/extra-species.js',import.meta.url));
const existing=new Set(SPECIES.map(dexNumber));
const missing=Array.from({length:251},(_,i)=>i+1).filter(i=>!existing.has(i));
if(missing.length===0){console.log('All 251 species already present.');process.exit(0)}
const bySlug=new Map(Object.values(MOVES).map(m=>[m.name.toLowerCase().replace(/[^a-z0-9]/g,''),m]));
const fixedScores=new Map([['Tackle',1],['Return',95],['Rest',45],['Quick Attack',68],['Protect',13],['Toxic',22],['Earthquake',105],['Surf',99],['Ice Beam',94],['Thunderbolt',95],['Flamethrower',95]]);
async function pokemon(id){let err;for(let i=0;i<4;i++)try{
 const c=new AbortController(),t=setTimeout(()=>c.abort(),19000);
 let r;try{r=await fetch('https://pokeapi.co/api/v2/pokemon/'+id,{signal:c.signal})}finally{clearTimeout(t)}
 if(!r.ok)throw Error('HTTP '+r.status);const p=await r.json();
 const name=p.name.replace(/\b[a-z]/g,m=>m.toUpperCase()).replace('Nidoran-F','Nidoran♀').replace('Nidoran-M','Nidoran♂').replace('Mr-Mime','Mr. Mime');
 const stats=new Map(p.stats.map(o=>[o.stat.name,o.base_stat]));
 const base={hp:stats.get('hp'),atk:stats.get('attack'),def:stats.get('defense'),spa:stats.get('special-attack'),spd:stats.get('special-defense'),spe:stats.get('speed')};
 if(Object.values(base).some(x=>!Number.isInteger(x)||x<=0))throw Error('Bad stats');
 const types=p.types.sort((a,b)=>a.slot-b.slot).map(x=>x.type.name.replace(/^./,m=>m.toUpperCase()));
 const choices=p.moves.flatMap(({move,version_group_details})=>{
  if(!version_group_details.some(d=>['crystal','gold-silver'].includes(d.version_group.name)))return [];
  const m=bySlug.get(move.name.replace(/[^a-z0-9]/g,''));return m?[m]:[];
 });
 const unique=[...new Map(choices.map(m=>[m.name,m])).values()];
 const ranked=unique.sort((a,b)=>((types.includes(b.type)?30:0)+(b.power||0)+(fixedScores.get(b.name)||0)) -((types.includes(a.type)?30:0)+(a.power||0)+(fixedScores.get(a.name)||0)));
 const selected=[];
 // Move diversity: primary STAB, coverage, utility and fourth slot
 for(const preferred of [ranked.find(m=>types.includes(m.type)&&m.power),ranked.find(m=>m.power&&!types.includes(m.type)),ranked.find(m=>!m.power),...ranked]){
  if(preferred&&!selected.includes(preferred.name))selected.push(preferred.name);if(selected.length===4)break;
 }
 for(const fallback of ['Return','Tackle','Rest','Protect'])if(selected.length<4&&!selected.includes(fallback))selected.push(fallback);
 return {dex:id,id:p.name.toLowerCase().replace(/[^a-z0-9]/g,''),name,types,base,moves:selected,item:'Leftovers'};
 }catch(e){err=e;await new Promise(r=>setTimeout(r,(i+1)*650))}throw Error(id+': '+err?.message)}
let next=0,finished=0;const newPokemon=[],errors=[];
console.log(`Fetching ${missing.length} missing species. A one-time internet connection to pokeapi.co is required.`);
await Promise.all(Array.from({length:Math.min(6,missing.length)},async()=>{while(next<missing.length){const id=missing[next++];try{newPokemon.push(await pokemon(id))}catch(e){errors.push(e.message)}finally{finished++;if(finished%20===0||finished===missing.length)console.log(`${finished}/${missing.length} species processed`)}}}));
if(errors.length){console.error(errors.join('\n'));console.error('No data file was replaced. Retry when online.');process.exit(1)}
newPokemon.sort((a,b)=>a.dex-b.dex);
await writeFile(file,'// Generated from PokéAPI once; no network required during play.\nexport const EXTRA_SPECIES='+JSON.stringify(newPokemon,null,2)+';\n');
console.log(`Saved ${SPECIES.length+newPokemon.length} playable species to local modules. Run node tools/download-sprites.mjs to download their art.`);
