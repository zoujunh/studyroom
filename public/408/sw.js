/* 408 刷卡 · 离线缓存 Service Worker
 *
 * 策略：
 * - 页面导航：network-first（保证刷新总能拿到最新 index.html，方便迭代）
 * - 带 hash 的静态资源：stale-while-revalidate（离线可用，文件名变了自然是新请求）
 */
const CACHE = 'kaoyan408-v2';
const SCOPE = '/408/';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE)) return;

  const isDocument = request.mode === 'navigate' || url.pathname === SCOPE || url.pathname === `${SCOPE}index.html`;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      if (isDocument) {
        // 网络优先：联网时永远拿最新页面，断网时回落到缓存。
        try {
          const response = await fetch(request);
          if (response && response.ok) void cache.put(request, response.clone());
          return response;
        } catch (error) {
          const fallback =
            (await cache.match(request, { ignoreSearch: true })) ??
            (await cache.match(`${SCOPE}index.html`, { ignoreSearch: true }));
          if (fallback) return fallback;
          throw error;
        }
      }

      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) {
        fetch(request)
          .then((response) => {
            if (response && response.ok) void cache.put(request, response.clone());
          })
          .catch(() => {});
        return cached;
      }

      const response = await fetch(request);
      if (response && response.ok) void cache.put(request, response.clone());
      return response;
    })(),
  );
});
