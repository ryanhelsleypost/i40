/* I-40 trip companion — offline service worker.
   The app shell (map library, fonts, route data, code, icons) is precached so
   the whole thing loads with zero signal. Map tiles are cached as they're
   viewed, so any stretch already looked at stays available in a dead zone. */

const VERSION = "i40-v7";
const SHELL = VERSION + "-shell";
const TILES = VERSION + "-tiles";

const SHELL_FILES = [
  ".", "index.html", "print.html", "manifest.json",
  "css/leaflet.css", "css/app.css",
  "js/leaflet.js", "js/data.js", "js/geo.js", "js/store.js", "js/towns.js", "js/app.js",
  "fonts/overpass-400.woff2", "fonts/overpass-600.woff2", "fonts/overpass-700.woff2",
  "images/marker-icon.png", "images/marker-icon-2x.png", "images/marker-shadow.png",
  "images/layers.png", "images/layers-2x.png",
  "icons/icon-192.png", "icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    e.respondWith(caches.open(TILES).then(cache =>
      cache.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res; }).catch(() => hit))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
