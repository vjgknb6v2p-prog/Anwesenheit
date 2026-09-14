"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { correctAbsenceAction } from "@/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { toDateTimeLocalValue } from "@/lib/time";

interface AbsenceCorrectionSheetProps {
  open: boolean;
  onClose: () => void;
  absenceId: string;
  initialCheckedOutAt: Date;
  initialPlannedReturnAt: Date;
  initialCheckedInAt: Date | null;
}

/**
 * PROMPT.md Abschnitt 3.6: Mitarbeiter-Korrektur von Auscheckzeit, geplanter
 * und tatsächlicher Rückkehr. Wiederverwendbar für die aktive Abwesenheit
 * und einzelne Historieneinträge auf der Schüler-Detailseite.
 */
export function AbsenceCorrectionSheet({
  open,
  onClose,
  absenceId,
  initialCheckedOutAt,
  initialPlannedReturnAt,
  initialCheckedInAt,
}: AbsenceCorrectionSheetProps) {
  const router = useRouter();
  const [checkedOutAt, setCheckedOutAt] = useState("");
  const [plannedReturnAt, setPlannedReturnAt] = useState("");
  const [checkedInAt, setCheckedInAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCheckedOutAt(toDateTimeLocalValue(initialCheckedOutAt));
      setPlannedReturnAt(toDateTimeLocalValue(initialPlannedReturnAt));
      setCheckedInAt(
        initialCheckedInAt ? toDateTimeLocalValue(initialCheckedInAt) : "",
      );
      setError(null);
    }
  }, [open, initialCheckedOutAt, initialPlannedReturnAt, initialCheckedInAt]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await correctAbsenceAction({
      absenceId,
      checkedOutAt: new Date(checkedOutAt).toISOString(),
      plannedReturnAt: new Date(plannedReturnAt).toISOString(),
      checkedInAt: checkedInAt ? new Date(checkedInAt).toISOString() : null,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Abwesenheit korrigieren">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="correct-checked-out">Ausgecheckt um</Label>
          <Input
            id="correct-checked-out"
            type="datetime-local"
            value={checkedOutAt}
            onChange={(event) => setCheckedOutAt(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="correct-planned-return">Geplante Rückkehr</Label>
          <Input
            id="correct-planned-return"
            type="datetime-local"
            value={plannedReturnAt}
            onChange={(event) => setPlannedReturnAt(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="correct-checked-in">
            Tatsächliche Rückkehr (leer lassen, falls noch nicht zurück)
          </Label>
          <Input
            id="correct-checked-in"
            type="datetime-local"
            value={checkedInAt}
            onChange={(event) => setCheckedInAt(event.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Wird gespeichert…" : "Korrektur speichern"}
        </Button>
      </form>
    </Sheet>
  );
}
