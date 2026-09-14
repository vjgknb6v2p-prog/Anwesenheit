"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettingsAction } from "@/actions/admin-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppSettings } from "@/lib/settings";

export function SettingsClient({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [requireExtensionApproval, setRequireExtensionApproval] = useState(
    settings.requireExtensionApproval,
  );
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(
    String(settings.reminderMinutesBefore),
  );
  const [overdueGraceMinutes, setOverdueGraceMinutes] = useState(
    String(settings.overdueGraceMinutes),
  );
  const [maxPlannedDurationHours, setMaxPlannedDurationHours] = useState(
    String(settings.maxPlannedDurationHours),
  );
  const [curfewTime, setCurfewTime] = useState(settings.curfewTime);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);
    const result = await updateSettingsAction({
      requireExtensionApproval,
      reminderMinutesBefore,
      overdueGraceMinutes,
      maxPlannedDurationHours,
      curfewTime,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Einstellungen</h1>
      <form
        onSubmit={handleSubmit}
        className="flex max-w-md flex-col gap-4 rounded-2xl border p-4 shadow-sm"
        noValidate
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requireExtensionApproval}
            onChange={(event) =>
              setRequireExtensionApproval(event.target.checked)
            }
            className="h-5 w-5"
          />
          Verlängerungen müssen von Mitarbeitern genehmigt werden
        </label>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reminder-minutes">
            Erinnerung vor geplanter Rückkehr (Minuten)
          </Label>
          <Input
            id="reminder-minutes"
            type="number"
            min={1}
            value={reminderMinutesBefore}
            onChange={(event) => setReminderMinutesBefore(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="overdue-grace">
            Karenzzeit bis Status Überfällig (Minuten)
          </Label>
          <Input
            id="overdue-grace"
            type="number"
            min={0}
            value={overdueGraceMinutes}
            onChange={(event) => setOverdueGraceMinutes(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max-duration">
            Maximale geplante Dauer (Stunden)
          </Label>
          <Input
            id="max-duration"
            type="number"
            min={1}
            value={maxPlannedDurationHours}
            onChange={(event) => setMaxPlannedDurationHours(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="curfew-time">Nachtruhe (HH:MM)</Label>
          <Input
            id="curfew-time"
            type="time"
            value={curfewTime}
            onChange={(event) => setCurfewTime(event.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="text-status-present text-sm">Gespeichert.</p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Wird gespeichert…" : "Speichern"}
        </Button>
      </form>
    </div>
  );
}
