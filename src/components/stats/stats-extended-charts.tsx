"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  DestinationCount,
  HeatmapCell,
  PeriodTrend,
} from "@/domain/stats-extended";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MAX_LEADERBOARD_ENTRIES = 10;

interface StatsExtendedChartsProps {
  heatmap: HeatmapCell[];
  byDestination: DestinationCount[];
  trend: PeriodTrend;
}

/**
 * Erweiterung "Erweiterte Statistik-Grafiken" (siehe docs/decisions.md):
 * Trendvergleich zur Vorperiode, Wochentag×Uhrzeit-Heatmap und
 * Ziel-Leaderboard — ergänzt die bestehenden `StatsCharts` (Phase 5) auf
 * `/staff/statistiken` und `/admin/statistiken`.
 */
export function StatsExtendedCharts({
  heatmap,
  byDestination,
  trend,
}: StatsExtendedChartsProps) {
  const maxCount = Math.max(1, ...heatmap.map((cell) => cell.count));
  const destinationData = byDestination
    .slice(0, MAX_LEADERBOARD_ENTRIES)
    .map((entry) => ({ label: entry.destination, Anzahl: entry.count }));

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Trend ggü. Vorperiode</h2>
        <TrendIndicator trend={trend} />
      </section>

      <section className="rounded-2xl border p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">
          Ausgänge nach Wochentag &amp; Uhrzeit
        </h2>
        <Heatmap cells={heatmap} maxCount={maxCount} />
      </section>

      <section className="rounded-2xl border p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Ziel-Leaderboard</h2>
        {destinationData.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Keine Daten im gewählten Zeitraum.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={destinationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  fontSize={12}
                />
                <Tooltip />
                <Bar dataKey="Anzahl" fill="var(--color-status-info)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: PeriodTrend }) {
  const { current, previous, deltaPercent } = trend;
  const isFlat = deltaPercent === null || deltaPercent === 0;
  const isUp = !isFlat && deltaPercent > 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const colorClass = isFlat
    ? "text-muted-foreground"
    : isUp
      ? "text-status-overdue"
      : "text-status-present";

  return (
    <div className="flex items-center gap-4">
      <Icon className={`h-8 w-8 shrink-0 ${colorClass}`} aria-hidden />
      <div>
        <p className="text-2xl font-semibold">
          {current}{" "}
          <span className="text-muted-foreground text-base font-normal">
            Ausgänge
          </span>
        </p>
        <p className="text-muted-foreground text-sm">
          Vorperiode: {previous}
          {deltaPercent !== null && (
            <>
              {" · "}
              {deltaPercent > 0 ? "+" : ""}
              {deltaPercent.toFixed(1)} %
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Heatmap({
  cells,
  maxCount,
}: {
  cells: HeatmapCell[];
  maxCount: number;
}) {
  const byKey = new Map(
    cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell.count]),
  );

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid grid-cols-[2rem_repeat(24,1.25rem)] gap-0.5">
        <div />
        {Array.from({ length: 24 }, (_, hour) => (
          <div
            key={`hour-${hour}`}
            className="text-muted-foreground text-center text-[9px] leading-4"
          >
            {hour}
          </div>
        ))}
        {WEEKDAY_LABELS.map((label, weekday) => (
          <div key={`row-${label}`} className="contents">
            <div className="text-muted-foreground flex items-center text-xs">
              {label}
            </div>
            {Array.from({ length: 24 }, (_, hour) => {
              const count = byKey.get(`${weekday}-${hour}`) ?? 0;
              const intensity =
                count === 0 ? 0 : Math.max(0.15, count / maxCount);
              return (
                <div
                  key={`cell-${weekday}-${hour}`}
                  title={`${label}, ${hour}–${hour + 1} Uhr: ${count} Ausgänge`}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor:
                      count === 0
                        ? "var(--color-border)"
                        : `color-mix(in srgb, var(--color-status-info) ${Math.round(intensity * 100)}%, transparent)`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
