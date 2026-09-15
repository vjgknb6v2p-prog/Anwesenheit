import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeDurationMs, formatDuration } from "@/domain/duration";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime, formatTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Historie – CheckIn",
};

const REASON_LABELS: Record<string, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

const ABSENCE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  CANCELLED: "Storniert",
  COMPLETED: "Abgeschlossen",
};

export default async function StaffHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("STAFF", "ADMIN");
  const { q } = await searchParams;

  const absences = await db.absence.findMany({
    where: q
      ? {
          user: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          },
        }
      : undefined,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { checkedOutAt: "desc" },
    take: 100,
  });

  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Historie (alle Schüler)</h1>

      <form className="flex gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Name suchen…"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Suchen
        </Button>
      </form>

      {absences.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Keine Einträge gefunden.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {absences.map((absence) => {
            const durationMs = computeDurationMs(
              absence.checkedOutAt,
              absence.checkedInAt,
              now,
            );
            return (
              <li key={absence.id} className="rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/staff/schueler/${absence.user.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {absence.user.firstName} {absence.user.lastName}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {ABSENCE_STATUS_LABELS[absence.status]}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {REASON_LABELS[absence.reason] ?? absence.reason} ·{" "}
                  {absence.destination}
                </p>
                <p className="text-sm">
                  {formatDateTime(absence.checkedOutAt)} Uhr
                  {" → "}
                  {absence.checkedInAt
                    ? `${formatTime(absence.checkedInAt)} Uhr`
                    : `geplant ${formatTime(absence.plannedReturnAt)} Uhr`}
                </p>
                {absence.status !== "ACTIVE" && (
                  <p className="text-muted-foreground text-sm">
                    Dauer: {formatDuration(durationMs)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
