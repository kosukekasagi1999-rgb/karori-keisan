// Change VERSION whenever the app shell changes.
const VERSION = 'nutrilog-20261007-meal-sheet-1';
const PREFIX = 'nutrilog-shell-' + self.registration.scope;
const CACHE = PREFIX + VERSION;
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  const shellUrls = SHELL.map(path => new URL(path, self.registration.scope).href);
  if (request.mode === 'navigate') {
    // Online navigation fetches the latest HTML; a failed connection uses the local shell.
    event.respondWith(fetch(request).then(response => {
      if (response.ok) event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', response.clone())));
      return response;
    }).catch(() => caches.open(CACHE).then(cache => cache.match('./index.html'))));
  } else if (shellUrls.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }));
  }
});
