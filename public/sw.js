// Hand geschriebener Service Worker (kein next-pwa/Workbox-Build-Plugin —
// next-pwa hakt sich per Webpack-Konfiguration in den Build ein, dieses
// Projekt baut aber mit `next build --turbopack`, wo Webpack-Konfiguration
// nicht ausgeführt wird. Siehe docs/decisions.md).
//
// Bewusst minimal: fast der gesamte Inhalt der App ist personenbezogen und
// live (Status, Live-Übersicht, Benachrichtigungen) — aggressives Caching
// würde veraltete/falsche Daten anzeigen. Gecacht wird daher nur das für
// den Offline-Fallback nötige Minimum (PROMPT.md Abschnitt 9: "Manifest,
// Service Worker, Offline-Fallback").
const CACHE_VERSION = "checkin-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Nur Navigationen (Seitenaufrufe) bekommen einen Offline-Fallback — API-/
// Server-Action-Requests sollen bei fehlendem Netz normal fehlschlagen,
// statt eine HTML-Seite als "Antwort" zu erhalten.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(
      () => caches.match(OFFLINE_URL) ?? Response.error(),
    ),
  );
});

// PROMPT.md Abschnitt 8: Web Push zusätzlich zu In-App-Benachrichtigungen.
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "CheckIn", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "CheckIn", {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow("/");
      }),
  );
});
