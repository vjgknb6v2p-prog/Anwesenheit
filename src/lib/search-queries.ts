import { rankSearchResults, type SearchResult } from "@/domain/search";
import { db } from "@/lib/db";

const MAX_RESULTS = 20;

/**
 * Erweiterung "Globale Suche": Schüler nach Name, E-Mail, Klasse oder Zimmer
 * — für Mitarbeiter/Admin, um einen Schüler ohne Umweg über die Filterliste
 * zu finden. `query` leer → keine Treffer (kein "alle Schüler"-Dump).
 */
export async function searchStudents(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const students = await db.user.findMany({
    where: {
      role: "STUDENT",
      deletedAt: null,
      OR: [
        { firstName: { contains: trimmed, mode: "insensitive" } },
        { lastName: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
        { schoolClass: { contains: trimmed, mode: "insensitive" } },
        { room: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    take: MAX_RESULTS,
  });

  return rankSearchResults(
    students.map((student) => ({ ...student, kind: "STUDENT" as const })),
    trimmed,
  );
}

/**
 * Erweiterung "Globale Suche": Mitarbeiter/Admin nach Name oder E-Mail — nur
 * für Admin (Rechte-Matrix: Mitarbeiterverwaltung ist Admin-exklusiv).
 */
export async function searchStaff(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const staff = await db.user.findMany({
    where: {
      role: { in: ["STAFF", "ADMIN"] },
      deletedAt: null,
      OR: [
        { firstName: { contains: trimmed, mode: "insensitive" } },
        { lastName: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    take: MAX_RESULTS,
  });

  return rankSearchResults(
    staff.map((member) => ({ ...member, kind: "STAFF" as const })),
    trimmed,
  );
}
