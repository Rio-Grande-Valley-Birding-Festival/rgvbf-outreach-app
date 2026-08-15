/**
 * service-worker.js
 * ------------------
 * This is what makes the app open and work with ZERO internet connection,
 * not just "save data offline". The service worker runs in the background
 * and intercepts every request the page makes. The first time someone
 * loads the app (with internet), it downloads and stores a copy of every
 * file below. On every future load -- with or without a signal -- the
 * browser serves those stored copies instantly instead of hitting the
 * network.
 *
 * Bump CACHE_NAME (e.g. to "rgvbf-outreach-v2") any time you change one of
 * these files and want devices to pick up the update.
 */
const CACHE_NAME = "rgvbf-outreach-v16";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./js/app.js",
  "./js/db.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/rgvbf-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Deliberately NOT using cache.addAll() here. addAll() lets the
      // browser satisfy each fetch from its own regular HTTP cache if it
      // has a recent-enough copy -- which means right after deploying an
      // update, a device could cache a STALE js/app.js or index.html into
      // this brand-new CACHE_NAME instead of the file that was actually
      // just uploaded. That's exactly the bug that caused the top summary
      // line to get stuck on "Loading..." forever: the HTML updated (new
      // markup) but the JS that fills it in didn't (old script, cached).
      // { cache: "reload" } forces every file below to come straight from
      // the network, bypassing the browser's HTTP cache entirely, so what
      // gets stored always matches what's actually live on GitHub Pages.
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { cache: "reload" }).then((response) => cache.put(url, response))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for app files; network calls to Google (the Sheets sync)
// always go straight to the network since that data changes constantly.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    // Let Google Apps Script sync requests pass through untouched.
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
