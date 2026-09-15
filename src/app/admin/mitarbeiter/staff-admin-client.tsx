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

export interface StaffRow extends EditingUser {
  active: boolean;
  residentialAreaName: string | null;
  role: Role;
}

interface StaffAdminClientProps {
  staff: StaffRow[];
  residentialAreas: ResidentialAreaOption[];
  currentUserId: string;
}

export function StaffAdminClient({
  staff,
  residentialAreas,
  currentUserId,
}: StaffAdminClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);

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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Mitarbeiter ({staff.length})</h1>
        <Button type="button" onClick={openCreate}>
          Neuer Mitarbeiter
        </Button>
      </div>

      {staff.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Keine Mitarbeiter angelegt.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {staff.map((member) => (
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
