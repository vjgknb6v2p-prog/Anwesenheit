import { deriveStatus, type StudentStatus } from "@/domain/status";
import { db } from "@/lib/db";

export interface LiveOverviewRow {
  userId: string;
  absenceId: string | null;
  name: string;
  schoolClass: string | null;
  residentialAreaName: string | null;
  status: StudentStatus;
  checkedOutAt: string | null;
  plannedReturnAt: string | null;
  destination: string | null;
}

export interface LiveOverviewKpis {
  totalStudents: number;
  anwesend: number;
  abwesend: number;
  ueberfaellig: number;
  activeAbsences: number;
  absencesToday: number;
}

export interface LiveOverviewSnapshot {
  generatedAt: string;
  kpis: LiveOverviewKpis;
  rows: LiveOverviewRow[];
}

/**
 * Basisdaten für die Admin-Live-Übersicht (PROMPT.md Abschnitt 7): 6 KPIs +
 * eine Zeile pro Schüler mit abgeleitetem Status. Wird sowohl von der
 * SSE-Route (`/api/v1/stream`) als auch beim initialen Server-Render von
 * `/admin` verwendet, damit beide exakt denselben Stand zeigen.
 */
export async function getLiveOverviewSnapshot(): Promise<LiveOverviewSnapshot> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [students, absencesToday] = await Promise.all([
    db.user.findMany({
      where: { role: "STUDENT", deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        schoolClass: true,
        residentialArea: { select: { name: true } },
        absences: { where: { status: "ACTIVE" }, take: 1 },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.absence.count({ where: { checkedOutAt: { gte: startOfToday } } }),
  ]);

  let anwesend = 0;
  let abwesend = 0;
  let ueberfaellig = 0;

  const rows: LiveOverviewRow[] = students.map((student) => {
    const active = student.absences[0] ?? null;
    const status = deriveStatus(
      active
        ? { status: "ACTIVE", plannedReturnAt: active.plannedReturnAt }
        : null,
      now,
    );
    if (status === "ANWESEND") {
      anwesend++;
    } else if (status === "ABWESEND") {
      abwesend++;
    } else {
      ueberfaellig++;
    }

    return {
      userId: student.id,
      absenceId: active?.id ?? null,
      name: `${student.firstName} ${student.lastName}`,
      schoolClass: student.schoolClass,
      residentialAreaName: student.residentialArea?.name ?? null,
      status,
      checkedOutAt: active?.checkedOutAt.toISOString() ?? null,
      plannedReturnAt: active?.plannedReturnAt.toISOString() ?? null,
      destination: active?.destination ?? null,
    };
  });

  return {
    generatedAt: now.toISOString(),
    kpis: {
      totalStudents: students.length,
      anwesend,
      abwesend,
      ueberfaellig,
      activeAbsences: abwesend + ueberfaellig,
      absencesToday,
    },
    rows,
  };
}
