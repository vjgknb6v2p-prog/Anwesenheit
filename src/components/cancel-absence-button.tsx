"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelAbsenceAction } from "@/actions/staff";
import { Button } from "@/components/ui/button";

export function CancelAbsenceButton({ absenceId }: { absenceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm("Diese Abwesenheit wirklich stornieren?")) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await cancelAbsenceAction(absenceId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? "Wird storniert…" : "Stornieren"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
