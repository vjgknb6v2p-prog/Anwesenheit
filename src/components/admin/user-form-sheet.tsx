"use client";

import type { Role } from "@prisma/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserAction, updateUserAction } from "@/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";

const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Schüler",
  STAFF: "Mitarbeiter",
  ADMIN: "Admin",
};

export interface ResidentialAreaOption {
  id: string;
  name: string;
}

export interface EditingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolClass: string | null;
  room: string | null;
  residentialAreaId: string | null;
}

interface UserFormSheetProps {
  open: boolean;
  onClose: () => void;
  residentialAreas: ResidentialAreaOption[];
  /** Klasse/Zimmer sind nur für Schüler relevant. */
  showSchoolClassAndRoom: boolean;
  /** Nur im Anlage-Modus (kein `editingUser`) genutzt. */
  createRoleOptions?: Role[];
  editingUser?: EditingUser | null;
}

/**
 * Formular für Benutzer anlegen/bearbeiten (Rechte-Matrix: "Benutzer
 * anlegen/bearbeiten"). Rolle, Aktivierung und Passwort-Reset sind bewusst
 * eigene, sofort wirksame Aktionen außerhalb dieses Formulars (siehe
 * `UserRowActions`/`RoleSelect`) statt Teil eines gemeinsamen Speichern-Tap —
 * das entspricht getrennten Zeilen in der Rechte-Matrix (Abschnitt 5) mit
 * jeweils eigenem Audit-Log-Eintrag.
 */
export function UserFormSheet({
  open,
  onClose,
  residentialAreas,
  showSchoolClassAndRoom,
  createRoleOptions,
  editingUser,
}: UserFormSheetProps) {
  const router = useRouter();
  const isEdit = Boolean(editingUser);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [room, setRoom] = useState("");
  const [residentialAreaId, setResidentialAreaId] = useState("");
  const [role, setRole] = useState<Role>(createRoleOptions?.[0] ?? "STUDENT");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    setPassword("");
    if (editingUser) {
      setFirstName(editingUser.firstName);
      setLastName(editingUser.lastName);
      setEmail(editingUser.email);
      setSchoolClass(editingUser.schoolClass ?? "");
      setRoom(editingUser.room ?? "");
      setResidentialAreaId(editingUser.residentialAreaId ?? "");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setSchoolClass("");
      setRoom("");
      setResidentialAreaId("");
      setRole(createRoleOptions?.[0] ?? "STUDENT");
    }
  }, [open, editingUser, createRoleOptions]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = editingUser
      ? await updateUserAction({
          id: editingUser.id,
          firstName,
          lastName,
          email,
          schoolClass: schoolClass || null,
          room: room || null,
          residentialAreaId: residentialAreaId || null,
        })
      : await createUserAction({
          firstName,
          lastName,
          email,
          role,
          schoolClass: schoolClass || null,
          room: room || null,
          residentialAreaId: residentialAreaId || null,
          password,
        });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Benutzer bearbeiten" : "Benutzer anlegen"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {!isEdit && createRoleOptions && createRoleOptions.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-role">Rolle</Label>
            <select
              id="user-role"
              className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {createRoleOptions.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-first-name">Vorname</Label>
            <Input
              id="user-first-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-last-name">Nachname</Label>
            <Input
              id="user-last-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-email">E-Mail</Label>
          <Input
            id="user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        {showSchoolClassAndRoom && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-school-class">Klasse</Label>
              <Input
                id="user-school-class"
                value={schoolClass}
                onChange={(event) => setSchoolClass(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-room">Zimmer</Label>
              <Input
                id="user-room"
                value={room}
                onChange={(event) => setRoom(event.target.value)}
              />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="user-residential-area">Wohnbereich</Label>
          <select
            id="user-residential-area"
            className="border-input bg-background h-11 rounded-xl border px-3 text-sm"
            value={residentialAreaId}
            onChange={(event) => setResidentialAreaId(event.target.value)}
          >
            <option value="">– kein Wohnbereich –</option>
            {residentialAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
        {!isEdit && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-password">Initialpasswort</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Wird gespeichert…"
            : isEdit
              ? "Änderungen speichern"
              : "Benutzer anlegen"}
        </Button>
      </form>
    </Sheet>
  );
}
