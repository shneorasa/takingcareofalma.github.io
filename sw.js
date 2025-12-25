
const CACHE_NAME = 'alma-care-v1';
// שינוי לנתיבים יחסיים כדי שזה יעבוד גם בתוך תיקייה בגיטהאב
const urlsToCache = ['./', './index.html', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
