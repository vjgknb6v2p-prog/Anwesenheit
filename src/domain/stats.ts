import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { AbsenceReason } from "./absence-reason";
import { computeDurationMs } from "./duration";
import { APP_TIMEZONE } from "./quick-return-times";

/**
 * PROMPT.md Abschnitt 9 (Phase 5): "Abwesenheiten pro Tag/Woche/Monat,
 * Ø-Dauer, Anzahl verspäteter Rückkehren, häufigste Gründe, Ausgänge pro
 * Schüler." Alle Funktionen hier sind rein (keine DB, kein `now()`) und
 * unit-testbar gegen feste Fixtures — die DB-Abfrage lebt in
 * `src/lib/stats-queries.ts`.
 *
 * Nur die für Aggregationen nötigen Felder einer Absence, damit die
 * Funktionen ohne Prisma-Typen testbar sind.
 */
export interface AbsenceStatsInput {
  userId: string;
  userName: string;
  reason: AbsenceReason;
  checkedOutAt: Date;
  plannedReturnAt: Date;
  checkedInAt: Date | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export type StatsGranularity = "day" | "week" | "month";

export interface PeriodCount {
  periodStart: Date;
  count: number;
}

export interface ReasonCount {
  reason: AbsenceReason;
  count: number;
}

export interface StudentCount {
  userId: string;
  userName: string;
  count: number;
}

export interface StatsSummary {
  totalAbsences: number;
  averageDurationMs: number;
  lateReturns: number;
  byReason: ReasonCount[];
  byStudent: StudentCount[];
  byPeriod: PeriodCount[];
}

/**
 * Stornierte Abwesenheiten haben nicht stattgefunden und fließen in keine
 * Statistik ein (Designentscheidung, siehe docs/decisions.md).
 */
function excludeCancelled(
  absences: readonly AbsenceStatsInput[],
): AbsenceStatsInput[] {
  return absences.filter((absence) => absence.status !== "CANCELLED");
}

/**
 * Beginn des Buckets (Tag/Woche/Monat), zu dem `date` in `Europe/Berlin`
 * gehört — als tatsächlicher UTC-Zeitpunkt. Analog zum Muster in
 * `quick-return-times.ts`: UTC-Getter/-Setter auf dem per `toZonedTime`
 * verschobenen Datum, damit das Ergebnis unabhängig von der Systemzeitzone
 * des ausführenden Prozesses ist. Wochen beginnen montags (ISO).
 */
function periodStart(date: Date, granularity: StatsGranularity): Date {
  const zoned = toZonedTime(date, APP_TIMEZONE);
  if (granularity === "month") {
    zoned.setUTCDate(1);
  } else if (granularity === "week") {
    const isoWeekday = ((zoned.getUTCDay() + 6) % 7) + 1; // Montag=1 … Sonntag=7
    zoned.setUTCDate(zoned.getUTCDate() - (isoWeekday - 1));
  }
  zoned.setUTCHours(0, 0, 0, 0);
  return fromZonedTime(zoned, APP_TIMEZONE);
}

/** Abwesenheiten pro Tag/Woche/Monat, aufsteigend nach Zeitraum sortiert. */
export function groupAbsencesByPeriod(
  absences: readonly AbsenceStatsInput[],
  granularity: StatsGranularity,
): PeriodCount[] {
  const buckets = new Map<number, PeriodCount>();
  for (const absence of excludeCancelled(absences)) {
    const start = periodStart(absence.checkedOutAt, granularity);
    const key = start.getTime();
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      buckets.set(key, { periodStart: start, count: 1 });
    }
  }
  return [...buckets.values()].sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
  );
}

/**
 * Ø-Dauer nur über bereits abgeschlossene Rückkehren (`checkedInAt` gesetzt)
 * — bei einer noch laufenden (`ACTIVE`) Abwesenheit ist die Dauer nicht
 * final und würde den Durchschnitt künstlich verzerren (Designentscheidung).
 */
export function computeAverageDurationMs(
  absences: readonly AbsenceStatsInput[],
): number {
  const completed = excludeCancelled(absences).filter(
    (absence) => absence.checkedInAt !== null,
  );
  if (completed.length === 0) {
    return 0;
  }
  const total = completed.reduce(
    (sum, absence) =>
      sum +
      computeDurationMs(
        absence.checkedOutAt,
        absence.checkedInAt,
        absence.checkedInAt!,
      ),
    0,
  );
  return total / completed.length;
}

/**
 * Anzahl der abgeschlossenen Abwesenheiten, deren tatsächliche Rückkehr nach
 * der geplanten lag. Aktuell überfällige, aber noch nicht zurückgekehrte
 * (`ACTIVE`) Abwesenheiten zählen hier bewusst nicht mit — sie sind kein
 * abgeschlossener Fall (Designentscheidung).
 */
export function countLateReturns(
  absences: readonly AbsenceStatsInput[],
): number {
  return excludeCancelled(absences).filter(
    (absence) =>
      absence.checkedInAt !== null &&
      absence.checkedInAt.getTime() > absence.plannedReturnAt.getTime(),
  ).length;
}

/** Häufigste Gründe, absteigend sortiert (Gleichstand: alphabetisch nach Grund). */
export function countByReason(
  absences: readonly AbsenceStatsInput[],
): ReasonCount[] {
  const counts = new Map<AbsenceReason, number>();
  for (const absence of excludeCancelled(absences)) {
    counts.set(absence.reason, (counts.get(absence.reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

/** Ausgänge pro Schüler, absteigend sortiert (Gleichstand: alphabetisch nach Namen). */
export function countAbsencesPerStudent(
  absences: readonly AbsenceStatsInput[],
): StudentCount[] {
  const counts = new Map<string, StudentCount>();
  for (const absence of excludeCancelled(absences)) {
    const existing = counts.get(absence.userId);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(absence.userId, {
        userId: absence.userId,
        userName: absence.userName,
        count: 1,
      });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.userName.localeCompare(b.userName, "de"),
  );
}

/** Kombiniert alle Kennzahlen zu einer Zusammenfassung für Seite und CSV-Export. */
export function buildStatsSummary(
  absences: readonly AbsenceStatsInput[],
  granularity: StatsGranularity,
): StatsSummary {
  const relevant = excludeCancelled(absences);
  return {
    totalAbsences: relevant.length,
    averageDurationMs: computeAverageDurationMs(absences),
    lateReturns: countLateReturns(absences),
    byReason: countByReason(absences),
    byStudent: countAbsencesPerStudent(absences),
    byPeriod: groupAbsencesByPeriod(absences, granularity),
  };
}
