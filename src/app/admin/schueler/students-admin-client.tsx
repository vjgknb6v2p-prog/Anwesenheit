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
import { Input } from "@/components/ui/input";
import type { StudentStatus } from "@/domain/status";

export interface StudentRow extends EditingUser {
  active: boolean;
  residentialAreaName: string | null;
  status: StudentStatus;
}

interface StudentsAdminClientProps {
  students: StudentRow[];
  residentialAreas: ResidentialAreaOption[];
  /** Erweiterung "Globale Suche": vorausgefüllt über `/admin/schueler?q=…`. */
  initialQuery?: string;
}

function matchesQuery(student: StudentRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return [
    `${student.firstName} ${student.lastName}`,
    student.email,
    student.schoolClass ?? "",
    student.room ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function StudentsAdminClient({
  students,
  residentialAreas,
  initialQuery = "",
}: StudentsAdminClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [query, setQuery] = useState(initialQuery);

  const filteredStudents = students.filter((student) =>
    matchesQuery(student, query),
  );

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          Schüler ({filteredStudents.length})
        </h1>
        <Button type="button" onClick={openCreate}>
          Neuer Schüler
        </Button>
      </div>

      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Name, E-Mail, Klasse oder Zimmer suchen…"
        aria-label="Schüler durchsuchen"
        className="max-w-sm"
      />

      {filteredStudents.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {students.length === 0
            ? "Keine Schüler angelegt."
            : "Keine Schüler gefunden."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredStudents.map((student) => (
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
