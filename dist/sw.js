const CACHE='zijlijn-v1.8.1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./model.js','./coaching.js','./persistence.js','./training.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(path=>new Request(path,{cache:'reload'})))));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zijlijn-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data?.type==='ACTIVATE_UPDATE')e.waitUntil(self.skipWaiting());});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==self.location.origin||url.pathname===new URL('./release.json',self.location.href).pathname)return;
  // Campaign parameters on a shared start link don't select another app page.
  const appRoot=new URL('./',self.location.href).pathname;
  const appDocument=e.request.mode==='navigate'&&(url.pathname===appRoot||url.pathname===appRoot+'index.html');
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request,{ignoreSearch:appDocument})).then(cached=>cached||fetch(e.request)));
});
