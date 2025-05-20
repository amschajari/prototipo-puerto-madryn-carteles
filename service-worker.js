const CACHE_NAME = 'madryn-reportes-cache-v5'; // <-- NUEVA VERSIÓN
const urlsToCache = [
  // Locales (funcionan)
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './img/escudo_madryn.png',

  // Leaflet (funcionan)
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',

  // AÑADIMOS EL SIGUIENTE GRUPO: LEAFLET.MARKERCLUSTER
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Instalando v5 (locales + Leaflet + MarkerCluster)...'); // LOG ACTUALIZADO
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] v5: Cacheando locales, Leaflet y MarkerCluster'); // LOG ACTUALIZADO
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('[ServiceWorker] v5: Archivos (locales, Leaflet, MarkerCluster) cacheados exitosamente.');
          })
          .catch(error => { 
            console.error('[ServiceWorker] v5: Fallo en cache.addAll() para (locales, Leaflet, MarkerCluster):', error);
            console.error('[ServiceWorker] v5: URLs que se intentaron cachear:', urlsToCache);
          });
      })
      .catch(error => {
        console.error('[ServiceWorker] v5: Fallo al abrir el caché:', error);
      })
  );
  self.skipWaiting();
});
// ... resto del SW sin cambios ...

// Evento 'activate': Se dispara después de que el SW se instala y cuando una nueva versión reemplaza a una antigua.
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activándose...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Eliminar cachés viejos que no coincidan con el CACHE_NAME actual
          // (útil cuando incrementas la versión en CACHE_NAME, ej. 'madryn-reportes-cache-v2')
          return cacheName.startsWith('madryn-reportes-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('[ServiceWorker] Eliminando caché viejo:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim(); // Permite que el SW activado tome control de los clientes no controlados inmediatamente.
    })
  );
});

// Evento 'fetch': Intercepta todas las peticiones de red de la aplicación.
self.addEventListener('fetch', event => {
  // console.log('[ServiceWorker] Fetch interceptado para:', event.request.url);

  // No queremos cachear las peticiones a la API de Firebase Firestore/Storage
  // directamente con esta estrategia de caché, ya que Firebase tiene su propio
  // manejo de offline y sincronización. Dejarlas pasar a la red es lo mejor.
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('firebasestorage.googleapis.com')) {
    // console.log('[ServiceWorker] Dejando pasar petición de Firebase a la red:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }

  // Estrategia: Cache First (servir desde caché si está disponible, sino ir a la red)
  // Bueno para los assets estáticos de la "app shell".
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[ServiceWorker] Sirviendo desde caché:', event.request.url);
          return cachedResponse;
        }
        // console.log('[ServiceWorker] No encontrado en caché, obteniendo de la red:', event.request.url);
        return fetch(event.request).then(networkResponse => {
          // Opcional: Cachear dinámicamente nuevas peticiones GET exitosas si quieres
          // if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension://')) {
          //   const responseToCache = networkResponse.clone();
          //   caches.open(CACHE_NAME).then(cache => {
          //     console.log('[ServiceWorker] Cacheando nuevo recurso de red:', event.request.url);
          //     cache.put(event.request, responseToCache);
          //   });
          // }
          return networkResponse;
        });
      })
      .catch(error => {
        console.error('[ServiceWorker] Error en el fetch (ni caché ni red):', error, event.request.url);
        // Aquí podrías devolver una página offline.html genérica si la tuvieras cacheada
        // Por ejemplo: return caches.match('./offline.html');
        // Si no, la petición fallará como lo haría normalmente sin un SW.
      })
  );
});