/**
 * PROMPT.md Abschnitt 9 (Phase 7): "Löschkonzept ... Hard-Delete-Job für
 * Abwesenheiten älter als konfigurierbare Aufbewahrungsfrist." Reine
 * Entscheidungsfunktion — der Cron-Route-Handler
 * (`src/app/api/v1/cron/cleanup/route.ts`) lädt die Daten und löscht.
 */
export interface AbsenceForRetention {
  checkedOutAt: Date;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

/**
 * Nur abgeschlossene oder stornierte Abwesenheiten sind Kandidaten für den
 * Hard-Delete — eine `ACTIVE`-Abwesenheit darf nie gelöscht werden, egal wie
 * alt `checkedOutAt` ist (sie ist noch nicht abgeschlossen). Das Alter
 * bemisst sich an `checkedOutAt`, dem Beginn des Vorgangs.
 */
export function isEligibleForHardDelete(
  absence: AbsenceForRetention,
  now: Date,
  retentionMonths: number,
): boolean {
  if (absence.status === "ACTIVE") {
    return false;
  }
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  return absence.checkedOutAt.getTime() < cutoff.getTime();
}
