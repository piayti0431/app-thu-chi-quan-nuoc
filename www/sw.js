// Service Worker cho Sổ Quán Nước Mía
const CACHE_NAME = 'so-quan-nuoc-v3-20260911';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/parser.js',
  './js/report.js',
  './js/speech.js',
  './js/sync.js',
  './assets/logo-app.svg',
  './assets/ingredients/bo_mia_10kg.svg',
  './assets/ingredients/bo_mia_12_cay.svg',
  './assets/ingredients/bo_mia.svg',
  './assets/ingredients/da_vien.svg',
  './assets/ingredients/tac.svg',
  './assets/ingredients/thom.svg',
  './assets/ingredients/rau_ma.svg',
  './assets/ingredients/dau_xanh.svg',
  './assets/ingredients/cam_sanh.svg',
  './assets/ingredients/sua_dac.svg',
  './assets/ingredients/ly_nhua.svg',
  './assets/ingredients/ong_hut.svg',
  './assets/ingredients/bich_t.svg',
  './assets/ingredients/mang_keo.svg',
  './assets/ingredients/duong_cat.svg',
  './assets/ingredients/bo_mia_10kg.jpg',
  './assets/ingredients/bo_mia_12_cay.jpg',
  './assets/ingredients/da_vien.jpg',
  './assets/ingredients/tac.jpg',
  './assets/ingredients/thom.jpg',
  './assets/ingredients/rau_ma.jpg',
  './assets/ingredients/dau_xanh.jpg',
  './assets/ingredients/cam_sanh.jpg',
  './assets/ingredients/sua_dac.jpg',
  './assets/ingredients/ly_nhua.jpg',
  './assets/ingredients/ong_hut.jpg',
  './assets/ingredients/bich_t.jpg',
  './assets/ingredients/mang_keo.jpg',
  './assets/ingredients/duong_cat.jpg',
  './assets/menu/nuoc_mia.jpg',
  './assets/menu/nuoc_mia_1l.jpg',
  './assets/menu/mia_tac.jpg',
  './assets/menu/mia_thom.jpg',
  './assets/menu/mia_cam.jpg',
  './assets/menu/nuoc_cam.jpg',
  './assets/menu/tra_tac.jpg',
  './assets/menu/tra_da.jpg',
  './assets/menu/rau_ma.jpg',
  './assets/menu/rau_ma_dau_xanh.jpg',
  './assets/menu/rau_ma_sua.jpg'
];

// Cài đặt SW & cache tài nguyên cốt lõi
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Kích hoạt SW & dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Xử lý fetch request
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Bỏ qua request không phải GET, hoặc request tới Supabase / external API
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Với navigation request (load trang HTML), dùng network-first, fallback về cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Với static assets (css, js, svg, img), dùng stale-while-revalidate hoặc cache-first
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Cập nhật ngầm trong background
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(req).then((response) => {
        if (response && response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return response;
      });
    })
  );
});
