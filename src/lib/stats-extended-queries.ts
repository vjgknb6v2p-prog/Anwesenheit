import {
  buildWeekdayHourHeatmap,
  computeTrend,
  countByDestination,
  type DestinationCount,
  type HeatmapCell,
  type PeriodTrend,
} from "@/domain/stats-extended";
import { db } from "@/lib/db";

export interface ExtendedStatsSummary {
  heatmap: HeatmapCell[];
  byDestination: DestinationCount[];
  trend: PeriodTrend;
}

/**
 * Erweiterung "Erweiterte Statistik-Grafiken": lädt dieselbe Absence-Menge
 * wie `getStatsSummary` (identischer Zeitraum/Wohnbereichs-Filter) für die
 * Heatmap und das Ziel-Leaderboard, plus die unmittelbar vorangehende
 * Periode gleicher Länge für den Trendvergleich (Vorwoche/Vormonat, je nach
 * gewähltem Zeitraum).
 */
export async function getExtendedStatsSummary({
  from,
  to,
  residentialAreaId,
}: {
  from: Date;
  to: Date;
  residentialAreaId?: string | null;
}): Promise<ExtendedStatsSummary> {
  const periodMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - periodMs);

  const [absences, previousCount] = await Promise.all([
    db.absence.findMany({
      where: {
        checkedOutAt: { gte: from, lte: to },
        ...(residentialAreaId ? { user: { residentialAreaId } } : {}),
      },
      select: { checkedOutAt: true, destination: true, status: true },
    }),
    db.absence.count({
      where: {
        checkedOutAt: { gte: previousFrom, lte: previousTo },
        status: { not: "CANCELLED" },
        ...(residentialAreaId ? { user: { residentialAreaId } } : {}),
      },
    }),
  ]);

  const currentCount = absences.filter(
    (absence) => absence.status !== "CANCELLED",
  ).length;

  return {
    heatmap: buildWeekdayHourHeatmap(absences),
    byDestination: countByDestination(absences),
    trend: computeTrend(currentCount, previousCount),
  };
}
