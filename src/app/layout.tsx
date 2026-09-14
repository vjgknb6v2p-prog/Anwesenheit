import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "CheckIn – Internats-Ausgangsverwaltung",
  description:
    "Digitale Ausgangsverwaltung für Internate: aus- und einchecken, Übersicht für Mitarbeiter und Admins.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    // Auf iOS ist "Zum Home-Bildschirm hinzufügen" die einzige Möglichkeit,
    // die App im Vollbild (und damit Web-Push-fähig ab iOS 16.4+) zu nutzen
    // — siehe InstallPromptBanner (PROMPT.md Abschnitt 8).
    capable: true,
    statusBarStyle: "default",
    title: "CheckIn",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

// #2563eb: dieselbe Hex-Näherung an --status-info wie in manifest.ts/den
// Icon-Routen (siehe docs/decisions.md).
export const viewport: Viewport = {
  themeColor: "#2563eb",
};

// Verhindert einen Theme-Flash: liest die manuell gewählte Dark-Mode-
// Präferenz (siehe src/components/theme-toggle.tsx) synchron vor dem ersten
// Paint, bevor React hydriert. Ohne gespeicherte Präferenz greift weiterhin
// `prefers-color-scheme` (globals.css).
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("checkin-theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
