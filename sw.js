// VEXARO service worker disabled: the site now uses normal network loading.
// This file remains only so devices with an older installed worker can remove it.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.map(k=>caches.delete(k)));
  await self.registration.unregister();
  const clients=await self.clients.matchAll({type:'window'});
  for(const client of clients) client.navigate(client.url);
})()));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request)));