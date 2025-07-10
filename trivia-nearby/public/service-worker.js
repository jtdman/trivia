// Service Worker for Trivia Nearby PWA
const CACHE_NAME = 'trivia-nearby-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-180.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.svg'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // If fetch fails (offline), try cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // If not in cache and offline, return offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/').then(response => {
                if (response) {
                  return response;
                }
                // Return a basic offline message
                return new Response(
                  `<!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Trivia Nearby - Offline</title>
                      <style>
                        body {
                          background: #000;
                          color: #fff;
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          height: 100vh;
                          margin: 0;
                          text-align: center;
                          padding: 20px;
                        }
                        h1 { color: #a855f7; }
                        p { color: #999; margin-top: 10px; }
                        button {
                          background: #a855f7;
                          color: white;
                          border: none;
                          padding: 12px 24px;
                          border-radius: 8px;
                          font-size: 16px;
                          margin-top: 20px;
                          cursor: pointer;
                        }
                      </style>
                    </head>
                    <body>
                      <div>
                        <h1>You're Offline</h1>
                        <p>Check your internet connection and try again.</p>
                        <button onclick="location.reload()">Try Again</button>
                      </div>
                    </body>
                  </html>`,
                  {
                    headers: { 'Content-Type': 'text/html' }
                  }
                );
              });
            }
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});