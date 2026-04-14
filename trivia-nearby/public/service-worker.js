// Network-only service worker.
//
// A prior build registered a service worker that aggressively cached
// bundles; users with that SW still active were seeing stale JS even
// after redeploys. This replacement does three things:
//   1. On install/activate, clears every cache storage (wipes stale
//      assets that the old SW left behind).
//   2. Registers a fetch handler that never calls respondWith(), so
//      the browser handles requests natively (network-first, no
//      caching, no offline fallback).
//   3. Stays registered — the presence of a SW with a fetch handler
//      is what qualifies the site for the PWA install prompt on
//      mobile, so we don't want to unregister.

const VERSION = 'network-only-2026-04-14'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Defensive second pass — in case anything re-created caches
      // between install and activate.
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (_event) => {
  // Intentionally empty. Not calling event.respondWith() lets the
  // browser handle the request normally (network, no cache). The
  // presence of this listener is what qualifies the app for the
  // Add to Home Screen / install prompt.
})

// Tag for debugging — visible in DevTools > Application > Service Workers
self.TRIVIA_NEARBY_SW_VERSION = VERSION
