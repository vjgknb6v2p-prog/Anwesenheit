"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkInAction } from "@/actions/absences";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { deriveStatus } from "@/domain/status";
import { formatDuration } from "@/domain/duration";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { CheckOutSheet } from "./check-out-sheet";
import { ExtendSheet } from "./extend-sheet";

interface ActiveAbsenceData {
  checkedOutAt: string;
  plannedReturnAt: string;
  destination: string;
}

interface DashboardClientProps {
  firstName: string;
  activeAbsence: ActiveAbsenceData | null;
  recentDestinations: string[];
  curfewTime: string;
}

export function DashboardClient({
  firstName,
  activeAbsence,
  recentDestinations,
  curfewTime,
}: DashboardClientProps) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);

  // Live-Countdown nur ticken lassen, wenn es tatsächlich etwas zu zählen
  // gibt (PROMPT.md Abschnitt 7: "Live-Countdown" bei ABWESEND/ÜBERFÄLLIG).
  useEffect(() => {
    if (!activeAbsence) {
      return;
    }
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [activeAbsence]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const plannedReturnAt = activeAbsence
    ? new Date(activeAbsence.plannedReturnAt)
    : null;
  const status = deriveStatus(
    activeAbsence && plannedReturnAt
      ? { status: "ACTIVE", plannedReturnAt }
      : null,
    now,
  );

  async function handleCheckIn() {
    setCheckInSubmitting(true);
    setCheckInError(null);
    const result = await checkInAction();
    setCheckInSubmitting(false);
    if (result.error) {
      setCheckInError(result.error);
      return;
    }
    setToast("Du bist erfolgreich eingecheckt.");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6 pb-28">
      <header className="flex items-center gap-3">
        <div className="bg-secondary text-secondary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold">
          {firstName.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">{firstName}</p>
          <StatusBadge status={status} />
        </div>
      </header>

      {status === "ANWESEND" && (
        <Button
          size="lg"
          className="w-full"
          onClick={() => setCheckOutOpen(true)}
        >
          AUSCHECKEN
        </Button>
      )}

      {activeAbsence && plannedReturnAt && (
        <div className="rounded-2xl border p-4 shadow-sm">
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-muted-foreground text-sm">Ziel</dt>
              <dd className="font-medium">{activeAbsence.destination}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Ausgecheckt um</dt>
              <dd className="font-medium">
                {formatTime(new Date(activeAbsence.checkedOutAt))} Uhr
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">
                Geplante Rückkehr
              </dt>
              <dd className="font-medium">{formatTime(plannedReturnAt)} Uhr</dd>
            </div>
          </dl>

          <Countdown target={plannedReturnAt} now={now} />

          {status === "UEBERFAELLIG" && (
            <p className="text-status-absent mt-3 text-sm font-medium">
              Deine geplante Rückkehrzeit ist überschritten.
            </p>
          )}

          {checkInError && (
            <p role="alert" className="text-destructive mt-3 text-sm">
              {checkInError}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              onClick={handleCheckIn}
              disabled={checkInSubmitting}
            >
              {checkInSubmitting ? "Wird eingecheckt…" : "EINCHECKEN"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setExtendOpen(true)}
            >
              Abwesenheit verlängern
            </Button>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="bg-foreground text-background fixed inset-x-6 bottom-24 rounded-xl px-4 py-3 text-center text-sm shadow-lg"
        >
          {toast}
        </div>
      )}

      <CheckOutSheet
        open={checkOutOpen}
        onClose={() => setCheckOutOpen(false)}
        onSuccess={() => {
          setCheckOutOpen(false);
          router.refresh();
        }}
        recentDestinations={recentDestinations}
        curfewTime={curfewTime}
      />

      {plannedReturnAt && (
        <ExtendSheet
          open={extendOpen}
          onClose={() => setExtendOpen(false)}
          onSuccess={() => {
            setExtendOpen(false);
            setToast("Abwesenheit verlängert.");
            router.refresh();
          }}
          currentReturnAt={plannedReturnAt}
          curfewTime={curfewTime}
        />
      )}
    </main>
  );
}

function Countdown({ target, now }: { target: Date; now: Date }) {
  const diffMs = target.getTime() - now.getTime();
  const overdue = diffMs < 0;
  const label = formatDuration(Math.abs(diffMs));

  return (
    <p
      className={cn(
        "mt-3 text-sm font-medium",
        overdue ? "text-status-absent" : "text-muted-foreground",
      )}
    >
      {overdue ? `Überfällig seit ${label}` : `Noch ${label}`}
    </p>
  );
}
