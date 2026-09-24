"use client";

import type { Role } from "@prisma/client";
import { useState } from "react";
import { RoleSelect } from "@/components/admin/role-select";
import {
  UserFormSheet,
  type EditingUser,
  type ResidentialAreaOption,
} from "@/components/admin/user-form-sheet";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface StaffRow extends EditingUser {
  active: boolean;
  residentialAreaName: string | null;
  role: Role;
}

interface StaffAdminClientProps {
  staff: StaffRow[];
  residentialAreas: ResidentialAreaOption[];
  currentUserId: string;
  /** Erweiterung "Globale Suche": vorausgefüllt über `/admin/mitarbeiter?q=…`. */
  initialQuery?: string;
}

function matchesQuery(member: StaffRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return `${member.firstName} ${member.lastName} ${member.email}`
    .toLowerCase()
    .includes(normalized);
}

export function StaffAdminClient({
  staff,
  residentialAreas,
  currentUserId,
  initialQuery = "",
}: StaffAdminClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [query, setQuery] = useState(initialQuery);

  const filteredStaff = staff.filter((member) => matchesQuery(member, query));

  function openCreate() {
    setEditingStaff(null);
    setSheetOpen(true);
  }

  function openEdit(member: StaffRow) {
    setEditingStaff(member);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          Mitarbeiter ({filteredStaff.length})
        </h1>
        <Button type="button" onClick={openCreate}>
          Neuer Mitarbeiter
        </Button>
      </div>

      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Name oder E-Mail suchen…"
        aria-label="Mitarbeiter durchsuchen"
        className="max-w-sm"
      />

      {filteredStaff.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {staff.length === 0
            ? "Keine Mitarbeiter angelegt."
            : "Keine Mitarbeiter gefunden."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredStaff.map((member) => (
            <li
              key={member.id}
              className="flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  {!member.active && (
                    <span className="text-muted-foreground text-xs">
                      (deaktiviert)
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{member.email}</p>
                <p className="text-muted-foreground text-sm">
                  {member.residentialAreaName ?? "–"}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                {member.id === currentUserId ? (
                  <span className="text-muted-foreground self-center text-xs">
                    Eigenes Konto
                  </span>
                ) : (
                  <>
                    <RoleSelect userId={member.id} role={member.role} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(member)}
                    >
                      Bearbeiten
                    </Button>
                    <UserRowActions userId={member.id} active={member.active} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <UserFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        residentialAreas={residentialAreas}
        showSchoolClassAndRoom={false}
        createRoleOptions={["STAFF", "ADMIN"]}
        editingUser={editingStaff}
      />
    </div>
  );
}
