self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? '練習リマインダー';
  const body = data.body ?? '来週の練習を登録しましょう';
  const url = data.url ?? '/schedule';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/og-image.jpg',
      badge: '/og-image.jpg',
      data: { url },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/schedule';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
