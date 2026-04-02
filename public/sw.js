// Versionado automático basado en la fecha (cambia diariamente)
// Esto fuerza actualización del cache automáticamente
const VERSION = new Date().toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
const CACHE_NAME = `stocker-v${VERSION}`

// Assets base que se pre-cachean en cada versión
const ASSETS = [
  '/',
  '/css/styles.css',
  '/favicon.ico',
  '/img/logo.svg'
]

// Instalación: Cacheamos los assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[SW] Pre-cacheando assets críticos (v${VERSION})`);
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de versiones vieja
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log(`[SW] Eliminando cache antiguo: ${key}`)
          return caches.delete(key)
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Estrategia Stale-While-Revalidate para assets dinámicos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cacheamos peticiones GET de nuestro propio origen
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Evitamos cachear llamadas a la API o Supabase
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase.co')) {
    return;
  }

  // Para requests de navigation (HTML), siempre vamos a la red
  if (request.mode === 'navigate') {
    return fetch(request).catch(() => caches.match('/'));
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Activación: Limpieza de versiones viejas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => {
          console.log(`[SW] Eliminando cache antiguo: ${key}`)
          return caches.delete(key)
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Estrategia Stale-While-Revalidate para assets dinámicos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cacheamos peticiones GET de nuestro propio origen
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
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cacheCopy);
          });
        }
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
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
