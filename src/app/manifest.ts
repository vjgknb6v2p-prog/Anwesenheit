import type { MetadataRoute } from "next";

// Next.js serviert diese Datei automatisch unter "/manifest.webmanifest"
// mit korrektem Content-Type (siehe PUBLIC_PATHS in src/auth.config.ts,
// damit die Middleware sie unabhängig vom Login-Status ausliefert).
// #2563eb: fixe Hex-Näherung an --status-info (oklch, src/app/globals.css)
// — manifest.theme_color erfordert einen konkreten CSS-Farbwert, siehe
// docs/decisions.md.
export default function manifest(): MetadataRoute.Manifest {
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
