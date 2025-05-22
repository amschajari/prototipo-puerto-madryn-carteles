const CACHE_NAME = 'madryn-reportes-cache-v1'; // ¡No cambies esto manualmente nunca más!
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './img/escudo_madryn.png',

  // Leaflet
  'https://unpkg.com/leaflet @1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet @1.9.4/dist/leaflet.js',

  // MarkerCluster
  'https://unpkg.com/leaflet.markercluster @1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster @1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster @1.5.3/dist/leaflet.markercluster.js',

  // Font Awesome
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css ',

  // Firebase SDKs
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js ',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js ',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js '
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[ServiceWorker] Cachando recursos en ${CACHE_NAME}...`);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error(`[ServiceWorker] Error al cachear recursos: ${error}`);
      })
  );
  self.skipWaiting(); // Activar inmediatamente el nuevo SW
});

// Activación: limpiar cachés antiguos
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log(`[ServiceWorker] Borrando caché antiguo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Tomar control inmediato de las páginas
    })
  );
});

// Fetch: responder con caché o red
self.addEventListener('fetch', event => {
  const requestURL = new URL(event.request.url);

  // Ignorar peticiones a Firebase Firestore / Storage
  if (
    requestURL.origin === 'https://firestore.googleapis.com ' ||
    requestURL.origin === 'https://firebasestorage.googleapis.com '
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Estrategia: Cache First (usar caché si existe, sino ir a la red)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// Mensaje desde cliente para forzar actualización
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});