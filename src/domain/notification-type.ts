/**
 * PROMPT.md Abschnitt 8: die vom Cron-Tick automatisch erzeugten
 * Benachrichtigungsarten. `Notification.type` bleibt laut Schema ein
 * `String` (analog zu `Absence.reason`, siehe absence-reason.ts) — diese
 * Liste ist die einzige Quelle der Wahrheit für gültige Werte.
 */
export const NOTIFICATION_TYPES = [
  "REMINDER",
  "OVERDUE",
  "STAFF_OVERDUE_SUMMARY",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
