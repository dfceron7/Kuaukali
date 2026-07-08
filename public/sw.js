const CACHE_NAME = "residencial-pwa-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-maskable.svg"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event (Cleanup Old Caches)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Cache-first for static, network-first for navigation, bypass for APIs)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. CRITICAL: NEVER cache API routes or hot-reload / WebSocket traffic!
  if (
    url.pathname.startsWith("/api") || 
    url.pathname.includes("hot-update") || 
    url.hostname.includes("localhost") && url.port !== "3000"
  ) {
    return; // Pass through to network directly
  }

  // 2. Navigation fallback for single page application structure
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/");
      })
    );
    return;
  }

  // 3. Cache assets, static bundles, images, etc.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache newly fetched assets dynamically
        if (
          response.status === 200 && 
          response.type === "basic" &&
          (url.pathname.endsWith(".js") || 
           url.pathname.endsWith(".css") || 
           url.pathname.endsWith(".svg") || 
           url.pathname.endsWith(".png") || 
           url.pathname.endsWith(".woff2") || 
           url.pathname.endsWith(".json"))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
