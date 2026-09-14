"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  UserFormSheet,
  type EditingUser,
  type ResidentialAreaOption,
} from "@/components/admin/user-form-sheet";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { Button } from "@/components/ui/button";
import type { StudentStatus } from "@/domain/status";

export interface StudentRow extends EditingUser {
  active: boolean;
  residentialAreaName: string | null;
  status: StudentStatus;
}

interface StudentsAdminClientProps {
  students: StudentRow[];
  residentialAreas: ResidentialAreaOption[];
}

export function StudentsAdminClient({
  students,
  residentialAreas,
}: StudentsAdminClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);

  function openCreate() {
    setEditingStudent(null);
    setSheetOpen(true);
  }

  function openEdit(student: StudentRow) {
    setEditingStudent(student);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Schüler ({students.length})</h1>
        <Button type="button" onClick={openCreate}>
          Neuer Schüler
        </Button>
      </div>

      {students.length === 0 ? (
        <p className="text-muted-foreground text-sm">Keine Schüler angelegt.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {students.map((student) => (
            <li
              key={student.id}
              className="flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {student.firstName} {student.lastName}
                  </p>
                  <StatusBadge status={student.status} />
                  {!student.active && (
                    <span className="text-muted-foreground text-xs">
                      (deaktiviert)
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{student.email}</p>
                <p className="text-muted-foreground text-sm">
                  {student.schoolClass ?? "–"} · Zimmer {student.room ?? "–"} ·{" "}
                  {student.residentialAreaName ?? "–"}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(student)}
                >
                  Bearbeiten
                </Button>
                <UserRowActions userId={student.id} active={student.active} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <UserFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        residentialAreas={residentialAreas}
        showSchoolClassAndRoom
        createRoleOptions={["STUDENT"]}
        editingUser={editingStudent}
      />
    </div>
  );
}
