// Offline cache. The version comes from core-manifest.json (a content hash generated at build time),
// so every new release installs a fresh cache and old ones are removed on activation.
const PREFIX='daily-silver-';
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const manifest=await (await fetch('./core-manifest.json',{cache:'no-store'})).json();
 const sprites=await (await fetch('./assets/sprites/crystal/precache.json',{cache:'no-store'})).json();
 const cache=await caches.open(PREFIX+manifest.version);
 await cache.addAll(['./',...manifest.files,'./core-manifest.json','./assets/sprites/crystal/precache.json']);
 for(let i=0;i<sprites.length;i+=40)await cache.addAll(sprites.slice(i,i+40));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const manifest=await (await fetch('./core-manifest.json',{cache:'no-store'}).catch(()=>null))?.json?.().catch(()=>null);
 const keep=manifest?PREFIX+manifest.version:null;
 const keys=await caches.keys();
 // Only delete older caches when the current one exists, so an offline activation never empties the cache.
 if(keep&&keys.includes(keep))await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==keep).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith((async()=>{
  const cached=await caches.match(e.request);
  const path=new URL(e.request.url).pathname;
  if(cached&&path.includes('/assets/'))return cached;
  try{
   const response=await fetch(e.request);
   if(response.ok&&response.type==='basic'){const keys=(await caches.keys()).filter(k=>k.startsWith(PREFIX)).sort();const target=keys[keys.length-1];if(target)(await caches.open(target)).put(e.request,response.clone())}
   return response.ok?response:(cached||response);
  }catch{
   return cached||(e.request.mode==='navigate'?await caches.match('./index.html'):null)||Response.error();
  }
 })());
});
