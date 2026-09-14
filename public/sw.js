const CACHE_PREFIX = "gcs-mobile-publisher-";
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const APP_BASE = "/publisher/";
const INDEX_PATH = `${APP_BASE}index.html`;
const APP_SHELL = [APP_BASE, INDEX_PATH, `${APP_BASE}manifest.webmanifest`, `${APP_BASE}icon.svg`];
const CACHEABLE_DESTINATIONS = new Set(["font", "image", "manifest", "script", "style"]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match(INDEX_PATH);
    if (shell) return shell;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(APP_BASE)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (CACHEABLE_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(cacheFirst(event.request));
  }
});
