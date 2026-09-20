// SAHAYAK Campus Lost & Found Service Worker for Browser Push Notifications
const SW_VERSION = 'sahayak-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push events if triggered by backend push service
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'SAHAYAK — Campus Lost & Found Alert';
  const options = {
    body: data.body || 'You have a new update regarding your reported item.',
    icon: data.icon || '/logo.svg',
    badge: '/logo.svg',
    tag: data.tag || 'sahayak-notification',
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click: bring SAHAYAK app window to front and open item chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const itemId = notifData.itemId;
  const targetUrl = itemId ? `/?openItemChat=${encodeURIComponent(itemId)}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and post a message to open the chat
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'SAHAYAK_NOTIFICATION_CLICK',
            itemId: itemId,
            messageId: notifData.messageId,
          });
          return client.focus();
        }
      }

      // If no window is open, open a new tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
