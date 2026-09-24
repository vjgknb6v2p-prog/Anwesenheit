import { toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "./quick-return-times";

type AbsenceStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

/**
 * Erweiterung "Erweiterte Statistik-Grafiken" (siehe docs/decisions.md):
 * Heatmap, Ziel-Leaderboard und Trendvergleich als eigene, bewusst von
 * `stats.ts` getrennte Eingabetypen (schlanker, nur die je Funktion
 * benötigten Felder) — dieselbe Konvention wie `domain/calendar.ts`.
 */
export interface HeatmapAbsenceInput {
  checkedOutAt: Date;
  status: AbsenceStatus;
}

export interface HeatmapCell {
  /** 0 = Montag … 6 = Sonntag. */
  weekday: number;
  /** Stunde in Europe/Berlin, 0–23. */
  hour: number;
  count: number;
}

const WEEKDAYS_PER_WEEK = 7;
const HOURS_PER_DAY = 24;

/**
 * Verteilung der Ausgänge über Wochentag × Uhrzeit (Europe/Berlin) — zeigt
 * z. B. Ausgangs-Schwerpunkte am Wochenende/Nachmittag. Liefert immer alle
 * 7×24 = 168 Zellen (auch mit `count: 0`), damit die Heatmap-Komponente ein
 * lückenloses Raster rendern kann. Stornierte Abwesenheiten fließen nicht
 * ein (dieselbe Konvention wie in `stats.ts`).
 */
export function buildWeekdayHourHeatmap(
  absences: readonly HeatmapAbsenceInput[],
): HeatmapCell[] {
  const counts = new Map<string, number>();
  for (const absence of absences) {
    if (absence.status === "CANCELLED") {
      continue;
    }
    const zoned = toZonedTime(absence.checkedOutAt, APP_TIMEZONE);
    const weekday = (zoned.getUTCDay() + 6) % 7; // Montag=0 … Sonntag=6
    const hour = zoned.getUTCHours();
    const key = `${weekday}-${hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const cells: HeatmapCell[] = [];
  for (let weekday = 0; weekday < WEEKDAYS_PER_WEEK; weekday++) {
    for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
      cells.push({
        weekday,
        hour,
        count: counts.get(`${weekday}-${hour}`) ?? 0,
      });
    }
  }
  return cells;
}

export interface DestinationAbsenceInput {
  destination: string;
  status: AbsenceStatus;
}

export interface DestinationCount {
  destination: string;
  count: number;
}

/** Häufigste Ziele ("Ziel-Leaderboard"), absteigend, Gleichstand alphabetisch. */
export function countByDestination(
  absences: readonly DestinationAbsenceInput[],
): DestinationCount[] {
  const counts = new Map<string, number>();
  for (const absence of absences) {
    if (absence.status === "CANCELLED") {
      continue;
    }
    counts.set(absence.destination, (counts.get(absence.destination) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([destination, count]) => ({ destination, count }))
    .sort(
      (a, b) =>
        b.count - a.count || a.destination.localeCompare(b.destination, "de"),
    );
}

export interface PeriodTrend {
  current: number;
  previous: number;
  /**
   * Prozentuale Veränderung ggü. der Vorperiode. `null`, wenn nicht sinnvoll
   * berechenbar (Vorperiode war 0, aktuelle Periode nicht) — anstelle einer
   * irreführenden "+∞ %"-Anzeige (Designentscheidung).
   */
  deltaPercent: number | null;
}

/** Vergleicht die aktuelle Periode mit der unmittelbar vorangehenden (Vorwoche/Vormonat). */
export function computeTrend(current: number, previous: number): PeriodTrend {
  if (previous === 0) {
    return { current, previous, deltaPercent: current === 0 ? 0 : null };
  }
  return {
    current,
    previous,
    deltaPercent: ((current - previous) / previous) * 100,
  };
}
