"use client";

import { useEffect, useState } from "react";
import { extendAction } from "@/actions/absences";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getQuickReturnOptions } from "@/domain/quick-return-times";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

interface ExtendSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentReturnAt: Date;
  curfewTime: string;
}

export function ExtendSheet({
  open,
  onClose,
  onSuccess,
  currentReturnAt,
  curfewTime,
}: ExtendSheetProps) {
  const [selected, setSelected] = useState<Date | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setCustomValue("");
      setError(null);
    }
  }, [open]);

  // Nur Optionen anbieten, die tatsächlich nach der bisherigen Rückkehrzeit
  // liegen (PROMPT.md Abschnitt 3.5: "Neue Zeit muss nach der alten liegen").
  const quickOptions = getQuickReturnOptions(new Date(), curfewTime).filter(
    (option) => option.value.getTime() > currentReturnAt.getTime(),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) {
      setError("Bitte eine neue Rückkehrzeit wählen.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await extendAction({ newReturnAt: selected.toISOString() });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Abwesenheit verlängern">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <p className="text-muted-foreground text-sm">
          Bisherige geplante Rückkehr: {formatTime(currentReturnAt)} Uhr
        </p>

        {quickOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  setSelected(option.value);
                  setCustomValue("");
                }}
                className={cn(
                  "min-h-11 rounded-full border px-4 py-2 text-sm",
                  selected?.getTime() === option.value.getTime()
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="extend-custom">Oder genaue Uhrzeit</Label>
          <Input
            id="extend-custom"
            type="datetime-local"
            value={customValue}
            onChange={(event) => {
              setCustomValue(event.target.value);
              setSelected(
                event.target.value ? new Date(event.target.value) : null,
              );
            }}
          />
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Wird gespeichert…" : "Verlängern bestätigen"}
        </Button>
      </form>
    </Sheet>
  );
}
