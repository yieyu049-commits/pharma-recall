const CACHE='pharma-recall-assets-v3-20261024';
const SHELL=['./','index.html','style.css','app.mjs','scheduler.mjs','cards.json','pharmacognosy.json','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest'];
const assetUrl=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const path of SHELL){try{const url=assetUrl(path),response=await fetch(url,{credentials:'same-origin',cache:'reload'});if(response.ok&&!response.redirected)await cache.put(url,response)}catch{}}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const legacy=(await caches.keys()).filter(name=>name==='pharma-recall-assets-v1'||name.startsWith('pharma-recall-assets-v2'));
 for(const name of legacy){try{const old=await caches.open(name);for(const request of await old.keys()){const url=new URL(request.url);if(url.href.startsWith(self.registration.scope)&&url.pathname.includes('/images/')&&!await cache.match(request)){const response=await old.match(request);if(response)await cache.put(request,response)}}await caches.delete(name)}catch{/* Keep the old image cache if migration could not finish. */}}
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==location.origin||!url.href.startsWith(self.registration.scope)||/signin|signout|callback/.test(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(event.request);
  if(url.pathname.includes('/images/')&&cached)return cached;
  try{const response=await fetch(event.request);if(response.ok&&!response.redirected){await cache.put(event.request,response.clone());return response}if(cached)return cached;return response}
  catch(error){if(cached)return cached;if(event.request.mode==='navigate'){const shell=await cache.match(assetUrl('index.html'))||await cache.match(assetUrl('./'));if(shell)return shell}throw error}
 })());
});
