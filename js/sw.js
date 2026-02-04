const APP_CACHE_NAME = 'sig-senegal-app-v2';
const TILE_CACHE_NAME = 'sig-senegal-tiles-v1';

const APP_ASSETS = [
  './',
  'index.html',
  'favicon.ico',
  'css/bootstrap.min.css',
  'css/leaflet.css',
  'css/L.Control.Layers.Tree.css',
  'css/L.Control.Locate.min.css',
  'css/leaflet.photon.css',
  'css/leaflet-measure.css',
  'css/MarkerCluster.css',
  'css/MarkerCluster.Default.css',
  'css/fontawesome-all.min.css',
  'css/Control.MiniMap.min.css',
  'css/leaflet.draw.css',
  'js/bootstrap.bundle.min.js',
  'data/Region_3.js',
  'data/Departement_4.js',
  'data/Arrondissement_5.js',
  'data/Routes_6.js',
  'data/localites_7.js',
  'js/leaflet.js',
  'js/L.Control.Layers.Tree.min.js',
  'js/L.Control.Locate.min.js',
  'js/leaflet.photon.js',
  'js/leaflet-measure.js',
  'js/leaflet.markercluster.js',
  'js/leaflet-hash.js',
  'js/Autolinker.min.js',
  'js/qgis2web_expressions.js',
  'js/Control.MiniMap.min.js',
  'js/leaflet.draw.js',
  'js/turf.min.js',
  'js/script.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Installation : Mise en cache des ressources statiques de l'application
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then((cache) => {
        console.log('Mise en cache des ressources de l\'application');
        return cache.addAll(APP_ASSETS);
      })
  );
});

// Activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [APP_CACHE_NAME, TILE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes : Stratégies de cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Stratégie pour les tuiles de carte (OSM, CartoDB, Google)
  // On vérifie si l'URL correspond à un service de tuiles
  if (url.hostname.includes('openstreetmap.org') || 
      url.hostname.includes('cartocdn.com') || 
      url.hostname.includes('google.com')) {
    
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          // Si dans le cache, on retourne la tuile
          if (response) return response;
          
          // Sinon on la télécharge, on la met en cache et on la retourne
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Stratégie par défaut pour le reste de l'application (Cache First, falling back to Network)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
