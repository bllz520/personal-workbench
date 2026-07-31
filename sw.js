// 个人工作台 PWA Service Worker：同源外壳缓存，WebDAV（跨域）走网络
// 关键：页面/脚本类资源采用「网络优先」，避免旧 SW 把旧 index.html 喂给新缓存导致永远刷新不出新版本
const CACHE = 'wb-shell-v3';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './sw.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
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

  const p = url.pathname;
  const isPage = p.endsWith('/') || p.endsWith('.html') || p.endsWith('.js') || p.endsWith('.webmanifest');

  if (isPage) {
    // 网络优先：永远拿到最新 index.html / sw.js；离线时才退回缓存
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const cp = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源（图标等）：缓存优先
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
