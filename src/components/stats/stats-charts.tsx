"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatsGranularity, StatsSummary } from "@/domain/stats";
import { formatDate } from "@/lib/time";

const REASON_LABELS: Record<string, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

interface StatsChartsProps {
  summary: StatsSummary;
  granularity: StatsGranularity;
}

/**
 * PROMPT.md Abschnitt 9 (Phase 5): "Diagramme responsiv." `ResponsiveContainer`
 * (Recharts) füllt die Breite des Elternelements — funktioniert damit sowohl
 * auf Tablet (Mitarbeiter/Admin-Zielgeräte, siehe PROMPT.md Abschnitt 1) als
 * auch bei schmalen Fenstern. Bekommt vorab am Server aggregierte,
 * serialisierbare Daten — kein DB-Zugriff im Client.
 */
export function StatsCharts({ summary, granularity }: StatsChartsProps) {
  const periodData = summary.byPeriod.map((entry) => ({
    label: formatDate(entry.periodStart),
    Abwesenheiten: entry.count,
  }));
  const reasonData = summary.byReason.map((entry) => ({
    label: REASON_LABELS[entry.reason] ?? entry.reason,
    Anzahl: entry.count,
  }));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">
          Abwesenheiten pro {granularityLabel(granularity)}
        </h2>
        {periodData.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="Abwesenheiten" fill="var(--color-status-info)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Häufigste Gründe</h2>
        {reasonData.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  fontSize={12}
                />
                <Tooltip />
                <Bar dataKey="Anzahl" fill="var(--color-status-present)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Ausgänge pro Schüler</h2>
        {summary.byStudent.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {summary.byStudent.map((entry) => (
              <li
                key={entry.userId}
                className="flex items-center justify-between border-b py-1.5 last:border-b-0"
              >
                <span>{entry.userName}</span>
                <span className="font-medium">{entry.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function granularityLabel(granularity: StatsGranularity): string {
  switch (granularity) {
    case "day":
      return "Tag";
    case "week":
      return "Woche";
    case "month":
      return "Monat";
  }
}

function EmptyState() {
  return (
    <p className="text-muted-foreground text-sm">
      Keine Daten im gewählten Zeitraum.
    </p>
  );
}
