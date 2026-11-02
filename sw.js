/* YRB’s World service worker — offline app shell. Bump VERSION on every deploy. */
const VERSION = 'yrb-v2.6.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/core.js', 'js/integrations.js', 'js/app.js',
  'js/views/tasks.js', 'js/views/calendar.js', 'js/views/goals.js', 'js/views/business.js',
  'js/views/trading.js', 'js/views/wealth.js', 'js/views/habits.js', 'js/views/dashboard.js', 'js/views/profile.js', 'js/views/music.js', 'js/views/coach.js',
  'js/views/spaces.js', 'js/views/connect.js', 'js/views/journal.js', 'js/views/vision.js', 'js/palette.js', 'css/v2.css',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'icons/biz/clientsniper.svg', 'icons/biz/yrb-nova.png', 'icons/biz/yrb-supreme.webp',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network-first for same-origin files (always fresh when online), cache fallback offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(x => 'focus' in x);
    if (c) { c.postMessage({ type: 'open', url }); return c.focus().then(w => (w && 'navigate' in w ? w.navigate(url).catch(() => {}) : null)); }
    return self.clients.openWindow(url);
  }));
});
