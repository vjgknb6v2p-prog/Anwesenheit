/**
 * Erweiterung "Gruppen-Sammelaktionen": Mitarbeiter wählen mehrere Schüler
 * aus (z. B. für einen gemeinsamen Wandertag/Kursfahrt) und checken sie in
 * einem Schritt gemeinsam aus oder wieder ein. Die Auswahl kann dabei
 * Schüler enthalten, für die die jeweilige Aktion nicht zulässig ist (z. B.
 * ein bereits abwesender Schüler beim Gruppen-Ausgang) — diese Funktionen
 * trennen die tatsächlich ausführbare Teilmenge von den zu überspringenden
 * Schülern, damit die Server Action kontrolliert einen Teilerfolg meldet
 * statt die gesamte Aktion abzulehnen (Domänenregel 2: maximal eine aktive
 * Abwesenheit pro Schüler).
 */

export interface GroupCheckOutCandidate {
  userId: string;
  userName: string;
  hasActiveAbsence: boolean;
}

export interface SkippedStudent {
  userId: string;
  userName: string;
}

export interface GroupCheckOutSelection {
  eligibleUserIds: string[];
  skipped: SkippedStudent[];
}

/** Nur Schüler ohne aktive Abwesenheit dürfen per Gruppen-Ausgang ausgecheckt werden. */
export function selectEligibleForGroupCheckOut(
  candidates: readonly GroupCheckOutCandidate[],
  selectedUserIds: readonly string[],
): GroupCheckOutSelection {
  const selected = new Set(selectedUserIds);
  const eligibleUserIds: string[] = [];
  const skipped: SkippedStudent[] = [];

  for (const candidate of candidates) {
    if (!selected.has(candidate.userId)) {
      continue;
    }
    if (candidate.hasActiveAbsence) {
      skipped.push({ userId: candidate.userId, userName: candidate.userName });
    } else {
      eligibleUserIds.push(candidate.userId);
    }
  }

  return { eligibleUserIds, skipped };
}

export interface GroupCheckInCandidate {
  userId: string;
  userName: string;
  activeAbsenceId: string | null;
}

export interface GroupCheckInSelection {
  eligible: { userId: string; absenceId: string }[];
  skipped: SkippedStudent[];
}

/** Nur Schüler mit einer aktiven Abwesenheit dürfen per Gruppen-Rückkehr eingecheckt werden. */
export function selectEligibleForGroupCheckIn(
  candidates: readonly GroupCheckInCandidate[],
  selectedUserIds: readonly string[],
): GroupCheckInSelection {
  const selected = new Set(selectedUserIds);
  const eligible: { userId: string; absenceId: string }[] = [];
  const skipped: SkippedStudent[] = [];

  for (const candidate of candidates) {
    if (!selected.has(candidate.userId)) {
      continue;
    }
    if (candidate.activeAbsenceId) {
      eligible.push({
        userId: candidate.userId,
        absenceId: candidate.activeAbsenceId,
      });
    } else {
      skipped.push({ userId: candidate.userId, userName: candidate.userName });
    }
  }

  return { eligible, skipped };
}
