const CACHE_NAME = 'madryn-reportes-cache-v6'; // <-- NUEVA VERSIÓN
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

  // Leaflet.MarkerCluster (funcionan)
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',

  // AÑADIMOS EL SIGUIENTE GRUPO: FONT AWESOME Y FIREBASE SDKs
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js' // Asumiendo que lo usarás para imágenes
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Instalando v6 (locales + libs + Firebase)...'); // LOG ACTUALIZADO
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] v6: Cacheando todo...'); // LOG ACTUALIZADO
        return cache.addAll(urlsToCache)
          .then(() => {
            console.log('[ServiceWorker] v6: Todos los archivos definidos cacheados exitosamente.');
          })
          .catch(error => { 
            console.error('[ServiceWorker] v6: Fallo en cache.addAll():', error);
            console.error('[ServiceWorker] v6: URLs que se intentaron cachear:', urlsToCache);
          });
      })
      .catch(error => {
        console.error('[ServiceWorker] v6: Fallo al abrir el caché:', error);
      })
  );
  self.skipWaiting();
});
// ... resto del SW sin cambios (activate, fetch) ...

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