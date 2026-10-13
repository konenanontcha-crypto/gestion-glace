/* Gestion Glace v1.0.0 — service worker (application installable + hors ligne de l'interface) */
const CACHE = 'gestion-glace-v1.0.0';
const FICHIERS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, polices, CDN : toujours le réseau
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    // Page : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne
    e.respondWith(fetch(req).then(r => {
      const copie = r.clone();
      caches.open(CACHE).then(c => c.put(req, copie));
      return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const lien = (e.notification.data && e.notification.data.lien) || 'alertes';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(liste => {
    for (const c of liste) {
      if ('focus' in c) { c.navigate ? c.navigate('./index.html#/' + lien) : null; return c.focus(); }
    }
    return self.clients.openWindow('./index.html#/' + lien);
  }));
});
