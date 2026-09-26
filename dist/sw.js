const CACHE='zijlijn-v1.7.2';
const ASSETS=['./','./index.html','./styles.css','./app.js','./model.js','./coaching.js','./training.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(path=>new Request(path,{cache:'reload'})))));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zijlijn-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data?.type==='ACTIVATE_UPDATE')e.waitUntil(self.skipWaiting());});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname===new URL('./release.json',self.location.href).pathname)return;
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(cached=>cached||fetch(e.request)));
});
