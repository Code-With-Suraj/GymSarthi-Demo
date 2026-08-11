/**
 * GymSarthi — Service Worker for Mobile PWA
 */

const CACHE_NAME = 'gymsarthi-pwa-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/member-dashboard.html',
  '/qr-scanner.html',
  '/store.html',
  '/owner-dashboard.html',
  '/owner-members.html',
  '/owner-expenses.html',
  '/owner-packages.html',
  '/owner-store.html',
  '/owner-payments.html',
  '/owner-subscription.html',
  '/manifest.json',
  '/assets/logo.svg',
  '/assets/logo.png',
  '/assets/favicon.png',
  '/assets/favicon.ico',
  '/css/app.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/razorpay.js',
  '/js/owner-sidebar.js',
  '/js/pwa.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Skip unsupported schemes (chrome-extension://, moz-extension://, file://, etc.)
  const url = e.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  // Network-first with cache fallback
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache).catch(err => {
              // Silently ignore cache put errors for non-cacheable resources
            });
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (e.request.headers && e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
