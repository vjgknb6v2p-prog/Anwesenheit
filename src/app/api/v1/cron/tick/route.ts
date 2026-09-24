import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import {
  buildOverdueNotification,
  buildReminderNotification,
  buildStaffOverdueSummary,
  shouldSendOverdueNotice,
  shouldSendReminder,
  type NotificationContent,
} from "@/domain/notification-rules";
import { isCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendWebPushToUser } from "@/lib/push";
import { getSettings } from "@/lib/settings";
import { formatTime } from "@/lib/time";

// Muss bei jedem Aufruf frisch gegen die DB laufen, nie gecacht/statisch.
export const dynamic = "force-dynamic";

/**
 * Legt eine Benachrichtigung nur an, wenn dieser Anlass (`userId` + `type` +
 * `sourceId`) noch nicht existiert — erzwungen über den DB-Unique-Index
 * `[userId, type, sourceId]` (siehe Migration `add_notification_source_id`),
 * nicht über ein vorheriges `findFirst` (race-sicher bei überlappenden
 * Cron-Aufrufen). Das ist die Grundlage für PROMPT.md Abschnitt 8:
 * "Idempotent — derselbe Anlass darf nie doppelt benachrichtigen."
 */
async function createNotificationOnce(
  userId: string,
  content: NotificationContent,
): Promise<boolean> {
  try {
    await db.notification.create({
      data: {
        userId,
        type: content.type,
        sourceId: content.sourceId,
        title: content.title,
        message: content.message,
      },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false; // Anlass wurde bereits einmal benachrichtigt.
    }
    throw error;
  }
}

async function notifyOnce(
  userId: string,
  content: NotificationContent,
): Promise<boolean> {
  const created = await createNotificationOnce(userId, content);
  if (created) {
    await sendWebPushToUser(userId, {
      title: content.title,
      body: content.message,
    });
  }
  return created;
}

/**
 * Erinnerungen, Überfälligkeits-Meldungen und die Mitarbeiter-Sammelmeldung
 * (PROMPT.md Abschnitt 8). Geschützt per `CRON_SECRET`-Header statt Session,
 * da der Aufrufer (Vercel Cron/systemd-Timer, siehe README.md) kein
 * Browser mit Login ist.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const settings = await getSettings();

  const activeAbsences = await db.absence.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, userId: true, plannedReturnAt: true },
  });

  let remindersSent = 0;
  let overdueNoticesSent = 0;
  const overdueUserIds = new Set<string>();

  for (const absence of activeAbsences) {
    const formattedReturn = formatTime(absence.plannedReturnAt);

    if (shouldSendReminder(absence, now, settings.reminderMinutesBefore)) {
      const created = await notifyOnce(
        absence.userId,
        buildReminderNotification(absence, formattedReturn),
      );
      if (created) {
        remindersSent++;
      }
    }

    if (shouldSendOverdueNotice(absence, now, settings.overdueGraceMinutes)) {
      overdueUserIds.add(absence.userId);
      const created = await notifyOnce(
        absence.userId,
        buildOverdueNotification(absence, formattedReturn),
      );
      if (created) {
        overdueNoticesSent++;
      }
    }
  }

  let staffSummariesSent = 0;
  if (overdueUserIds.size > 0) {
    const staffMembers = await db.user.findMany({
      where: { role: "STAFF", deletedAt: null, active: true },
      select: { id: true },
    });
    const summary = buildStaffOverdueSummary(overdueUserIds.size, now);
    for (const staffMember of staffMembers) {
      if (await notifyOnce(staffMember.id, summary)) {
        staffSummariesSent++;
      }
    }
  }

  logger.info(
    { remindersSent, overdueNoticesSent, staffSummariesSent },
    "Cron-Tick abgeschlossen",
  );

  return Response.json({
    remindersSent,
    overdueNoticesSent,
    staffSummariesSent,
  });
}
