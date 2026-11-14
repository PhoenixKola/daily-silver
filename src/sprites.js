/** National Dex references for the curated Generation I & II party roster.
 * Images are NOT bundled with source; see tools/download-sprites.mjs.
 * Pokémon and Pokémon Crystal sprites are the property of their respective owners.
 */
const ROWS = `
Pikachu:25 Raichu:26 Venusaur:3 Charizard:6 Blastoise:9 Butterfree:12 Beedrill:15 Pidgeot:18 Fearow:22 Arbok:24 Sandslash:28 Nidoqueen:31 Nidoking:34 Clefable:36 Ninetales:38 Wigglytuff:40 Golbat:42 Vileplume:45 Parasect:47 Venomoth:49 Dugtrio:51 Persian:53 Golduck:55 Primeape:57 Arcanine:59 Poliwrath:62 Alakazam:65 Machamp:68 Victreebel:71 Tentacruel:73 Golem:76 Rapidash:78 Slowbro:80 Magneton:82 Dodrio:85 Dewgong:87 Muk:89 Cloyster:91 Gengar:94 Onix:95 Hypno:97 Kingler:99 Electrode:101 Exeggutor:103 Marowak:105 Hitmonlee:106 Hitmonchan:107 Weezing:110 Rhydon:112 Chansey:113 Kangaskhan:115 Starmie:121 Scyther:123 Jynx:124 Electabuzz:125 Magmar:126 Pinsir:127 Tauros:128 Gyarados:130 Lapras:131 Ditto:132 Vaporeon:134 Jolteon:135 Flareon:136 Omastar:139 Kabutops:141 Aerodactyl:142 Snorlax:143 Articuno:144 Zapdos:145 Moltres:146 Dragonite:149 Mewtwo:150 Mew:151
Meganium:154 Typhlosion:157 Feraligatr:160 Furret:162 Noctowl:164 Ledian:166 Ariados:168 Crobat:169 Lanturn:171 Togetic:176 Xatu:178 Ampharos:181 Bellossom:182 Azumarill:184 Sudowoodo:185 Politoed:186 Jumpluff:189 Sunflora:192 Quagsire:195 Espeon:196 Umbreon:197 Murkrow:198 Slowking:199 Misdreavus:200 Unown:201 Wobbuffet:202 Girafarig:203 Forretress:205 Dunsparce:206 Gligar:207 Steelix:208 Granbull:210 Qwilfish:211 Scizor:212 Shuckle:213 Heracross:214 Sneasel:215 Ursaring:217 Magcargo:219 Piloswine:221 Corsola:222 Octillery:224 Delibird:225 Mantine:226 Skarmory:227 Houndoom:229 Kingdra:230 Donphan:232 Porygon2:233 Stantler:234 Smeargle:235 Hitmontop:237 Miltank:241 Blissey:242 Raikou:243 Entei:244 Suicune:245 Tyranitar:248 Lugia:249 Ho-Oh:250 Celebi:251
`;
export const DEX = Object.freeze(Object.fromEntries(ROWS.trim().split(/\s+/).map(pair => {
  const pivot = pair.lastIndexOf(':'); return [pair.slice(0,pivot).toLowerCase().replace(/[^a-z0-9]/g,''), Number(pair.slice(pivot+1))];
})));
export function dexNumber(mon) {
  if(mon&&typeof mon==='object'&&Number.isInteger(mon.dex)&&mon.dex>=1&&mon.dex<=251)return mon.dex;
  const key=String(typeof mon==='string'?mon:mon?.id??mon?.name??'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const id=DEX[key]; if(!id) throw new Error('No national Pokédex ID for '+key); return id;
}
export const CRYSTAL_BASE='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ii/crystal/';
export function spriteFilename(mon,back=false) {return `${back?'back/':'front/'}${dexNumber(mon)}.png`}
export function localSprite(mon,back=false) {return `./assets/sprites/crystal/${spriteFilename(mon,back)}`}
export function remoteSprite(mon,back=false) {return CRYSTAL_BASE+(back?'back/':'')+dexNumber(mon)+'.png'}
/** Make only near-white pixels connected to the image border transparent.
 * Flood filling the border (instead of deleting ALL whites) keeps white eyes,
 * fur and highlights inside the actual Pokémon artwork.
 * This is also safe for PNGs which already contain transparency.
 */
export function clearWhiteBackdrop(pixels, width, height, cutoff=244) {
  const seen=new Uint8Array(width*height);
  const pending=[];
  const whiteOrTransparent=(index)=>{
    const o=index*4;
    return pixels[o+3]===0 || (pixels[o]>=cutoff && pixels[o+1]>=cutoff && pixels[o+2]>=cutoff);
  };
  const enqueue=index=>{ if(!seen[index] && whiteOrTransparent(index)){seen[index]=1;pending.push(index);} };
  if(width<=0||height<=0)return pixels;
  for(let x=0;x<width;x++){enqueue(x);enqueue((height-1)*width+x);}
  for(let y=0;y<height;y++){enqueue(y*width);enqueue(y*width+width-1);}
  while(pending.length){
    const index=pending.pop();
    const x=index%width,y=(index-x)/width;
    // Existing alpha is untouched for opaque, nonwhite Pokémon pixels.
    if(pixels[index*4+3]!==0)pixels[index*4+3]=0;
    if(x>0)enqueue(index-1);
    if(x+1<width)enqueue(index+1);
    if(y>0)enqueue(index-width);
    if(y+1<height)enqueue(index+width);
  }
  return pixels;
}
function cleanSprite(image){
  const canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;
  canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('2D canvas unavailable');
  ctx.drawImage(image,0,0);
  const im=ctx.getImageData(0,0,canvas.width,canvas.height);
  clearWhiteBackdrop(im.data,im.width,im.height);
  ctx.putImageData(im,0,0);
  return canvas;
}
const cleanedMarkupSprites=new Map();
// A resilient image loader: local, downloadable files always take priority.
// Browser-only remote fallback is a convenience for sites which haven't pre-fetched sprites.
const loaded=new Map();
export function getSpriteImage(mon,back=false){
  const key=`${dexNumber(mon)}:${back?'back':'front'}`;
  if(loaded.has(key)) return loaded.get(key);
  const image=new Image(); const state={image,renderSource:null,loaded:false,failed:false,source:'local'};
  image.decoding='async';
  image.crossOrigin='anonymous';
  image.onload=()=>{
    try{state.renderSource=cleanSprite(image)}
    catch(error){console.warn('Could not process Pokémon sprite background:',error);state.renderSource=image}
    state.loaded=true;state.failed=false;
  };
  image.onerror=()=>{
    if(state.source==='local') {state.source='remote'; image.src=remoteSprite(mon,back)}
    else {state.failed=true;state.loaded=false;}
  };
  image.src=localSprite(mon,back);
  loaded.set(key,state);return state;
}
export function spriteHTML(mon,back=false,extraClass='') {
  const n=dexNumber(mon),name=(mon?.name??String(mon)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<img class="species-sprite ${extraClass}" crossorigin="anonymous" src="./assets/sprites/crystal/${back?'back/':'front/'}${n}.png" data-fallback="${CRYSTAL_BASE}${back?'back/':''}${n}.png" alt="${name}" loading="lazy" decoding="async" />`;
}
// One remote retry for markup (for static previews and deployed sites without local sprites).
export function installSpriteImageFallback() {
  // Party + results screens use <img> rather than the battle canvas.
  // Convert the same images once to transparent PNGs and cache the result.
  document.addEventListener('load',event=>{
    const el=event.target;
    if(!(el instanceof HTMLImageElement)||!el.classList.contains('species-sprite')||el.dataset.cleaned==='1')return;
    try{
      const original=el.currentSrc||el.src;
      if(!cleanedMarkupSprites.has(original))cleanedMarkupSprites.set(original,cleanSprite(el).toDataURL('image/png'));
      el.dataset.cleaned='1'; // prevent an infinite load event loop
      el.src=cleanedMarkupSprites.get(original);
    }catch(error){console.warn('Could not remove Pokémon sprite backdrop:',error);}
  },true);
  document.addEventListener('error',event=>{
    const el=event.target;
    if(!(el instanceof HTMLImageElement) || !el.classList.contains('species-sprite'))return;
    if(el.dataset.fallback && !el.dataset.remoteTried){el.dataset.remoteTried='1';el.src=el.dataset.fallback;}
    else{el.classList.add('sprite-unavailable');el.alt+=' (sprite unavailable: download artwork first)';}
  },true);
}
