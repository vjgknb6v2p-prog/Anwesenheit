"use client";

import { useEffect } from "react";

/**
 * Registriert `public/sw.js` (siehe dort). Reiner Effekt ohne UI — läuft
 * einmalig im Root-Layout für alle Rollen, da Offline-Fallback und Web Push
 * (Abschnitt 8) nicht auf Schüler beschränkt sind. Kein Fehler, falls
 * Service Worker nicht unterstützt werden (Abschnitt 8: "Kein Fehler, wenn
 * Push nicht verfügbar ist" — dieselbe Toleranz gilt für PWA-Grundfunktionen).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registrierung fehlgeschlagen (z. B. eingeschränkter Browser-Modus) —
      // die App bleibt ohne Offline-Fallback/Push voll nutzbar.
    });
  }, []);

  return null;
}
