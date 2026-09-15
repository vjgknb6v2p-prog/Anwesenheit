"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkInOtherAction } from "@/actions/staff";
import { Button } from "@/components/ui/button";

/** "Für Schüler einchecken" (Rechte-Matrix) — auf Listen- und Detailseiten nutzbar. */
export function CheckInButton({ absenceId }: { absenceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await checkInOtherAction(absenceId);
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
        {pending ? "Wird eingecheckt…" : "Einchecken"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
