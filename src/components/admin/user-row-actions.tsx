"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  resetUserPasswordAction,
  setUserActiveAction,
  softDeleteUserAction,
} from "@/actions/admin-users";
import { Button } from "@/components/ui/button";

type ActionKey = "toggle-active" | "reset" | "delete";

/**
 * Zeilen-Aktionen für Benutzerverwaltung: Aktivieren/Deaktivieren,
 * Passwort-Reset-Link auslösen, Soft-Delete. Jede Aktion schreibt einen
 * eigenen Audit-Log-Eintrag (siehe `src/actions/admin-users.ts`).
 */
export function UserRowActions({
  userId,
  active,
}: {
  userId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<ActionKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    key: ActionKey,
    action: () => Promise<{ error?: string }>,
  ) {
    setPending(key);
    setError(null);
    setMessage(null);
    const result = await action();
    setPending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (key === "reset") {
      setMessage("Reset-Link wurde per E-Mail versendet.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() =>
            void run("toggle-active", () =>
              setUserActiveAction(userId, !active),
            )
          }
        >
          {pending === "toggle-active"
            ? "…"
            : active
              ? "Deaktivieren"
              : "Aktivieren"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() =>
            void run("reset", () => resetUserPasswordAction(userId))
          }
        >
          {pending === "reset" ? "…" : "Passwort zurücksetzen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => {
            if (!window.confirm("Diesen Benutzer wirklich löschen?")) {
              return;
            }
            void run("delete", () => softDeleteUserAction(userId));
          }}
        >
          {pending === "delete" ? "…" : "Löschen"}
        </Button>
      </div>
      {message && <p className="text-muted-foreground text-xs">{message}</p>}
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
