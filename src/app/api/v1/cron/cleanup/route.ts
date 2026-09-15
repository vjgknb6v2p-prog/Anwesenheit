import type { NextRequest } from "next/server";
import { isEligibleForHardDelete } from "@/domain/retention";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSettings } from "@/lib/settings";

// Muss bei jedem Aufruf frisch gegen die DB laufen, nie gecacht/statisch.
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("x-cron-secret") === secret;
}

/**
 * Hard-Delete-Job (PROMPT.md Abschnitt 9, Phase 7 — "Löschkonzept"): löscht
 * abgeschlossene/stornierte Abwesenheiten, die älter als das Setting
 * `dataRetentionMonths` sind, endgültig aus der Datenbank (kein Soft-Delete
 * — das ist bereits die letzte Stufe). `Extension`-Datensätze werden über
 * `onDelete: Cascade` automatisch mitgelöscht; `AuditLog`-Einträge referen-
 * zieren die Absence nur über eine ungebundene `targetId` (kein FK, siehe
 * Schema) und bleiben unabhängig davon als Nachweis der Löschung erhalten.
 *
 * Eigener Endpunkt statt Teil von `/api/v1/cron/tick` (Phase 6): andere
 * Aufgabe, andere sinnvolle Frequenz (täglich statt alle 5 Minuten, siehe
 * README.md).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const settings = await getSettings();

  const candidates = await db.absence.findMany({
    where: { status: { in: ["COMPLETED", "CANCELLED"] } },
    select: { id: true, checkedOutAt: true, status: true },
  });

  const idsToDelete = candidates
    .filter((absence) =>
      isEligibleForHardDelete(absence, now, settings.dataRetentionMonths),
    )
    .map((absence) => absence.id);

  if (idsToDelete.length > 0) {
    await db.absence.deleteMany({ where: { id: { in: idsToDelete } } });
    await writeAuditLog({
      action: "RETENTION_HARD_DELETE",
      targetType: "Absence",
      metadata: {
        count: idsToDelete.length,
        retentionMonths: settings.dataRetentionMonths,
        executedAt: now.toISOString(),
      },
    });
  }

  logger.info(
    { deletedCount: idsToDelete.length },
    "Hard-Delete-Job (Aufbewahrungsfrist) abgeschlossen",
  );

  return Response.json({ deletedCount: idsToDelete.length });
}
