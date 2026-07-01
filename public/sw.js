/*
 * AirScore Service Worker — Offline-Shell für die PWA.
 *
 * Strategie (bewusst einfach & robust für statischen Next-Export):
 *  - Nur SAME-ORIGIN GET-Requests werden gecacht (App-Shell, Seiten, Assets).
 *  - Externe APIs (Nominatim, Overpass) werden NIE gecacht → Straßensuche &
 *    POIs immer live aus dem Internet (genau wie gewünscht).
 *  - Network-first: frische Inhalte bevorzugt, Cache als Fallback (offline).
 *
 * Versionsnummer bei größeren Änderungen erhöhen, um alten Cache zu verwerfen.
 */
const CACHE = 'airscore-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Externe Domains (OpenStreetMap-APIs etc.) nicht abfangen → immer live.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./'))
      )
  );
});
