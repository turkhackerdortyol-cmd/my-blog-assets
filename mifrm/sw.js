/*
  Minimal Service Worker
  Amaç: Chrome'un "kurulabilir PWA" kriterini karşılamak (kayıtlı SW + fetch
  handler). Basit bir network-first davranışı uygular; agresif offline
  cache YAPMAZ, böylece forumun canlı içeriği (yeni konular, yorumlar)
  bayatlamış halde gösterilmez.
*/
const CACHE_NAME = 'vb-pwa-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı GET yanıtlarını hafif bir "son bilinen sayfa" cache'i
        // olarak sakla (yalnızca çevrimdışı yedek amaçlı).
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
