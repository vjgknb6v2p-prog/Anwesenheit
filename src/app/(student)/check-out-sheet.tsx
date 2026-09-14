"use client";

import { useEffect, useState } from "react";
import { checkOutAction } from "@/actions/absences";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABSENCE_REASONS, type AbsenceReason } from "@/domain/absence-reason";
import { getQuickReturnOptions } from "@/domain/quick-return-times";
import { cn } from "@/lib/utils";

const REASON_LABELS: Record<AbsenceReason, string> = {
  HEIMFAHRT: "Heimfahrt",
  ARZT: "Arzt",
  SPORT_VEREIN: "Sportverein",
  EINKAUF_STADT: "Einkauf/Stadt",
  FAMILIE_BESUCH: "Familienbesuch",
  SCHULVERANSTALTUNG: "Schulveranstaltung",
  SONSTIGES: "Sonstiges",
};

interface CheckOutSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recentDestinations: string[];
  curfewTime: string;
}

export function CheckOutSheet({
  open,
  onClose,
  onSuccess,
  recentDestinations,
  curfewTime,
}: CheckOutSheetProps) {
  const [reason, setReason] = useState<AbsenceReason>("HEIMFAHRT");
  const [reasonDetail, setReasonDetail] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedReturn, setSelectedReturn] = useState<Date | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Formular bei jedem Öffnen zurücksetzen.
  useEffect(() => {
    if (open) {
      setReason("HEIMFAHRT");
      setReasonDetail("");
      setDestination("");
      setSelectedReturn(null);
      setCustomValue("");
      setNote("");
      setError(null);
    }
  }, [open]);

  const quickOptions = getQuickReturnOptions(new Date(), curfewTime);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!destination.trim()) {
      setError("Bitte ein Ziel angeben.");
      return;
    }
    if (!selectedReturn) {
      setError("Bitte eine geplante Rückkehr wählen.");
      return;
    }
    if (reason === "SONSTIGES" && !reasonDetail.trim()) {
      setError("Bitte einen Grund angeben.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await checkOutAction({
      reason,
      reasonDetail: reason === "SONSTIGES" ? reasonDetail : undefined,
      destination,
      plannedReturnAt: selectedReturn.toISOString(),
      note: note || undefined,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Auschecken">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Label>Grund</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ABSENCE_REASONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setReason(option)}
                className={cn(
                  "min-h-11 rounded-full border px-4 py-2 text-sm",
                  reason === option
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input",
                )}
              >
                {REASON_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        {reason === "SONSTIGES" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reasonDetail">Welcher Grund?</Label>
            <Input
              id="reasonDetail"
              value={reasonDetail}
              onChange={(event) => setReasonDetail(event.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="destination">Ziel</Label>
          {recentDestinations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recentDestinations.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDestination(option)}
                  className={cn(
                    "min-h-9 rounded-full border px-3 py-1.5 text-xs",
                    destination === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          <Input
            id="destination"
            list="destination-suggestions"
            placeholder="z. B. Stadtzentrum"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          />
          <datalist id="destination-suggestions">
            {recentDestinations.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div>
          <Label>Geplante Rückkehr</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  setSelectedReturn(option.value);
                  setCustomValue("");
                }}
                className={cn(
                  "min-h-11 rounded-full border px-4 py-2 text-sm",
                  selectedReturn?.getTime() === option.value.getTime()
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Input
            type="datetime-local"
            className="mt-2"
            aria-label="Geplante Rückkehr, genaue Uhrzeit"
            value={customValue}
            onChange={(event) => {
              setCustomValue(event.target.value);
              setSelectedReturn(
                event.target.value ? new Date(event.target.value) : null,
              );
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note">Bemerkung (optional)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Wird gespeichert…" : "Auschecken bestätigen"}
        </Button>
      </form>
    </Sheet>
  );
}
