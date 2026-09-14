"use client";

import type { Role } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeUserRoleAction } from "@/actions/admin-users";

/** Rolle direkt in der Mitarbeiterliste ändern (Rechte-Matrix: "Rollen ändern"). */
export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = event.target.value as Role;
    if (newRole === role) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await changeUserRoleAction({ id: userId, role: newRole });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Rolle ändern"
        className="border-input bg-background h-9 rounded-xl border px-2 text-sm"
        value={role}
        disabled={pending}
        onChange={(event) => void handleChange(event)}
      >
        <option value="STAFF">Mitarbeiter</option>
        <option value="ADMIN">Admin</option>
      </select>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
