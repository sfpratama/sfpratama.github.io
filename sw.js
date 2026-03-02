// Rumah Main Fokus - Service Worker
// Version: 1.0.0

const CACHE_NAME = 'rmf-cache-v1';
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
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => {
        // Use no-cors for CDN resources
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

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for dynamic
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http requests
  if (!request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match(OFFLINE_PAGE);
        }
      });
    })
  );
});

// Background sync for score uploads (future use)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    console.log('[SW] Background sync: uploading scores');
  }
});
