import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { roleHomePath } from "@/lib/roles";

export interface AuthenticatedUser {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
}

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
  };
}

/** Erzwingt eine angemeldete Session, sonst Redirect zu `/login`. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Erzwingt eine angemeldete Session **und** eine der erlaubten Rollen.
 * Fehlt die Berechtigung, wird kontrolliert auf den eigenen Rollen-Bereich
 * umgeleitet — keine Exception, kein Datenleck an die UI.
 *
 * PROMPT.md Abschnitt 5: "Jede Server Action und jeder Route Handler ruft
 * sie als erste Zeile auf. Middleware allein reicht nicht."
 */
export async function requireRole(
  ...roles: Role[]
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(roleHomePath(user.role));
  }
  return user;
}

/**
 * Die Rechte-Matrix aus PROMPT.md Abschnitt 5. `can()` prüft nur die grobe,
 * rollenbasierte Berechtigung für eine Aktion — eine feinere Einschränkung
 * wie "Mitarbeiter sehen Statistiken nur für den eigenen Wohnbereich" ist
 * Sache der jeweiligen Abfrage (Filter nach `residentialAreaId`), nicht von
 * `can()` selbst.
 */
export type Action =
  | "VIEW_OWN_STATUS"
  | "CHECK_IN_OUT_SELF"
  | "VIEW_OWN_HISTORY"
  | "EXPORT_OWN_DATA"
  | "VIEW_PRESENCE_LIST"
  | "VIEW_OTHER_HISTORY"
  | "CORRECT_OR_CANCEL_ABSENCE"
  | "APPROVE_EXTENSION"
  | "CHECK_IN_OTHER_STUDENT"
  | "MANAGE_USERS"
  | "MANAGE_ROLES_AND_PASSWORDS"
  | "VIEW_STATISTICS"
  | "VIEW_AUDIT_LOG"
  | "MANAGE_SETTINGS_AND_AREAS";

const PERMISSIONS: Record<Action, ReadonlySet<Role>> = {
  VIEW_OWN_STATUS: new Set(["STUDENT", "STAFF", "ADMIN"]),
  CHECK_IN_OUT_SELF: new Set(["STUDENT", "STAFF", "ADMIN"]),
  VIEW_OWN_HISTORY: new Set(["STUDENT", "STAFF", "ADMIN"]),
  EXPORT_OWN_DATA: new Set(["STUDENT", "STAFF", "ADMIN"]),
  VIEW_PRESENCE_LIST: new Set(["STAFF", "ADMIN"]),
  VIEW_OTHER_HISTORY: new Set(["STAFF", "ADMIN"]),
  CORRECT_OR_CANCEL_ABSENCE: new Set(["STAFF", "ADMIN"]),
  APPROVE_EXTENSION: new Set(["STAFF", "ADMIN"]),
  CHECK_IN_OTHER_STUDENT: new Set(["STAFF", "ADMIN"]),
  MANAGE_USERS: new Set(["ADMIN"]),
  MANAGE_ROLES_AND_PASSWORDS: new Set(["ADMIN"]),
  VIEW_STATISTICS: new Set(["STAFF", "ADMIN"]),
  VIEW_AUDIT_LOG: new Set(["ADMIN"]),
  MANAGE_SETTINGS_AND_AREAS: new Set(["ADMIN"]),
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[action].has(role);
}
