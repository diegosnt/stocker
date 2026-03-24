const CACHE_NAME = 'stocker-v1';
const ASSETS = [
  '/',
  '/css/styles.css',
  '/js/app.js',
  '/js/api-client.js',
  '/js/supabase-client.js',
  '/js/router.js',
  '/js/utils.js',
  '/js/cache.js',
  '/img/logo.svg',
  '/fonts/inter-400.woff2',
  '/fonts/inter-500.woff2',
  '/fonts/inter-600.woff2',
  '/fonts/inter-700.woff2'
];

// Instalación: Cacheamos los assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-cacheando assets críticos');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de versiones viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Estrategia Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cacheamos peticiones GET de nuestro propio origen (assets estáticos)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Evitamos cachear llamadas a la API o Supabase
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Actualizamos el cache con la nueva versión de la red
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheCopy);
          });
        }
        return networkResponse;
      });

      // Devolvemos el cache si existe, sino esperamos a la red
      return cachedResponse || fetchPromise;
    })
  );
});
