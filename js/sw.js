const CACHE_NAME = 'sig-senegal-v1';
const ASSETS_TO_CACHE = [
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

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourne la réponse en cache si elle existe, sinon fait la requête réseau
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
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
