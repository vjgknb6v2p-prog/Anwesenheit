import type { Metadata } from "next";
import { StatsCharts } from "@/components/stats/stats-charts";
import { StatsExtendedCharts } from "@/components/stats/stats-extended-charts";
import { StatsFilterForm } from "@/components/stats/stats-filter-form";
import { formatDuration } from "@/domain/duration";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  RESIDENTIAL_AREA_ALL,
  buildStatsExportQuery,
  parseStatsPageParams,
} from "@/lib/stats-params";
import { getExtendedStatsSummary } from "@/lib/stats-extended-queries";
import { getStatsSummary } from "@/lib/stats-queries";

export const metadata: Metadata = {
  title: "Statistiken – CheckIn",
};

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    granularity?: string;
    residentialAreaId?: string;
  }>;
}) {
  await requireRole("ADMIN");
  const params = await searchParams;
  const { from, to, granularity } = parseStatsPageParams(params);
  const residentialAreaId =
    params.residentialAreaId &&
    params.residentialAreaId !== RESIDENTIAL_AREA_ALL
      ? params.residentialAreaId
      : undefined;

  const [summary, extendedSummary, residentialAreas] = await Promise.all([
    getStatsSummary({ from, to, granularity, residentialAreaId }),
    getExtendedStatsSummary({ from, to, residentialAreaId }),
    db.residentialArea.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Statistiken</h1>

      <StatsFilterForm
        from={from}
        to={to}
        granularity={granularity}
        residentialAreas={residentialAreas}
        selectedResidentialAreaId={residentialAreaId}
        exportHref={`/api/v1/export/statistiken?${buildStatsExportQuery({ from, to, granularity, residentialAreaId }).toString()}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Abwesenheiten gesamt"
          value={String(summary.totalAbsences)}
        />
        <KpiCard
          label="Ø-Dauer"
          value={
            summary.averageDurationMs > 0
              ? formatDuration(summary.averageDurationMs)
              : "–"
          }
        />
        <KpiCard
          label="Verspätete Rückkehren"
          value={String(summary.lateReturns)}
        />
      </div>

      <StatsCharts summary={summary} granularity={granularity} />
      <StatsExtendedCharts
        heatmap={extendedSummary.heatmap}
        byDestination={extendedSummary.byDestination}
        trend={extendedSummary.trend}
      />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
