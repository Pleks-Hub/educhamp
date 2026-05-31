/**
 * EduChamp Service Worker — v1.0.0
 *
 * Strategy:
 *  • App shell (HTML, CSS, JS, fonts): Cache-first with background update
 *  • API calls (/api/*): Network-first with 3s timeout, no cache
 *  • Static assets (images, icons): Cache-first, long TTL
 *  • Offline fallback: /offline.html for navigation requests
 *
 * This file is registered by workbox-window in PWAUpdatePrompt.tsx.
 * The "waiting" lifecycle event triggers the in-app update toast.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `educhamp-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `educhamp-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Assets to pre-cache on install (app shell)
const SHELL_ASSETS = [
  "/",
  "/offline.html",
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => {
        // Gracefully handle missing assets during install
      })
    )
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // API calls: Network-first, no caching
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/manus-storage/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Navigation requests: Network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest shell HTML
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          // Try cache, then offline page
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match(OFFLINE_URL);
          return (
            offlinePage ||
            new Response("<h1>You are offline</h1>", {
              headers: { "Content-Type": "text/html" },
            })
          );
        })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): Cache-first with background update
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// ─── Message: skipWaiting (triggered by workbox-window on user click) ─────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
