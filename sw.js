// Service Worker: ein Skript, das der Browser getrennt von der Seite im Hintergrund ausführt.
// Er sitzt zwischen Seite und Netz und kann jede Anfrage aus dem Cache beantworten –
// dadurch läuft Big Talk nach dem ersten Besuch auch offline.
//
// Strategie „stale-while-revalidate“: sofort aus dem Cache antworten (schnell, offline-fähig)
// und im Hintergrund die neue Version holen. Änderungen sind damit beim nächsten Öffnen da.
//
// Bei einem Release CACHE_VERSION erhöhen: Dann wird der alte Cache komplett ersetzt.

const CACHE_VERSION = 'bigtalk-v2';

const APP_FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/cards.js',
  'js/deck.js',
  'js/feedback.js',
  'js/scoring.js',
  'js/sound.js',
  'js/storage.js',
  'js/timer.js',
  'js/wakelock.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

// 1. Installieren: alle App-Dateien vorab in den Cache laden.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting()), // neue Version sofort aktiv, nicht erst nach Schließen aller Tabs
  );
});

// 2. Aktivieren: Caches alter Versionen löschen.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 3. Jede Anfrage: aus dem Cache antworten, parallel aktualisieren.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // ignoreSearch: „index.html?x=1“ findet auch „index.html“.
      const cached = await cache.match(request, { ignoreSearch: true });

      const fromNetwork = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        // Offline: Cache-Version; unbekannte Seitenaufrufe bekommen notfalls die Startseite.
        .catch(() => cached || (request.mode === 'navigate' ? cache.match('./') : undefined));

      if (cached) {
        event.waitUntil(fromNetwork); // Aktualisierung im Hintergrund zu Ende laufen lassen
        return cached;
      }
      return fromNetwork;
    }),
  );
});
