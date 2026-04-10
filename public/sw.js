const CACHE = 'knitmentor-v1';
const STATIC = [
  '/',
  '/app.js',
  '/style.css',
  '/stitches.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
