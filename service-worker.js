// The complete release is cached at install, including all curated sprites.
const CACHE='daily-silver-6-recap-jump-v1';
const PREFIX='daily-silver-';
const CORE=['./','./index.html','./src/app.js','./src/backup.js','./src/engine.js','./src/data.js','./src/entrances.js','./src/matchups.js','./src/replay.js','./src/extra-species.js','./src/sound.js','./src/scene.js','./src/sprites.js','./src/style.css','./src/cockpit.css','./assets/art/summit-night.png','./assets/art/summit-rival.png','./assets/art/daily-silver-mark-96.png','./assets/art/daily-silver-mark-192.png','./assets/art/daily-silver-mark-512.png','./assets/sprites/crystal/precache.json','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const list=await (await fetch('./assets/sprites/crystal/precache.json')).json();
 await cache.addAll(CORE);
 for(let i=0;i<list.length;i+=40)await cache.addAll(list.slice(i,i+40));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(e.request);
  if(cached&&new URL(e.request.url).pathname.includes('/assets/'))return cached;
  try{
   const response=await fetch(e.request);
   if(response.ok&&response.type==='basic')await cache.put(e.request,response.clone());
   if(response.ok)return response;
   return cached||response;
  }catch{
   return cached||(e.request.mode==='navigate'?await cache.match('./index.html'):null)||Response.error();
  }
 })());
});
