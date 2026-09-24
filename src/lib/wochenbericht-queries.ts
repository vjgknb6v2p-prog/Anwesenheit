import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { formatDuration } from "@/domain/duration";
import type { AbsenceReason } from "@/domain/absence-reason";
import { APP_TIMEZONE } from "@/domain/quick-return-times";
import type { StatsSummary } from "@/domain/stats";
import { getWeekRange, type WeekRange } from "@/domain/week";
import { getStatsSummary } from "@/lib/stats-queries";
import { formatDate } from "@/lib/time";
import type { WochenberichtViewData } from "@/components/wochenbericht-view";

const REASON_LABELS: Record<AbsenceReason, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export interface WochenberichtData {
  week: WeekRange;
  residentialAreaName: string | null;
  summary: StatsSummary;
}

/**
 * Erweiterung "Wochenbericht-PDF-Export": aggregiert dieselbe Statistik-Logik
 * aus Phase 5 (`getStatsSummary`, Granularität "day") auf genau eine Woche
 * (Montag–Sonntag, Europe/Berlin) statt eines frei wählbaren Zeitraums —
 * bewusst keine eigene Aggregation, um die etablierte, unit-getestete
 * `buildStatsSummary()`-Logik wiederzuverwenden.
 */
export async function getWochenberichtData({
  referenceDate,
  weekOffset = 0,
  residentialAreaId,
  residentialAreaName,
}: {
  referenceDate: Date;
  weekOffset?: number;
  residentialAreaId?: string | null;
  residentialAreaName?: string | null;
}): Promise<WochenberichtData> {
  const week = getWeekRange(referenceDate, weekOffset);
  const summary = await getStatsSummary({
    from: week.from,
    to: new Date(week.to.getTime() - 1),
    granularity: "day",
    residentialAreaId,
  });

  return {
    week,
    residentialAreaName: residentialAreaName ?? null,
    summary,
  };
}

/**
 * Formatiert die rohen Aggregationsdaten für die Druckansicht
 * (`WochenberichtView`) — inkl. aller 7 Wochentage (auch mit 0 Abwesenheiten),
 * da `summary.byPeriod` nur Tage mit mindestens einer Abwesenheit enthält.
 */
export function toWochenberichtViewData(
  data: WochenberichtData,
): WochenberichtViewData {
  const countsByDay = new Map(
    data.summary.byPeriod.map((entry) => [
      entry.periodStart.getTime(),
      entry.count,
    ]),
  );

  // Tagesgrenzen über Europe/Berlin-Kalendertage (nicht +24h in echter UTC-
  // Zeit) berechnet — konsistent mit `periodStart()` in `src/domain/stats.ts`,
  // damit die Zuordnung auch in DST-Wechsel-Wochen exakt mit den Buckets in
  // `summary.byPeriod` übereinstimmt.
  const weekStartZoned = toZonedTime(data.week.from, APP_TIMEZONE);
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const dayZoned = new Date(weekStartZoned);
    dayZoned.setUTCDate(dayZoned.getUTCDate() + i);
    const dayStart = fromZonedTime(dayZoned, APP_TIMEZONE);
    return {
      label: `${WEEKDAY_LABELS[i]}, ${formatDate(dayStart)}`,
      count: countsByDay.get(dayStart.getTime()) ?? 0,
    };
  });

  return {
    weekLabel: `${formatDate(data.week.from)} – ${formatDate(new Date(data.week.to.getTime() - 1))}`,
    residentialAreaLabel: data.residentialAreaName ?? "Alle Wohnbereiche",
    totalAbsences: data.summary.totalAbsences,
    averageDurationLabel:
      data.summary.averageDurationMs > 0
        ? formatDuration(data.summary.averageDurationMs)
        : "–",
    lateReturns: data.summary.lateReturns,
    byReason: data.summary.byReason.map((entry) => ({
      label: REASON_LABELS[entry.reason] ?? entry.reason,
      count: entry.count,
    })),
    byStudent: data.summary.byStudent.map((entry) => ({
      userName: entry.userName,
      count: entry.count,
    })),
    byDay,
    issuedAt: formatDate(new Date()),
  };
}
