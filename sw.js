/** A version is installable only after its essential shell is safely cached. */
const CACHE_PREFIX = 'onlydrunk-';
const CACHE_VERSION = 'onlydrunk-mvil9w4o';
const BUILD_ASSETS = ["./assets/game-catalog-DzxdyUOi.js","./assets/index-BPalUUCs.js","./assets/index-VHY6d5W6.css","./assets/taboo-data-R3It4JOS.js","./assets/vendor-react-SGLyOfVL.js","./beer-spinner.js","./index.html","./logo-192.png","./logo-512.png","./logo-mark.png","./logo-maskable-192.png","./logo-maskable-512.png","./logo.png","./manifest.webmanifest"];
const APP_SHELL = Array.from(new Set(['./', './index.html', './manifest.webmanifest', ...BUILD_ASSETS]));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
      .catch(async (error) => {
        await caches.delete(CACHE_VERSION);
        throw error;
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const scope = new URL('./', self.location.href);
  if (req.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const navigation = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');
    // Pin HTML and hashed assets to the same version until explicit activation.
    if (navigation) {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const response = await fetch(req);
      if (response.ok && response.type === 'basic') {
        event.waitUntil(cache.put(req, response.clone()).catch(() => {}));
      }
      return response;
    } catch {
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});
