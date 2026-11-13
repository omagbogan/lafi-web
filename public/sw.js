// Service Worker PWA Desktop pour Lafi Web
const CACHE_NAME = 'lafi-desktop-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/lafi-emblem.png',
  '/lafi-logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
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
  const url = new URL(event.request.url);

  // Ne jamais mettre en cache les appels API temps réel ou les méthodes non-GET
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/articles') ||
    url.pathname.startsWith('/orders') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/ai') ||
    url.pathname.startsWith('/shops') ||
    url.pathname.startsWith('/customers') ||
    url.pathname.startsWith('/uploads') ||
    url.pathname.startsWith('/health')
  ) {
    return;
  }

  // Stratégie Network-First avec repli sur le cache pour l'application Bureau
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

