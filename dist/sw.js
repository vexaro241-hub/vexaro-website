/* VEXARO legacy worker cleanup.
   The site no longer relies on a service worker for page loading.
   This worker only removes old caches and unregisters itself. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try{
    const keys=await caches.keys();
    await Promise.all(keys.map(k=>caches.delete(k)));
  }catch(e){}
  await self.registration.unregister();
  const clients=await self.clients.matchAll({type:'window'});
  for(const client of clients){try{await client.navigate(client.url)}catch(e){}}
})()));
self.addEventListener('fetch',event=>event.respondWith(fetch(event.request)));