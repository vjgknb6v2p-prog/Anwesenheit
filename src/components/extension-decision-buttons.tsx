"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideExtensionAction } from "@/actions/staff";
import { Button } from "@/components/ui/button";

export function ExtensionDecisionButtons({
  extensionId,
}: {
  extensionId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setPending(decision);
    setError(null);
    const result = await decideExtensionAction({ extensionId, decision });
    setPending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => decide("APPROVED")}
          disabled={pending !== null}
        >
          {pending === "APPROVED" ? "Wird genehmigt…" : "Genehmigen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => decide("REJECTED")}
          disabled={pending !== null}
        >
          {pending === "REJECTED" ? "Wird abgelehnt…" : "Ablehnen"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
