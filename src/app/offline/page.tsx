import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline – CheckIn",
};

/**
 * PROMPT.md Abschnitt 9 (Phase 6): "Offline-Fallback." Der Service Worker
 * (public/sw.js) liefert diese Seite aus dem Cache aus, wenn eine
 * Navigation ohne Netzverbindung fehlschlägt — daher bewusst statisch, ohne
 * `requireRole()`/DB-Zugriff (beides würde offline ohnehin fehlschlagen).
 * Öffentlich erreichbar (siehe PUBLIC_PATHS in src/auth.config.ts), damit
 * der Service Worker sie beim Installieren unabhängig vom Login-Status
 * cachen kann.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Keine Verbindung</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        CheckIn ist gerade nicht erreichbar. Bitte überprüfe deine
        Internetverbindung und versuche es erneut.
      </p>
    </main>
  );
}
