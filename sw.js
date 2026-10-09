/* VEXARO service-worker cleanup.
   The site does not rely on a service worker for page loading.
   Retire this worker without deleting site caches or navigating open app windows. */
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      await self.registration.unregister();
    } catch (_) {}
  })());
});
