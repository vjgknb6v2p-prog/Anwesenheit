import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { formatDateTime } from "@/lib/time";

const REASON_LABELS: Record<string, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

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
 * Eigene-Daten-Export (PROMPT.md Abschnitt 5/9: "Eigene Daten exportieren
 * (JSON/CSV)" — für alle drei Rollen gleichermaßen, jeder exportiert
 * ausschließlich seine eigenen Daten (Abschnitt 3.8). `?format=json`
 * (Default) oder `?format=csv`.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireApiRole("STUDENT", "STAFF", "ADMIN");
  if ("response" in authResult) {
    return authResult.response;
  }
  const { user } = authResult;

  const format = new URL(request.url).searchParams.get("format") ?? "json";

  const [profile, absences, notifications] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        schoolClass: true,
        room: true,
        residentialArea: { select: { name: true } },
        createdAt: true,
      },
    }),
    db.absence.findMany({
      where: { userId: user.id },
      include: { extensions: true },
      orderBy: { checkedOutAt: "desc" },
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  await writeAuditLog({
    actorId: user.id,
    action: "DATA_EXPORT",
    targetUserId: user.id,
    targetType: "User",
    targetId: user.id,
    metadata: { format },
  });

  if (format === "csv") {
    let csv = "";
    csv += csvRow(["Profil", ""]);
    csv += csvRow(["Name", `${profile.firstName} ${profile.lastName}`]);
    csv += csvRow(["E-Mail", profile.email]);
    csv += csvRow(["Rolle", profile.role]);
    csv += csvRow(["Klasse", profile.schoolClass ?? ""]);
    csv += csvRow(["Zimmer", profile.room ?? ""]);
    csv += csvRow(["Wohnbereich", profile.residentialArea?.name ?? ""]);
    csv += csvRow(["Konto erstellt am", formatDateTime(profile.createdAt)]);
    csv += "\r\n";

    csv += csvRow([
      "Abwesenheit-ID",
      "Ausgecheckt",
      "Geplante Rückkehr",
      "Tatsächliche Rückkehr",
      "Grund",
      "Bemerkung",
      "Ziel",
      "Status",
    ]);
    for (const absence of absences) {
      csv += csvRow([
        absence.id,
        formatDateTime(absence.checkedOutAt),
        formatDateTime(absence.plannedReturnAt),
        absence.checkedInAt ? formatDateTime(absence.checkedInAt) : "",
        REASON_LABELS[absence.reason] ?? absence.reason,
        absence.note ?? "",
        absence.destination,
        absence.status,
      ]);
    }
    csv += "\r\n";

    csv += csvRow([
      "Verlängerung zu Abwesenheit-ID",
      "Alte Rückkehr",
      "Neue Rückkehr",
      "Status",
    ]);
    for (const absence of absences) {
      for (const extension of absence.extensions) {
        csv += csvRow([
          absence.id,
          formatDateTime(extension.oldReturnAt),
          formatDateTime(extension.newReturnAt),
          extension.status,
        ]);
      }
    }
    csv += "\r\n";

    csv += csvRow(["Benachrichtigung", "Erstellt am", "Gelesen"]);
    for (const notification of notifications) {
      csv += csvRow([
        `${notification.title}: ${notification.message}`,
        formatDateTime(notification.createdAt),
        notification.readAt ? formatDateTime(notification.readAt) : "Nein",
      ]);
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="meine-daten.csv"`,
      },
    });
  }

  const json = {
    profil: {
      name: `${profile.firstName} ${profile.lastName}`,
      email: profile.email,
      rolle: profile.role,
      klasse: profile.schoolClass,
      zimmer: profile.room,
      wohnbereich: profile.residentialArea?.name ?? null,
      kontoErstelltAm: profile.createdAt.toISOString(),
    },
    abwesenheiten: absences.map((absence) => ({
      id: absence.id,
      checkedOutAt: absence.checkedOutAt.toISOString(),
      plannedReturnAt: absence.plannedReturnAt.toISOString(),
      checkedInAt: absence.checkedInAt?.toISOString() ?? null,
      grund: absence.reason,
      grundDetail: absence.reasonDetail,
      bemerkung: absence.note,
      ziel: absence.destination,
      status: absence.status,
      verlaengerungen: absence.extensions.map((extension) => ({
        alteRueckkehr: extension.oldReturnAt.toISOString(),
        neueRueckkehr: extension.newReturnAt.toISOString(),
        status: extension.status,
      })),
    })),
    benachrichtigungen: notifications.map((notification) => ({
      titel: notification.title,
      nachricht: notification.message,
      erstelltAm: notification.createdAt.toISOString(),
      gelesenAm: notification.readAt?.toISOString() ?? null,
    })),
  };

  return new Response(JSON.stringify(json, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meine-daten.json"`,
    },
  });
}
