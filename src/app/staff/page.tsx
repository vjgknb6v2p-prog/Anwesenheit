import type { Metadata } from "next";
import Link from "next/link";
import { deriveStatus } from "@/domain/status";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Mitarbeiter – CheckIn",
};

export default async function StaffDashboardPage() {
  await requireRole("STAFF", "ADMIN");

  const [totalStudents, activeAbsences, pendingExtensions] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
    db.absence.findMany({
      where: { status: "ACTIVE" },
    }),
    db.extension.findMany({
      where: { status: "PENDING" },
      include: {
        absence: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const now = new Date();
  let abwesend = 0;
  let ueberfaellig = 0;
  for (const absence of activeAbsences) {
    const status = deriveStatus(
      { status: "ACTIVE", plannedReturnAt: absence.plannedReturnAt },
      now,
    );
    if (status === "UEBERFAELLIG") {
      ueberfaellig++;
    } else {
      abwesend++;
    }
  }
  const anwesend = totalStudents - abwesend - ueberfaellig;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Schüler gesamt" value={totalStudents} />
        <KpiCard label="Anwesend" value={anwesend} />
        <KpiCard label="Abwesend" value={abwesend} />
        <KpiCard label="Überfällig" value={ueberfaellig} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Offene Verlängerungsanfragen</h2>
        {pendingExtensions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Keine offenen Anfragen.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendingExtensions.map((extension) => (
              <li
                key={extension.id}
                className="flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">
                    {extension.absence.user.firstName}{" "}
                    {extension.absence.user.lastName}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {formatTime(extension.oldReturnAt)} Uhr →{" "}
                    {formatTime(extension.newReturnAt)} Uhr
                  </p>
                </div>
                <Link
                  href={`/staff/schueler/${extension.absence.user.id}`}
                  className="text-sm underline underline-offset-4"
                >
                  Details
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
