// sw.js - Offline App Support
const CACHE_NAME = 'sk-study-point-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './logo.png',
  './default-male.png',
  './default-female.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => caches.match('./index.html'))
  );
});