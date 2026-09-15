/**
 * PROMPT.md Abschnitt 3.7: "Dauer wird immer berechnet (checkedInAt ?? now()
 * minus checkedOutAt), nie gespeichert." Reine Funktion, damit Dashboard,
 * Historie und spätere Statistiken (Phase 5) exakt dieselbe Berechnung
 * verwenden.
 */
export function computeDurationMs(
  checkedOutAt: Date,
  checkedInAt: Date | null,
  now: Date,
): number {
  const end = checkedInAt ?? now;
  return end.getTime() - checkedOutAt.getTime();
}

/** Formatiert eine Dauer in Millisekunden als "Xh Ym" (bzw. nur "Ym" unter 1h). */
export function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}min`;
  }
  return `${hours}h ${minutes}min`;
}
