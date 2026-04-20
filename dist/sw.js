// Versionado granular (YYYYMMDD-HHMM)
const VERSION = '20260408-0055'
const CACHE_NAME = `stocker-v${VERSION}`

// Assets base que se pre-cachean en cada versión
const ASSETS = [
  '/',
  '/css/styles.css',
  '/favicon.ico',
  '/img/logo.svg'
]

/**
 * Instalación: Cacheamos los assets críticos
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log(`[SW] Pre-cacheando assets críticos (v${VERSION})`);
      return cache.addAll(ASSETS);
    })
  );
  // Eliminamos skipWaiting automático para permitir actualización controlada
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
 * - Navigation: Network First con fallback a '/' (Offline support)
 * - Assets propios: Stale-While-Revalidate (Velocidad + Actualización)
 * - APIs/Supabase: Network Only (Datos frescos siempre)
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Solo manejamos peticiones GET
  if (request.method !== 'GET') return;

  // 2. No cacheamos llamadas a la API ni a Supabase (queremos datos reales)
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase.co')) {
    return;
  }

  // 3. Manejo de Navegación (HTML Principal) - Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }

  // 4. Assets Estáticos Propios - Stale-While-Revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Si la respuesta es válida, actualizamos el caché en segundo plano
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse); // Si falla la red, devolvemos lo que había en caché

        return cachedResponse || fetchPromise;
      })
    );
  }
});
