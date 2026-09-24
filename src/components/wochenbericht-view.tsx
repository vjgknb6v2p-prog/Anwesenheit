"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface WochenberichtReasonRow {
  label: string;
  count: number;
}

export interface WochenberichtStudentRow {
  userName: string;
  count: number;
}

export interface WochenberichtDayRow {
  label: string;
  count: number;
}

export interface WochenberichtViewData {
  weekLabel: string;
  residentialAreaLabel: string;
  totalAbsences: number;
  averageDurationLabel: string;
  lateReturns: number;
  byReason: WochenberichtReasonRow[];
  byStudent: WochenberichtStudentRow[];
  byDay: WochenberichtDayRow[];
  issuedAt: string;
}

/**
 * Erweiterung "Wochenbericht-PDF-Export": wie beim Beurlaubungsschein
 * (siehe docs/decisions.md) eine druckoptimierte Seite mit `window.print()`
 * statt einer eigenen PDF-Bibliothek — Tabellen statt Diagrammen, da
 * Recharts-SVGs sich browserübergreifend nicht zuverlässig drucken lassen.
 */
export function WochenberichtView({
  data,
  prevHref,
  nextHref,
  backHref,
}: {
  data: WochenberichtViewData;
  prevHref: string;
  nextHref: string;
  backHref: string;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={backHref}
          className="border-input bg-background hover:bg-accent inline-flex h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium"
        >
          Zurück
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={prevHref}
            className="border-input bg-background hover:bg-accent inline-flex h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium"
          >
            ← Vorherige Woche
          </Link>
          <Link
            href={nextHref}
            className="border-input bg-background hover:bg-accent inline-flex h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium"
          >
            Nächste Woche →
          </Link>
          <Button onClick={() => window.print()}>
            Drucken / Als PDF speichern
          </Button>
        </div>
      </div>

      <header className="flex flex-col gap-1 border-b pb-4">
        <p className="text-muted-foreground text-sm print:text-black">
          CheckIn – Internats-Ausgangsverwaltung
        </p>
        <h1 className="text-2xl font-semibold">Wochenbericht</h1>
        <p className="text-sm">
          {data.weekLabel} · {data.residentialAreaLabel}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Abwesenheiten gesamt"
          value={String(data.totalAbsences)}
        />
        <KpiCard label="Ø-Dauer" value={data.averageDurationLabel} />
        <KpiCard
          label="Verspätete Rückkehren"
          value={String(data.lateReturns)}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Abwesenheiten pro Tag</h2>
        <table className="w-full text-left text-sm">
          <tbody>
            {data.byDay.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0">
                <td className="py-1">{row.label}</td>
                <td className="py-1 text-right font-medium">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Häufigste Gründe</h2>
        {data.byReason.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Keine Abwesenheiten in dieser Woche.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {data.byReason.map((row) => (
                <tr key={row.label} className="border-b last:border-b-0">
                  <td className="py-1">{row.label}</td>
                  <td className="py-1 text-right font-medium">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Ausgänge pro Schüler</h2>
        {data.byStudent.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Keine Abwesenheiten in dieser Woche.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {data.byStudent.map((row) => (
                <tr key={row.userName} className="border-b last:border-b-0">
                  <td className="py-1">{row.userName}</td>
                  <td className="py-1 text-right font-medium">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-muted-foreground mt-4 text-sm print:text-black">
        Erstellt am {data.issuedAt} Uhr.
      </p>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm print:border-black">
      <p className="text-muted-foreground text-sm print:text-black">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
