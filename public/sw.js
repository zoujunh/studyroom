const CACHE_NAME = 'studyroom-v2'
const PRECACHE_URLS = [
  '/',
  '/images/logo.png',
  '/manifest.json',
]

// 安装：预缓存关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  )
  self.clients.claim()
})

// 请求策略：图片和音频用 cache-first，其他用 network-first
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 只处理同源请求
  if (url.origin !== location.origin) return

  // 图片和音频：cache-first（离线也能用）
  if (url.pathname.match(/\.(webp|jpg|jpeg|png|mp3|wav|ogg)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
      })
    )
    return
  }

  // JS/CSS：network-first（拿最新的，失败用缓存）
  if (url.pathname.match(/\.(js|css|html)$/)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }
})
