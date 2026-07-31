// 个人工作台 PWA Service Worker：仅缓存同源页面外壳，WebDAV 同步（跨域）走网络
const CACHE = 'wb-shell-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;            // POST/PUT/PROPFIND 等不缓存
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 跨域（坚果云 WebDAV）直接走网络
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          const cp = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
