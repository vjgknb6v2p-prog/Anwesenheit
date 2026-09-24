"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  bulkCheckInAction,
  bulkCheckOutAction,
  type BulkActionResult,
} from "@/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/status-badge";
import { ABSENCE_REASONS, type AbsenceReason } from "@/domain/absence-reason";
import type { StudentStatus } from "@/domain/status";

const REASON_LABELS: Record<AbsenceReason, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

export interface GroupActionStudent {
  id: string;
  firstName: string;
  lastName: string;
  schoolClass: string | null;
  residentialAreaName: string | null;
  status: StudentStatus;
}

/**
 * Erweiterung "Gruppen-Sammelaktionen": Schüler-Liste mit Mehrfachauswahl,
 * ergänzt um zwei Sheets für den gemeinsamen Gruppen-Ausgang und die
 * gemeinsame Gruppen-Rückkehr (z. B. Wandertag/Kursfahrt). Übernimmt die
 * Listen-Darstellung der bisherigen Server-Komponente `/staff/schueler`
 * vollständig, da die Auswahl clientseitigen State braucht.
 */
export function GroupActionsPanel({
  students,
}: {
  students: GroupActionStudent[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openSheet, setOpenSheet] = useState<"checkout" | "checkin" | null>(
    null,
  );
  const [lastResult, setLastResult] = useState<BulkActionResult | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function closeSheets() {
    setOpenSheet(null);
  }

  function handleResult(result: BulkActionResult) {
    setLastResult(result);
    if (!result.error) {
      clearSelection();
      closeSheets();
      router.refresh();
    }
  }

  const selectedIds = [...selected];

  return (
    <div className="flex flex-col gap-4">
      {lastResult && !lastResult.error && (
        <div className="bg-status-present/10 text-status-present-foreground rounded-2xl border p-3 text-sm">
          <p>{lastResult.checkedCount} Schüler erfolgreich bearbeitet.</p>
          {lastResult.skipped && lastResult.skipped.length > 0 && (
            <p className="mt-1">
              Übersprungen (Status hat sich zwischenzeitlich geändert):{" "}
              {lastResult.skipped.map((s) => s.userName).join(", ")}
            </p>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {students.map((student) => (
          <li
            key={student.id}
            className="flex items-center gap-3 rounded-2xl border p-4 shadow-sm"
          >
            <input
              type="checkbox"
              aria-label={`${student.firstName} ${student.lastName} auswählen`}
              checked={selected.has(student.id)}
              onChange={() => toggle(student.id)}
              className="h-5 w-5 shrink-0"
            />
            <Link
              href={`/staff/schueler/${student.id}`}
              className="hover:bg-accent -m-2 flex flex-1 items-center justify-between gap-4 rounded-xl p-2"
            >
              <div>
                <p className="font-medium">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-muted-foreground text-sm">
                  {student.schoolClass ?? "–"} ·{" "}
                  {student.residentialAreaName ?? "–"}
                </p>
              </div>
              <StatusBadge status={student.status} />
            </Link>
          </li>
        ))}
      </ul>

      {selectedIds.length > 0 && (
        <div
          className="bg-background sticky bottom-0 flex flex-wrap items-center gap-2 rounded-2xl border p-3 shadow-lg"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          }}
        >
          <p className="text-sm font-medium">{selectedIds.length} ausgewählt</p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenSheet("checkin")}
            >
              Gruppen-Rückkehr
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setOpenSheet("checkout")}
            >
              Gruppen-Ausgang
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              Auswahl aufheben
            </Button>
          </div>
        </div>
      )}

      <GroupCheckOutSheet
        open={openSheet === "checkout"}
        onClose={closeSheets}
        studentIds={selectedIds}
        onResult={handleResult}
      />
      <GroupCheckInSheet
        open={openSheet === "checkin"}
        onClose={closeSheets}
        studentIds={selectedIds}
        onResult={handleResult}
      />
    </div>
  );
}

function GroupCheckOutSheet({
  open,
  onClose,
  studentIds,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  studentIds: string[];
  onResult: (result: BulkActionResult) => void;
}) {
  const [reason, setReason] = useState<AbsenceReason>("SCHULVERANSTALTUNG");
  const [reasonDetail, setReasonDetail] = useState("");
  const [destination, setDestination] = useState("");
  const [plannedReturnAt, setPlannedReturnAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!destination.trim() || !plannedReturnAt) {
      setError("Bitte Ziel und geplante Rückkehr angeben.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await bulkCheckOutAction({
      studentIds,
      reason,
      reasonDetail: reasonDetail || undefined,
      destination,
      plannedReturnAt: new Date(plannedReturnAt).toISOString(),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onResult(result);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Gruppen-Ausgang für ${studentIds.length} Schüler`}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-checkout-reason">Grund</Label>
          <select
            id="group-checkout-reason"
            className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
            value={reason}
            onChange={(event) => setReason(event.target.value as AbsenceReason)}
          >
            {ABSENCE_REASONS.map((value) => (
              <option key={value} value={value}>
                {REASON_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        {reason === "SONSTIGES" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-checkout-reason-detail">Genauer Grund</Label>
            <Input
              id="group-checkout-reason-detail"
              value={reasonDetail}
              onChange={(event) => setReasonDetail(event.target.value)}
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-checkout-destination">Ziel</Label>
          <Input
            id="group-checkout-destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-checkout-return">Geplante Rückkehr</Label>
          <Input
            id="group-checkout-return"
            type="datetime-local"
            value={plannedReturnAt}
            onChange={(event) => setPlannedReturnAt(event.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Wird ausgecheckt…"
            : `${studentIds.length} Schüler auschecken`}
        </Button>
      </form>
    </Sheet>
  );
}

function GroupCheckInSheet({
  open,
  onClose,
  studentIds,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  studentIds: string[];
  onResult: (result: BulkActionResult) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const result = await bulkCheckInAction({ studentIds });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onResult(result);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Gruppen-Rückkehr für ${studentIds.length} Schüler`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Alle ausgewählten Schüler mit einer aktiven Abwesenheit werden mit der
          aktuellen Uhrzeit eingecheckt. Bereits anwesende Schüler in der
          Auswahl werden übersprungen.
        </p>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={submitting}
        >
          {submitting
            ? "Wird eingecheckt…"
            : `${studentIds.length} Schüler einchecken`}
        </Button>
      </div>
    </Sheet>
  );
}
