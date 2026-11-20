/**
 * Service worker di NefroCalc: salva in cache solo i file dell'app (mai dati clinici)
 * e li serve dalla cache, così l'app funziona offline.
 * A ogni aggiornamento dei file cambio CACHE (nefrocalc-v2, v3…) per forzare il ricaricamento.
 */
const CACHE = 'nefrocalc-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/formulas.js', './js/bvas-data.js', './js/session.js', './js/prefs.js', './js/fields.js', './js/ui.js',
  './js/calc/idroelettrolitico.js', './js/calc/renale.js', './js/calc/trapianto.js', './js/calc/vasculiti.js',
  './js/pages/info.js', './js/pages/formule.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable.png'];

// Installazione: metto in cache tutti i file dell'app
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Attivazione: elimino le cache delle versioni precedenti
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Richieste: rispondo dalla cache; per i file non in cache vado in rete (solo stessa origine)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request)));
});
