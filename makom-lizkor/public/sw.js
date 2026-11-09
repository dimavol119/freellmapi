// Makom Lizkor service worker: lets the site open as an installed app and load quickly.
// Privacy rule: account data is NEVER cached. Anything under /api/ goes straight to the network.
const VERSION='makom-shell-v2';
const STATIC=['/manifest.webmanifest','/icon-192.png','/icon-512.png','/apple-touch-icon.png'];
// Stores the start page together with exactly the scripts it references (from the same response), so an
// offline start never pairs a page with a missing or different script. Scripts of older releases are dropped.
async function storeShell(response){
  const cache=await caches.open(VERSION),html=await response.clone().text();
  const scripts=[...new Set(html.match(/\/_expo\/static\/[^"'\s>]+/g)||[])];
  await cache.addAll(scripts);await cache.put('/',response);
  for(const request of await cache.keys()){const path=new URL(request.url).pathname;if(path.startsWith('/_expo/static/')&&!scripts.includes(path))await cache.delete(request)}
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(STATIC)).then(()=>fetch('/',{cache:'no-store'})).then(r=>r.ok?storeShell(r):undefined).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  // Pages: always try the network first so a new release is used at once; the stored start page is only an offline fallback.
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{if(response.ok&&(url.pathname==='/'||url.pathname==='/index.html'))event.waitUntil(storeShell(response.clone()).catch(()=>{}));return response}).catch(()=>caches.match('/').then(r=>r||Response.error())));
    return;
  }
  // Built scripts have a content hash in their name and never change: cache first.
  if(url.pathname.startsWith('/_expo/static/')){
    event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
    return;
  }
  // Icons and the manifest: use the cache, refresh it in the background.
  if(STATIC.includes(url.pathname)){
    event.respondWith(caches.match(request).then(hit=>{const network=fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(VERSION).then(c=>c.put(request,copy)))}return response});return hit||network}));
  }
});
