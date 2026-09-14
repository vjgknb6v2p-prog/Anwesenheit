"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";

/**
 * Markiert eine eigene Benachrichtigung als gelesen. Die automatische
 * Erzeugung von Benachrichtigungen (Erinnerungen, Überfälligkeits-Meldungen)
 * folgt erst in Phase 6 — diese Action ist bereits jetzt nutzbar, sobald
 * Datensätze existieren. Rückgabetyp `void`, da sie direkt als
 * `<form action>` gebunden wird (siehe benachrichtigungen/page.tsx); eine
 * fremde oder unbekannte ID wird still ignoriert statt sie zu bestätigen
 * oder abzulehnen (Abschnitt 3.8: kein Datenleck über die Fehlermeldung).
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const user = await requireUser();

  const notification = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== user.id) {
    return;
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  revalidatePath("/benachrichtigungen");
}
