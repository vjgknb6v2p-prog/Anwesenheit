import type { NotificationType } from "./notification-type";

/**
 * PROMPT.md Abschnitt 8: "Erinnerungen (reminderMinutesBefore),
 * Überfälligkeits-Meldungen und die Mitarbeiter-Sammelmeldung." Reine
 * Entscheidungsfunktionen (keine DB, kein Versand) — der Cron-Tick
 * (`src/app/api/v1/cron/tick/route.ts`) lädt die Daten und wendet diese
 * Regeln an; Idempotenz selbst wird dort über den DB-Unique-Index
 * `[userId, type, sourceId]` erzwungen, nicht hier.
 */
export interface ActiveAbsenceForNotifications {
  id: string;
  plannedReturnAt: Date;
}

/**
 * Erinnerung, wenn die geplante Rückkehr in höchstens `reminderMinutesBefore`
 * Minuten ansteht, aber noch nicht überschritten ist.
 */
export function shouldSendReminder(
  absence: ActiveAbsenceForNotifications,
  now: Date,
  reminderMinutesBefore: number,
): boolean {
  const msUntilReturn = absence.plannedReturnAt.getTime() - now.getTime();
  return msUntilReturn > 0 && msUntilReturn <= reminderMinutesBefore * 60_000;
}

/**
 * Überfälligkeits-Meldung erst nach Ablauf der Karenzzeit
 * (`overdueGraceMinutes`), nicht bei jeder minimalen Überschreitung. Gibt
 * dem bis Phase 6 ungenutzten Setting `overdueGraceMinutes` (PROMPT.md
 * Abschnitt 4) damit seine Bedeutung — `deriveStatus()` selbst bleibt davon
 * unberührt, der angezeigte Status kippt weiterhin exakt bei
 * `plannedReturnAt` (Abschnitt 3). Siehe docs/decisions.md.
 */
export function shouldSendOverdueNotice(
  absence: ActiveAbsenceForNotifications,
  now: Date,
  overdueGraceMinutes: number,
): boolean {
  const msOverdue = now.getTime() - absence.plannedReturnAt.getTime();
  return msOverdue >= overdueGraceMinutes * 60_000;
}

/**
 * Rundet `date` auf den Beginn der aktuellen UTC-Stunde — das Dedupe-Fenster
 * für die Mitarbeiter-Sammelmeldung. Ohne dieses Fenster würde ein alle 5
 * Minuten laufender Cron-Tick (Abschnitt 8) bei weiterhin überfälligen
 * Schülern bis zu 12 identische Meldungen pro Stunde erzeugen.
 */
export function hourBucketKey(date: Date): string {
  const bucket = new Date(date);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket.toISOString();
}

export interface NotificationContent {
  type: NotificationType;
  sourceId: string;
  title: string;
  message: string;
}

/** `formattedReturnTime` wird vom Aufrufer übergeben (z. B. `formatTime()`
 * aus `src/lib/time.ts`) — Domänenfunktionen importieren bewusst nichts aus
 * `src/lib/`, damit sie ohne I/O-nahe Abhängigkeiten testbar bleiben (siehe
 * dasselbe Muster in `quick-return-times.ts`). */
export function buildReminderNotification(
  absence: ActiveAbsenceForNotifications,
  formattedReturnTime: string,
): NotificationContent {
  return {
    type: "REMINDER",
    sourceId: absence.id,
    title: "Erinnerung",
    message: `Deine geplante Rückkehr ist um ${formattedReturnTime} Uhr.`,
  };
}

export function buildOverdueNotification(
  absence: ActiveAbsenceForNotifications,
  formattedReturnTime: string,
): NotificationContent {
  return {
    type: "OVERDUE",
    sourceId: absence.id,
    title: "Überfällig",
    message: `Deine geplante Rückkehrzeit (${formattedReturnTime} Uhr) ist überschritten.`,
  };
}

/** Text exakt nach PROMPT.md Abschnitt 8 ("3 Schüler sind aktuell überfällig."). */
export function buildStaffOverdueSummary(
  overdueCount: number,
  now: Date,
): NotificationContent {
  return {
    type: "STAFF_OVERDUE_SUMMARY",
    sourceId: hourBucketKey(now),
    title: "Überfällige Schüler",
    message:
      overdueCount === 1
        ? "1 Schüler ist aktuell überfällig."
        : `${overdueCount} Schüler sind aktuell überfällig.`,
  };
}
