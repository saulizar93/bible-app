/* Service worker: makes the app shell (HTML, JS, CSS, icons, info pages)
 * available offline. Bible text, notes and the lexicon are NOT cached here —
 * the app stores those in IndexedDB itself (src/data.js), and the "Download
 * App" panel (src/offline.js) downloads whole translations into it.
 *
 * Bump SHELL_VERSION to force every installed copy to drop its old shell. */
const SHELL_VERSION = 1;
const CACHE = `shell-v${SHELL_VERSION}`;
const SCOPE = new URL(self.registration.scope);

// data/ files handled by IndexedDB in the app — leave them to the network.
const isAppData = (url) => /\/data\/(bibles|notes|strongs|concord)\//.test(url.pathname);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const shell = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"].map(
        (p) => new URL(p, SCOPE).href,
      );
      await cache.addAll(shell);
      // Precache the hashed JS/CSS referenced by index.html.
      try {
        const html = await (await fetch(SCOPE.href, { cache: "no-store" })).text();
        const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => new URL(m[1], SCOPE).href);
        await cache.addAll(assets);
      } catch {
        /* offline during install — assets get cached on first use instead */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("shell-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (isAppData(url)) return;

  // Pages: network first (to pick up new deployments), cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(SCOPE.href, res.clone());
          return res;
        } catch {
          return (await caches.match(SCOPE.href)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else in scope (hashed assets, icons, info pages):
  // stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);
      return cached || (await network) || Response.error();
    })(),
  );
});
