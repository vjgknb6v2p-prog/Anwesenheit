"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { getMailer } from "@/lib/mail/mailer";
import { hashPassword } from "@/lib/password";
import { generateResetToken } from "@/lib/tokens";
import {
  changeUserRoleSchema,
  createUserSchema,
  updateUserSchema,
} from "@/lib/validation/admin";

const UNIQUE_VIOLATION = "P2002";
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 Stunde, wie requestPasswordResetAction

export interface ActionResult {
  error?: string;
}

function revalidateUserViews() {
  revalidatePath("/admin/schueler");
  revalidatePath("/admin/mitarbeiter");
  revalidatePath("/admin");
}

/**
 * Legt einen Benutzer an (Rechte-Matrix: "Benutzer anlegen"). Das
 * Initialpasswort wird vom Admin vergeben; `mustChangePassword=true` zwingt
 * den Benutzer beim ersten Login zu einer Änderung — ein eigener
 * "Passwort bei erstem Login ändern"-Flow ist laut PROMPT.md nicht gefordert,
 * das Feld existiert aber bereits im Schema und wird hier korrekt gesetzt.
 */
export async function createUserAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const data = parsed.data;
  const passwordHash = await hashPassword(data.password);

  let created;
  try {
    created = await db.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        schoolClass: data.schoolClass ?? null,
        room: data.room ?? null,
        residentialAreaId: data.residentialAreaId ?? null,
        passwordHash,
        mustChangePassword: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return { error: "Diese E-Mail-Adresse wird bereits verwendet." };
    }
    throw error;
  }

  await writeAuditLog({
    actorId: admin.id,
    action: "USER_CREATED",
    targetUserId: created.id,
    targetType: "User",
    targetId: created.id,
    metadata: { after: { email: created.email, role: created.role } },
  });

  revalidateUserViews();
  return {};
}

/** Bearbeitet Stammdaten eines Benutzers (nicht Rolle/Passwort — eigene Actions). */
export async function updateUserAction(input: unknown): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const data = parsed.data;

  const before = await db.user.findUnique({ where: { id: data.id } });
  if (!before || before.deletedAt) {
    return { error: "Benutzer nicht gefunden." };
  }

  let updated;
  try {
    updated = await db.user.update({
      where: { id: data.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        schoolClass: data.schoolClass ?? null,
        room: data.room ?? null,
        residentialAreaId: data.residentialAreaId ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return { error: "Diese E-Mail-Adresse wird bereits verwendet." };
    }
    throw error;
  }

  await writeAuditLog({
    actorId: admin.id,
    action: "USER_UPDATED",
    targetUserId: updated.id,
    targetType: "User",
    targetId: updated.id,
    metadata: {
      before: {
        firstName: before.firstName,
        lastName: before.lastName,
        email: before.email,
        schoolClass: before.schoolClass,
        room: before.room,
        residentialAreaId: before.residentialAreaId,
      },
      after: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        schoolClass: updated.schoolClass,
        room: updated.room,
        residentialAreaId: updated.residentialAreaId,
      },
    },
  });

  revalidateUserViews();
  return {};
}

/**
 * Aktiviert/deaktiviert ein Benutzerkonto. Ein deaktiviertes Konto kann sich
 * nicht mehr anmelden (siehe `src/auth.ts`), bleibt aber inkl. Historie
 * erhalten — im Unterschied zum Soft-Delete (siehe unten).
 */
export async function setUserActiveAction(
  userId: string,
  active: boolean,
): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  if (userId === admin.id) {
    return { error: "Das eigene Konto kann nicht deaktiviert werden." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return { error: "Benutzer nicht gefunden." };
  }

  await db.user.update({ where: { id: userId }, data: { active } });

  await writeAuditLog({
    actorId: admin.id,
    action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    targetUserId: userId,
    targetType: "User",
    targetId: userId,
    metadata: { before: { active: user.active }, after: { active } },
  });

  revalidateUserViews();
  return {};
}

/**
 * Soft-Delete (PROMPT.md Abschnitt 4/7): `deletedAt` wird gesetzt, der
 * Datensatz bleibt für Historie/Audit-Log erhalten, verschwindet aber aus
 * allen aktiven Listen und kann sich nicht mehr anmelden.
 */
export async function softDeleteUserAction(
  userId: string,
): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  if (userId === admin.id) {
    return { error: "Das eigene Konto kann nicht gelöscht werden." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return { error: "Benutzer nicht gefunden." };
  }

  await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), active: false },
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "USER_SOFT_DELETED",
    targetUserId: userId,
    targetType: "User",
    targetId: userId,
  });

  revalidateUserViews();
  return {};
}

/** Ändert die Rolle eines Benutzers (Rechte-Matrix: "Rollen ändern"). */
export async function changeUserRoleAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  const parsed = changeUserRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Ungültige Eingabe." };
  }
  const { id, role } = parsed.data;

  if (id === admin.id) {
    return { error: "Die eigene Rolle kann nicht geändert werden." };
  }

  const user = await db.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    return { error: "Benutzer nicht gefunden." };
  }
  if (user.role === role) {
    return {};
  }

  await db.user.update({ where: { id }, data: { role } });

  await writeAuditLog({
    actorId: admin.id,
    action: "USER_ROLE_CHANGED",
    targetUserId: id,
    targetType: "User",
    targetId: id,
    metadata: { before: { role: user.role }, after: { role } },
  });

  revalidateUserViews();
  return {};
}

/**
 * Löst für einen Benutzer denselben Passwort-Reset-Link-Flow aus wie
 * "Passwort vergessen" (Rechte-Matrix: "Passwort zurücksetzen") — der Admin
 * setzt das Passwort nicht selbst, sondern ein Reset-Link wird verschickt
 * (`ConsoleMailer`), damit niemals ein Klartext-Passwort durch Admin-Hände
 * geht oder im Audit-Log landet.
 */
export async function resetUserPasswordAction(
  userId: string,
): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return { error: "Benutzer nicht gefunden." };
  }

  const { raw, hash } = generateResetToken();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  await getMailer().send({
    to: user.email,
    subject: "CheckIn – Passwort zurücksetzen",
    text: `Ein Administrator hat einen Passwort-Reset für dein Konto ausgelöst. Zum Setzen eines neuen Passworts öffne diesen Link (gültig 1 Stunde): ${appUrl}/passwort-zuruecksetzen/${raw}`,
  });

  await writeAuditLog({
    actorId: admin.id,
    action: "ADMIN_PASSWORD_RESET_TRIGGERED",
    targetUserId: user.id,
    targetType: "User",
    targetId: user.id,
  });

  return {};
}
