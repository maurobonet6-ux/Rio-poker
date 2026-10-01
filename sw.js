// La app vive en /app/ (la portada «/» es la landing, que no se guarda para uso sin conexión).
// Service worker de RÍO: permite instalar la web como app y abrirla sin
// conexión. Siempre intenta la red primero (para tener la última versión) y
// solo usa la copia guardada si no hay conexión. Nunca guarda llamadas a /api.
const CACHE = 'rio-v6';
const SHELL = ['/app/', '/app.css', '/app.js', '/partida.css', '/partida.js', '/ui.css', '/fonts/inter-var-latin.woff2', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('/app/')))
  );
});
