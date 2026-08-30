/* Cache simples para o app abrir sem internet. */
var CACHE = 'minha-rotina-v1';
var ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/icon.svg',
  './assets/icon-maskable.svg',
  './js/util.js',
  './js/store.js',
  './js/ui.js',
  './js/view-hoje.js',
  './js/view-rotina.js',
  './js/view-habitos.js',
  './js/view-tarefas.js',
  './js/view-progresso.js',
  './js/view-ajustes.js',
  './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARQUIVOS); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (chaves) {
    return Promise.all(chaves.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (resp) {
        var copia = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copia); });
        return resp;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
