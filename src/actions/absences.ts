"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { checkOutSchema, extendSchema } from "@/lib/validation/absence";

export interface ActionResult {
  error?: string;
}

/** Postgres-Fehlercode für eine verletzte Unique-Constraint (auch für den
 * partiellen Raw-SQL-Index `one_active_absence`, siehe PROMPT.md Abschnitt 3.2). */
const UNIQUE_VIOLATION = "P2002";

/**
 * Auscheckt den angemeldeten Nutzer. `checkedOutAt` wird ausschließlich
 * serverseitig gesetzt — Client-Zeit wird nie übernommen (Abschnitt 3.3).
 */
export async function checkOutAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = checkOutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const settings = await getSettings();
  const maxAllowedAt = new Date(
    Date.now() + settings.maxPlannedDurationHours * 60 * 60 * 1000,
  );
  if (parsed.data.plannedReturnAt.getTime() > maxAllowedAt.getTime()) {
    return {
      error: `Die geplante Rückkehr darf laut Einstellung höchstens ${settings.maxPlannedDurationHours} Stunden in der Zukunft liegen.`,
    };
  }

  try {
    await db.absence.create({
      data: {
        userId: user.id,
        checkedOutAt: new Date(),
        plannedReturnAt: parsed.data.plannedReturnAt,
        reason: parsed.data.reason,
        reasonDetail: parsed.data.reasonDetail ?? null,
        destination: parsed.data.destination,
        note: parsed.data.note ?? null,
        status: "ACTIVE",
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      // Verletzt one_active_absence: es existiert bereits eine aktive
      // Abwesenheit. Kontrolliert abgefangen statt als Exception im UI
      // (Abschnitt 3.2).
      return { error: "Du bist bereits abwesend gemeldet." };
    }
    throw error;
  }

  await writeAuditLog({
    actorId: user.id,
    action: "CHECK_OUT",
    targetUserId: user.id,
    targetType: "Absence",
  });

  revalidatePath("/");
  revalidatePath("/abwesenheiten");
  return {};
}

/**
 * Checkt den angemeldeten Nutzer ein. Nur möglich, wenn eine aktive
 * Abwesenheit existiert — sonst kontrollierter Fehler statt Exception
 * (Abschnitt 3.4).
 */
export async function checkInAction(): Promise<ActionResult> {
  const user = await requireUser();

  const activeAbsence = await db.absence.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });

  if (!activeAbsence) {
    return { error: "Du bist aktuell nicht abwesend gemeldet." };
  }

  await db.absence.update({
    where: { id: activeAbsence.id },
    data: { checkedInAt: new Date(), status: "COMPLETED" },
  });

  await writeAuditLog({
    actorId: user.id,
    action: "CHECK_IN",
    targetUserId: user.id,
    targetType: "Absence",
    targetId: activeAbsence.id,
  });

  revalidatePath("/");
  revalidatePath("/abwesenheiten");
  return {};
}

/**
 * Verlängert die aktive Abwesenheit (Abschnitt 3.5). Erzeugt immer einen
 * `Extension`-Datensatz; ob die neue Zeit sofort gilt oder erst nach
 * Mitarbeiter-Freigabe, hängt vom Setting `requireExtensionApproval` ab.
 */
export async function extendAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = extendSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const activeAbsence = await db.absence.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });

  if (!activeAbsence) {
    return { error: "Du bist aktuell nicht abwesend gemeldet." };
  }

  if (
    parsed.data.newReturnAt.getTime() <= activeAbsence.plannedReturnAt.getTime()
  ) {
    return {
      error: "Die neue Rückkehrzeit muss nach der bisherigen liegen.",
    };
  }

  const maxDaysAheadMs = 14 * 24 * 60 * 60 * 1000;
  if (parsed.data.newReturnAt.getTime() > Date.now() + maxDaysAheadMs) {
    return {
      error:
        "Die neue Rückkehrzeit darf höchstens 14 Tage in der Zukunft liegen.",
    };
  }

  const settings = await getSettings();
  const requiresApproval = settings.requireExtensionApproval;

  await db.$transaction([
    db.extension.create({
      data: {
        absenceId: activeAbsence.id,
        oldReturnAt: activeAbsence.plannedReturnAt,
        newReturnAt: parsed.data.newReturnAt,
        status: requiresApproval ? "PENDING" : "AUTO_APPROVED",
      },
    }),
    ...(requiresApproval
      ? []
      : [
          db.absence.update({
            where: { id: activeAbsence.id },
            data: { plannedReturnAt: parsed.data.newReturnAt },
          }),
        ]),
  ]);

  await writeAuditLog({
    actorId: user.id,
    action: "EXTEND",
    targetUserId: user.id,
    targetType: "Absence",
    targetId: activeAbsence.id,
    metadata: {
      oldReturnAt: activeAbsence.plannedReturnAt.toISOString(),
      newReturnAt: parsed.data.newReturnAt.toISOString(),
      requiresApproval,
    },
  });

  revalidatePath("/");
  revalidatePath("/abwesenheiten");
  return {};
}
