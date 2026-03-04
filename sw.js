// Sparkids - Service Worker v1.3.0
const CACHE_NAME = 'spk-cache-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const isHTML = request.destination === 'document' ||
                 /\.html(\?|$)/.test(request.url);

  if (isHTML) {
    // cache:'reload' sends Cache-Control:no-cache to CDN — forces revalidation
    // This is exactly what Cmd+Shift+R (hard refresh) does
    event.respondWith(
      fetch(request.url, { cache: 'reload' })
        .catch(() => caches.match(request))
    );
  } else {
    // Non-HTML: cache-first for speed
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
