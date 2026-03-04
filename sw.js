// Sparkids - Service Worker
// Version: 1.1.0

const CACHE_NAME = 'spk-cache-v2';
const OFFLINE_PAGE = '/auth.html';

const STATIC_ASSETS = [
  '/index.html',
  '/auth.html',
  '/dashboard.html',
  '/game-pop-warna.html',
  '/game-ingat-urutan.html',
  '/game-cari-yang-berbeda.html',
  '/game-temukan-pola.html',
  '/game-labirin-ringan.html',
  '/game-hitung-cepat-baseline.html',
  '/game-campur-warna.html',
  '/game-warna-ajaib.html',
  '/game-cari-pasangan-bunyi-gambar.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com'
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => {
        if (url.startsWith('https://')) {
          return new Request(url, { mode: 'no-cors' });
        }
        return url;
      })).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - HTML files → network-first (always get latest, fall back to cache if offline)
// - Everything else → cache-first (fast)
self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const isHTML = request.destination === 'document' ||
                 request.url.match(/\.html(\?|$)/);

  if (isHTML) {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(request).then(cached => {
          return cached || caches.match(OFFLINE_PAGE);
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
