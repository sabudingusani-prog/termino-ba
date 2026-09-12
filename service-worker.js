self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: "TERMINO",
      body: event.data ? event.data.text() : "Nova rezervacija"
    };
  }

  const title = data.title || "TERMINO";

  const options = {
    body: data.body || "🔔 Nova rezervacija",
    icon: "/termino-ba/icon-192.png",
    badge: "/termino-ba/icon-192.png",
    data: {
      url: data.url || "/termino-ba/dashboard.html"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url =
    event.notification.data?.url ||
    "/termino-ba/dashboard.html";

  event.waitUntil(
    clients.openWindow(url)
  );
});