/**
 * OnlyDrunk Service Worker — Stratégie offline-first
 * ==================================================
 * - Cache l'app shell + tous les assets de version
 * - Stratégie : cache-first pour assets statiques, network-first pour HTML
 * - Auto-cleanup des anciennes versions à chaque activation
 *
 * Note : ce SW est volontairement minimal (pas de Workbox) pour éviter
 *        une dépendance lourde. Pour des features avancées (background sync,
 *        push notifications), envisager Workbox v7+.
 */

// mtvzum1j est remplacé au build (scripts/stamp-sw.mjs via postbuild) par un
// identifiant unique → le cache tourne à chaque déploiement et l'ancien est purgé
// (activate supprime les caches != CACHE_VERSION). En dev le SW ne s'enregistre pas.
const CACHE_VERSION = 'onlydrunk-mtvzum1j';
// Remplacé par scripts/stamp-sw.mjs après le build. La valeur vide garde le
// fichier source valide en développement et pour les tests directs.
const BUILD_ASSETS = ["./assets/app-main-DYH-fnor.js","./assets/app-main-Dg8V7C5u.css","./assets/blindtest-data-CRcagmjh.js","./assets/debug-cyh4Z7ei.js","./assets/feature-games-CWsL2j2a.js","./assets/games-data-Nkav3eHL.js","./assets/i18n-BWRwV3v0.js","./assets/index-XkSK0rYj.js","./assets/pools-data-Dz64lIMx.js","./assets/vendor-DJ1mgiBU.js","./assets/vendor-react-QXrNKzY_.js","./assets/venue-game-ukTgtMG5.js","./beer-spinner.js","./index.html","./logo-192.png","./logo-512.png","./logo-mark.png","./logo-maskable-192.png","./logo-maskable-512.png","./logo.png","./manifest.webmanifest"];
const APP_SHELL = Array.from(new Set([
  './',
  './index.html',
  './manifest.webmanifest',
  ...BUILD_ASSETS,
]));

// ─── INSTALL : pré-cache de l'app shell ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.allSettled(
        APP_SHELL.map((asset) => cache.add(asset))
      ))
      .then((results) => {
        const failed = results.filter((result) => result.status === 'rejected');
        if (failed.length) {
          console.warn(`[SW] Pre-cache: ${failed.length}/${results.length} asset(s) indisponible(s).`);
        }
      })
  );
});

// ─── ACTIVATE : nettoie les anciennes versions ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH : routing par type de ressource ───
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Ne pas intercepter les requêtes non-GET ni cross-origin POST
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Ignore les frames externes (YouTube/Spotify/Deezer) — pas notre app
  if (url.hostname !== self.location.hostname) return;

  // HTML / navigation : network-first (récupère la dernière version si possible)
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // On clone et on met à jour le cache
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Assets statiques (JS, CSS, fonts, images) : cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // On ne cache que les responses OK
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          // Fallback offline : si la requête échoue et rien en cache → erreur réseau natif
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
    })
  );
});

// ─── MESSAGE : permet à l'app de demander un skipWaiting ───
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    // L'activation est exclusivement déclenchée par l'action « Installer » de
    // l'utilisateur. « Plus tard » laisse donc réellement le worker en attente.
    event.waitUntil(self.skipWaiting());
  }
});
