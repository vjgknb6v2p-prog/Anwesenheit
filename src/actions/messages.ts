"use server";

import { revalidatePath } from "next/cache";
import { canSendMessageTo } from "@/domain/messaging";
import { can, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { sendWebPushToUser } from "@/lib/push";
import {
  sendBroadcastSchema,
  sendMessageSchema,
} from "@/lib/validation/messages";

export interface ActionResult {
  error?: string;
}

function revalidateMessagePaths(): void {
  revalidatePath("/nachrichten");
  revalidatePath("/staff/nachrichten");
  revalidatePath("/admin/nachrichten");
}

/**
 * Sendet eine Direktnachricht. PROMPT.md-Erweiterung "Nachrichten": Schüler
 * dürfen nur an Mitarbeiter/Admin schreiben (kein unbeaufsichtigter
 * Peer-Chat), siehe `canSendMessageTo` in `src/domain/messaging.ts`.
 */
export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (!can(user.role, "SEND_MESSAGE")) {
    return { error: "Keine Berechtigung." };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const recipient = await db.user.findUnique({
    where: { id: parsed.data.recipientId },
    select: { id: true, role: true, active: true, deletedAt: true },
  });
  if (!recipient || !recipient.active || recipient.deletedAt) {
    return { error: "Empfänger nicht gefunden." };
  }
  if (!canSendMessageTo(user.role, recipient.role)) {
    return { error: "An diese Rolle darfst du keine Nachricht schreiben." };
  }

  const message = await db.message.create({
    data: {
      senderId: user.id,
      recipientId: recipient.id,
      body: parsed.data.body,
    },
  });

  await sendWebPushToUser(recipient.id, {
    title: `Neue Nachricht von ${user.name ?? "CheckIn"}`,
    body: message.body,
  });

  revalidateMessagePaths();
  return {};
}

/**
 * Markiert eine an den aktuellen Nutzer gerichtete Nachricht als gelesen.
 * Fremde/unbekannte IDs werden still ignoriert (Abschnitt 3.8: kein
 * Datenleck über die Fehlermeldung), analog zu
 * `markNotificationReadAction`.
 */
export async function markMessageReadAction(messageId: string): Promise<void> {
  const user = await requireUser();

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.recipientId !== user.id || message.readAt) {
    return;
  }

  await db.message.update({
    where: { id: messageId },
    data: { readAt: new Date() },
  });

  revalidateMessagePaths();
}

/**
 * Notfall-Broadcast: Mitarbeiter/Admin senden eine Sofort-Nachricht an alle
 * aktuell abwesenden/überfälligen Schüler (jede aktive Abwesenheit, ohne
 * Rücksicht auf `plannedReturnAt` — PROMPT.md-Erweiterung "Notfall-
 * Broadcast"). Mitarbeiter erreichen nur den eigenen Wohnbereich (analog
 * zur Wohnbereichs-Einschränkung bei Statistiken), Admin alle. Erzeugt eine
 * `Message`-Zeile pro Empfänger mit gemeinsamer `broadcastGroupId`, damit
 * Lesestatus pro Empfänger unabhängig bleibt (siehe schema.prisma).
 */
export async function sendBroadcastAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!can(user.role, "SEND_BROADCAST")) {
    return { error: "Keine Berechtigung." };
  }

  const parsed = sendBroadcastSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  let staffResidentialAreaId: string | null = null;
  if (user.role === "STAFF") {
    const staffUser = await db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { residentialAreaId: true },
    });
    staffResidentialAreaId = staffUser.residentialAreaId;
    if (!staffResidentialAreaId) {
      return {
        error: "Dir ist kein Wohnbereich zugeordnet — Rundruf nicht möglich.",
      };
    }
  }

  const recipients = await db.user.findMany({
    where: {
      role: "STUDENT",
      active: true,
      deletedAt: null,
      ...(staffResidentialAreaId
        ? { residentialAreaId: staffResidentialAreaId }
        : {}),
      absences: { some: { status: "ACTIVE" } },
    },
    select: { id: true },
  });

  if (recipients.length === 0) {
    return {
      error: "Aktuell ist niemand abwesend — kein Rundruf verschickt.",
    };
  }

  const broadcastGroupId = crypto.randomUUID();

  await db.message.createMany({
    data: recipients.map((recipient) => ({
      senderId: user.id,
      recipientId: recipient.id,
      body: parsed.data.body,
      broadcastGroupId,
    })),
  });

  await Promise.all(
    recipients.map((recipient) =>
      sendWebPushToUser(recipient.id, {
        title: `Rundruf von ${user.name ?? "CheckIn"}`,
        body: parsed.data.body,
      }),
    ),
  );

  revalidateMessagePaths();
  return {};
}
