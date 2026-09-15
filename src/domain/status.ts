/**
 * PROMPT.md Abschnitt 3.1: Der Anwesenheitsstatus wird nirgends gespeichert,
 * sondern ausschließlich aus der aktiven Abwesenheit (falls vorhanden)
 * abgeleitet. Diese Funktion ist die einzige Wahrheit dafür — Frontend, API
 * und Statistik dürfen den Status niemals anders herleiten.
 */
export type StudentStatus = "ANWESEND" | "ABWESEND" | "UEBERFAELLIG";

/**
 * Die für die Statusableitung relevanten Felder einer aktiven Abwesenheit.
 * Der Aufrufer ist dafür verantwortlich, nur eine Absence mit
 * `status === "ACTIVE"` zu übergeben (oder `null`, wenn keine existiert) —
 * das entspricht exakt der Domänenregel „eine Absence mit status = ACTIVE
 * existiert".
 */
export interface ActiveAbsenceForStatus {
  status: "ACTIVE";
  plannedReturnAt: Date;
}

export function deriveStatus(
  activeAbsence: ActiveAbsenceForStatus | null,
  now: Date,
): StudentStatus {
  if (!activeAbsence) {
    return "ANWESEND";
  }

  return activeAbsence.plannedReturnAt >= now ? "ABWESEND" : "UEBERFAELLIG";
}
