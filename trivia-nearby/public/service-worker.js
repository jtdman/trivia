// Tombstone service worker.
//
// An earlier build of this app registered a service worker; the app no
// longer ships one, but installed PWAs on users' devices may still have
// the stale SW active and serving cached bundles. When the browser does
// its periodic SW update check against this path, it will install this
// replacement, which wipes all caches and unregisters itself so the PWA
// falls back to plain network fetches.
//
// Safe to leave in place indefinitely — the sw does nothing on repeat
// launches because the unregister call removes its own registration.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch (err) {
        // ignore; we still want to unregister even if cache cleanup fails
      }

      await self.registration.unregister()

      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        if ('navigate' in client) {
          client.navigate(client.url)
        }
      }
    })(),
  )
})

// Do not install any fetch handlers — let the network handle requests.
