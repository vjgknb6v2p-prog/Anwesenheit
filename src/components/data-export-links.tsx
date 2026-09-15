const LINK_CLASSES =
  "border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-11 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition-colors";

/**
 * Rechte-Matrix (PROMPT.md Abschnitt 5): "Eigene Daten exportieren
 * (JSON/CSV)" gilt für alle drei Rollen gleichermaßen — dieselbe
 * Komponente auf `/profil` (Schüler) sowie den Benachrichtigungsseiten für
 * Mitarbeiter/Admin (siehe docs/decisions.md).
 */
export function DataExportLinks() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border p-4 shadow-sm">
      <p className="text-sm font-medium">Eigene Daten exportieren</p>
      <p className="text-muted-foreground text-sm">
        Lade eine Kopie deiner gespeicherten Daten herunter (Profil,
        Abwesenheiten, Benachrichtigungen).
      </p>
      <div className="flex gap-2">
        <a
          href="/api/v1/export/eigene-daten?format=json"
          className={LINK_CLASSES}
        >
          Als JSON
        </a>
        <a
          href="/api/v1/export/eigene-daten?format=csv"
          className={LINK_CLASSES}
        >
          Als CSV
        </a>
      </div>
    </div>
  );
}
