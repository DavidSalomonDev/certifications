// Service worker de la PWA: permite seguir practicando sin conexión.
//
// - Páginas y JSON de preguntas: "network first" (siempre lo más reciente si hay red;
//   la copia en caché solo se usa offline).
// - Assets de Next (/_next/static) e imágenes: "cache first" (son inmutables o casi).
//
// Las preguntas e imágenes se guardan a medida que se visitan; no se precarga todo
// porque las imágenes pesan decenas de MB.

const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(["/", "/data/certifications.json"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== PAGES && k !== ASSETS)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/")
  ) {
    event.respondWith(cacheFirst(req, ASSETS));
    return;
  }

  event.respondWith(networkFirst(req, PAGES));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    // `cache: "no-store"` del fetch original se ignora aquí a propósito: queremos
    // guardar una copia para offline.
    const res = await fetch(req.url, { headers: req.headers, credentials: "same-origin" });
    if (res.ok) cache.put(req.url, res.clone());
    return res;
  } catch (err) {
    const hit =
      (await cache.match(req.url, { ignoreSearch: req.mode === "navigate" })) ||
      (req.mode === "navigate" ? await cache.match("/") : undefined);
    if (hit) return hit;
    throw err;
  }
}
