"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { getSettings, type AppSettings } from "@/lib/settings";
import { residentialAreaSchema, settingsSchema } from "@/lib/validation/admin";

const UNIQUE_VIOLATION = "P2002";

export interface ActionResult {
  error?: string;
}

/** Legt einen Wohnbereich an oder benennt ihn um (Rechte-Matrix: "Wohnbereiche"). */
export async function upsertResidentialAreaAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  const parsed = residentialAreaSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const { id, name } = parsed.data;

  try {
    if (id) {
      const before = await db.residentialArea.findUnique({ where: { id } });
      if (!before) {
        return { error: "Wohnbereich nicht gefunden." };
      }
      await db.residentialArea.update({ where: { id }, data: { name } });
      await writeAuditLog({
        actorId: admin.id,
        action: "RESIDENTIAL_AREA_UPDATED",
        targetType: "ResidentialArea",
        targetId: id,
        metadata: { before: { name: before.name }, after: { name } },
      });
    } else {
      const created = await db.residentialArea.create({ data: { name } });
      await writeAuditLog({
        actorId: admin.id,
        action: "RESIDENTIAL_AREA_CREATED",
        targetType: "ResidentialArea",
        targetId: created.id,
        metadata: { after: { name } },
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return { error: "Ein Wohnbereich mit diesem Namen existiert bereits." };
    }
    throw error;
  }

  revalidatePath("/admin/wohnbereiche");
  return {};
}

/**
 * Löscht einen Wohnbereich. Schlägt kontrolliert fehl, wenn ihm noch
 * Benutzer zugeordnet sind (`onDelete` ist im Schema nicht kaskadierend
 * gesetzt) — Zuordnung muss zuerst aufgelöst werden.
 */
export async function deleteResidentialAreaAction(
  id: string,
): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  const area = await db.residentialArea.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!area) {
    return { error: "Wohnbereich nicht gefunden." };
  }
  if (area._count.users > 0) {
    return {
      error: `Diesem Wohnbereich sind noch ${area._count.users} Benutzer zugeordnet.`,
    };
  }

  await db.residentialArea.delete({ where: { id } });
  await writeAuditLog({
    actorId: admin.id,
    action: "RESIDENTIAL_AREA_DELETED",
    targetType: "ResidentialArea",
    targetId: id,
    metadata: { before: { name: area.name } },
  });

  revalidatePath("/admin/wohnbereiche");
  return {};
}

/** Aktualisiert die globalen Einstellungen (Rechte-Matrix: "Einstellungen"). */
export async function updateSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireRole("ADMIN");

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const before = await getSettings();
  const after = parsed.data;

  await db.$transaction(
    (Object.keys(after) as (keyof AppSettings)[]).map((key) =>
      db.setting.upsert({
        where: { key },
        create: { key, value: after[key] },
        update: { value: after[key] },
      }),
    ),
  );

  await writeAuditLog({
    actorId: admin.id,
    action: "SETTINGS_UPDATED",
    targetType: "Setting",
    metadata: { before: { ...before }, after: { ...after } },
  });

  revalidatePath("/admin/einstellungen");
  return {};
}
