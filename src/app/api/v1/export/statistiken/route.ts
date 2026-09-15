import type { NextRequest } from "next/server";
import { formatDuration } from "@/domain/duration";
import { requireApiRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { RESIDENTIAL_AREA_ALL, parseStatsPageParams } from "@/lib/stats-params";
import { getStatsSummary } from "@/lib/stats-queries";
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

/** Escaped ein CSV-Feld nach RFC 4180 (Komma/Anführungszeichen/Zeilenumbruch → quoten). */
function csvField(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(csvField).join(",") + "\r\n";
}

/**
 * CSV-Export der Statistiken (PROMPT.md Abschnitt 9, Phase 5). Kein
 * zusätzliches CSV-Package nötig — das Format hier ist einfach genug für
 * manuelles, RFC-4180-konformes Escaping. Nutzt dieselbe Aggregation wie die
 * Seiten (`getStatsSummary`), damit Export und Anzeige nie auseinanderlaufen.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireApiRole("STAFF", "ADMIN");
  if ("response" in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams);
  const { from, to, granularity } = parseStatsPageParams(searchParams);

  // Rechte-Matrix: Mitarbeiter sehen Statistiken nur für den eigenen
  // Wohnbereich — ein von außen mitgegebener residentialAreaId-Parameter wird
  // für STAFF serverseitig ignoriert/überschrieben, nicht nur clientseitig
  // ausgeblendet.
  let residentialAreaId: string | undefined;
  if (user.role === "STAFF") {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { residentialAreaId: true },
    });
    if (!dbUser?.residentialAreaId) {
      return new Response("Kein Wohnbereich zugewiesen.", { status: 409 });
    }
    residentialAreaId = dbUser.residentialAreaId;
  } else if (
    searchParams.residentialAreaId &&
    searchParams.residentialAreaId !== RESIDENTIAL_AREA_ALL
  ) {
    residentialAreaId = searchParams.residentialAreaId;
  }

  const summary = await getStatsSummary({
    from,
    to,
    granularity,
    residentialAreaId,
  });

  let csv = "";
  csv += csvRow(["Zeitraum von", formatDate(from)]);
  csv += csvRow(["Zeitraum bis", formatDate(to)]);
  csv += "\r\n";
  csv += csvRow(["Kennzahl", "Wert"]);
  csv += csvRow(["Abwesenheiten gesamt", summary.totalAbsences]);
  csv += csvRow([
    "Ø-Dauer",
    summary.averageDurationMs > 0
      ? formatDuration(summary.averageDurationMs)
      : "–",
  ]);
  csv += csvRow(["Verspätete Rückkehren", summary.lateReturns]);
  csv += "\r\n";
  csv += csvRow(["Zeitraum-Beginn", "Anzahl"]);
  for (const entry of summary.byPeriod) {
    csv += csvRow([formatDate(entry.periodStart), entry.count]);
  }
  csv += "\r\n";
  csv += csvRow(["Grund", "Anzahl"]);
  for (const entry of summary.byReason) {
    csv += csvRow([REASON_LABELS[entry.reason] ?? entry.reason, entry.count]);
  }
  csv += "\r\n";
  csv += csvRow(["Schüler", "Anzahl"]);
  for (const entry of summary.byStudent) {
    csv += csvRow([entry.userName, entry.count]);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statistiken.csv"`,
    },
  });
}
