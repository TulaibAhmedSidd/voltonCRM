/* Volt-On CRM service worker.
 * Caches ONLY static files (app code, fonts, icons) so the app opens fast.
 * Pages and API calls always go to the network — customer data is never stored on the phone.
 * When the network is down, pages show /offline.html. */
const VERSION = 'v2'
const STATIC = `volton-static-${VERSION}`
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/brand/volton-logo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('volton-') && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }
  const isStatic = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/')
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(STATIC).then((cache) => cache.put(request, copy))
            }
            return res
          }),
      ),
    )
  }
})

// ── Phone / PC notifications (Web Push) ──
// If the CRM is open on screen, the page shows its own pop-up instead (no double alert).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Volton CRM', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const visible = windows.find((c) => c.visibilityState === 'visible')
      if (visible) {
        visible.postMessage({ type: 'volton-push', title: data.title, body: data.body, link: data.link })
        return
      }
      await self.registration.showNotification(data.title || 'Volton CRM', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: { link: data.link || '/dashboard' },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/dashboard'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of windows) {
        if ('focus' in c) {
          await c.focus()
          if ('navigate' in c) return c.navigate(link)
          return
        }
      }
      return self.clients.openWindow(link)
    })(),
  )
})
