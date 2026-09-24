// Offline support: cache the app on first visit, serve from cache afterwards.
const CACHE = 'listen-and-play-v2';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/audio.js',
  'js/fx.js',
  'js/icons.js',
  'js/mascot.js',
  'js/store.js',
  'js/data/ling.js',
  'js/games/index.js',
  'js/games/ling6.js',
  'assets/ling/aeroplane.png',
  'assets/ling/baby.png',
  'assets/ling/car.png',
  'assets/ling/chilli.png',
  'assets/ling/lollipop.png',
  'assets/ling/train.png',
  'assets/ling/audio/aeroplane.mp3',
  'assets/ling/audio/baby.mp3',
  'assets/ling/audio/car.mp3',
  'assets/ling/audio/chilli.mp3',
  'assets/ling/audio/lollipop.mp3',
  'assets/ling/audio/train.mp3',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first (so updates arrive), falling back to the cache when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
