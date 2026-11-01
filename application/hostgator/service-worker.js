const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const PREFIX = `perform-ai:${BASE}:`;
const CACHE = `${PREFIX}v3`;
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/assets/icon-192.png", "/assets/icon-512.png", "/pdf.worker.min.mjs"].map(path => BASE + path);

self.addEventListener("install", (event) => event.waitUntil(
  caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
));
self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((key) => (key.startsWith(PREFIX) && key !== CACHE) || (BASE === "/app" && ["perform-ai-app-v1", "perform-ai-app-v2"].includes(key))).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE + "/") || url.pathname.endsWith(".php")) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const contentType = response.headers.get("content-type") || "";
        const cacheableAsset = response.ok && !response.bodyUsed && (
          (event.request.destination === "script" && /javascript/i.test(contentType)) ||
          (event.request.destination === "style" && /css/i.test(contentType)) ||
          ["image", "font", "worker"].includes(event.request.destination)
        );
        if (cacheableAsset) {
          const cachedResponse = response.clone();
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, cachedResponse)).catch(() => undefined));
        }
        return response;
      })
      .catch(async () => await caches.match(event.request) || (event.request.mode === "navigate" && await caches.match(BASE + "/index.html")) || Response.error()),
  );
});
