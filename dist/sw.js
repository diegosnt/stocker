// Versionado granular (YYYYMMDD-HHMM)
const VERSION = '20260420-VITE-001'
const CACHE_NAME = `stocker-v${VERSION}`

// En desarrollo, no queremos que el SW cachee nada de Vite (HMR)
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Assets base que se pre-cachean (Solo los que están en /public y son 100% estáticos)
const ASSETS = [
  '/',
  '/favicon.ico',
  '/img/logo.svg'
]

/**
 * Instalación: Cacheamos los assets críticos
 */
self.addEventListener('install', (event) => {
  if (isDev) {
    console.log('[SW] Modo Desarrollo: Saltando pre-cacheo.');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[SW] Pre-cacheando assets críticos (v${VERSION})`);
      return cache.addAll(ASSETS);
    })
  );
});

/**
 * Mensajes: Escuchamos comandos desde el cliente
 */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Activación: Limpieza de versiones viejas de caché
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log(`[SW] Eliminando caché antiguo: ${key}`);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch: Estrategia de cacheo inteligente
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Solo manejamos peticiones GET
  if (request.method !== 'GET') return;

  // 2. EN DESARROLLO: No cacheamos nada que venga de Vite o HMR
  if (isDev || url.pathname.startsWith('/@vite/') || url.pathname.startsWith('/node_modules/')) {
    return;
  }

  // 3. No cacheamos llamadas a la API ni a Supabase
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase.co')) {
    return;
  }

  // 4. Manejo de Navegación (HTML Principal) - Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  // 5. Assets Estáticos Propios - Stale-While-Revalidate
  // Solo si no estamos en desarrollo
  if (url.origin === self.location.origin) {
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
  }
});
