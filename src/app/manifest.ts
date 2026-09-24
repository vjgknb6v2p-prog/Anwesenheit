import type { MetadataRoute } from "next";
import { getSessionUser } from "@/lib/authz";

/**
 * App-Shortcuts (Homescreen-Icon lang drücken/rechtsklicken) — pro Rolle
 * unterschiedlich, da `manifest()` als Route Handler pro Request läuft und
 * damit die Session lesen darf (PWA-Erweiterung, siehe docs/decisions.md).
 * Kein direktes "Auschecken mit 1 Klick" ohne App-Öffnung möglich (Grund/
 * Zeit müssen ausgewählt werden) — die Shortcuts verkürzen aber den Weg zur
 * jeweils wichtigsten Aktion.
 */
async function buildShortcuts(): Promise<MetadataRoute.Manifest["shortcuts"]> {
  const user = await getSessionUser();

  if (user?.role === "ADMIN") {
    return [
      { name: "Live-Übersicht", url: "/admin" },
      { name: "Nachrichten", url: "/admin/nachrichten" },
      { name: "Statistiken", url: "/admin/statistiken" },
    ];
  }
  if (user?.role === "STAFF") {
    return [
      { name: "Abwesend", url: "/staff/abwesend" },
      { name: "Überfällig", url: "/staff/ueberfaellig" },
      { name: "Nachrichten", url: "/staff/nachrichten" },
    ];
  }
  return [
    { name: "Aus-/Einchecken", url: "/" },
    { name: "Nachrichten", url: "/nachrichten" },
    { name: "Historie", url: "/abwesenheiten" },
  ];
}

// Next.js serviert diese Datei automatisch unter "/manifest.webmanifest"
// mit korrektem Content-Type (siehe PUBLIC_PATHS in src/auth.config.ts,
// damit die Middleware sie unabhängig vom Login-Status ausliefert).
// #2563eb: fixe Hex-Näherung an --status-info (oklch, src/app/globals.css)
// — manifest.theme_color erfordert einen konkreten CSS-Farbwert, siehe
// docs/decisions.md.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const shortcuts = await buildShortcuts();
  return {
    name: "CheckIn – Internats-Ausgangsverwaltung",
    short_name: "CheckIn",
    description:
      "Digitale Ausgangsverwaltung für Internate: aus- und einchecken, Übersicht für Mitarbeiter und Admins.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    lang: "de",
    shortcuts,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
