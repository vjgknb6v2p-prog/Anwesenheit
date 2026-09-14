"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import {
  correctAbsenceSchema,
  decideExtensionSchema,
} from "@/lib/validation/staff";

const UNIQUE_VIOLATION = "P2002";

export interface ActionResult {
  error?: string;
}

function revalidateStaffViews(userId: string) {
  revalidatePath("/staff");
  revalidatePath("/staff/abwesend");
  revalidatePath("/staff/ueberfaellig");
  revalidatePath("/staff/historie");
  revalidatePath(`/staff/schueler/${userId}`);
}

/**
 * Checkt einen Schüler stellvertretend ein (Rechte-Matrix: "Für Schüler
 * einchecken"). `checkedInById` protokolliert, wer eingecheckt hat.
 */
export async function checkInOtherAction(
  absenceId: string,
): Promise<ActionResult> {
  const staffUser = await requireRole("STAFF", "ADMIN");

  const absence = await db.absence.findUnique({ where: { id: absenceId } });
  if (!absence || absence.status !== "ACTIVE") {
    return { error: "Diese Abwesenheit ist nicht mehr aktiv." };
  }

  await db.absence.update({
    where: { id: absenceId },
    data: {
      checkedInAt: new Date(),
      status: "COMPLETED",
      checkedInById: staffUser.id,
    },
  });

  await writeAuditLog({
    actorId: staffUser.id,
    action: "CHECK_IN",
    targetUserId: absence.userId,
    targetType: "Absence",
    targetId: absenceId,
  });

  revalidateStaffViews(absence.userId);
  return {};
}

/**
 * Korrigiert Auscheckzeit, geplante Rückkehr und/oder tatsächliche Rückkehr
 * einer Abwesenheit. Schreibt laut Abschnitt 3.6 **immer** einen Audit-Log-
 * Eintrag mit Vorher-/Nachher-Werten, unabhängig davon, ob sich am Ende
 * inhaltlich etwas ändert.
 */
export async function correctAbsenceAction(
  input: unknown,
): Promise<ActionResult> {
  const staffUser = await requireRole("STAFF", "ADMIN");

  const parsed = correctAbsenceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const absence = await db.absence.findUnique({
    where: { id: parsed.data.absenceId },
  });
  if (!absence) {
    return { error: "Abwesenheit nicht gefunden." };
  }

  const before = {
    checkedOutAt: absence.checkedOutAt.toISOString(),
    plannedReturnAt: absence.plannedReturnAt.toISOString(),
    checkedInAt: absence.checkedInAt?.toISOString() ?? null,
    status: absence.status,
  };

  // Wird die tatsächliche Rückkehr entfernt, ist die Abwesenheit wieder aktiv
  // (sofern sie nicht storniert wurde) — umgekehrt macht das Setzen einer
  // Rückkehr eine aktive Abwesenheit wieder abgeschlossen.
  const nextStatus =
    absence.status === "CANCELLED"
      ? "CANCELLED"
      : parsed.data.checkedInAt
        ? "COMPLETED"
        : "ACTIVE";

  let updated;
  try {
    updated = await db.absence.update({
      where: { id: absence.id },
      data: {
        checkedOutAt: parsed.data.checkedOutAt,
        plannedReturnAt: parsed.data.plannedReturnAt,
        checkedInAt: parsed.data.checkedInAt,
        status: nextStatus,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      // Die Korrektur würde eine zweite aktive Abwesenheit erzeugen
      // (one_active_absence, Abschnitt 3.2).
      return {
        error: "Für diesen Schüler existiert bereits eine aktive Abwesenheit.",
      };
    }
    throw error;
  }

  const after = {
    checkedOutAt: updated.checkedOutAt.toISOString(),
    plannedReturnAt: updated.plannedReturnAt.toISOString(),
    checkedInAt: updated.checkedInAt?.toISOString() ?? null,
    status: updated.status,
  };

  await writeAuditLog({
    actorId: staffUser.id,
    action: "CORRECT_ABSENCE",
    targetUserId: absence.userId,
    targetType: "Absence",
    targetId: absence.id,
    metadata: { before, after },
  });

  revalidateStaffViews(absence.userId);
  return {};
}

/** Storniert eine Abwesenheit (Abschnitt 3.6). */
export async function cancelAbsenceAction(
  absenceId: string,
): Promise<ActionResult> {
  const staffUser = await requireRole("STAFF", "ADMIN");

  const absence = await db.absence.findUnique({ where: { id: absenceId } });
  if (!absence) {
    return { error: "Abwesenheit nicht gefunden." };
  }
  if (absence.status === "CANCELLED") {
    return { error: "Diese Abwesenheit ist bereits storniert." };
  }

  await db.absence.update({
    where: { id: absenceId },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    actorId: staffUser.id,
    action: "CANCEL_ABSENCE",
    targetUserId: absence.userId,
    targetType: "Absence",
    targetId: absenceId,
    metadata: {
      before: { status: absence.status },
      after: { status: "CANCELLED" },
    },
  });

  revalidateStaffViews(absence.userId);
  return {};
}

/**
 * Genehmigt oder lehnt eine Verlängerungsanfrage ab (nur relevant, wenn das
 * Setting `requireExtensionApproval=true` ist — sonst werden Verlängerungen
 * bereits in Phase 2 automatisch übernommen).
 */
export async function decideExtensionAction(
  input: unknown,
): Promise<ActionResult> {
  const staffUser = await requireRole("STAFF", "ADMIN");

  const parsed = decideExtensionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Ungültige Eingabe." };
  }

  const extension = await db.extension.findUnique({
    where: { id: parsed.data.extensionId },
    include: { absence: true },
  });
  if (!extension || extension.status !== "PENDING") {
    return { error: "Diese Verlängerungsanfrage ist nicht mehr offen." };
  }

  await db.$transaction([
    db.extension.update({
      where: { id: extension.id },
      data: {
        status: parsed.data.decision,
        approvedById: staffUser.id,
        decidedAt: new Date(),
      },
    }),
    ...(parsed.data.decision === "APPROVED"
      ? [
          db.absence.update({
            where: { id: extension.absenceId },
            data: { plannedReturnAt: extension.newReturnAt },
          }),
        ]
      : []),
  ]);

  await writeAuditLog({
    actorId: staffUser.id,
    action:
      parsed.data.decision === "APPROVED"
        ? "EXTENSION_APPROVED"
        : "EXTENSION_REJECTED",
    targetUserId: extension.absence.userId,
    targetType: "Extension",
    targetId: extension.id,
    metadata: {
      oldReturnAt: extension.oldReturnAt.toISOString(),
      newReturnAt: extension.newReturnAt.toISOString(),
    },
  });

  revalidateStaffViews(extension.absence.userId);
  return {};
}
