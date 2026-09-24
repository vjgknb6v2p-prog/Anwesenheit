import type { Metadata } from "next";
import { StatsCharts } from "@/components/stats/stats-charts";
import { StatsExtendedCharts } from "@/components/stats/stats-extended-charts";
import { StatsFilterForm } from "@/components/stats/stats-filter-form";
import { formatDuration } from "@/domain/duration";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import {
  buildStatsExportQuery,
  parseStatsPageParams,
} from "@/lib/stats-params";
import { getExtendedStatsSummary } from "@/lib/stats-extended-queries";
import { getStatsSummary } from "@/lib/stats-queries";

export const metadata: Metadata = {
  title: "Statistiken – CheckIn",
};

/**
 * Rechte-Matrix (PROMPT.md Abschnitt 5): Mitarbeiter sehen Statistiken nur
 * für den eigenen Wohnbereich — im Gegensatz zu `/admin/statistiken` gibt es
 * hier daher keinen Wohnbereichs-Filter, `residentialAreaId` wird serverseitig
 * fest auf den Wohnbereich des angemeldeten Mitarbeiters gesetzt.
 */
export default async function StaffStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; granularity?: string }>;
}) {
  const staffUser = await requireRole("STAFF", "ADMIN");
  const params = await searchParams;
  const { from, to, granularity } = parseStatsPageParams(params);

  const dbUser = await db.user.findUnique({
    where: { id: staffUser.id },
    select: {
      residentialAreaId: true,
      residentialArea: { select: { name: true } },
    },
  });

  if (!dbUser?.residentialAreaId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Statistiken</h1>
        <p className="text-muted-foreground text-sm">
          Dir ist kein Wohnbereich zugewiesen — bitte einen Admin bitten, dies
          in der Benutzerverwaltung nachzutragen.
        </p>
      </div>
    );
  }

  const [summary, extendedSummary] = await Promise.all([
    getStatsSummary({
      from,
      to,
      granularity,
      residentialAreaId: dbUser.residentialAreaId,
    }),
    getExtendedStatsSummary({
      from,
      to,
      residentialAreaId: dbUser.residentialAreaId,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Statistiken</h1>
        <p className="text-muted-foreground text-sm">
          Wohnbereich: {dbUser.residentialArea?.name}
        </p>
      </div>

      <StatsFilterForm
        from={from}
        to={to}
        granularity={granularity}
        exportHref={`/api/v1/export/statistiken?${buildStatsExportQuery({ from, to, granularity }).toString()}`}
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
