const CACHE_NAME = 'sk-study-v2'; // वर्जन 2 (ताकि पुराना वाला कभी वापस न आए)

// ऐप को बिना इंटरनेट चलाने के लिए जरूरी फाइलें
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './logo.png',
  './default-male.png',
  './default-female.png',
  './manifest.json',
  './js/config.js',
  './js/ui.js',
  './js/user.js',
  './js/store.js',
  './js/features.js',
  './js/auth.js',
  './js/main.js'
];

// Install Event (फाइलों को डाउनलोड करके सेव करना)
self.addEventListener('install', event => {
  self.skipWaiting(); // नया वर्ज़न आते ही तुरंत चालू करें
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('V2 Cache Opened & Files Saved');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate Event (पुराने कचरे/कैश को हमेशा के लिए डिलीट करना)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Old Cache Deleted:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // तुरंत कंट्रोल अपने हाथ में लेना
});

// Fetch Event (Network First, Fallback to Cache)
self.addEventListener('fetch', event => {
  // Firebase और बाहरी वेबसाइट्स (YouTube, APIs) को कैश मत करो
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // पहले इंटरनेट से नया डेटा लाओ, अगर नेट न हो तो मेमोरी से दिखाओ
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // नए डेटा को मेमोरी में भी सेव कर लो ताकि ऑफलाइन काम आए
        var responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // अगर इंटरनेट बंद है, तो सेव की गई फाइल दिखा दो
        return caches.match(event.request);
      })
  );
});