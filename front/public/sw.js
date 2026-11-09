// Service worker minimal : sa présence (avec un gestionnaire fetch) rend l'app installable en plein écran.
// Aucun cache : tout passe par le réseau, pour ne jamais servir une ancienne version de l'app.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request));
});
