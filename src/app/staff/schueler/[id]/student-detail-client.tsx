"use client";

import { useState } from "react";
import Link from "next/link";
import { AbsenceCorrectionSheet } from "@/components/absence-correction-sheet";
import { CancelAbsenceButton } from "@/components/cancel-absence-button";
import { CheckInButton } from "@/components/check-in-button";
import { ExtensionDecisionButtons } from "@/components/extension-decision-buttons";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { computeDurationMs, formatDuration } from "@/domain/duration";
import { deriveStatus } from "@/domain/status";
import { formatDateTime, formatTime } from "@/lib/time";

const REASON_LABELS: Record<string, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

interface StudentInfo {
  firstName: string;
  lastName: string;
  email: string;
  schoolClass: string | null;
  room: string | null;
  residentialAreaName: string | null;
}

interface ActiveAbsenceInfo {
  id: string;
  destination: string;
  checkedOutAt: string;
  plannedReturnAt: string;
}

interface PendingExtensionInfo {
  id: string;
  oldReturnAt: string;
  newReturnAt: string;
}

interface HistoryEntry {
  id: string;
  destination: string;
  reason: string;
  reasonDetail: string | null;
  checkedOutAt: string;
  plannedReturnAt: string;
  checkedInAt: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

interface StudentDetailClientProps {
  student: StudentInfo;
  activeAbsence: ActiveAbsenceInfo | null;
  pendingExtension: PendingExtensionInfo | null;
  history: HistoryEntry[];
}

export function StudentDetailClient({
  student,
  activeAbsence,
  pendingExtension,
  history,
}: StudentDetailClientProps) {
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const now = new Date();

  const status = deriveStatus(
    activeAbsence
      ? {
          status: "ACTIVE",
          plannedReturnAt: new Date(activeAbsence.plannedReturnAt),
        }
      : null,
    now,
  );

  const correctingEntry =
    activeAbsence && activeAbsence.id === correctingId
      ? {
          id: activeAbsence.id,
          checkedOutAt: activeAbsence.checkedOutAt,
          plannedReturnAt: activeAbsence.plannedReturnAt,
          checkedInAt: null as string | null,
        }
      : (history.find((entry) => entry.id === correctingId) ?? null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          {student.firstName} {student.lastName}
        </h1>
        <p className="text-muted-foreground text-sm">
          {student.email} · {student.schoolClass ?? "–"} · Zimmer{" "}
          {student.room ?? "–"} · {student.residentialAreaName ?? "–"}
        </p>
        <StatusBadge status={status} />
      </header>

      {activeAbsence && (
        <section className="flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Aktuelle Abwesenheit</h2>
          <p className="text-sm">Ziel: {activeAbsence.destination}</p>
          <p className="text-sm">
            Ausgecheckt {formatTime(new Date(activeAbsence.checkedOutAt))} Uhr ·
            geplante Rückkehr{" "}
            {formatTime(new Date(activeAbsence.plannedReturnAt))} Uhr
          </p>
          {status === "UEBERFAELLIG" && (
            <p className="text-status-absent text-sm font-medium">
              Überfällig seit{" "}
              {formatDuration(
                computeDurationMs(
                  new Date(activeAbsence.plannedReturnAt),
                  null,
                  now,
                ),
              )}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <CheckInButton absenceId={activeAbsence.id} />
            <Button
              type="button"
              variant="outline"
              onClick={() => setCorrectingId(activeAbsence.id)}
            >
              Bearbeiten
            </Button>
            <CancelAbsenceButton absenceId={activeAbsence.id} />
            <Link
              href={`/beurlaubungsschein/${activeAbsence.id}`}
              target="_blank"
              className="border-input bg-background hover:bg-accent inline-flex h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium"
            >
              Beurlaubungsschein
            </Link>
          </div>
        </section>
      )}

      {pendingExtension && (
        <section className="border-status-info flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Offene Verlängerungsanfrage</h2>
          <p className="text-sm">
            {formatTime(new Date(pendingExtension.oldReturnAt))} Uhr →{" "}
            {formatTime(new Date(pendingExtension.newReturnAt))} Uhr
          </p>
          <ExtensionDecisionButtons extensionId={pendingExtension.id} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historie</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Noch keine abgeschlossenen Abwesenheiten.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((entry) => {
              const durationMs = computeDurationMs(
                new Date(entry.checkedOutAt),
                entry.checkedInAt ? new Date(entry.checkedInAt) : null,
                now,
              );
              return (
                <li
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{entry.destination}</p>
                    <p className="text-muted-foreground text-sm">
                      {REASON_LABELS[entry.reason] ?? entry.reason}
                      {entry.reasonDetail ? ` – ${entry.reasonDetail}` : ""}
                    </p>
                    <p className="text-sm">
                      {formatDateTime(new Date(entry.checkedOutAt))} Uhr
                      {" → "}
                      {entry.checkedInAt
                        ? `${formatTime(new Date(entry.checkedInAt))} Uhr`
                        : `geplant ${formatTime(new Date(entry.plannedReturnAt))} Uhr`}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {entry.status === "CANCELLED"
                        ? "Storniert"
                        : `Dauer: ${formatDuration(durationMs)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCorrectingId(entry.id)}
                    >
                      Bearbeiten
                    </Button>
                    {entry.status !== "CANCELLED" && (
                      <Link
                        href={`/beurlaubungsschein/${entry.id}`}
                        target="_blank"
                        className="border-input bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-2xl border px-3 text-sm font-medium"
                      >
                        Beurlaubungsschein
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {correctingEntry && (
        <AbsenceCorrectionSheet
          open
          onClose={() => setCorrectingId(null)}
          absenceId={correctingEntry.id}
          initialCheckedOutAt={new Date(correctingEntry.checkedOutAt)}
          initialPlannedReturnAt={new Date(correctingEntry.plannedReturnAt)}
          initialCheckedInAt={
            correctingEntry.checkedInAt
              ? new Date(correctingEntry.checkedInAt)
              : null
          }
        />
      )}
    </div>
  );
}
