import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CheckIn – Internats-Ausgangsverwaltung",
  description:
    "Digitale Ausgangsverwaltung für Internate: aus- und einchecken, Übersicht für Mitarbeiter und Admins.",
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
        {children}
      </body>
    </html>
  );
}
